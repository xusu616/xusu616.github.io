---
title: Kotlin-在viewmodel当中采用 注册 或者 订阅 的方式读取值
date: 2026-08-27 16:00:00
tags:
  - Kotlin
  - Android
categories:
  - Kotlin
excerpt: 快照读一次，订阅持续监听，跨页面同步 使用 同一个 ViewModel 实例
---

在 Compose 里从 ViewModel 读值，有两种写法，效果看起来差不多，但原理完全不同

## 快照

```kotlin
var checked by remember {
    mutableStateOf(viewModel?.getValue() ?: fallback)
}
```

>但是这样写并不能实现持久化
所以我们其实可以采用一种混合写法


```kotlin
    var stateBarPressDown by remember { mutableStateOf(uiPreferencesViewModel?.getTopComponentPressedDown() ?: UiPreferences.getTopComponentPressedDown(prefs)) }
//....
    SwitchPrefRow(
        title = "Weather Top Component Pressed Down",
        description = "Look bigger?",
        checked = stateBarPressDown,
        onCheckedChange = {
            stateBarPressDown = it               // 手动推，Settings 页开关能动
            uiPreferencesViewModel?.setTopComponentPressedDown(it)  // 触发 StateFlow
        }
    )

//在viewmodel当中需要写方法
//class......
    fun getTopComponentPressedDown(): Boolean {
        return UiPreferences.getTopComponentPressedDown(barDownPrefs)
    }

```

如果不这样，`remember` 块只在第一次组合时跑一次`getValue()` 是个普通函数调用，拿到值就结束了之后 ViewModel 里的数据怎么变，这个 `checked` 都不知道

适合状态只属于当前页面、不需要跨页面同步的情况改了写 prefs，下次进来重新读

例如[我的项目新写的部分](https://github.com/rD227/shizuku-ftp/blob/420cd854bab072f3d47cfc9f82aff0536c4c9879/primitiveFTPd/src/org/primftpd/ui/SettingsScreen.kt)，设置的switch是在另外的界面，而受到影响的是其他界面

~~（文件很长的原因是分散了很多小的屏幕在里面，可以把它们分散开但是我不知道有没有必要）~~

```kotlin
onCheckedChange = {
    checked = it               // 本地状态更新，开关能动
    viewModel?.setFoo(it)      // 同时推给 ViewModel（通知其他页面）
}
```

本地 `remember` 和 ViewModel 各司其职，这种写法没问题

## 订阅（持续监听）

```kotlin
val checked by (viewModel?.fooFlow ?: flowOf(fallback))
    .collectAsState(fallback)
```

例如

```kotlin
    val stateBatPressDown by (uiPreferencesViewModel?.topComponentPressedDown ?: flowOf(
        UiPreferences.getTopComponentPressedDown(prefs)
    )).collectAsState(UiPreferences.getTopComponentPressedDown(prefs))
```

`collectAsState` 订阅这个 Flow，每次 Flow 发出新值，Compose 自动重组，`checked` 跟着变不需要在 `onCheckedChange` 里手动更新本地状态

```kotlin
onCheckedChange = {
    viewModel?.setFoo(it) // 只改 ViewModel，UI 自动跟上
}
```

## 跨页面同步

两个页面拿到的要是同一个 ViewModel 实例

例如 Activity 级别创建，再往下传参数：

```kotlin
// MainTabsActivity.kt
private val uiPreferencesViewModel: UiPreferencesViewModel by viewModels()

composable("main") {
    MainScreen(uiPreferencesViewModel = uiPreferencesViewModel)
}
composable("settings/{section}") {
    SettingsScreen(uiPreferencesViewModel = uiPreferencesViewModel)
}
```

同一个实例，Settings 页调 `setFoo()`，MainScreen 里的 `collectAsState` 就能收到
