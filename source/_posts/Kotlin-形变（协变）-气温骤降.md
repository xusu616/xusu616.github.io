---
title: Kotlin 形变（协变） - 气温骤降
tags:
  - Kotlin
date: 2026-04-23 03:27:00
cnblogs_url: https://www.cnblogs.com/xvsu/p/19914163
---

协变 （variance） out 关键字 public interface StateFlow<out T> : SharedFlow<T> { /** * The current value of this state flow. */ public val value: T } 此函数用于读取流的值，不需要异步地 collect 在这里用out声明后，可以向上转型 类可以默认向上转型，但是泛型不行，因为这不是继承关系，而是多个类关系 in 关键字 逆变 (Contravariance) interface Consumer<in T> { fun consume(item: T)...
<!-- more -->

<h1 id="协变-variance">协变 （variance）</h1>
<h2 id="out-关键字">out 关键字</h2>
<pre><code class="language-Kotlin">public interface StateFlow&lt;out T&gt; : SharedFlow&lt;T&gt; {
    /**
     * The current value of this state flow.
     */
    public val value: T
}
</code></pre>
<p><em>此函数用于读取流的值，不需要异步地 collect</em><br>
在这里用out声明后，可以向上转型<br>
<sub>类可以默认向上转型，但是泛型不行，因为这不是继承关系，而是多个类关系</sub></p>
<h2 id="in-关键字-逆变-contravariance">in 关键字 逆变 (Contravariance)</h2>
<pre><code class="language-Kotlin">interface Consumer&lt;in T&gt; {
    fun consume(item: T) // T 作为参数进来
}
</code></pre>
<p>没什么，父类能被处理，子类也可以<br>
（当然，类这样做是不行的，除非原本就是子类对象，但是是父类类型<br>
要解决这个问题，你可以</p>
<h3 id="1手动包装">1.手动包装</h3>
<pre><code class="language-Kotlin">val father = father()
val me = me (father.personality,age = 0 )
</code></pre>
<h3 id="2猫王操作符--ass">2.猫王操作符 + ass</h3>
<pre><code class="language-Kotlin">val dog = animal as? Dog ?: Dog(animal.name, 0) //(转型失败会返回一个新的，或者手动指定一个新的
</code></pre>
