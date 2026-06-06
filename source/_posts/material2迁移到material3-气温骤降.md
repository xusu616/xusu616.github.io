---
title: material2迁移到material3 - 气温骤降
tags:
  - Android
  - Kotlin
  - Android开发
date: 2026-03-19 15:47:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19741168
---

区别 区别就是m3比m2好看（不是 官网扒出来的对迁移有阻碍的API 缺少的 API： M2 M3 androidx.compose.material.swipeable 目前无法添加文件 已替换的 API： M2 M3 androidx.compose.material.BackdropScaffold 无 M3 等效项，请改用 Scaffold 或 BottomSheetScaffold androidx.compose.material.BottomDrawer 无 M3 等效项，请改用 ModalBottomSheet 重命名的 API： M2 M3...
<!-- more -->

<h1 id="区别">区别</h1>
<blockquote>
<p>区别就是m3比m2好看（不是</p>
</blockquote>
<p><img src="https://img2024.cnblogs.com/blog/3673875/202603/3673875-20260319205354656-856391327.png" alt="image" loading="lazy"></p>
<h1 id="官网扒出来的对迁移有阻碍的api">官网扒出来的对迁移有阻碍的API</h1>
<p>缺少的 API：</p>
<p>M2	M3<br>
androidx.compose.material.swipeable	目前无法添加文件<br>
已替换的 API：</p>
<table>
<thead>
<tr>
<th>M2</th>
<th>M3</th>
</tr>
</thead>
<tbody>
<tr>
<td>androidx.compose.material.BackdropScaffold</td>
<td>无 M3 等效项，请改用 Scaffold 或 BottomSheetScaffold</td>
</tr>
<tr>
<td>androidx.compose.material.BottomDrawer</td>
<td>无 M3 等效项，请改用 ModalBottomSheet</td>
</tr>
</tbody>
</table>
<p>重命名的 API：</p>
<table>
<thead>
<tr>
<th>M2</th>
<th>M3</th>
</tr>
</thead>
<tbody>
<tr>
<td>androidx.compose.material.BottomNavigation</td>
<td>androidx.compose.material3.NavigationBar</td>
</tr>
<tr>
<td>androidx.compose.material.BottomNavigationItem</td>
<td>androidx.compose.material3.NavigationBarItem</td>
</tr>
<tr>
<td>androidx.compose.material.Chip</td>
<td>androidx.compose.material3.AssistChip 或 androidx.compose.material3.SuggestionChip</td>
</tr>
<tr>
<td>androidx.compose.material.ModalBottomSheetLayout</td>
<td>androidx.compose.material3.ModalBottomSheet</td>
</tr>
<tr>
<td>androidx.compose.material.ModalDrawer</td>
<td>androidx.compose.material3.ModalNavigationDrawer</td>
</tr>
</tbody>
</table>
<h1 id="具体流程和操作">具体流程和操作</h1>
<blockquote>
<p>添加 M3 依赖项和 M2 依赖项。<br>
添加 M3 版应用主题和 M2 版应用主题。<br>
将各个模块、屏幕或可组合项迁移至 M3，具体取决于应用的大小和复杂程度（如需了解详情，请参阅下文）。<br>
完全迁移后，请移除 M2 版应用主题。<br>
移除 M2 依赖项。<br>
PS：主 M2 和 M3 库以外的其他 Material 依赖项未发生更改。它们结合使用 M2 和 M3 软件包及版本，但这对迁移没有任何影响。它们可以按原样与 M3 配合使用：<br>
库	软件包和版本<br>
Compose Material 图标	androidx.compose.material:material-icons-*:$m2-version<br>
Compose Material Ripple  构成材料涟漪	androidx.compose.material:material-ripple:$m2-version</p>
</blockquote>
<h2 id="更换依赖">更换依赖</h2>
<p>implementation "androidx.compose.material:material:$m2-version"<br>
-&gt;<br>
implementation "androidx.compose.material3:material3:$m3-version"</p>
<h2 id="更换颜色">更换颜色</h2>
```kotlin
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
```
<p>调用这两个方法lightColorScheme( darkColorScheme(<br>
可以这样把变量写外面</p>
```kotlin
val AppLightColorScheme = lightColorScheme(
    // M3 light Color parameters
)
val AppDarkColorScheme = darkColorScheme(
    // M3 dark Color parameters
)
val AppColorScheme = if (darkTheme) {
    AppDarkColorScheme
} else {
    AppLightColorScheme
}
```
<h2 id="注意要更换导航栏sidemenu也需要修改">注意要更换导航栏，sideMenu也需要修改</h2>
<blockquote>
<p>M2 Scaffold 中的所有 drawer* 参数都已从 M3 Scaffold 中移除。其中包括 drawerShape 和 drawerContent 等参数。如需使用 M3 Scaffold 显示抽屉式导航栏，请改用抽屉式导航栏可组合项（如 ModalNavigationDrawer）</p>
</blockquote>
