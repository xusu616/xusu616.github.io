---
title: FPGA=zynq7010蚂蚁矿机多焊针版大板的硬件检查
date: 2026-10-03 10:32:00
tags:
  - FPGA
  - 嵌入式
categories:
  - 嵌入式
  - FPGA
excerpt: 依旧😡😡😡😡这垃圾二手板子给我整没辙了
---

# 首先发现是始终烧录进会卡在第一帧

>上一篇de[FPGA-蚂蚁矿机antminer t9/s90的 zynq 控制板烧录和调试](https://rd227.github.io/2026/09/25/FPGA-%E8%9A%82%E8%9A%81%E7%9F%BF%E6%9C%BA(antminer%20t9/s9)%E7%9A%84%20zynq%20%E6%8E%A7%E5%88%B6%E6%9D%BF%E7%83%A7%E5%BD%95%E5%92%8C%E8%B0%83%E8%AF%95/)

然后我经过一时间的乱翻乱找

成功找到了一个说法就是

可以先跑一下ps端的时钟（例如跑一个Hello world），然后就可以了

然后我就尝试这样做了，在vivado当中 左上角 Export -> Export hardware

记得勾选 include bit stream 

![ppm50t66-i43pmg6-2026-10-03-13-43-50](/img/ppm50t66-i43pmg6-2026-10-03-13-43-50.png)

然后再次点开Export当中的launch SDK选项

然后你就可以发现

你在右键左边的文件管理器的内容

然后选择New

创建一个application 示例项目

![ppm30t66-i44pmg6-2026-10-03-14-44-30](/img/ppm30t66-i44pmg6-2026-10-03-14-44-30.png)

这里你可能会看见你未配置 usart ~~还是usrt来着 忘记了））~~

总之就是要配一下这两个引脚

查看线路图可以发现如下信息

双击你配置的ipcore ，或者点击open block design

然后就可以processing_system7_0 → Re-customize IP →（或者双击进入这里） Peripheral I/O Pins / MIO Configuration

![ppm5t66-i51pmg6-2026-10-03-14-51-05](/img/ppm5t66-i51pmg6-2026-10-03-14-51-05.png)

然后再次生成比特流，然后再次Export -> include bitstream

再次打开sdk，确认加载磁盘上的更改即可

但是我再这里尝试烧录的话和再vivado里面不一样

我跑了hello world尝试右键然后run as launch 在hardware上，但是不知道为什么

```bash
Error while launching program: 
Could not find ARM device on the board for connection 'Local'. 
C 
Check if the target is in: 
1. Split JTAG - No operations are possible with ARM DAP 
2. Non JTAG bootmode - Bootrom may need time to enable DAP. 
Please try again. 
Troubleshooting hints: 
0
1. Check whether board is connected to system properly 
E 
E 
1. In case of zyng board, check whether Digilent/Xilinx cable switch settings are correct. 
r 
r 
1. If you are using Xilinx Platform Cable USB, ensure that status LED is green. 
```

跳帽和视频当中一样bitstream都能烧录的，然后我根据电路图来设置为全0（全接电阻那一边，我量过）但是还是不行，反而提示

```cmd
xsct% connect
tcfchan#1
xsct% targets
  2  whole scan chain (DR shift output all zeroes)
xsct% targets 1
xsct% Code 16 Time 1790737128413 Format {Invalid context}
```

我有点绝望了，gpt认为根据官方文档来看，xsct除了*xc7z0，还应该显示ARM Cortex-A9 MPCore #0
  ARM Cortex-A9 MPCore #1这样的东西

gpt认为我们应该查硬件

所以那就查吧

# 首先是发现c219和另外一个电容似乎电压不够

>但是这并不能直接就判定说应该更换这个电容对吧

然后准备去借示波器

然后我把相同的万用表和板子带到实验室了之后

发现原来0.8v的低电压莫名其妙变成了2.1v

这就不太妙了

但是我们还是首先测量有怀疑的晶振

但是说实话，似乎几个相关的晶振都没有问题

![ppm56t66-i24pmg6-2026-10-03-15-24-56](/img/ppm56t66-i24pmg6-2026-10-03-15-24-56.png)

![ppm16t66-i25pmg6-2026-10-03-15-25-16](/img/ppm16t66-i25pmg6-2026-10-03-15-25-16.png)

![ppm36t66-i25pmg6-2026-10-03-15-25-36](/img/ppm36t66-i25pmg6-2026-10-03-15-25-36.png)

很奇怪，然后我和gpt一起尝试测量降压芯片周围相关的问题

首先就是那两个电容，突然从低压变成高压了

![ppm21t66-i41pmg6-2026-10-03-15-41-21](/img/ppm21t66-i41pmg6-2026-10-03-15-41-21.png)

![ppm29t66-i41pmg6-2026-10-03-15-41-29](/img/ppm29t66-i41pmg6-2026-10-03-15-41-29.png)

很诡异对吧，1.5v的都变成 2.1v了

然后我就测测测

对着电路图一点一点来

然后应该是查到u13芯片

发现 P_GOOD 只有约 0.02 V，而上拉端是 3.31 V，说明 Power Good 没有正常释放；这会把 Zynq 的 PS_POR_B 压低

我并不明白这个，是问的gpt

然后顺着电源级往前查：

- V1P8 ≈ 1.8 V，FB ≈ 0.8 V，U11 调压本身正常

- 但 PG_V1P8 只有约 0.5 V，而且示波器确认是稳定卡在 0.5 V 左右，不是快速跳变

- 这导致后级 U13 的 EN 处在异常的中间电平

然后就是 V1P5 本应约 1.5 V，但 C219/C104 实测稳定在 2.1～2.2 V。原理图确认这是 U13 输出的 V1P5 电源轨

检查 U13 反馈是否断路：
- R171/R173 分压点约 1.13～1.14 V
- 分压点到 U13 FB pin 5 ≈ 0 Ω
- V1P5 到 U13 VOS pin 14 ≈ 0 Ω
- 所以 FB/VOS 走线和焊接基本正常

然后就是芯片问题，我到时候专门写个文章讲找的过程好了

总之就是等TLV62130RGT然后更换