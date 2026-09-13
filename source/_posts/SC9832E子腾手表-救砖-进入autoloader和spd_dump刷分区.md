---
title: SC9832E子腾手表-救砖-进入autoloader和spd_dump刷分区
date: 2026-09-14 12:00:00
tags:
  - Android
  - Unisoc
  - 救砖
categories:
  - Android
excerpt: 记录一次 SC9832E 子腾手表刷错包变砖再救回来的过程 重点记进入 autoloader 的方法和 spd_dump 刷分区
---

# 前提

设备是 Unisoc SC9832E 的子腾手表

板号 sp9820e_1h10ll

固件 build 字符串里带 ZW21EF_XH_H07_BIG_DDR3_ShuangShe

工具用的是 TomKing062 的 spd_dump

# 为什么变砖

启动链是 BootROM 再到 splloader 再到 uboot 再到 kernel

splloader 排在最前面

我刷了一个别的 SoC 的解锁包 想解 BL

那个包的脚本第一步就是先读出 splloader 再把它擦掉

```
spd_dump --wait 300 exec_addr 0x65015f08 fdl fdl1-dl.bin 0x65000800 fdl fdl2-dl.bin 0x9efffe00 exec r splloader r uboot e splloader e splloader_bak reset
```

splloader 一空 BootROM 就没有可以加载的东西

上电之后毫无反应 这就是砖

# 进入 autoloader 也就是下载模式

只要 BootROM 还在就有的救

下载模式在芯片内部 和 splloader 没有关系

所以 splloader 空了反而更好连 因为每次上电它就直接停在这里

先让 spd_dump 跑起来 它会等 30 秒连接

```
Waiting for connection (30s)
```

然后

如果系统还能开机 直接

```bash
adb reboot autoloader
```

如果已经开不了机 先把手表关机 再插 USB

连不上就关机 按住机身按键不放 再插 USB

具体是哪个键以你自己机器为准

连上的时候 spd_dump 会打印

```
CHECK_BAUD bootrom
BSL_REP_VER: "SPRD4:AutoD\0"
CMD_CONNECT bootrom
SEND fdl1-dl.bin to 0x5000
EXEC FDL1
```

看到 SPRD4 AutoD 就是成功进了 BootROM

# 用 spd_dump 刷分区

一条完整的写入命令长这样

```bash
spd_dump fdl fdl1-dl.bin 0x5000 fdl fdl2-dl.bin 0x9efffe00 exec w splloader splloader.bin reset
```

拆开看

fdl 是把 FDL 下载进去 后面的地址就是它的加载地址

FDL1 用 0x5000 FDL2 用 0x9efffe00

这两个地址是这块板子的 别的 SoC 不一样

exec 后面才是真正对分区做的事

w 分区名 文件名 是写

r 分区名 是读 默认存成 分区名.bin

e 分区名 是擦

reset 是重启设备

多个操作可以串在一条命令里 用空格隔开

顺序有讲究

splloader 一定放在最后写

因为中途断电的话 前面写的还在 而 SPL 一坏就彻底没救

# 动手之前先备份

把手上的分区先读一遍

```bash
spd_dump fdl fdl1-dl.bin 0x5000 fdl fdl2-dl.bin 0x9efffe00 exec r splloader r uboot r boot r recovery reset
```

读出来的就是原始内容 后面全靠它

# SPL 一定要选对 build

这是最容易踩的坑

我第一次救砖用的是网上下载的 2024 版固件里的 splloader

刷进去能开机

但是进了系统花屏 触摸完全没反应 过一会儿自动重启

原因是 SPL 负责 DDR 训练和 PMIC 上电

下载那版 SPL 是给另一块板子编的

我这台是 BIG_DDR3_ShuangShe 参数对不上

内存和电源没配好 能开机但一跑就崩

后来在把我刷坏的那个包里翻到一个 u-boot-spl-16k-sign.bin

和 2024 版一对比

同一颗芯片 同一块板子 但是另一个 build

DHTB 里的 payload 长度 0x8d40 对 0x8cb0

118 个可读字符串里有 108 个一样

零平移只有 19% 的字节能对上

整体平移 140 字节之后才有 62%

刷进去之后一切正常

# 原厂 SPL 是怎么找回来的

那个包为什么会有我自己的 SPL

因为它解锁的第一步就是 r splloader

先把我的读出来存成 splloader.bin 再擦掉

接着 gen_spl-unlock 处理完改名成 u-boot-spl-16k-sign.bin

所以那个文件夹里躺着的其实是我自己的 SPL

同目录还有 uboot_bak.bin

它前 440724 字节和我回读的 uboot 逐字节一致 可以直接证明

所以结论是

设备被某个包刷坏之后 先别急着删那个包

它的脚本很可能在读取的时候 就把你的原始内容留在硬盘上了
