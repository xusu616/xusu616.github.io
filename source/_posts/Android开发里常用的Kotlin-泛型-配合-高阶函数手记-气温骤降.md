---
title: Android开发里常用的Kotlin 泛型 配合 高阶函数手记 - 气温骤降
tags:
  - Kotlin
  - Android
date: 2026-04-08 01:58:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19833801
categories:
    - Android
    - 应用开发
---

为什么要使用这种东西 声明变量的x作用域，使其更加便于管理 比如这个，很好的例子 fun <T : View> AndroidView( factory: (Context) -> T, // 受影响：必须返回 T modifier: Modifier, // 不受影响：跟 T 没关系 update: (T) -> Unit // 受影响：必须接收 T 作为入参 ) 同样的，还有其他好处，就是比如这个写在第一排的形参 （直接把一个表达式（函数）传进去了还算形参吗？ 这样就可以不用把创建的对象直接传进去 避免在不需要的时候再次创建对象（这是昂贵的 （应该是上一级（或者更底层实现的 fun...
<!-- more -->

<h1 id="为什么要使用这种东西">为什么要使用这种东西</h1>
<p>声明变量的x作用域，使其更加便于管理<br>
比如这个，很好的例子</p>
```kotlin
fun <T : View> AndroidView(
    factory: (Context) -> T,   // 受影响：必须返回 T
    modifier: Modifier,        // 不受影响：跟 T 没关系
    update: (T) -> Unit        // 受影响：必须接收 T 作为入参
)
```
<p>同样的，还有其他好处，就是比如这个写在第一排的形参 <s>（直接把一个表达式（函数）传进去了还算形参吗？</s><br>
<sub>这样就可以不用把创建的对象直接传进去</sub><br>
避免在不需要的时候再次创建对象（这是昂贵的<br>
（应该是上一级（或者更底层实现的</p>
```koltin
fun <T : View> MyCustomAndroidView(
    factory: (Context) -> T,
```
<h1 id="它在做什么">它在做什么</h1>
<p>一样的，比如写个简单的版本</p>
```kotlin
fun <T : SU>/*可以限制*/ fixSU(
  //这里就可以把表达式传入（成为高阶
  facFun: (INPUT) -> T;
  //其他参数也可以进入它的作用域
  fucInput: (T) 
)
```
<p><s>写了一段过编译的</s></p>
```kotlin
fun main() {
    println(facUI(BigUI()))
    println(facUI(SmallUI()))
}

open class BigUI{
    open var layout = 1;
    open fun UIF (layout : Int ) : Int {
        return layout*2;
    }
}

class SmallUI : BigUI(){
    override var layout = 0;
	override fun UIF ( layout : Int ) : Int{
        return layout*2;
    }     
}

fun <T : BigUI> facUI (UI : T) :Int {
    return UI.layout;//在这里占位，等待转换，不需要在这里指定
}
```
<h5 id="嗯不知道写什么了">嗯，不知道写什么了（</h5>
