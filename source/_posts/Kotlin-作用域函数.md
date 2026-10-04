---
title: Kotlin-作用域函数
date: 2026-08-20 17:00:00
tags:
  - Kotlin
categories:
  - Kotlin
  - 语言特性
excerpt: 容易看错的一集（？
---

# 第一个简单例子 apply

```Kotlin
@IgnorableReturnValue
@InlineOnly
public inline fun <T> T.apply(
    block: T.() -> Unit
): T
```

介绍原文如下

Calls the specified function block with this value as its receiver and returns this value.

For detailed usage information see the documentation for [scope functions](https://kotlinlang.org/docs/scope-functions.html#apply)

总之就是，它可以T.传入一个apply方法，在它的代码块当中（作用域中）传入它自己本身

用法如下

```Kotlin
val adam = Person("Adam").apply {
    age = 32
    city = "London"        
}
//就相当于adam.age(32)
println(adam)
```

# also可能混淆的情况

比如说这个是错的

```Kotlin
numbers.also {
    add("daoshaohuo")
    println("The list elements: $this")
    add("four")
}
```

这个是对的

```Kotlin
val numbers = mutableListOf("one", "two", "three")
numbers
    .also { println("The list elements before adding new one: $it") }
    .add("four")
```

这是因为它返回自身

总之不是apply那样用的

意思就是

also    做什么 在这之后把自己传出去再再做什么

定义源码如下

```Kotlin
@kotlin.internal.InlineOnly
@SinceKotlin("1.1")
@IgnorableReturnValue
public inline fun <T> T.also(block: (T) -> Unit): T {
    contract {
        callsInPlace(block, InvocationKind.EXACTLY_ONCE)
    }
    block(this)
    return this
}
```

# 其他

## run (类似 let)

下为官网示例

```Kotlin

val service = MultiportService("https://example.kotlinlang.org", 80)

val result = service.run {
    port = 8080
    query(prepareRequest() + " to port $port")
}

// the same code written with let() function:
val letResult = service.let {
    it.port = 8080
    it.query(it.prepareRequest() + " to port ${it.port}")
}
```

看源代码可以发现，run的函数中 block 类型是 T.() -> R，而不是 (T) -> R，返回是 `return block()` 而不是 `block(this)`

也就是说，它返回的不是本身，而是T.()->

这个东西的更底层ai说它其实是传入了一个this进去，只不过被省略掉了

显式传入参数则是

```Kotlin
public inline fun <T, R> T.let(block: (T) -> R): R {
    return block(this)  // 显式把 this 传进去，所以 Lambda 里只能通过 it 接收
}
```
