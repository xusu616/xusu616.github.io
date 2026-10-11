---
title: Kotlin-在viewmodel当中采用 注册 或者 订阅 的方式读取值
date: 2026-08-27 16:00:00
tags:
  - Kotlin
  - Android
categories:
  - Kotlin
  - Android开发
excerpt: 快照读一次，订阅持续监听，跨页面同步 使用 同一个 ViewModel 实例
---

# 首先我觉得这一段看起来很复杂的可以理一下

就是那段

```kotlin
    val testStateBatPressDown by (uiPreferencesViewModel?.topComponentPressedDown ?: flowOf(
        UiPreferences.getTopComponentPressedDown(prefs)
    )).collectAsState(UiPreferences.getTopComponentPressedDown(prefs))
```

这里的意思就是

emmm，先看collectAsState作用于什么

这里就是
```kotlin
(uiPreferencesViewModel?.topComponentPressedDown ?: flowOf(
        UiPreferences.getTopComponentPressedDown(prefs)
    ))
```

*这里 uiPreferencesViewModel` 是接收的形参，所以说，是小写开头*

对它取了 topComponentPressedDown 的流，然后使用猫王运算符，如果没渠道就取 prefs存着的 `UiPreferences.getTopComponentPressedDown`

这里flow函数的定义是

```kotlin
public fun <T> flowOf(
    value: T
): Flow<T>
```

就是把这个存入的值转换为固定值的流类型

然后这一坨就能保证有值了

然后对它 `.collectAsState(UiPreferences.getTopComponentPressedDown(prefs)`，就能在流上取到值(这里括号里面的东西是由initial形参接收的，就是没有在流上取到值得时候的值（从持久化的prefs当中取出，相当于初始化~~（形如其名）~~）)

最后它们被包裹在 by 内部 

~~这里可以说我之前那片博客写错了，实际上上面那一篇博客是讲类委托的，但是我把它的名字说成属性委托了~~

这里再简单讲讲属性委托

```kotlin
  val checked by flow.collectAsState(false)
  //编译器展开后相当于：                     
  val _state = flow.collectAsState(false)
  val checked get() = _state.getValue(this, ::checked)  // 即 _state.value
```

首先要知道，val 的"只读"指的是这个引用本身不能重新指向别的对象，不是说引用指向的对象内部不能变

uiPreferencesViewModel?.setTopComponentPressedDown(it) 改的是 ViewModel 里的StateFlow，是真实的

stateBarPressDown = it 改的是 MutableState 里的值，是临时的，让按钮可以动

回到前面

也就是说这里修改了testStateBatPressDown的getter方法，然后给了按钮checked = stateBarPressDown，它本质上是一个空壳，并不代表点击按钮的真正逻辑

真正逻辑应该是

```kotlin

    SwitchPrefRow(
        title = "Weather Top Component Pressed Down",
        description = "Look bigger?",
        checked = testStateBarPressDown,
        onCheckedChange = {
            uiPreferencesViewModel?.setTopComponentPressedDown(it)
        }
    )
```


# 从 ViewModel 读值，有两种写法，效果看起来差不多，但原理不同

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

