---
title: kotlin-不是是什么就传递什么，而是传递回调
date: 2026-08-25 12:14:00
tags:
  - Android
  - kotlin
categories:
  - kotlin
  - Android架构
excerpt: 传递的形参不应该强行修改之后再传回去，没必要使用可变对象之类的东西 ~~可是我不熟悉回调到处传的模式~~
---

# 想要像某些其他语言一样直接传递值
>在这里的例子就是
想要接收一个`ImageBitmap`类型的值，但是
直接去修改会出现`val can't be modified`

例如这里，我想要把图片背景部分的代码拆出主界面

我通过粗暴地改写原有的逻辑，给函数加上返回值类型和形参

看起来`十分的新鲜，十分的美味`

但是却报错了
```kotlin

@Composable
fun getWallPaperPicker(imageBit : ImageBitmap): ManagedActivityResultLauncher<String, Uri?>{

    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val wallpaperPicker = rememberLauncherForActivityResult(
    ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val savedPath = saveWallpaperToLocal(context, uri)
                if (savedPath != null) {
                    imageBit = BitmapFactory.decodeFile(savedPath)?.asImageBitmap()
                } else {
                    Toast.makeText(context, "Failed to import wallpaper", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    return wallpaperPicker;
}
```

`'val' cannot be reassigned.`出现了

我突然就想到C语言当中的指针（？

或者数组，真实行为是直接传递副本

但是这里并不是C语言，那么在kotlin里面有什么可以持久化传递呢？

我想到了对象，对象是持久化的，但是这需要改变变量本身

于是我想到了，可以再给它赋值一次再return就好了

如下

```kotlin
@Composable
fun getWallPaperPicker(imageBit : ImageBitmap): ManagedActivityResultLauncher<String, Uri?>{

    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val wallpaperPicker = rememberLauncherForActivityResult(
    ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        var returnImageLauncher: ImageBitmap? = imageBit 
        if (uri != null) {
            scope.launch {
                val savedPath = saveWallpaperToLocal(context, uri)
                if (savedPath != null) {
                    returnImageLauncher = BitmapFactory.decodeFile(savedPath)?.asImageBitmap()
                } else {
                    Toast.makeText(context, "Failed to import wallpaper", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    return returnImageLauncher;
}

//调用处：

    val wallpaperPicker = wallpaperBitmap?.let { getWallPaperPicker(imageBit = it) }



            MainHeroImage(
                wallpaperBitmap = wallpaperBitmap,
                modifier = Modifier
                    .weight(0.7f)
                    .fillMaxWidth()
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onLongPress = { wallpaperPicker?.launch("image/*") }
                        )
                    }
            )
```

## 但是ai看见我写的构思给我骂了一顿（不是
>这样写不行，有两个问题：                                                 
wallpaperBitmap 可能是 null，?.let 会导致 picker 也变成 null，长按就没反应

而且返回错误并且超出作用域了

```kotlin
@Composable
fun getWallPaperPicker(imageBit : ImageBitmap): ManagedActivityResultLauncher<String, Uri?>{

    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var returnImageLauncher: ImageBitmap? = imageBit
    val wallpaperPicker = rememberLauncherForActivityResult(
    ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val savedPath = saveWallpaperToLocal(context, uri)
                if (savedPath != null) {
                    returnImageLauncher = BitmapFactory.decodeFile(savedPath)?.asImageBitmap()
                } else {
                    Toast.makeText(context, "Failed to import wallpaper", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    return wallpaperPicker;
}

```

同时这也不对

设计是错的

应该传入回调来实现

这里似乎导致了没办法更换图片背景

回调如下

```kotlin
    //var wallpaperBitmap by remember { mutableStateOf<ImageBitmap?>(null) }
    //val wallpaperPicker = wallpaperBitmap?.let { getWallPaperPicker(imageBit = it) }
    var wallpaperBitmap by remember { mutableStateOf<ImageBitmap?>(null) }
    val wallpaperPicker = rememberWallpaperPicker { wallpaperBitmap = it }

    
@Composable
fun rememberWallpaperPicker(
    onLoaded: (ImageBitmap?) -> Unit
): ManagedActivityResultLauncher<String, Uri?> {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    return rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                val savedPath = saveWallpaperToLocal(context, uri)
                val bitmap = savedPath?.let { BitmapFactory.decodeFile(it)?.asImageBitmap() }
                if (bitmap != null) onLoaded(bitmap)
                else Toast.makeText(context, "Failed to import wallpaper", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

```

因为我这里不是很熟悉回调

*所以我直接用最通俗最易懂最直白最不绕弯子的办法告诉你*

*给你拆开了揉碎了讲*

*稳稳地接住你*

*一定不让你真的怒了*

*我必须诚实地说*

# 实际上

调用处就是 调用 ` wallpaperBitmap = it` 传入了 `onLoaded: (ImageBitmap?) -> Unit` 形参

然后 出现了 onLoaded(wallpaperBitmap = it)

把它传给了它

这个lambda表达式地形参就是wallpaperBitmap，值就是 var wallpaperBitmap by remember { mutableStateOf<ImageBitmap?>(null) }

直接调用外面传进来的 { wallpaperBitmap = it }，这个 lambda 直接修改了 Compose state，触发重组，UI 就刷新了

尝试用ai描述一下：

**调用方（MainScreen）**：
```kotlin
var wallpaperBitmap by remember { mutableStateOf<ImageBitmap?>(null) }  // ① 这是状态变量
val wallpaperPicker = rememberWallpaperPicker { wallpaperBitmap = it }  // ② 传 lambda 进去
```

**被调用方（WallpaperSet）**：
```kotlin
fun rememberWallpaperPicker(
    onLoaded: (ImageBitmap?) -> Unit  // ③ 接收这个 lambda
) {
    ...
    scope.launch {
        val bitmap = ...  // ④ 加载出新图
        if (bitmap != null) onLoaded(bitmap)  // ⑤ 调用 lambda，把 bitmap 传进去
    }
}
```

**执行流程**：

1. ② 处的 `{ wallpaperBitmap = it }` 是一个 lambda，它**捕获了外层的 `wallpaperBitmap` 变量**（闭包）
2. 这个 lambda 被传给 `onLoaded` 参数
3. ⑤ 处调用 `onLoaded(bitmap)`，等价于执行 `{ wallpaperBitmap = it }(bitmap)`
4. Lambda 内的 `it` 就是传进来的 `bitmap`，`wallpaperBitmap = it` 把新图赋给了外层状态
5. 状态改变，Compose 重组，UI 显示新图
