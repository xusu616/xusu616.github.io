---
title: Kotlin UI层状态提升
date: 2026-08-21 20:00:00
tags:
  - Kotlin
  - Android
categories:
  - Kotlin
excerpt: 写 Switch Row 组件时纠结要不要在里面写 if 判断，结论是不要——用状态提升
---

## 问题

把 Text 和 Switch 放进 Row 时，switch 的状态怎么管理？在组件内部根据 `name` 字符串做 if 判断？

```kotlin
// 直觉上觉得这样写很蠢——确实如此
@Composable
private fun RowSwitch(name: String) {
    Row {
        Text(text = name)
        Switch(
            checked = /* if (name == "xxx") ??? */,
            onCheckedChange = { }
        )
    }
}
```

## 方案：受控组件

Switch 的 `checked` 和 `onCheckedChange` 由**上层**提供，组件只负责展示和回调

```kotlin
@Composable
private fun RowSwitch(
    name: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = name, fontWeight = FontWeight.SemiBold,
             style = MaterialTheme.typography.titleLarge)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
```

调用方管理状态：

```kotlin
RowSwitch(
    name = "蓝牙扫描",
    checked = viewModel.bleScanEnabled,
    onCheckedChange = { viewModel.toggleBleScan(it) }
)
```

## 如果需要判断类型

用 **enum** 代替魔法字符串：//其实包装到stringResource里面也是很方便管理的

```kotlin
enum class SwitchOption { BLE_SCAN, CLASSIC_SCAN, LOGGING }
```

组件接收枚举，上层做映射——组件内仍然没有业务逻辑//不太明白这个

## 总结

这就是 Compose **状态提升（State Hoisting）**：UI 组件保持无状态，数据和行为由上层注入