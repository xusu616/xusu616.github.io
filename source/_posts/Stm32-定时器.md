---
title: Stm32-定时器
date: 2026-08-14 9:14:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
excerpt: TIM 定时器分频（不过其实也没什么可记的（（
---

# 分频器

>在stm32f10系列中最多有三个定时器，其中tim1 tim8 为高级定时器，tim 2 3 4 5 通用定时器，tim 6 7 为基本定时器。stm32f103c8t6上有 tim1 2 3 4

TIM 定时器 的 频率 就是时钟频率 除以 分频器 + 1 的频率

比如说我们想要 72MHz 除以 7200 得到 10000Hz

就需要 设置 分频器 为 7200 -1 = 7299 分频

## 实际配置分频器

实际在stm32当中配置tim的话

需要在配置的时候勾选 internal clock

但是这个时候就算在时钟树里面调整到外部晶振也还是内部时钟，而且能用，这是因为

**tim 里面的时钟不是指内部rc振荡器**

定时器使用芯片内部已经由 RCC 分配过来的总线时钟，即 TIMxCLK

而这个 TIMxCLK 的来源，仍然可以是配置的外部晶振 + PLL

所以即使你系统时钟用的是 HSE 外部晶振，TIM 仍然可以选择 Internal Clock

```TEXT
HSE 8MHz //外部晶振
  → PLL ×9
  → SYSCLK 72MHz
  → AHB 72MHz
  → APB1 36MHz
  → TIM2~TIM7 定时器时钟 = APB1 × 2 = 72MHz
```


# 实际代码

可以反复读取寄存器给变量赋值
```C
HAL_TIM_BASE_START(&htim3);
int counter;
while(1){
    counter = __HAL_TIM_GET_COUNTER(&htim3/**指向定时器的指针**/)
}
```

# 配置重载寄存器（counter period

设置为 9999

就会在从 0 — 9999 数够 10000 次的时候

重新装载为 0

## 影子重装载寄存器（auto reload preload

这个没打开的话，可能在刚好计数器与重装载寄存器错过（没反应过来，导致重装载寄存器到 2 ^ 16 - 1 的时候才复原（触发更新

这可能在重装载寄存器设置得过小的时候出现

# 重载寄存器满中断

打开 tim的 nvic（NVIC Nested Vectored Interrupt Controller（嵌套向量中断控制器）） 选项卡

勾选打开

## 示例

使用

```C
/*USER CODE BEGIN O*/
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim){
    if (htim == &htim2)
    //这里可以开启中断串口，蓝牙中断串口也行。。来发送消息
}

HAL_TIM_BASE_START_IT(&htim3);
//同样是重写更新中断回调函数
//和中断和dma发送数据一样
//都是不能在循环里面调用，要重写中断函数，要在主函数中调用一次，然后再再中断重写
//还是一样的 先调用一次触发回调，然后，再再重写回调那里再写一次
```

# 定时器

>HAL_Delay() 不是不好，而是它是阻塞的，因此在某些情况下必须使用硬件定时器