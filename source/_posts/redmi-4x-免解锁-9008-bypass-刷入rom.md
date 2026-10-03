---
title: Redmi 4x 免解锁 9008 bypass 刷入rom
date: 2026-10-02 15:55:00
tags:
  - Android
  - 刷机
categories:
  - Android
  - 刷机
excerpt: 新手机（划掉）旧手机买来之后发现有账号/金凡不给解锁怎么办？直接上雄氏老方9008，解锁不了怎么办？就不解锁直接刷😋😋
---

# 首先是尝试_进犯_的妙妙の小工具

结果发现提示请先绑定账号

尝试找了很多方法退出登录也没用

# 所以我们也是直接拆机了好吧

连接的就只有一根指纹排线在中心，只要不是特别蠢的话

都可以轻松拆开的

不能拆开的买拆机套装去

pdd上11块钱买一套就够用了

可以买那种带金属拆机片的

可以加点酒精润♂滑一下

然后就拆开了，拆开就能看到上面有个屏蔽罩，我们直接把螺丝拧下来就能看到这个

![ppm2t55-i18pmg5-2026-10-02-18-18-02](/img/ppm2t55-i18pmg5-2026-10-02-18-18-02.png)

然后关机

断开电池排线

短接9008，设备管理器看不到设备并且尝试震动并且 进入关机充电，就是进入失败了

没有镊子的话建议专门买一根镊子，否则真的不好短接

建议买那种后面绝缘的尖镊子

否则会带走一部分电流，不好碰黄色金属点

# 考虑对9008干点什么

> 首先当然是去万能的 xda 上找一找\
> 你会看到：这个，一个是二进制包（ida查看是加密的）\
> 其次就是一个9008的镜像包\

如果要刷入镜像的话，不建议使用任何图形界面，因为它们既低效又容易产生歧义

使用 `git clone git@github.com:bkerler/edl.git` 来下载经典的开源9008命令行工具

我找到的对话在这里 https://xdaforums.com/t/unofficial-unlock-bootloader-redmi-4x.4150597/

但是我在刷入的过程中，发现了这玩意刷完之后再回读，分区似乎会被偷偷替换回来？（unlock 为 false）

不对，我再次尝试在9008当中读取刷入的 `emmcdl -p COM38 -f $loader -MaxPayloadSizeToTargetInBytes 16384 -b devinfo "$images\auto-fhone.img"` 和 `$emmcdl -p COM38 -f $loader -MaxPayloadSizeToTargetInBytes 16384 -b config "$images\auto-fhone"` 都是成功写入的，再次读出的分区也在 devinfo 的对应解锁位 是翻转了的

实际上是出于 aboot 或者 其他组件的某些行为，仍然不解锁

不同的MIUI机型可能不相同

我在这里使用的是国行版 MIUI 8.2.18.0

# 考虑其他bypass方案

直接尝试修改aboot呢？

尝试刷入的bypass的readwolf rec

但是它会直接闪回，拒绝进入rec

是有校验问题吗？

通过 `.\emmcdl-2.16.exe -p COM41 -f .\prog_emmc_firehose_8937_ddr.mbn -MaxPayloadSizeToTargetInBytes 1048576 -d 921600 131072 -o .\run-20261001-100220-v216\recovery-b.bin` 这样的命令尝试了读出后，我发现实际上MIUI尝试了重新写入

准确地说，就是MIUI 启动后用 /system 中的恢复脚本重写 recovery

但是沟槽的MIUI并不会擦屁股，连分区超出范围都没考虑到

然后就留下的redwolf的尾块导致无法启动

而且，过于长的append尾块实际上会导致内核直接panic而无法启动

所以我们实际上需要修改aboot

这里尝试把aboot换成了小米签名 MIUI 11 版本

然后就可以了

> 做到这里我才意识到，实际上，可能升级MIUI版本对解锁通过是有帮助的，但是也无所谓的，不需要去从金金金凡那里祈求168小时的还可能卡住的解锁时间

## 进入激动人心的 redwolf-bypass 吧！

![pam20t66-i4amg6-2026-10-03-01-04-20](/img/pam20t66-i4amg6-2026-10-03-01-04-20.png)

会问你要不要挂载系统分区，这个无所谓，也不用挂，我们的任务是刷入自由而且~~仙静~~先进（存疑？Android 6 -> android 11 毕竟内存太小了）的系统

然后我这里尝试刷入的rom指定了配套的twrp

那就照做吧（下图就是redwolf，按道理说 在install 里面选择image然后刷入append的image即可，但是Astra直接帮我做了，我没有在这里使用过非图形界面刷，因为dd到by-name稍微有点反人类，说不定还会对这里加密（不过这里都是自定义rec了，倒是没什么可担心的），不过你可以都试试看，只要刷进去就行）

Astra应该是这样的：（包含了备份刷入检查，感觉比我还细欧）

```powershell
adb shell "dd if=/dev/block/bootdevice/by-name/recovery of=/tmp/recovery-before-twrp37.bin bs=1048576"
adb pull /tmp/recovery-before-twrp37.bin ./recovery-before-twrp37.bin
adb push ./TWRP-3.7.0-A11-20240520-mi8937_4_19-appended.img /tmp/twrp37-appended.img
adb shell "sha256sum /tmp/twrp37-appended.img"
adb shell "dd if=/tmp/twrp37-appended.img of=/dev/block/bootdevice/by-name/recovery bs=4096"
adb shell sync
adb shell "dd if=/dev/block/bootdevice/by-name/recovery of=/tmp/twrp37-readback.img bs=4096 count=7760"
adb shell "sha256sum /tmp/twrp37-readback.img"
# 仅在读回 SHA256 与输入完全一致后：
adb reboot recovery
```

![pam29t66-i6amg6-2026-10-03-01-06-29](/img/pam29t66-i6amg6-2026-10-03-01-06-29.png)

但是需要你加入自动绕过的尾块，你应该能在仓库的script文件夹找到

当然，你要刷入同款rom的话也可以用现成的

[ROM 发布目录](https://sourceforge.net/projects/crdroid7-mi8937/files/LOS/)

[仓库：rD227/santoni-recovery-bypass](https://github.com/rD227/santoni-recovery-bypass)

 repository path: santoni-recovery-bypass\payloads\RedWolf-santoni-appended.img

# 其他注意事项

## 进入900E

此时断开电池排线，接回，即可正常开机

## 指纹失效

安装rom的时候没有扣回指纹排线

别急，实际上扣回指纹排线重启即可

## sim卡失效不显示

别急，安装可用的sim卡重启即可

_最后就是享受你的新手机 吧，再见！_
