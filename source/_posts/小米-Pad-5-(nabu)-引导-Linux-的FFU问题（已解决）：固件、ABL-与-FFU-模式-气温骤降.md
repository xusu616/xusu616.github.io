---
title: 小米 Pad 5 (nabu) 引导 Linux 的FFU问题（已解决）：固件、ABL 与 FFU 模式 - 气温骤降
tags:
  - Android架构和安全
  - 刷机
categories:
  - [Android架构和安全, 刷机]
date: 2026-01-05 13:38:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19444810
---

折腾了一个星期还是总结一下吧 在为小米 Pad 5 部署 Arch Linux ARM 的过程中，我发现，可能因为刷入了其他 Android 系统版本，回避了某些固件更新（hyperOS），导致无法顺利加载 UEFI 镜像（它确实在工作，但是无法找到要引导的系统，我确认ESP分区里的内容没有异常），甚至会触发罕见 （应该算？） 的安全报错。(应该是FFU 模式，一个二维码和一个扳手，暂时懒得上传图片了（而且我不是很理解产生这种东西的原因，于是先记录一下） 不过看起来大佬们对这个似乎挺感兴趣 1. 固件（Firmware）与系统（ROM）的独立 在 Android...
<!-- more -->

<blockquote>
<p>折腾了一个星期还是总结一下吧<br>
在为小米 Pad 5 部署 Arch Linux ARM 的过程中，我发现，可能因为刷入了其他 Android 系统版本，回避了某些固件更新（hyperOS），导致无法顺利加载 UEFI 镜像（它确实在工作，但是无法找到要引导的系统，<strong>我确认ESP分区里的内容没有异常</strong>），甚至会触发<em>罕见</em> <s>（应该算？）</s> 的安全报错。<em>(应该是FFU 模式，一个二维码和一个扳手，暂时懒得上传图片了（而且我不是很理解产生这种东西的原因，于是先记录一下）</em><br>
<s>不过看起来大佬们对这个似乎挺感兴趣</s></p>
</blockquote>
<p><img src="https://img2024.cnblogs.com/blog/3673875/202602/3673875-20260204113547503-336477078.jpg" alt="IMG_20260104_145731_868" loading="lazy"></p>
<h1 id="1-固件firmware与系统rom的独立">1. 固件（Firmware）与系统（ROM）的独立</h1>
<p>在 Android 设备的架构中，底层固件与操作系统分区是相互独立的。</p>
<p>操作系统 (ROM)：存储在 /system, /vendor, /boot 等分区，包含 Android 内核（我们的eufi.zip似乎分两种形式，内核补丁型和替换boot到rEFInd镜像，不过似乎还有第三种uboot？）</p>
<p>底层固件 (Firmware)：存储在 ABL, XBL, DSP, Modem 等分区。这些组件在 Android 内核启动之前运行，负责硬件初始化和安全校验（我们在这里只关心ABL</p>
<p>刷入第三方 ROM（Custom ROM，如 DerpFest 或移植版 HyperOS）通常只更新系统分区，而不会触动底层的固件，但似乎，从MIUI到hyperOS的更新会动固件？）</p>
<h1 id="2-abl">2. ABL</h1>
<p>ABL (Android Bootloader) 是高通平台设备引导链中的关键一环。它负责验证 boot 分区的签名并加载内核。<br>
看起来应该是能正常引导的？比如硅eufi？它并不会直接拒绝它<br>
但是可能是由于它从未升级过hyperOS，导致ABL或者相关固件不通过？</p>
<h1 id="3-ffu-模式较为罕见的扳手与二维码界面">3. FFU 模式：较为罕见的“扳手与二维码”界面</h1>
<p>当高版本 ABL 检测到未经授权的引导尝试或底层固件不匹配时，会触发一种特殊的保护状态。<br>
即上述操作导致的结果</p>
<h1 id="4-等期末周过去后尝试操作与总结-">~~4. 等期末周过去后尝试操作与总结 ~~</h1>
<p><s>在折腾移动设备时，要关注底层的固件版本</s><br>
使用一个脚本最终解决了，自动分区并且使用其他办法sideload<br>
详情参考https://github.com/nabu-alarm/installation-guide/blob/main/guide/English/install.md<br>
不过说实话，很奇怪，我手动分区完全正确，其他步骤一样，但是不能成功？</p>
