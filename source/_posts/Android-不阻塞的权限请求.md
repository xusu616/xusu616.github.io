---
title: Android-不阻塞的权限请求
date: 2026-08-04 23:00:00
tags:
  - Android
  - Kotlin
categories:
  - Kotlin
  - 语言特性
excerpt: 根据源码看ui层的权限请求是如何不阻塞得到的，如何与下层交互
---

# launcher 在 Composable 里声明，结果通知 ViewModel

```Kotlin
val permissionLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.RequestMultiplePermissions()
) { result ->
    viewModel.onPermissionResult(result.values.all { it })
}

```

在这里 布尔值 作为 流传给 viewmodel层的函数 onPermissionResult

由下层判断 是否得到权限，进行蓝牙扫描之类

# rememberLauncherForActivityResult 函数并不是阻塞式地传递一个真假值

```Kotlin
/**
 * Register a request to [Activity#startActivityForResult][start an activity for result], designated
 * by the given [ActivityResultContract][contract].
 *
 * This creates a record in the [ActivityResultRegistry][registry] associated with this caller,
 * managing request code, as well as conversions to/from [Intent] under the hood.
 *
 * This *must* be called unconditionally, as part of initialization path.
 *
 * You should *not* call [ActivityResultLauncher.unregister] on the returned
 * [ActivityResultLauncher]. Attempting to do so will result in an [IllegalStateException].
 *
 * @sample androidx.activity.compose.samples.RememberLauncherForActivityResult
 * @param contract the contract, specifying conversions to/from [Intent]s
 * @param onResult the callback to be called on the main thread when activity result is available
 * @return the launcher that can be used to start the activity.
 */
@Composable
public fun <I, O> rememberLauncherForActivityResult(
    contract: ActivityResultContract<I, O>,
    onResult: (O) -> Unit,
): ManagedActivityResultLauncher<I, O> {
    // Keep track of the current contract and onResult listener
    val currentContract = rememberUpdatedState(contract)
    val currentOnResult = rememberUpdatedState(onResult)

    // It doesn't really matter what the key is, just that it is unique
    // and consistent across configuration changes
    val key = rememberSaveable { UUID.randomUUID().toString() }

    val activityResultRegistry =
        checkNotNull(LocalActivityResultRegistryOwner.current) {
                "No ActivityResultRegistryOwner was provided via LocalActivityResultRegistryOwner"
            }
            .activityResultRegistry
    val realLauncher = remember { ActivityResultLauncherHolder<I>() }
    val returnedLauncher = remember { ManagedActivityResultLauncher(realLauncher, currentContract) }

    // DisposableEffect ensures that we only register once
    // and that we unregister when the composable is disposed
    DisposableEffect(activityResultRegistry, key, contract) {
        realLauncher.launcher =
            activityResultRegistry.register(key, contract) { currentOnResult.value(it) }
        onDispose { realLauncher.unregister() }
    }
    return returnedLauncher
}

```

~~源码稍微有点多emmm算了无所谓了~~

函数文档大概是这样

形参:

contract - the contract, specifying conversions to/from Intents\
onResult - the callback to be called on the main thread when activity result is available

返回:

the launcher that can be used to start the activity.

示例:

androidx.activity.compose.samples.RememberLauncherForActivityResult

# 关键的一段大概是

```Kotlin
val returnedLauncher = remember { ManagedActivityResultLauncher(realLauncher, currentContract) }

    realLauncher.launcher =
            activityResultRegistry.register(key, contract) { currentOnResult.value(it) }

```

这里的register就是在等待活动出结果（注册了一个监听器

在活动杀死，或者授权失败的时候就是假

