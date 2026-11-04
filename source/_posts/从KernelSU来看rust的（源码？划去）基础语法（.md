---
title: "从KernelSU来看rust的（源码？划去）基础语法（"
date: 2026-11-02 19:35:00
tags:
  - "Rust"
categories:
  - "Rust"
excerpt: "从一个枚举能看到rs的语言特性？倒是可以简单记一下"
---

# 静态匹配

> ~虽然不是很有必要讲….但是也可以解决一眼完全看不懂新语言的问题（？~

从

[https://github.com/SukiSU-Ultra/SukiSU-Ultra/blob/fd2a85151c8312fd9b4237db9ba827dcea692228/userspace/ksud/src/feature\_id.rs#L74](https://github.com/SukiSU-Ultra/SukiSU-Ultra/blob/fd2a85151c8312fd9b4237db9ba827dcea692228/userspace/ksud/src/feature_id.rs#L74)

可以看出来

这里配置了一个类似于映射的东西，给一个数字就会吐出一个枚举类型，感觉是没有必要的

```rust
pub fn parse_feature_id(name: &str) -> Result<FeatureId> {
    match name {
        "su_compat" | "0" => Ok(FeatureId::SuCompat),
        "kernel_umount" | "1" => Ok(FeatureId::KernelUmount),
        "sulog" | "2" => Ok(FeatureId::Sulog),
        "adb_root" | "3" => Ok(FeatureId::AdbRoot),
        "selinux_hide" | "4" => Ok(FeatureId::SelinuxHide),
        "shell_su_adb_only" | "6" => Ok(FeatureId::ShellSuAdbOnly),
        _ => bail!("Unknown feature: {name}"),
    }
}
```

因为在rust当中的枚举不是弱类型枚举，而是强类型枚举

> 怎么说呢

## 在 C 语言里，枚举就是个整数 int

```plaintext

enum FeatureId { SuCompat = 0, KernelUmount = 1 };

// C 语言里你可以随便把任意整数直接赋给枚举，编译器没意见
//在kotlin之类的语言里面是这么处理的：它会在写了有问题的东西的时候温柔地提醒你
enum FeatureId f = 999; // 甚至能编译通过

```

## Rust 里的qiang枚举

在 Rust 里，FeatureId 即便代码里标注了 #\[repr(u32)\] 编译器也不允许直接混用

例如 `let f: FeatureId = 0;` 会报错

### 你可能会注意到

等等，阻止999的赋值我能理解，但是为什么要阻止直接使用赋枚举值的办法来创建一个变量？

因为rust在编译期不能确认是否这个传递的值/可能是变量 是什么

就是是静态数字，但是这样做也不好，因为会产生魔数
