---
title: Android-内核修改设备树的打包解包和注意事项？
date: 2026-10-07 7:19:00
tags:
  - Android
  - 刷机
categories:
  - Android
  - 刷机
excerpt: 刷.........机........
---

# 继上次sawp分区模块之后感觉这台老家伙的cpu其实也不是很够用

\>所以我们直接对它开电

首先看看内核的情况

cat /sys/devices/system/cpu/cpufreq/policy4/

scaling_available_frequencies960000 1094400 1248000 1344000 

1401000 1497600

santoni:/ # cat /sys/devices/system/cpu/cpufreq/policy4/

scaling_available_frequencies

768000 902400 998400 1094400 1209600

这里 两组分别是 

policy0	CPU 0–3	960 \~ 1497.6 MHz	960 \~ 1497.6 MHz

policy4	CPU 4–7	768 \~ 1209.6 MHz	768 \~ 1209.6 MHz

高频核和低频核

所以我们都给它上最高一档就行了，虽然内核是 MiThorium 4.19.325 是开源的

实际上你可以自己重新编译 来开到更高的内核档

但是我们这里就不这样做了

我们直接改到最高档即可

# 首先使用magiskboot工具解包

用法 

```powershell
.\magiskboot.exe unpack D:\Project\MagiskBootWindows\lineage18-boot-magisk-appended.img
```

然后看到其实是有单个~~dts~~++++++++++++~~为什么我一直把dtb打成了dts我简直就是个蠢蛋~~文件的，意味着我们可以不用重新编译整个内核（其实不编译应该也有办法patch？但是不敢想象u多麻烦

可以看到 dtb kernel ramdisk

我们修改设备树即可

你知道的，我从来都不喜欢用十六进制编辑器

所以我让ai写（:

```python
from pathlib import Path

src = Path("kernel_dtb")
dst = Path("kernel_dtb_corner7")

data = bytearray(src.read_bytes())

offset = 0x1B3C8F

assert data[offset:offset+4] == b"\x00\x00\x00\x06"

data[offset:offset+4] = b"\x00\x00\x00\x07"

dst.write_bytes(data)

print("patched:", dst)
```

再在同目录下运行

需要原镜像才能打包

注意一切包内格式一定要符合要求，否则会静默失败导致刷入后不开机

不过也可以轻松救回，但是要拆机

也可以自己再把打包的镜像解包看看

然后刷入就能看到手机正在以最高频率运行....吗？

实际上不止是这样的

CPR 的 7 已生效，启动日志也识别到了两组高频档

缺口在另一组调频表 qcom,cpufreq-table-0/4：它们仍只列到原频率上限

 调频驱动读取这两张表，所以仅改 CPR （或者说挡位表？）不够

[对应源码](https://github.com/Mi-Thorium/kernel_msm-4.19/blob/2ccb48e63608/drivers%2Fcpufreq%2Fqcom-cpufreq.c)

emmm没有可讲的了
