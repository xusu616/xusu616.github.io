---
title: FPGA-蚂蚁矿机(antminer t9/s9)的 zynq 控制板烧录和调试
date: 2026-08-14 9:14:00
tags:
  - FPGA
  - 嵌入式
categories:
  - 嵌入式
  - FPGA
excerpt: 😡😡😡😡这垃圾二手板子给我整没辙了
---

# 安装vivado简述

照着装就行，但是对于vivado这种3A大作注意不要安装多的固件库~~隔壁Intel的q就比v小得多了~~

![pam50t66-i30amg6-2026-09-26-00-30-50](/img/pam50t66-i30amg6-2026-09-26-00-30-50.png)

这里的spartan可以不用下载，约节省 500MB

# 烧录

配置完引脚解释/限制文件xdc之后，就可以烧录写好的代码/写入字节流了

具体的细节没有描述

烧录之后发现了如下提示

![pam9t66-i34amg6-2026-09-26-00-34-09](/img/pam9t66-i34amg6-2026-09-26-00-34-09.png)

软件配置应该是没有任何问题的，但是不让烧录

应该是硬件问题

我们首先可以点击open hardware manager，然后auto connect发现能连接但是出现了如上报错

在JTAG选项卡的下面可以发现此芯片

![pam37t66-i37amg6-2026-09-26-00-37-37](/img/pam37t66-i37amg6-2026-09-26-00-37-37.png)

就是在这里点击此芯片无法烧录

我们在软件上查看此devices的 hardware devices的 properties

![pam4t66-i39amg6-2026-09-26-00-39-04](/img/pam4t66-i39amg6-2026-09-26-00-39-04.png)

在此处点击 REGISTER

点击 REGISTER.CONFIG_STATUS

可以发现

```bash
REGISTER.CONFIG_STATUS = 00000000

BIT04_END_OF_STARTUP_(EOS)_STATUS       0
BIT06_GWE_STATUS                         0
BIT07_GHIGH_STATUS                       0

BIT11_INIT_B_INTERNAL_SIGNAL_STATUS      0
BIT12_INIT_B_PIN                         0

BIT13_DONE_INTERNAL_SIGNAL_STATUS        0
BIT14_DONE_PIN                            0

BIT15_IDCODE_ERROR                        0
BIT16_SECURITY_ERROR                      0

BIT18_CFG_STARTUP_STATE_MACHINE_PHASE    000
```

而且

```bash
REGISTER.IR.BIT4_INIT_COMPLETE = 0
REGISTER.IR.BIT5_DONE          = 0
```

所以这很有可能是复位卡住的问题

观察硬件

...

啥也没观察出来

从引脚pdf里面看INIT_B，发现它连接着R10，它阻值并没有问题

所以是其他间接或者间接和间接的问题

看到 背面有一个电容掉了，感觉这暂时并不重要，然后看到了R57掉了

在图纸上看到它是一个44欧的电阻，我直接用镊子短接（这是有风险的，最好还是找个相近阻值的电阻）

然后就发现能烧录了

不行就短接上电再烧录

# 复盘观察引脚图

![pam8t66-i49amg6-2026-09-26-00-49-08](/img/pam8t66-i49amg6-2026-09-26-00-49-08.png)

就这样

然后它就是在主控需要释放复位时，把信号拉高

断开相当于电阻无穷大，失去了取消复位的能力

## 还是有问题

我发现烧录之后非常诡异，流水线像是Android studio 的@Preview一样卡在了第一帧

它没办法流动起来，会固定卡死再全亮

我尝试反转信号，结果它直接卡死在全不亮之类的

我应该尝试焊接一个正确的贴片电阻？

或者我听说这是因为它同时支持zynq开发Linux导致的时钟不跑的软件问题？

或者纯粹就是晶振坏掉了？

但是似乎原始的程序时可以实现最左边的LED闪动的（LED板上顺序和0123顺序不一样）

而且我这样尝试短接烧录的话，不知道是哪里的问题，始终无法覆盖烧录这个原始的程序

