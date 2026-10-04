---
title: Kotlin的泛型上下界，枚举 和 字符串资源的区别 - 气温骤降
tags:
  - Kotlin
  - java
  - Android
date: 2026-04-05 11:19:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19824140
categories:
    - Kotlin
    - 语言特性
---

泛型上下界 泛型用于 让多个类（或者函数巴拉巴拉），让他们 能 拥有接受多种类型 的 某一特定类型 （虽然可以用类继承来达到这个目的，但是这样做更方便，更可读 上界： T : Animal (Kotlin) 或 T extends Animal (Java) 下界： in T (Kotlin) //似乎这个in是因为其实“文件夹里面的文件加是外面文件夹的父类？” ，这听起来很诡异。。。不管了，可以想象一棵树，往上的分支是子类，密密麻麻，作为上界 （ Java： ? super T 不可以联合使用上下界（这是不合法的，但是我觉得能限制一个范围也挺好的，不知道为甚么不允许）： 可以联合限制...
<!-- more -->

<h1 id="泛型上下界">泛型上下界</h1>
<blockquote>
<p>泛型用于 让多个类（或者函数巴拉巴拉），让他们 能 拥有接受多种类型 的 某一特定类型<br>
（虽然可以用类继承来达到这个目的，但是这样做更方便，更可读</p>
</blockquote>
<p>上界：<br>
T : Animal (Kotlin) 或 T extends Animal (Java)</p>
<p>下界：<br>
in T (Kotlin) //似乎这个in是因为其实“<strong>文件夹里面的文件加是外面文件夹的父类？</strong>” ，这听起来很诡异。。。不管了，可以<strong>想象一棵树</strong>，往上的分支是子类，密密麻麻，作为上界 （ Java： ? super T</p>
<p>不可以联合使用上下界（这是不合法的，但是我觉得能限制一个范围也挺好的，不知道为甚么不允许）：</p>
<p>可以联合限制</p>
```kotlin
fun <T> copyWhenGreater(list: List<T>, threshold: T): List<String>
```
```kotlin
fun <T> a_B(item: T) where T : A, T : B {
    item.a() // 来自 A
    item.b() // 来自 B
}
```
<p>Java</p>
```java
public <T extends A & B> void a_B(T item) {
    item.a();
    item.b();
}
```
<h1 id="枚举enum">枚举（enum</h1>
<p>枚举类可以在读取类时确认字符串没有拼写错误（<s>虽然但是这个东西不能用string.xml资源来解决吗？</s>）</p>
```kotlin
//使用这个东西的理由就应该是更加方便（汗
if (status == context.getString(R.string.status_processing))
//比如这个东西他们就觉得不方便
```
<p>查了一下，应该是属于逻辑层和UI层的使用区别之分</p>
```kotlin
enum class UserRole(val labelResId: Int) {
    ADMIN(R.string.role_admin),
    USER(R.string.role_user),
    GUEST(R.string.role_guest);
}


enum class OrderStatus {
    Processing, Shipped, Delivered
}

fun handleOrder(status: OrderStatus) {
    when (status) { // 如果少写了一个状态，IDE 会直接标红报错提示没写完
        OrderStatus.Processing -> { /* ... */ }
        OrderStatus.Shipped -> { /* ... */ }
        OrderStatus.Delivered -> { /* ... */ }
    }
}

// 在 UI 层显示时：
val displayLabel = context.getString(user.role.labelResId)
```
<p>（总之就是规范化用来限制 <s>能跑就行</s><br>
可变的话可以把枚举放在<strong>数据类里面</strong></p>
