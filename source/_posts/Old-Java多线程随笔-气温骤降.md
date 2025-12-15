---
title: Old-Java多线程随笔 - 气温骤降
tags:
  - java
excerpt: >-
  1. Runnable / Future / FutureTask 关系 Runnable 接口 无返回值 不能抛出受检异常 只有： void run();
  Future 接口：表示异步任务的结果 常用方法： V get(); // 阻塞等待获取结果 boolean cancel(); boolea
date: 2025-12-11 03:05:00
---

1\. Runnable / Future / FutureTask 关系 Runnable 接口 无返回值 不能抛出受检异常 只有： void run(); Future 接口：表示异步任务的结果 常用方法： V get(); // 阻塞等待获取结果 boolean cancel(); boolea
<!-- more -->
【摘要】 [阅读全文](https://www.cnblogs.com/xvsu/p/19335065)