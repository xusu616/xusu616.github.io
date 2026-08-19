---
title: Kotlin属性委托 (1 - 气温骤降
tags:
  - Kotlin
  - Android
date: 2026-04-18 03:29:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19887264
categories:
    - Kotlin
---

干嘛 val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings") 属性对应的 get()（与 set()）会被委托给它（后面被委托的那个东西）的 getValue() 与 setValue() 方法 警告 Kotlin 不允许在局部作用域定义这种扩展属性委托，也就是说 （拓展属性必须定义在这些地方，它可以拓展 量 的属性） 因为 写 val Context.dataStore 时，Kotlin 编译器在底层其实生成了一个类似 public static...
<!-- more -->

<h1 id="干嘛">干嘛</h1>
```kotlin
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")
```
<p>属性对应的 get()（与 set()）会被委托给它（后面被委托的那个东西）的 getValue() 与 setValue() 方法</p>
<h2 id="警告">警告</h2>
<p>Kotlin 不允许在局部作用域定义这种扩展属性委托，也就是说<br>
（拓展属性必须定义在这些地方，它可以拓展 量 的属性）</p>
<h2 id="因为">因为</h2>
<p>写 val Context.dataStore 时，Kotlin 编译器在底层其实生成了一个类似 public static getDataStore(Context receiver) 的方法<br>
而局部作用域是不能声明这种静态的东西，因为它归属于类，走出类这个东西就没用了，但是又拓展了这个属性，所以<strong>卡了</strong></p>
<p>val Context.dataStore by preferencesDataStore(...) 必须放在 顶层（Top-level），即 class 或者 fun 的外面。</p>
<p>否则会无法识别，会报告缺少getValue之类的</p>
<p>而且写在函数内部会导致定义在函数内部（局部作用域），那么每次函数运行都会尝试创建一个新的 DataStore 实例<br>
无论如何，这听起来就很坏</p>
<h1 id="用处">用处：</h1>
<h2 id="1像上面一样拓展属性">1.像上面一样，拓展属性</h2>
<h2 id="2委托属性其实还是一个意思">2.委托属性（<s>其实还是一个意思</s>）</h2>
<h2 id="3懒惰延迟属性">3.懒惰（延迟）属性</h2>
```kotlin
val lazyValue: String/*缓存属性*/ by lazy {
    println("computed!")/*初始化方法*/
    "Hello"
}

fun main() {
    println(lazyValue)//输出 computed Hello
    println(lazyValue)//输出 Hello
}
```
<h1 id="可观察属性-observable-properties">可观察属性 Observable properties</h1>
<p>看一下这一段就懂了</p>
```kotlin
import kotlin.properties.Delegates

var name: String by Delegates.observable("初始值") { property, oldValue, newValue ->
    println("${property.name} 从 '$oldValue' 变成了 '$newValue'")
}

fun main() {
    name = "Alice"  // 输出: name 从 '初始值' 变成了 'Alice'
    name = "Bob"    // 输出: name 从 'Alice' 变成了 'Bob'
}
```
