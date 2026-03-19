---
title: 重构Java项目到Kotlin遇到的问题 - 气温骤降
tags:
  - Kotlin
  - Android
excerpt: >-
  防止我忘了吧~ 1.错误: 无法从最终MainTabsActivity进行继承
  因为Java是默认可以继承的，而Kotlin不行，所以Kotlin要加open 也可以说Java的类默认open，Kotlin默认final 2.错误:
  方法不会覆盖或实现超类型的方法 某些方法不正常，需要open，重写
date: 2026-03-19 02:39:00
---

防止我忘了吧~ 1.错误: 无法从最终MainTabsActivity进行继承 因为Java是默认可以继承的，而Kotlin不行，所以Kotlin要加open 也可以说Java的类默认open，Kotlin默认final 2.错误: 方法不会覆盖或实现超类型的方法 某些方法不正常，需要open，重写
<!-- more -->
【摘要】 [阅读全文](https://www.cnblogs.com/xvsu/p/19737643)