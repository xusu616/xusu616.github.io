---
title: STM32iic通道频率过高问题和stm32f103c8t6的5v引脚问题
date: 2026-08-07 12:00:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
excerpt: 随便记两个小问题
---

# stm32iic频率相对高导致通信异常

iic 的clock speed 速度可以调低点

比如说 如果将 iic 引脚直接通过公对公的杜邦线接入 其他地方的话，寄生电容会大得多

面包板 + 杜邦线的寄生电容大、走线长, 400kHz 下 SCL/SDA 边沿被拖圆, 从机(SSD1306)时不时识别不到正确时序;

## I2C 是有 ACK 握手的

主机没等到 ACK 就靠时钟拉伸等下去, iic 如果使用了 transmit 的 HAL_MAX_DELAY 

导致行为异常，oled 刷新慢，留影之类的

改低一点就可以了，400khz的话太高了

直接改到 100khz 也行

# stm32f103c8t6 的 5v 引脚

stm32f103c8t6上的5v引脚电流似乎比较小

没办法让蓝牙模块跑起来


