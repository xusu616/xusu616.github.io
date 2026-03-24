---
title: Xiaomi pad 5(nabu)（或者其他Linux arm设备？）屏幕休眠时Kernel panic的解决办法 - 气温骤降
tags:
  - 刷机
  - Android架构和安全
  - Android
excerpt: >-
  现象： 休眠后会自动关机 修复 排除 journalctl -b -1 -p 3 -n 233 -b -1：查看上一次启动（即崩溃前）的记录 -p
  3：只看Error级别以上的日志 -n 9178：看上次多少条 点击查看崩溃日志 [xvsu@alarm ~]$ journalctl -b -1 -p
date: 2026-03-24 07:12:00
---

现象： 休眠后会自动关机 修复 排除 journalctl -b -1 -p 3 -n 233 -b -1：查看上一次启动（即崩溃前）的记录 -p 3：只看Error级别以上的日志 -n 9178：看上次多少条 点击查看崩溃日志 \[xvsu@alarm ~\]$ journalctl -b -1 -p
<!-- more -->
【摘要】 [阅读全文](https://www.cnblogs.com/xvsu/p/19764162)