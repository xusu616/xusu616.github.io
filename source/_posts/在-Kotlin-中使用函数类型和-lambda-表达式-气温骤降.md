---
title: 在 Kotlin 中使用函数类型和 lambda 表达式 - 气温骤降
tags:
  - Android
  - Kotlin
  - Android开发
date: 2026-03-18 16:22:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19736180
---

函数类型 不能写val functionCall = func()这回调用函数并执行得到返回值 写val functionCall = ::func lambda 点击查看语法格式 将函数作为数据类型 如果你没有指定返回值，编译器会自动默认它返回 Unit 在 Kotlin 中，每一个函数都必须返回某个东西。如果你没有指定返回值，编译器会自动默认它返回 Unit 写(): () -> /type/相当于指定函数返回值类型了 各种写法演示 fun main() { val testCallFunction = ::test testCallFunction() val...
<!-- more -->

<h1 id="函数类型">函数类型</h1>
<p>不能写val functionCall = func()这回调用函数并执行得到返回值<br>
写val functionCall = ::func</p>
<h1 id="lambda">lambda</h1>
<details>
<summary>点击查看语法格式</summary>
<p><img src="https://img2024.cnblogs.com/blog/3673875/202603/3673875-20260318202738238-1639491345.png" alt="image" loading="lazy"></p>
</details>
<h1 id="将函数作为数据类型">将函数作为数据类型</h1>
<blockquote>
<p>如果你没有指定返回值，编译器会自动默认它返回 Unit<br>
在 Kotlin 中，每一个函数都必须返回某个东西。如果你没有指定返回值，编译器会自动默认它返回 Unit<br>
写(): () -&gt; /type/相当于指定函数返回值类型了<br>
各种写法演示</p>
</blockquote>
```kotlin
fun main() {
    val testCallFunction = ::test
    testCallFunction()
    val testCallValFunction = testCallValFunction
    testCallValFunction()
    f2()
    createProcessor(name = "ProcessorA")(5)
}

fun test() : (/*这里可以指定吐出函数的形参类型，具体见下方BBB */) -> Unit {
    println("testCallFunction!")
    return { println("Returned function call!") }
}
val testCallValFunction = {
    println("val testCallVal Function !")
}

val f2: () -> Unit = fun() { println("Unnamed function call with lambda") }

//BBB: 这里可以指定吐出函数的形参类型，具体如下
// 意思是：这个函数接受一个 String，返回一个“接受 Int 并返回空”的函数
fun createProcessor(name: String): (Int) -> Unit {
    return { count -> 
        println("$name 处理了 $count 个任务") 
    }
}//我也不知道为什么要这么整个第二个括号套娃，可能是为了更复杂的函数调用吧
```
<h1 id="看个有意思的套娃">看个有意思的套娃</h1>
```kotlin
fun trickOrTreat(isTrick: Boolean, extraTreat: ((Int) -> String)?): () -> Unit {
  
}
```
<h1 id="用自然语言-人话-说">用自然语言 <sub>人话</sub> 说</h1>
<p>就是一个函数调用了一个叫isTrick的形式参数和一个函数传入<br>
这个传入的函数返回Unit <em>返回的函数不捕获参数</em><br>
传入的函数（可以为空）允许传入一个的Int，将要返回String</p>
<h1 id="作用域外不用it要指明">作用域外不用it要指明</h1>
```kotlin
fun main() {
    // 这里的 quarters -> 就是在给传入的那个 Int 起名字
    println(trickOrTreat(true) { quarters -> "$quarters quarters" }) 
    println(trickOrTreat(false) { quarters -> "$quarters quarters" })
    val quarters = 3
    println("$quarters quarters")
}

// 同样的，这里也得加上 quarters ->
val treatFunction = trickOrTreat(false) { quarters -> "$quarters candies" }

fun trickOrTreat(isTrick: Boolean, treatFunction: (quarters : Int) -> String): String {
    return if (isTrick) "Trick!" else treatFunction(2)
}
```
<p>一般写</p>
```kotlin
fun main() {
    println(trickOrTreat(true) { "$it quarters" })
    println(trickOrTreat(false) { "$it quarters" })
}

val treatFunction = trickOrTreat(false) { "$it candies" }

fun trickOrTreat(isTrick: Boolean, treatFunction: (Int) -> String): String {
    return if (isTrick) "Trick!" else treatFunction(2)
}
```
<p>比如这里的coin可以删去</p>
```kotlin
fun main() {
    val coins: (Int) -> String = {
        "$it quarters"
    }
    val treatFunction = trickOrTreat(false, { "$it quarters" })
    val trickFunction = trickOrTreat(true, null)
    treatFunction()
    trickFunction()
}
```
