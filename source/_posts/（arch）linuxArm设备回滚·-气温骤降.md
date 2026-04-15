---
title: （arch）linuxArm设备回滚· - 气温骤降
tags:
  - 刷机
excerpt: >-
  LinuxArm 一般没有 btrfs 文件系统（至少我尝试过，它拒绝格式化为这种文件类型，所以快照回滚肯定不行 arch官方并没有arm的回滚机
  第三方回滚镜像站 如果问题不是特别严重，最好先尝试 sudo pacman -U /var/cache/pacman/pkg/<软件包名>-<版本号>.
date: 2026-04-15 12:26:00
---

LinuxArm 一般没有 btrfs 文件系统（至少我尝试过，它拒绝格式化为这种文件类型，所以快照回滚肯定不行 arch官方并没有arm的回滚机 第三方回滚镜像站 如果问题不是特别严重，最好先尝试 sudo pacman -U /var/cache/pacman/pkg/<软件包名>-<版本号>.
<!-- more -->
【摘要】LinuxArm 一般没有 btrfs 文件系统（至少我尝试过，它拒绝格式化为这种文件类型，所以快照回滚肯定不行 arch官方并没有arm的回滚机 第三方回滚镜像站 如果问题不是特别严重，最好先尝试 sudo pacman -U /var/cache/pacman/pkg/<软件包名>-<版本号>. [阅读全文](https://www.cnblogs.com/xvsu/p/19873835)