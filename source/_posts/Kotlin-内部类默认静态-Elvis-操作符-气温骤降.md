---
title: Kotlin 内部类默认静态  Elvis 操作符 - 气温骤降
tags:
  - Kotlin
  - Android
date: 2026-04-21 16:29:00
cnblogs_url: https://www.cnblogs.com/xvsu/p/19904407
---

Kotlin 内部类 默认静态内部类 在 Kotlin 中，你直接在一个类里写另一个类，它默认就是静态的。 它不持有外部类的引用 调用方便： * 外部调用： Outer.Inner()。直接 new（当然kotlin没有这个关键字），不需要先创建外部类对象 它拿不到外部类的 this（实例变量），只能访问外部类的静态成员（companion object 里的东西） 不完全是静态的，加了@JvmStatic才会生成一样的静态的字节码 而且都这样了，为什么不直接写外面，非要写个内部类 非静态内部类 (需加 inner 关键字) 它会持有一个指向外部类的引用（this@Outer）...
<!-- more -->

<h1 id="kotlin-内部类">Kotlin 内部类</h1>
<h2 id="默认静态内部类">默认静态内部类</h2>
<p>在 Kotlin 中，你直接在一个类里写另一个类，它默认就是静态的。<br>
它不持有外部类的引用</p>
<p>调用方便： * 外部调用： Outer.Inner()。直接 new（当然kotlin没有这个关键字），不需要先创建外部类对象</p>
<p><strong>它拿不到外部类的 this（实例变量），只能访问外部类的静态成员（companion object 里的东西）</strong></p>
<p><s>不完全是静态的，加了@JvmStatic才会生成一样的静态的字节码</s></p>
<p><s>而且都这样了，为什么不直接写外面，非要写个内部类</s></p>
<h2 id="非静态内部类-需加-inner-关键字">非静态内部类 (需加 inner 关键字)</h2>
<p>它会持有一个指向外部类的引用（this@Outer）</p>
<p><em>如果内部类在跑耗时任务，外部 Activity 关了也跑不掉，内存直接炸</em></p>
<p>特权： 它可以随意访问外部类的所有私有变量。</p>
<p>调用麻烦</p>
<pre><code class="language-Kotlin">val o = Outer()
o.Inner()
</code></pre>
<p>实际上，这种拓展功能的东西，应该用接口写</p>
<h1 id="elvis-操作符-">Elvis 操作符 (?:&nbsp;)</h1>
<p><sub>这个操作符的名字来源于它的形状像猫王</sub> ~(Elvis Presley~ <s>听起来像榴莲</s> <sub>的侧脸发型</sub></p>
<h2 id="用法">用法</h2>
<p>Kotlin<br>
val result = 可能为空的变量 ?: 默认值</p>
<p>val result = A ?: B。如果 A 不为 null，则 result = A；如果 A 为 null，则 result = B。</p>
<p><sub>如果左边不是null返回左边</sub></p>
<p><sub>如果左边是null返回右边</sub></p>
<p>配合返回/抛错： ```kotlin<br>
val name = user.name ?: return false // 如果没名字就直接退出方法<br>
val id = user.id ?: throw IllegalArgumentException("Missing ID") // 没 ID 就报错</p>
