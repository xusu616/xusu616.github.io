---
title: Android开发里常用的Kotlin 泛型 配合 高阶函数手记 - 气温骤降
tags:
  - Kotlin
  - Android
excerpt: >-
  为什么要使用这种东西 声明变量的x作用域，使其更加便于管理 比如这个，很好的例子 fun <T : View> AndroidView( factory:
  (Context) -> T, // 受影响：必须返回 T modifier: Modifier, // 不受影响：跟 T 没关系 update
date: 2026-04-08 01:58:00
---

为什么要使用这种东西 声明变量的x作用域，使其更加便于管理 比如这个，很好的例子 fun AndroidView( factory: (Context) -> T, // 受影响：必须返回 T modifier: Modifier, // 不受影响：跟 T 没关系 update
<!-- more -->
【摘要】为什么要使用这种东西 声明变量的x作用域，使其更加便于管理 比如这个，很好的例子 fun <T : View> AndroidView( factory: (Context) -> T, // 受影响：必须返回 T modifier: Modifier, // 不受影响：跟 T 没关系 update [阅读全文](https://www.cnblogs.com/xvsu/p/19833801)