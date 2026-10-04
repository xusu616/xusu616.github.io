---
title: STM32-定时器从模式
date: 2026-08-18 14:14:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
  - STM32
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

## 功能

在时钟正常运行的时候，外部时钟模式二的输入输入了脉冲

此时计数器将会归零

从模式复位模式同时也会触发HAL_TIM_PeriodElapsedCallback

就是重装载寄存器满的时候触发的回调

这里可以区分一下 *不是指输出比较模式中的“输出复位”*

## 区分

那么如何区分它们的行为的

实际上它们是靠一串二进制标志位来区分的

我们对它直接判断即可（一个是更新中断标志位，一个是触发器中断标志位

例如

```C

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  if(htim->Instance==TIM2)
  {
    if(__HAL_TIM_GET_FLAG(htim, TIM_FLAG_UPDATE) == SET)
    {
      // 这里是更新中断标志位
      // do something
    }
    else if(__HAL_TIM_GET_FLAG(htim, TIM_FLAG_TRIGGER) == SET)
    {
      // 这里是触发器中断标志位
      // 此处应该立即清空此标志，以防下次触发重装载中断的时候，触发中断标志位还是1，造成误判
      __HAL_TIM_CLEAR_FLAG(htim, TIM_FLAG_TRIGGER);
      // do something
    }
  }
}
```
 
ps:

```C
typedef enum
{
  RESET = 0,
  SET = !RESET
}FlagStatusTypeDef;
```

# 门模式

>当时钟模式1端输入的信号为高电平时，计数器才会计数\
输入信号为低电平的时候，计数器就会暂停计数

PS: 此模式并不会触发HAL_TIM_PeriodElapsedCallback

不需要在更新中断回调函数 中判断trigger中断标志位，因为它不会触发

```C
//写一下
//因为不会触发HAL_TIM_PeriodElapsedCallback
//所以是写在主逻辑里面的
char gate_mode_flag[10] = "门的从模式触发";
while(1)
{
  if(__HAL_TIM_GET_FLAG(&htim2, TIM_FLAG_TRIGGER) == SET){
    HAL_UART_Transmit(&huart1, (uint8_t *)gate_mode_flag, strlen(gate_mode_flag), 1000);
    __HAL_TIM_CLEAR_FLAG(&htim2, TIM_FLAG_UPDATE);
  }
}

```


# 触发模式

>默认不让计数器计数，得到满足的上升或者下降沿之后，计时器开启计数，从模式触发器不再让计时器停止

代码和门模式演示相同

经常与单脉冲模式相配合

>单脉冲指的是计数器在计数到重装载寄存器的值之后，计数器就会停止计数（**变成0**

此时再次触发从模式触发器，计数器就会重新开始计数

# 其他（开始初始化时默认将定时器更新中断标志位置为1

如果不想要的话，在 `MX_TIMX_Init()` 函数后面，在`HAL_TIM_Restart_IT()`函数前面 清零更新中断标志位即可

下面其实有两种

```C
__HAL_TIM_CLEAR_IT(&htim2,TIM_IT_UPDATE);
__HAL_TIM_CLEAR_FLAG(&htim2,TIM_FLAG_UPDATE);
```