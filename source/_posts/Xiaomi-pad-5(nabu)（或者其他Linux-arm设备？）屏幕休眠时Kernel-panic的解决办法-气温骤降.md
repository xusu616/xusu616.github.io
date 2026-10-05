---
title: Xiaomi pad 5(nabu)（或者其他Linux arm设备？）屏幕休眠时Kernel panic的解决办法 - 气温骤降
date: 2026-03-24 07:12:00
permalink: 2026/03/23/Xiaomi-pad-5(nabu)（或者其他Linux-arm设备？）屏幕休眠时Kernel-panic的解决办法-气温骤降/
tags:
  - 刷机
  - Android架构和安全
  - Android
categories:
  - Linux
  - 设备维护
excerpt: ''
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19764162
---

现象： 休眠后会自动关机 修复 排除 journalctl -b -1 -p 3 -n 233 -b -1：查看上一次启动（即崩溃前）的记录 -p 3：只看Error级别以上的日志 -n 9178：看上次多少条 点击查看崩溃日志 [xvsu@alarm \~]$ journalctl -b -1 -p 3 -n 50 Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_check_fw_reset_state 537: error, retry=11, buf[1]=0x00> Mar 23 12:04:10 alarm kernel:...
<!-- more -->

<h1 id="现象">现象：</h1>
<p>休眠后会自动关机</p>
<h1 id="修复">修复</h1>
<h2 id="排除">排除</h2>
<p>journalctl -b -1 -p 3 -n 233<br>
-b -1：查看上一次启动（即崩溃前）的记录<br>
-p 3：只看Error级别以上的日志<br>
-n 9178：看上次多少条</p>
<details>
<summary>点击查看崩溃日志</summary>

```bash
[xvsu@alarm ~]$ journalctl -b -1 -p 3 -n 50
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_check_fw_reset_state 537: error, retry=11, buf[1]=0x00>
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_download_firmware_hw_crc 694: nvt_check_fw_reset_state>
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_tx_auto_copy_mode 323: tx auto copy mode enable
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_update_firmware 821: Update firmware success! <430698 >
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_get_fw_info 639: fw_ver = 0x35, fw_type = 0x01, x_num=>
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_read_pid 576: PID=5953
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] disable_pen_input_device 1175: ++
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_ts_work_func 1140: Unknown pen format id!
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] disable_pen_input_device 1199: pen charge state is DISABLE>
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] disable_pen_input_device 1204: --
Mar 23 12:04:10 alarm kernel: [NVT-ts-spi] nvt_ts_resume 1825: end
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_drm_notifier_callback 1841: event=2, *blank=1
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_ts_suspend 1700: cancel delayed work sync
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_ts_suspend 1707: suspend start
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_ts_suspend 1710: if enable pen,will close it
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] disable_pen_input_device 1175: ++
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] disable_pen_input_device 1199: pen charge state is DISABLE>
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] disable_pen_input_device 1204: --
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_ts_suspend 1759: end
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_drm_notifier_callback 1847: event=1, *blank=0
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_ts_resume 1784: resume start
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] update_firmware_request 302: filename is novatek/novatek_n>
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_bin_header_parser 125: cascade_2nd_header_info = 1
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_bin_header_parser 156: ovly_info = 0, ilm_dlm_num = 2,>
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_tx_auto_copy_mode 323: tx auto copy mode enable
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_check_fw_reset_state 537: error, retry=11, buf[1]=0x00>
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_download_firmware_hw_crc 694: nvt_check_fw_reset_state>
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_tx_auto_copy_mode 323: tx auto copy mode enable
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_update_firmware 821: Update firmware success! <438494 >
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_get_fw_info 639: fw_ver = 0x35, fw_type = 0x01, x_num=>
```

</details>
<p><em>还有个sudo dmesg -w应该也可以用（）但是我没试过（）应该是实时的，适合复现</em><br>
日志里面nvt_ts_suspend之后nvt_ts_resume，但是失败了nvt_check_fw_reset_state 537: error, retry=11, buf[1]=0x00</p>
<h2 id="尝试解决">尝试解决</h2>
<h3 id="如果在模块当中应该用">如果在模块当中，应该用</h3>

```bash
lsmod | grep -iE(E是正则表达式~) 'nvt|novatek|touch|andAnyOtherTings'
```

<p>然后像后面一样，写个禁用脚本</p>

```bash
# 查找SPI 总线上的 Novatek设备(显驱设备)
ls /sys/bus/spi/devices/
# 如果是spi0.0
ls -l /sys/bus/spi/devices/spi0.0/driver
#然后得到这个名字
sudo nano /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh
#写这个脚本，脚本内容大概类似于
```

```sh
#!/bin/bash
case $1 in
    pre)
        # 休眠前：强行卸载触摸屏驱动
        modprobe -r nvt_ts_spi
        ;;
    post)
        # 唤醒后：重新加载触摸屏驱动
        modprobe nvt_ts_spi
        ;;
esac
```

<p>然后</p>

```bash
sudo chmod +x /user/lib/systemd/system-sleep/fix-touch.sh
#或者写用户自定义区/etc/lib/systemd.....
```

<h3 id="另一种情况">另一种情况</h3>
<p>如果内核没有集成触摸，即触摸模组不作为模块加载，而是built-in的（类似于我手上这种） <s>（我猜可以这么说？管他呢 把问题解决就行）</s><br>

[最新的在这里](https://rd227.github.io/2026/10/04/nabu-arch-arm-%E4%BC%91%E7%9C%A0%E5%A4%B1%E8%B4%A5%E6%8E%92%E6%9F%A5%E8%AE%B0%E5%BD%95/)<br>
一样找到spi几几<br>
然后船舰脚本</p>

```bash
sudo nano /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh
```

```sh
#!/bin/bash

# 设备 ID
TOUCH_DEV="spi0.0"

DRIVER_PATH="/sys/bus/spi/drivers/nvt_ts_spi"

case $1 in
    pre)
        # 在进入休眠前解绑驱动 #不作为模块加载，编译在内核，利用解绑机制
        #-e代表检查该路径是否存在
        if [ -e "$DRIVER_PATH/$TOUCH_DEV" ]; then
            echo "$TOUCH_DEV" > "$DRIVER_PATH/unbind"
            echo "Touch screen unbound before suspend" >> /tmp/touch_fix.log #可要可不要
        fi
        ;;
    post)
        # 在唤醒后重新绑定驱动
        if [ ! -e "$DRIVER_PATH/$TOUCH_DEV" ]; then
            echo "$TOUCH_DEV" > "$DRIVER_PATH/bind"
            echo "Touch screen re-bound after resume" >> /tmp/touch_fix.log #随便你吧
        fi
        ;;
esac
```

<p>然后不要忘了</p>

```bash
sudo chmod +x /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh
```

<p>然后休眠试试看</p>
<h1 id="补充">补充</h1>
<p>由于脚本可能不太稳健的原因（）有时候可能会错误执行，导致亮着的没触摸，这个时候</p>

```bash
[xvsu@alarm ~]$ sudo sh -c 'echo "spi0.0" > /sys/bus/spi/drivers/NVT-ts-spi/bind'

[sudo] password for xvsu:  

sh: line 1: echo: write error: Device or resource busy
```

<p>这样不行，要</p>

```bash
sudo sh -c 'echo "spi0.0" > /sys/bus/spi/drivers/NVT-ts-spi/unbind'
sudo sh -c 'echo "spi0.0" > /sys/bus/spi/drivers/NVT-ts-spi/bind'
```

<p><s>先凑合用着吧，我有其他事情</s></p>
