---
title: 用 Root 安卓机做 Tailscale 远程 USB HID 唤醒器
date: 2026-11-15 16:30:00
tags:
  - Android
  - Linux
  - Tailscale
  - Magisk
  - archived
categories:
  - Linux
  - 折腾记录
excerpt: 远程 Arch Linux 主机网口松了只能用 USB 网卡且不支持 WoL，这里记录用闲置 Root 安卓机（Redmi 4X / santoni）配合 Tailscale 和 Magisk 模块模拟 USB 键盘，实现远程唤醒 S3 休眠电脑的完整方案与踩坑
---

## 起因

远程那台 Arch Linux 电脑平时会进入休眠，但打开很快，基本就是挂起到内存（Suspend to RAM / S3 或 `s2idle`），一休眠系统冻结，Tailscale 也会跟着掉线

麻烦的是这台电脑板载网口松了，又不想粘胶带固定，只能插 USB 网卡，而外接 USB 网卡大概率不支持 Wake-on-LAN（WoL），或者休眠后 USB 网卡直接断电

手头正好有一台之前绕过 BL 刷好 LineageOS 18.1 + Magisk 的红米 4X（`santoni`，Linux 4.19 内核），干脆直接把它当成一个插在电脑上的 USB 键盘来用，手机自己连 Wi-Fi 跑 Tailscale 常驻在线，自带电池也不怕电脑休眠时 USB 断电

<!-- more -->

---

## 为什么常规方式唤不醒，以及为什么没选蓝牙

电脑挂起到内存（S3）时，CPU 和整个 Linux 系统处于暂停状态，上面跑的 Tailscale、SSH、ADB、MTP 全都不工作，靠发普通网络请求或串口/文件数据是叫不醒的

主板硬件层能直接响应的唤醒信号就那几种：机箱电源键、原生 PCIe 网卡的 WoL 魔术包、USB 键鼠的 `Remote Wakeup` 信号、或者 USB 接口的插拔电平变化

期间也顺带对比过其他做法：

* **NanoKVM / GL.iNet Comet**：最省心，台式机上用 NanoKVM PCIe 版直接吃 `3.3Vaux` 待机供电还能接主板电源针脚，不过要两三百块
* **树莓派 Zero 2 W**：和手机 USB Gadget 原理一样，但手头没有现成的
* **台式机加 PCIe 网卡**：几十块钱能彻底治好板载网口松动并恢复 WoL，但只适合有空闲 PCIe 槽的台式机
* **手机模拟蓝牙键盘**：虽然不用手机和电脑之间连 USB 线，但大多数电脑进 S3 后会断开蓝牙连接或给蓝牙下电，Linux 默认也不开 `hci0` 唤醒，Android 后台蓝牙 HID 服务又容易被系统回收，稳定性比 USB 差很多

所以最后还是折腾手头现成的 `santoni`

---

## 第一步：确认手机内核支持 USB HID Gadget

不是所有手机内核都带 USB HID 驱动，先切到 `su` 检查一下内核配置：

```bash
zcat /proc/config.gz 2>/dev/null | grep -E "CONFIG_USB_CONFIGFS|CONFIG_USB_F_HID"
```

在我的 `santoni`（`4.19.325-cip132-st16-Mi8937v2`）上返回：

```text
CONFIG_USB_F_HID=y
CONFIG_USB_CONFIGFS=y
CONFIG_USB_CONFIGFS_F_HID=y
```

已经直接编译进内核了，不需要重编内核和重新打包带绕过尾块的 `boot.img`，只是 `/config/usb_gadget/g1/functions/` 默认没建 `hid.usb0` 目录而已

---

## 整体设计

为了避免 Android 杀后台，我没有用 Termux 挂脚本，而是直接打成了一个 **Magisk / KernelSU / APatch 模块（`wake_bridge`）**，所有核心服务全部在 root 层自启运行：

1. **联网层**：手机上装官方 **Tailscale Android App** 连上同一个 tailnet，开启开机自启，关闭电池优化并在多任务锁定
2. **监听与鉴权层**：模块启动后向 `/sys/power/wake_lock` 申请唤醒锁防止深睡断流，用 Magisk 自带的 BusyBox `httpd` 监听 `9876` 端口
   * 不能“只要收到 Tailscale 流量就唤醒”，因为 Tailscale 本身有心跳包和探测流量，那样电脑刚睡着就会自己醒来
   * 所有请求必须携带随机生成的 24 位十六进制 `token`，且脚本只放行 Tailscale 网段和内网来源 IP
3. **触发层（双保险）**：
   * 收到 `/cgi-bin/wake?token=...` 后，先往 `/dev/hidg0` 发送 **Left Shift（`0x02`）按下并松开**（用 Shift 而不用回车或空格，是因为就算电脑当时其实没睡着，按一下 Shift 也不会在终端或编辑器里误输入字符或误提交）
   * 等 2 秒后再读 `/sys/class/udc/<udc>/state`，如果依然停在 `suspended`，就往 `/sys/class/udc/<udc>/soft_connect` 写 `disconnect` 再写 `connect`，模拟物理拔插一次 USB 键盘，利用主板 USB 插入检测唤醒

---

## 实操中踩过的几个坑

### 1. Android 的 `ueventd` 不自动创建 `/dev/hidg0`
把 `hid.usb0` 绑定到 ConfigFS 后，`hid.usb0/dev` 里明明已经出现了主次设备号 `488:0`，`/proc/devices` 也有 `488 hidg`，但 `/dev/` 下就是没有 `hidg0`

解决方法是在初始化脚本里直接读 `/config/usb_gadget/g1/functions/hid.usb0/dev`，解析出 `major:minor` 后手动 `mknod /dev/hidg0 c <maj> <min>`

### 2. Android `init` 会抢先重绑 `UDC`
最开始 `setup-hid.sh` 写 `echo "" > UDC` 后 `usleep 250000`，结果 Android 的 `init`（`sys.usb.config=adb` 触发器）在 170ms 左右抢先自己把 `UDC` 重新绑回去了，等脚本再执行 `echo msm_hsusb > UDC` 就直接报 `Device or resource busy`

后来改成先准备好 `hid.usb0`、再把原本的 `f1 -> ffs.adb` 保留，同时把 `f2 -> hid.usb0` 软链好、设定 `bmAttributes=0xa0`（打开 USB Remote Wakeup 位），最后再判断是否需要写 `UDC`，避开了竞态问题

### 3. `\x00` 截断与 `/dev/hidg0` 写阻塞
* BusyBox `ash` 或不同 shell 在双引号传参时容易吞掉 `\x00`，导致 63 字节引导键盘描述符长度不对，把描述符和 8 字节 HID 报告全改成 `base64 -d` 写入后就稳了
* 如果主机没有轮询第二个 HID 接口（比如在 Windows 上因为同 `VID:PID` 注册表缓存成单接口 ADB 没读取 HID 端点），往 `/dev/hidg0` 写完第一个缓冲包后，第二次写入会永远阻塞在内核队列里，所以所有写 `/dev/hidg0` 的地方都必须套上 `busybox timeout 2`

### 4. Magisk 自启环境的 `PATH` 精简
开机阶段 Magisk `service.d` / `service.sh` 拉起 `httpd` 时，默认 `PATH` 里不包含 `/system/bin`，导致 `/cgi-bin/status` 里的 `ip -br addr` 返回空，在 `common.sh` 统一加上 `export PATH="/system/bin:/system/xbin:/vendor/bin:/sbin:/data/adb/magisk:$PATH"` 解决

---

## 电池保护与防失联配置

### 1. 用 ACC 控制 40% - 60% 充电
旧手机常年插在电脑 USB 上如果一直维持 100% 满电很快就会鼓包，这里直接用官方 **ACC (Advanced Charging Controller)** Magisk 模块接管充电（如果用我们之前的简易守护脚本记得关掉，不要让两个进程同时改 `charging_enabled`）

刷入 ACC 后执行：

```bash
# 重启前如果命令还没挂载到 PATH，用完整路径：
su -c "sh /data/adb/vr25/acc/acc.sh 60 40"
# 重启后可以直接用：
su -c "acc 60 40"
su -c "acc -sp cap"
```

确认输出里有 `pause_capacity=60` 和 `resume_capacity=40` 即可，也可以跑一次 `acc -t` 测一下机型支不支持旁路供电（Idle Mode）

### 2. 取消锁屏密码
开启了文件加密（FBE）的手机如果停电或意外重启后停在密码解锁界面，Wi-Fi、Tailscale 和后台服务都不会完全起来，作为远程控制节点使用的旧手机一定要把锁屏设为无密码或仅滑动

---

## 远程 Linux（Arch）端的配合设置

手机插上电脑 USB 后，在 Arch 上检查：

1. 查看是否识别出键盘接口：
   ```bash
   lsusb
   dmesg | grep -iE "hid|input|18d1" | tail -n 20
   ```
2. 电脑醒着时测试一次 `wake` URL，确认返回 `hid=ok`
3. BIOS 里打开 **Wake on USB** / **USB Resume from S3**，并关掉 **ErP** 节能
4. Linux 下确认 `/proc/acpi/wakeup` 里的 `XHC` 与对应 USB 口 `power/wakeup` 为 `enabled`，并用 `udev` 规则持久化（具体规则和 systemd 单元见仓库里的 `docs/LINUX-USB-WAKEUP.md`）

---

## 模块安装与常用命令

可以从仓库 Release 下载 `wake_bridge-v1.0.0.zip` 直接在 Magisk 里刷入并重启，安装脚本会自动在 `/data/adb/wake-bridge/config.env` 生成随机 Token（升级模块会保留原配置）

重启后在手机 root shell 运行：

```bash
# 查看状态与完整唤醒 URL
su -c "wake-bridge status"
su -c "wake-bridge url"

# 远程在任意 Tailscale 设备访问即可唤醒：
# http://<TAILSCALE_IP>:9876/cgi-bin/wake?token=<TOKEN>
```

* GitHub 仓库：`https://github.com/xusu616/Remote_HID_computer_power_switch_solution`
* GitLab 仓库与 Release 下载：`https://gitlab.com/xusu616/remote_hid_computer_power_switch_solution`
