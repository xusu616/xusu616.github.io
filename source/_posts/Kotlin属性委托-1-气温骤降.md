---
title: Kotlin属性委托 (1 - 气温骤降
tags:
  - Kotlin
  - Android
excerpt: >-
  干嘛 val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name
  = "settings") 属性对应的 get()（与 set()）会被委托给它（后面被委托的那个东西）的 getValue() 与 setVa
date: 2026-04-18 03:29:00
---

干嘛 val Context.dataStore: DataStore by preferencesDataStore(name = "settings") 属性对应的 get()（与 set()）会被委托给它（后面被委托的那个东西）的 getValue() 与 setVa
<!-- more -->
【摘要】干嘛 val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings") 属性对应的 get()（与 set()）会被委托给它（后面被委托的那个东西）的 getValue() 与 setVa [阅读全文](https://www.cnblogs.com/xvsu/p/19887264)