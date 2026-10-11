---
title: luks2加密后grub解锁磁盘usb不识别的问题
date: 2026-10-11 20:18:00
tags:
  - Linux
categories:
  - Linux
  - 设备维护
excerpt: 其实我一直没有注意到grub启动阶段usb会初始化失败.....
---

# 什么

Grub菜单之前就是GRUB解锁磁盘，读取boot分区

选择 Arch Linux 之后，才是 Linux 的 initramfs 再次解锁根分区

~~所以，嗯就是修这个问题，但是其实也不是大问题反正就是水博客~~

# 打开相关的配置文件

~~我不知道这个叫什么名字~~

然后就是

```conf
sudo nano /etc/mkinitcpio.conf
```

~~或者就叫`mkinitcpio`得了（（~~

找到在使用的HOOKS=(的那一行

`sudo mkinitcpio -P`

像这样放在前面

```conf
HOOKS=(base systemd keyboard autodetect microcode modconf kms sd-vconsole block sd-encrypt filesystems fsck........)
```
