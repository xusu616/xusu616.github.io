---
title: Android-ui从组合到布局测量最后绘制是什么
date: 2026-08-09 12:00:00
tags:
  - Android
  - Kotlin
categories:
  - Android
  - Kotlin
excerpt: ui有三大过程.....分别是组合(Composable)....布局(Layout)....绘制(Draw)...因为组合需要让ui更新界面树，所以，滿足组合的行為，在這三者之中，優先是第一位的.....如果能在组合的過程中，产生了美味的测量，也能使人類無比愉快。而在現實生活中，存在著這種對快感執著追求的人，我們通常把這種人稱之為安卓人，而本餐廳則專門為那些厭倦世間常見xml-layout的人，量體裁衣，提供符合他們身份的文章。
---

# 初始的组合代码中没有测量长度

这里的长度是指组件之类的东西本身长度的测量

它可能知道自己在什么地方，但是不知道自己的尺寸大小

比如说可以规定它的距离底部的padding(bottom = xx.dp)

但是此时使用size之类的东西尝试得到组件尺寸是不允许的哦

比如这里

```Kotlin
fun Modifier.sweepEffect(active: Boolean) : Modifier {
    if (!active ) return this
    return composed {
        val infiniteTransition = rememberInfiniteTransition(label = "sweep_effect")
        val sweepLight by infiniteTransition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                tween(1000,
                    easing = EaseInOut
                ),
                RepeatMode.Reverse
            ),
            label = "sweep_light"
        )

        val primaryColor = Color.White
        val neutralColor = MaterialTheme.colorScheme.primaryContainer
        this.drawWithContent {
            drawContent()
            val bandWidth = size.width * 0.3f
            val centerX = (size.width - bandWidth) * sweepLight + bandWidth / 2
            drawRect(
                brush = Brush.linearGradient(
                    colors=listOf(Color.Transparent,neutralColor,primaryColor,neutralColor, Color.Transparent),
                    start = Offset(centerX - bandWidth , 0f),
                    end = Offset(centerX + bandWidth , 0f),
                    tileMode = TileMode.Clamp
                ),
                alpha = 0.2f
            )
        }
    }
}
```

假如写到前面

```Kotlin
        val primaryColor = Color.White
        val neutralColor = MaterialTheme.colorScheme.primaryContainer
        val bandWidth = size.width * 0.3f
        val centerX = (size.width - bandWidth) * sweepLight + bandWidth / 2

```

就会报错

Function invocation 'size(...)' expected.

这是另外一个东西，别管

同样是composable的东西，用于指定，而不是测量

# 绘制阶段尝试访问composable相关函数

```Kotlin
drawRect(
brush = Brush.linearGradient(),
colors=listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.primaryContainer),
)
```

此时的编译器终于脑子聪明了一点，提醒你阶段有问题

```Bash
@Composable invocations can only happen from the context of a @Composable function
```

此时把 MaterialTheme.colorScheme.primary之类的东西移动到组合的地方先赋值即可

```Kotlin
        val primaryColor = Color.White
        val neutralColor = MaterialTheme.colorScheme.primaryContainer
        this.drawWithContent {
            drawContent()
            val bandWidth = size.width * 0.3f
            val centerX = (size.width - bandWidth) * sweepLight + bandWidth / 2
            drawRect(
                brush = Brush.linearGradient(
                    colors=listOf(Color.Transparent,neutralColor,primaryColo
```

emmmm

暂时没有其他例子了