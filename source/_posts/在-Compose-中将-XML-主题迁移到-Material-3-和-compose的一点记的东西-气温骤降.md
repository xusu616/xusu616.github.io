---
title: 在 Compose 中将 XML 主题迁移到 Material 3 和 compose的一点记的东西 - 气温骤降
tags:
  - Android
  - Kotlin
  - Android开发
date: 2026-03-19 16:43:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19741243
categories:
    - Android
    - 应用开发
---

查看原有的xml 根据xml原有的信息确定形状大小等等 字符串等资源可按原样重复使用，无需迁移 迁移配色（例） <shape android:shape="rectangle"> <corners android:radius="16dp" /> </shape> import androidx.compose.foundation.shape.RoundedCornerShape import androidx.compose.material3.Shapes import androidx.compose.ui.unit.dp val AppShapes = Shapes( //...
<!-- more -->

<p>查看原有的xml<br>
根据xml原有的信息确定形状大小等等<br>
字符串等资源可按原样重复使用，无需迁移</p>
<h1 id="迁移配色例">迁移配色（例）</h1>
<h1 id="_"></h1>
```xml
<shape android:shape="rectangle">
    <corners android:radius="16dp" />
</shape>
```
```kotlin
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val AppShapes = Shapes(
    // Material 3 将形状分为 5 个档位，可以根据组件大小选择
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp), 
    large = RoundedCornerShape(16.dp),  // 对应 XML 中的 16dp
    extraLarge = RoundedCornerShape(28.dp)
)
```
<p>//挡位让各个不同地方的圆角大小不同，好看。。<br>
这一段写在theme.kt里面<br>
<s>emmm，官方也只说了这一点，我也只能想到补充这一点</s></p>
<p><s>那就把compose的一部分东西写这里好了</s></p>
```kotlin
@Composable
fun GreetingImage(
   message: String, 
   from: String, 
   modifier: Modifier = Modifier // = 代表可选项
)
```
<p>当没有传入（没有写）会采用默认选项（默认值）<br>
Box之类的有类似的行为<br>
比如写Box写空的，甚至误写成Modifier或者modifier = Modifier<br>
会自动生成一个空的对象<br>
然后就会警告（）形参“modifier” 从未使用</p>
