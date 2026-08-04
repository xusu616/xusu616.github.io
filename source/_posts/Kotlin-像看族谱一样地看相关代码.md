---
title: Kotlin-像看族谱一样地看相关代码
date: 2026-08-4 12:00:00
tags:
  - Android
  - Kotlin
categories:
  - Kotlin
excerpt: 感觉到一种方法，可以一层一层地看Kotlin，比如请求权限这个行为，可以放在主方法的地方
---

# 不能在需要的地方分开请求

请求权限这个行为看起来并不像 **UI层面** 的东西

所以我第一时间想到把它写到ui层之下

所以我创建了viewmodel软件包

准备与ui层相解耦

但是我在这里似乎无法使用 **rememberLauncherForActivityResult** 来进行请求

它提示

```Bash
 @Composable invocations can only happen from the context of a @Composable function 
```

因为很奇怪，它是一个@Composable 函数

> 之所以要写在 Composable 里，原因是注册 launcher 必须在 Activity/Fragment 生命周期内完成（Composable 入场时）

所以我尝试加入@Composable 注解

但是还是不行

```Bash
@Composable invocations can only happen from the context of a @Composable function
```

因为它根本上不是一个composable函数，不行就是不行

于是我想到在其他地方声明

但是这样显然太散乱了

所以规范的方式是去oncreate的地方请求

也可以在 Composable 函数里声明 rememberLauncherForActivityResult

# 为了规范

 rememberLauncherForActivityResult 的 remember 部分负责在 Composable 进入/退出组合树时自动注册和注销，避免手动管理

 直接 在 activitiy 当中声明变量 然后 赋值即可

 然后传入其他要调用的函数

 # 总结

 ~~说得不是很明白干脆让ai帮我说了~~

   基本正确，标准的 Android MVVM 分层是：

  UI 层        ScanScreen（只管显示和用户交互）
      ↕
  ViewModel 层  ScanViewModel（持有状态、驱动业务逻辑）
      ↕
  Data 层       BleRepository（封装蓝牙扫描的具体实现）

  ViewModel 兼任"产生和收集数据" — 你理解没错。它调用 Repository 拿数据，把结果处理成 UI 能直接用的状态暴露出去。

  ---
  权限请求那条线

  权限请求有点特殊，它不是"数据"，是系统交互，发起必须在 Activity 或 Composable 里，但结果可以由 ViewModel 处理：

  ScanScreen 里声明 launcher（rememberLauncherForActivityResult）
      ↓ 用户点按钮
  launcher.launch(...)  ← 发起，必须在 Composable/Activity
      ↓ 用户授权/拒绝
  result → viewModel.onPermissionResult(granted)  ← 结果交给 ViewModel
      ↓
  ViewModel 更新状态，决定是否开始扫描

  意思是说可以在mainActivity launch 的地方请求权限，也可以在ui层使用launch来做到

  上面的示例不是正文的，而是更合理架构的后者

  **如果是前者的话，会出现一个我们都不想要的现象就是，主函数好好的ui，甚至是调用传入了 modifier的surface的ui相关的地方 都会突然有一层不相干的权限请求**

就像这样(就比较拉)

```Kotlin

Surface(
    modifier = Modifier.fillMaxSize(),
    color = MaterialTheme.colorScheme.background 
){
    McuLinkApp(onRequestPermission = {
    val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(Manifest.permission.BLUETOOTH_SCAN,
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.BLUETOOTH_ADVERTISE
        )
    } else {
        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
    }
    permissionLauncher.launch(permissions)            
}) 
}

```
