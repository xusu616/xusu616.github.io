---
title: STM32-定时器从模式
date: 2026-08-16 14:14:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
excerpt: TIM 除了上次的直接的内部时钟源（来自apb1或者apb2）还有很多其他的时钟源头可供选择
---

# 设置为从模式的其他三个选项

>slave mode除了 external clock mode\
还有 reset mode gated mode trigger mode

## 复位模式

*此时是时钟模式一，还是从模式，输入信号到触发控制器的从模式控制器*

>可以对计数器复位状态进行复位

此时由于不是EXR1模式，所以从模式控制器就没办法当时钟用了

所以就只能用内部时钟（直接勾选内部时钟）或者选择 ETR外部触发器，此时为外部时钟模式2

# 别急还没写完
