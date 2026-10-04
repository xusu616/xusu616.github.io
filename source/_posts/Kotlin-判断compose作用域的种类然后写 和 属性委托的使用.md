---
title: Kotlin-判断compose作用域的种类然后写 和 类委托的使用
date: 2026-08-21 17:00:00
tags:
  - Kotlin
  - Android
categories:
  - Kotlin
  - Android UI
excerpt: 在修饰出错时看源码快速判断compose种类然后正确使用 以及 类委托的使用（类委托和属性委托共用一个关键词by）
---

# 在看源码的时候判断compose种类

>compose当中的Modifer的修饰并不是通用的
Compose 中有很多“作用域”（Scope）概念，它们以接口形式存在，如 BoxScope、ColumnScope、RowScope、LazyListScope 等

这些作用域内定义了专属的 Modifier 扩展函数，例如：

BoxScope 提供 Modifier.align   .matchParentSize()

ColumnScope 提供 Modifier.align     .weight(weight: Float)

RowScope 提供 Modifier.align        .weight(weight: Float)

```Kotlin

        AnimatedVisibility(
            visible = rightMenuVisible.value,
            enter = slideInHorizontally(
                initialOffsetX = { it },
                //animationSpec = tween(300)
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioLowBouncy,
                    stiffness = Spring.StiffnessLow
                )
            ) + fadeIn(animationSpec = tween(300)),
            exit = slideOutHorizontally(
                targetOffsetX = { it },
                //animationSpec = tween(300)
            ) + fadeOut(animationSpec = tween(300)),
            modifier = Modifier.align(Alignment.TopEnd)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(270.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .graphicsLayer { clip = true } // 提示系统开启硬件加速
            ) {
                Column {

                }
            }
        }
```

这里虽然一点那种问题也没有

但是编译器还是报错 `Unresolved reference 'align'.`

这是因为这里面没有可以接受 Modifier.align 的compose组件

## 为什么 Scaffold 不能直接用 align（除非有可接受的外层包裹

看 Scaffold 的签名：

```kotlin
@Composable
fun Scaffold(
    modifier: Modifier = Modifier,
    topBar: @Composable () -> Unit = {},
    bottomBar: @Composable () -> Unit = {},
    snackbarHost: @Composable () -> Unit = {},
    floatingActionButton: @Composable () -> Unit = {},
    floatingActionButtonPosition: FabPosition = FabPosition.End,
    containerColor: Color = MaterialTheme.colorScheme.background,
    contentColor: Color = contentColorFor(containerColor),
    contentWindowInsets: WindowInsets = ScaffoldDefaults.contentWindowInsets,
    content: @Composable (PaddingValues) -> Unit,   // ← 注意这里
) { ... }
//
```

content 的类型是 @Composable (PaddingValues) -> Unit，它没有 receiver（例如 BoxScope.(/**省略this，上一篇的**/) -> Unit）

因此，在 content 内部无法使用任何依赖于父布局作用域的 Modifier 扩展函数，包括 Modifier.align、Modifier.weight（来自 Column/RowScope）等

## 判断方法：

查看组件源码中 content 参数的类型。

如果 content 是 @Composable BoxScope.() -> Unit，则内部可以使用 BoxScope 的扩展函数。

如果 content 是 @Composable ColumnScope.() -> Unit，则内部可以使用 ColumnScope 的扩展函数

如果 content 是 @Composable (PaddingValues) -> Unit（像 Scaffold 这样），则没有任何布局作用域，只能使用普通的 Modifier（如 padding、background、clickable 等

### 例如 Box 的源码：

```kotlin
@Composable
inline fun Box(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit   // ← content 是 BoxScope 的扩展函数
) {
    ...
}
```

因此你可以在 Box 内部自由使用 Modifier.align

## 如何获得类似 TopEnd 的效果

既然 Scaffold 不提供作用域，我们就需要手动将它放在一个 Box 中，然后在 Box 的作用域里对 Scaffold 或其他元素使用 Modifier.align

# 属性委托
>不对这里是类委托

在看kotlin官方文档的时候

我又看到了这个东西的详细解释

但是我不是很理解为什么要这样做

比如说

```Kotlin
interface Base {
fun print()
}

class BaseImpl(val x: Int) : Base {
override fun print() { print(x) }
}

class Derived(b: Base) : Base by b

fun main() {
val base = BaseImpl(10)
Derived(base).print()
}
```

但是我觉得也能这样写（（

```Kotlin
interface Base {
fun print()
}
​
class BaseImpl(val x: Int) : Base {
override fun print() { print(x) }
}
​
class Derived(val y:BaseImpl) : Base {
override fun print() {
y.print()
}
}
​
fun main() {
val base = BaseImpl(10)
Derived(base).print()
}
```

输出当然都是一样的

而且我这个能指定传入的必须是实现了接口的BaseImpl方法，那不是更安全？

那这个属性委托有什么用

实际上这个东西可以解决很多问题

比如说

## 样板代码大幅减少

当接口有很多方法时，手动转发的代码会变很多

```kotlin
interface Printer {
    fun print()
    fun printPreview()
    fun printToPdf()
    fun cancelPrint()
    fun getStatus(): String
    // ... 可能还有更多
}
```

手动转发：

```kotlin
class ManualPrinter(private val delegate: BasePrinter) : Printer {
    override fun print() = delegate.print()
    override fun printPreview() = delegate.printPreview()
    override fun printToPdf() = delegate.printToPdf()
    override fun cancelPrint() = delegate.cancelPrint()
    override fun getStatus() = delegate.getStatus()
}
```

委托：

```kotlin
class DelegatedPrinter(private val delegate: Printer) : Printer by delegate
```

一个方法也好，一百个方法也好，委托都是一行搞定

## 装饰器模式清晰的类继承关系

比如我想要给BaseImpl加功能重写之类的

但是不想要通过继承

因为这个东西无法多重继承，而且会产生复杂的类关系

假设你想给 BaseImpl 增加一些行为（比如打印前记录日志），但又不希望修改原有代码，也不希望通过继承（因为继承可能导致类爆炸或无法多重继承）

```kotlin
class LoggingPrinter(private val delegate: Base) : Base by delegate {
    override fun print() {
        println("Log: printing started")
        delegate.print()          // 调用被委托对象的原方法
        println("Log: printing finished")
    }
}
```

只覆盖了 print()，其他方法（如 printPreview）自动委托给 delegate，不需要重写

这在装饰器模式中非常方便

完整代码如下

```Kotlin
interface Base {
    fun print()
}
​
class BaseImpl(val x: Int) : Base {
    override fun print() { println(x) }
}
​
class Derived(val y:BaseImpl) : Base {
    override fun print() {
        y.print()
    }
}
​
class LoggingPrinter(private val delegate: Base) : Base by delegate {
    override fun print() {
        println("Log: printing started")
        delegate.print()          // 调用被委托对象的原方法
        println("Log: printing finished")
    }
}
​
fun main() {
    val base = BaseImpl(10)
    Derived(base).print()
    LoggingPrinter(base).print()
}
```

```Terminal
10
Log: printing started
10
Log: printing finished
```


本文部分摘自[Kotlin docs 官方文档](https://kotlinlang.org/docs/delegation.html)