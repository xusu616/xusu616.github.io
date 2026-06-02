---
title: Android安全认证机制 - 气温骤降
tags:
  - Android架构和安全
date: 2025-12-16 01:07:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19355259
---

信任根 一切安全都始于硬件。 Android 的信任链始于设备中不可更改的，受保护的硬件区域（即使解锁bootloader刷机也不会被破坏 硬件信任根仍然会验证 Bootloader 的第一阶段代码。然而，一旦 Bootloader 被解锁，它在执行时会有条件地跳过或忽略对后续分区的验证） 即硬件信任根（Hardware Root of Trust） 工作方式： 在设备启动的最初阶段，芯片上的固件会验证下一阶段引导加载程序（Bootloader）的数字签名。如果签名不匹配或被篡改，启动过程将立即停止。 dm-verity Android早期 (Android 4.4 - Android...
<!-- more -->

<h1 id="信任根">信任根</h1>
<blockquote>
<p>一切安全都始于硬件。</p>
</blockquote>
<p>Android 的信任链始于设备中不可更改的，受保护的硬件区域（即使解锁bootloader刷机也不会被破坏  <em>硬件信任根仍然会验证 Bootloader 的第一阶段代码。然而，一旦 Bootloader 被解锁，它在执行时会有条件地跳过或忽略对后续分区的验证</em>）<br>
即<strong>硬件信任根（Hardware Root of Trust）</strong></p>
<blockquote>
<p>工作方式： 在设备启动的最初阶段，芯片上的固件会验证下一阶段引导加载程序（Bootloader）的数字签名。如果签名不匹配或被篡改，启动过程将立即停止。</p>
</blockquote>
<h1 id="dm-verity">dm-verity</h1>
<p>Android早期  (Android 4.4 - Android 7.x) 的认证方式</p>
<p>主要针对系统的只读分区，例如 /system /vendor 和 /product进行认证</p>
<h1 id="avb">AVB</h1>
<p>Android8以后将dm包含在AVB当中</p>
<p>执行者： 主要由设备的引导加载程序 (Bootloader) 和 AVB 库执行</p>
<p>验证对象： 验证分区镜像（如 boot.img、dtbo.img）的数字签名和元数据</p>
<h2 id="后续引入super分区">后续引入super分区</h2>
<blockquote>
<p><strong>Super 分区（Dynamic Partitions）</strong>是在 Android 10 (Q) 引入，并在 Android 11 中普及的技术，它的目的主要是为了实现 OTA 升级时系统分区大小的动态调整。</p>
</blockquote>
<p>AVB 不直接对 Super 分区作为一个整体进行数字签名验证。验证过程发生在启动的第一阶段 init 中：</p>
<p><s>Android的启动流程不用写了吧，大概知道就好了</s></p>
<p>验证 Super 分区的元数据： Super 分区包含一张表，列出了其中所有<strong>逻辑分区</strong>的名称、大小和位置信息，将会验证它们</p>
<blockquote>
<p>AVB 的验证流程会确保这张元数据表本身是经过验证的，以防止攻击者修改逻辑分区的映射关系。<br>
验证逻辑分区的内容： Super 分区包含的这些逻辑子分区（如 system、vendor）<strong>仍然需要被验证</strong><br>
在启动的第一阶段 init，系统会解析 Super 分区元数据，并为每个逻辑分区创建虚拟块设备（<strong>抽象为物理固件，让其可被使用？</strong>）<br>
每个逻辑分区都采用 hashtree 类型，也就是 dm-verity 验证机制。<br>
AVB 信任链中被验证的 vbmeta 仍然包含这些逻辑分区的 dm-verity 根哈希值。<br>
只有在 dm-verity 校验通过后，这些逻辑分区才会被挂载，并在运行时受到 dm-verity 的保护。</p>
</blockquote>
