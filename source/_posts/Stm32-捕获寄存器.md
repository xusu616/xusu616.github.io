---
title: Stm32-捕获寄存器
date: 2026-08-21 22:14:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
excerpt: 捕获寄存器的介绍
---

# 捕获寄存器简介
>可以用于一些防止阻塞的行为
而且捕获的数值/时间不会变化，不会因为运行时间而被干扰，因此十分精准

输入通道检测到上升沿或者是下降沿的时候、

立刻将此时寄存器的数值记录到捕获寄存器当中  以待程序稍后读取

而且在开启中断时，此时还会触发输入捕获中断

在每个tim上都有捕获寄存器存在

## 捕获寄存器并不能设置为双边沿捕获

所以可以设置为两个通道相互配合

stm上也确实集成了这样的东西

就是TI1FP2，这个就是输入捕获的间接模式

无独有偶，也有TI2FP1, 也是间接模式

如图

![ppm26t55-i10pmg5-2026-08-21-18-10-26](/img/ppm26t55-i10pmg5-2026-08-21-18-10-26.png)

[linkToTheVedio](https://www.bilibili.com/video/BV1HM4m1R75B/?share_source=copy_web&vd_source=f81fbf4a49f2ebfee7f0e9e8e4ef928f)

![ppm27t55-i13pmg5-2026-08-21-18-13-27](/img/ppm27t55-i13pmg5-2026-08-21-18-13-27.png)

ti4 ti3 没有接入从模式控制器和编码器当中

# 实际设置

例如我们要用ti3 和 ti4 来测算间隔的高电平

![ppm4t55-i23pmg5-2026-08-21-18-23-04](/img/ppm4t55-i23pmg5-2026-08-21-18-23-04.png)

设置在tim之前的预分频器Prescaler之后设置channel

![ppm30t55-i24pmg5-2026-08-21-18-24-30](/img/ppm30t55-i24pmg5-2026-08-21-18-24-30.png)

然后启用中断的化需要开启capture compare interrupt，就是捕获寄存器的中断

# 实际代码

>需要开启ti3和ti4.在ti4捕获到之后还需要开启中断，此时就完成了ti3和ti4的间隔的测量

```C
HAL_TIM_Base_Start(&htim1);
HAL_TIM_IC_Start(&htim1,TIM_CHANELL_3);
HAL_TIM_IC_Start(&htim1,TIM_CHANELL_4);//IC - input capture
```

为了防止下降沿捕获之前，计数器置为0，我们还需要在最初测量的时候把寄存器置0

```C
While(1){
  __HAL_TIM_SET_COUNTER(&htim1, 0);
}
```

然后就是重写中断函数

在这里记一下不知道的情况下如何寻找中断回调函数】

首先就是点击到stm32f1xx.c

找到 `TIM1_CC_IRQHander` (interrupt Request) 函数

转到它的声明

就能看到 `HAL_TIM_CaputureCallBack` 函数

再次转到声明

就能看到

```C
weak void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *htim){.....}
```

然后简单写写就行了

记得tim和ti-channel要检查

```C
if ( htim == &htim1 && htim ->/**解析指针属性**/ Channel == HAL_TIM_ACTIVE_CHANNEL_4 )
```
