---
title: Kotlin 形变（协变） - 气温骤降
tags:
  - Kotlin
excerpt: >-
  协变 （variance） out 关键字 public interface StateFlow<out T> : SharedFlow<T> { /**
  * The current value of this state flow. */ public val value: T } 此函数用于读取
date: 2026-04-23 03:27:00
---

协变 （variance） out 关键字 public interface StateFlow : SharedFlow { /\*\* \* The current value of this state flow. \*/ public val value: T } 此函数用于读取
<!-- more -->
【摘要】协变 （variance） out 关键字 public interface StateFlow<out T> : SharedFlow<T> { /\*\* \* The current value of this state flow. \*/ public val value: T } 此函数用于读取 [阅读全文](https://www.cnblogs.com/xvsu/p/19914163)