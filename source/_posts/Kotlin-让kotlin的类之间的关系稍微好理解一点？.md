---
title: Kotlin-让kotlin的类之间的关系稍微好理解一点？
date: 2026-08-20 12:00:00
tags:
  - Kotlin
  - Android
categories:
  - Kotlin
  - 语言特性
excerpt: 尝试去更好（？地理解Kotlin的语法糖
---

# 这一段看起来像是直接把抽象类拿来用或者是尝试把抽象类实例化

最开始是想看看nav导航后面具体是些什么，为什么会有看起来像出栈入栈的操作（` val navController = rememberNavController()` `navController.popBackStack()`），所以尝试看一看

```Kotlin
@Composable
public actual fun rememberNavController(
    vararg navigators: Navigator<out NavDestination>
): NavHostController 
```

刚刚看上去似乎确实没什么问题

但是我刚刚把鼠标放到 Navigator想知道它是什么的时候就完全不理解了

`public abstract class Navigator<D : NavDestination>`

Navigater 看起来是一个抽象类，那怎么能把它直接拿来用呢

所以往后看`<out NavDestination>`，看起来这是一个上界或者下界吗？下界在kotlin当中很少用到 应该是因为Kotlin 有更好的办法转型？

但是上界 的修饰符 是 :  所以这里并不是上界

实际上这里的out是协变修饰符

相当于是 泛型的一种更强的修饰

在这里代表着**泛型形参在这里只能函数返回 NavDestination**

更容易理解地说就是

最开始的问题：一个 Navigator 的抽象类型形参，并不是要接收抽象类

抽象类类型的变量/参数，可以引用它的具体子类实例

*就是说 这里的 navigator 实际是 NavDestination 对象，只是它的静态类型被声明为 Navigator<out NavDestination>*

它的类型参数是 NavDestination 或其子类，并且这个 Navigator 只会产出（返回）NavDestination 类型，不会消费（接收）NavDestination

## 这样写的原因是Android希望navigator能普适化

点到Navigater的声明就能看到

![ppm43t44-i57pmg4-2026-08-20-14-57-43](/img/ppm43t44-i57pmg4-2026-08-20-14-57-43.png)

这里看起来有多种继承类（实现方法

然后apply会把上面的对象赋值（应该

