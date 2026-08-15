---
title: STM32-定时器和红外反射器使用的一些小问题-随记
date: 2026-08-14 13:14:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
excerpt: 随便记一些可能犯的错误和小问题
---

# 时钟主频率过高

> 假设我们有一个可以计算光电传感器产生了多少上边沿的 OLED 屏幕\
主频率过高导致红外反射光电开关（以下简称红外反射器）计数过多

此时不能调节 trigger prescaler（触发预分频器）或者 prescaler。

其实我这里是想解决主频率过高、**导致上涨抖动在 filter 在 15 的时候仍然不稳定**的问题，才去动这个东西的。

但是这两个东西都是增加需要的脉冲然后输出的脉冲，不能从根本上解决这个问题（这个就不应该这么解决）。

再要增加 filter 的值，就只能减少主频率，或降低对应 APB 外设上的频率。

总的来说就是：要么减少主频率，要么降低对应 APB 外设上的频率。

# 优化编译问题

中断里改一个变量、主循环里读它，若不加 `volatile`，开启优化后主循环读到的可能就是缓存的旧值

以计数为例：`HAL_TIM_PeriodElapsedCallback` 里 `offset_counter++`，主循环里 `count = CNT + 65535 * offset_counter`\
编译器编译主循环时看不到中断会改这个变量，于是把它加载进寄存器后就不再回读内存

`-O0`（Debug 默认）下编译器不做这种优化，每次都重新读，所以"碰巧"能工作；一旦切到 `-Os` / `-O2`，OLED 上的数字就可能卡住不更新。

解决即给变量加 `volatile`：

```c
volatile int count = 0;
volatile int offset_counter = 0;
```

# 满计时器溢出回调

```C
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim){
  if(htim->Instance == TIM2){
    offset_counter++;
  }
}
```

溢出应该为65536

```C
int offset_counter = 0;


  int count_offset = 65536; // 计数器溢出时的偏移量
  count = __HAL_TIM_GET_COUNTER(&htim2) + count_offset * offset_counter;
```

## 总结

- 中断与主循环共享的变量要加 `volatile`，否则优化后可能读到旧值。
- `__HAL_TIM_GET_COUNTER()` 读的是硬件寄存器，HAL 已把它声明为 `__IO`（即 `volatile`），无需再处理。

