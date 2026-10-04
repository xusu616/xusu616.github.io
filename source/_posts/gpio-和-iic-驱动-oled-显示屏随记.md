---
title: GPIO 和 iic 驱动 oled 显示屏随记
date: 2026-08-02 11:55:00
tags:
  - 嵌入式
  - stm32
categories:
  - 嵌入式
  - STM32
excerpt: GPIO 和 iic 驱动的区别
---

# GPIO驱动oled屏幕

> 软件驱动，使用GPIO来HAL write

如

```c
#define OLED_W_SCL(x)  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_8, x)
#define OLED_W_SDA(x)  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_9, x)
```

就是软件驱动，例如 <https://github.com/rD227/STM32-Learning/blob/main/Core/Src/OLED.c.bak>

OLED_I2C_Start:手动摆出起始时序(SDA 先降、SCL 再降)\
OLED_I2C_SendByte:for 循环 8 次,一位一位地摆 SDA、再拉 SCL 产生一个时钟沿\
OLED_I2C_Stop:手动摆出停止时序\

# iic 驱动oled 屏幕

硬件驱动

需要sda 和 scl

开启 iic 通道

可以重新映射这两个引脚
