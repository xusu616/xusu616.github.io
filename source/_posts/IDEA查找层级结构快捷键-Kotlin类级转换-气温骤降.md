---
title: IDEA查找层级结构快捷键 | Kotlin类级转换 - 气温骤降
tags:
  - Kotlin
  - Android
date: 2026-04-06 03:38:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19825793
categories:
    - Kotlin
---

IDEA查找层级结构 将光标指向类，按住ctrl + H，即可查找父类 因为 IDEA 并不会扫描所有文件，外部文件不会扫描，只会扫描项目文件，所以看不到usage，按住 按住alt + F7也不好使 按住 alt + F7 可以查找子类 | 用法 按住 ctrl + Q 可以查找快速文档（介绍 kotlin 类级转换 val fragmentManager = (context as? FragmentActivity)?.supportFragmentManager 使用as?转换（接受子类），无法转换kotlin会自动换为Null，后续再用?.安全调用 （向上转型 （向下转型是自动的
<!-- more -->

<h1 id="idea查找层级结构">IDEA查找层级结构</h1>
<p>将光标指向类，按住ctrl + H，即可查找父类</p>
<p>因为 IDEA 并不会扫描所有文件，外部文件不会扫描，只会扫描项目文件，所以看不到usage，按住<br>
按住alt + F7也不好使</p>
<p>按住 alt + F7 可以查找子类 | 用法<br>
按住 ctrl + Q 可以查找快速文档（介绍</p>
<h1 id="kotlin-类级转换">kotlin 类级转换</h1>
```kotlin
val fragmentManager = (context as? FragmentActivity)?.supportFragmentManager
```
<p>使用as?转换（接受子类），无法转换kotlin会自动换为Null，后续再用?.安全调用<br>
（向上转型<br>
（向下转型是自动的</p>
