---
title: Kotlin-尾随lambda语法和自动重载让编译器的形参报错相当蠢
date: 2026-08-10 12:00:00
tags:
  - Android
  - Kotlin
categories:
  - Kotlin
  - 语言特性
excerpt: 乱搓的函数匹配全部报告一遍就离谱，不知道怎么说了
---

# 自动重载而且全部尝试匹配并且报告一遍错误导致形参报错有误

~~或者说这个报错就不是给人看的~~

```Kotlin
Column(Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    )
                }
```

```Bash
None of the following candidates is applicable:

fun Box(modifier: Modifier = ..., contentAlignment: Alignment = ..., propagateMinConstraints: Boolean = ..., content: ComposableFunction1<BoxScope, Unit>): Unit:
No value passed for parameter 'content'.

fun Box(modifier: Modifier): Unit:
No parameter with name 'contentAlignment' found.
```

这里有两个报错，但是很明显不是contentAlignment的问题

实际上是content形参缺失的问题

这个content形参是什么呢

实际上它就是 {} 内的东西，但是因为这里没有打大括号所以产生了这个错误

这个就是Kotlin当中的尾随 lambda 语法

默认把跟着的代码块作为形参里面的最后一个参数，而且是接受函数类型的参数

# 为什么有这些奇奇怪怪的报错

因为它会报告所有 自动重载的匹配的 缺失的形参

第一步：尝试匹配有 content 参数的那个 Box

```kotlin
fun Box(
    modifier: Modifier = ...,
    contentAlignment: Alignment = ...,
    propagateMinConstraints: Boolean = ...,
    content: @Composable BoxScope.() -> Unit
)
```

传了 modifier 

传了 contentAlignment

没传 content  → 缺少必传参数

所以编译器记录第一条错误：

No value passed for parameter 'content'.

第二步：因为第一步匹配失败，编译器继续看其他重载，试图帮你找到可能写错的原因。
它发现了另一个只有 modifier 参数的简化版 Box：

```kotlin
fun Box(modifier: Modifier = Modifier)
```

它有一个参数叫 modifier

尝试传了 contentAlignment = ...，但这个函数根本没有叫 contentAlignment 的参数

于是编译器记录第二条错误：

No parameter with name 'contentAlignment' found.

