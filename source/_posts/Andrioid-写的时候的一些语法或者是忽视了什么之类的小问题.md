---
title: Andrioid-写的时候的一些语法或者是忽视了什么之类的小问题
date: 2026-08-19 12:00:00
tags:
  - Android
  - Kotlin
categories:
  - Android
excerpt: 随便记一点东西在这里, 两个问题，没考虑preview，隐式少传了参数
---

# 默认值导致不带真实生命周期的@Preview主题失效

```Kotlin
                                         
@Composable                                                                                                                              
fun ShizukuFtpTheme(                                                                                                                     
-    darkTheme: Boolean = if (LocalInspectionMode.current) false else isSystemInDarkTheme(),                                              
+    darkTheme: Boolean = isSystemInDarkTheme(),                                                                                          
    dynamicColor: Boolean = true,                                                                                                        
    content: @Composable () -> Unit                                                                                                      
) {                                                                                                                                      
    val colorScheme = when {                                                                                                             
-        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {                                                              
+        dynamicColor && !LocalInspectionMode.current && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {                              
            val context = LocalContext.current                                                                                           
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)                                         
        }                                                                                          
```

**Theme 直接硬编码返回 false（即强制浅色模式），忽略了 uiMode =           Configuration.UI_MODE_NIGHT_YES 的设置**

# MaterialTheme 本身不会绘制背景色

 ```Kotlin
 @Composable
fun ShizukuFtpTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && !LocalInspectionMode.current && Build.VERSION.SDK_INT >= 31 -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> darkColorScheme()
        else -> lightColorScheme()
    }
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
 ```

 比如这里就有问题

 应该把可指定背景的composable函数传入这里的composable形参当中

 因为这里的 MaterialTheme 不接受background参数（我猜是为了分工明确

 所以你可以这样写

 ```Kotlin
     MaterialTheme(
        colorScheme = colorScheme,
    ) {
        Surface(content = content)
    }
 ```

 Surface 的 函数声明大概长这样

 ```Kotlin
 @Composable
@NonRestartableComposable
fun Surface(
    modifier: Modifier = Modifier,
    shape: Shape = RectangleShape,
    color: Color = MaterialTheme.colorScheme.surface,
    contentColor: Color = contentColorFor(color),
    tonalElevation: Dp = 0.dp,
    shadowElevation: Dp = 0.dp,
    border: BorderStroke? = null,
    content: @Composable () -> Unit,
)
 ```

 这里可以看到，它接受一个color参数，默认为 MaterialTheme.colorScheme.surface

 ~~它的描述意思就相当于是黑天黑的白天白的~~

 ```Discrable
 The surface color that affect surfaces of components, such as cards, sheets, and menus.
 ```

或者说，其实也不一定要这样写，可用box传入颜色也行，给组件的modifer传入background即可

```Kotlin
  MaterialTheme(colorScheme = colorScheme) {                                                                                                        
      Box(        
          modifier = Modifier     
              .fillMaxSize()
              .background(colorScheme.background)          
      ) {            
          content()                          
      }                                          
  }  
```
