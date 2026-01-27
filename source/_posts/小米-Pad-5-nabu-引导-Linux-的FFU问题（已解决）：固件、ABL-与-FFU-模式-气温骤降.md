---
title: 小米 Pad 5 (nabu) 引导 Linux 的FFU问题（已解决）：固件、ABL 与 FFU 模式 - 气温骤降
tags:
  - 刷机
  - Android架构和安全
excerpt: >-
  折腾了一个星期还是总结一下吧 在为小米 Pad 5 部署 Arch Linux ARM 的过程中，我发现，可能因为刷入了其他 Android
  系统版本，回避了某些固件更新（hyperOS），导致无法顺利加载 UEFI
  镜像（它确实在工作，但是无法找到要引导的系统，我确认ESP分区里的内容没有异常），
date: 2026-01-05 13:38:00
---

折腾了一个星期还是总结一下吧 在为小米 Pad 5 部署 Arch Linux ARM 的过程中，我发现，可能因为刷入了其他 Android 系统版本，回避了某些固件更新（hyperOS），导致无法顺利加载 UEFI 镜像（它确实在工作，但是无法找到要引导的系统，我确认ESP分区里的内容没有异常），
<!-- more -->
【摘要】 [阅读全文](https://www.cnblogs.com/xvsu/p/19444810)