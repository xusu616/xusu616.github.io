---
title: 给所有OPPO R7(t)及其子型号刷机的教程和资源及mtkclient和SP flash tool冲突1013解决（包括R7f R7 R7splus R7c R7sf R7sm R7c 及其所有plus的型号的ROM资源） - 气温骤降
tags:
  - 刷机
categories:
  - Android架构和安全
  - 刷机
date: 2026-02-04 03:24:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19573235
---

1.刷机前一定要注意rec一定要刷入自定义的rec 进入sp刷入 否则无法运行ORS脚本，导致卡死在原生recovery的第一屏，无法进入系统 R7t(联发科)可长按音量上键和关机键，熄屏立刻松开关机，关机后按音量上键，插线进入mtk深刷，SPflashtool选择 下载 较新的SP flash tool 是无法使用的 mtkclient是无法使用的，无法和老旧的芯片通信 SPflashTools所需要的端口会因为被mtkclient所需要的UsbDk劫持端口 解决方法：卸载UsbDk驱动，重新安装一遍mtk的官方驱动，最新亦可...
<!-- more -->

<h1 id="1刷机前一定要注意rec一定要刷入自定义的rec">1.刷机前一定要注意rec一定要刷入自定义的rec</h1>
<p>进入sp刷入<br>
否则无法运行ORS脚本，导致卡死在原生recovery的第一屏，无法进入系统<br>
R7t(联发科)可长按音量上键和关机键，熄屏立刻松开关机，关机后按音量上键，插线进入mtk深刷，SPflashtool选择 下载<br>
<strong>较新的SP flash tool 是无法使用的</strong><br>
<strong>mtkclient是无法使用的，无法和老旧的芯片通信</strong></p>
<p><strong>SPflashTools所需要的端口会因为被mtkclient所需要的UsbDk劫持端口</strong><br>
解决方法：卸载UsbDk驱动，重新安装一遍mtk的官方驱动，最新亦可<br>
<img src="https://img2024.cnblogs.com/blog/3673875/202602/3673875-20260204111132381-1878899286.png" alt="image" loading="lazy"></p>
<h1 id="2刷入coloros3稳定ors脚本zip文件文件管理器点击亦可识别">2.刷入colorOS3稳定ORS脚本zip文件（文件管理器点击亦可识别）</h1>
<h1 id="3刷入某贼的ors脚本">3.刷入某贼的ORS脚本</h1>
<h1 id="4然后请不要更新coloros否则会跳rec重启">4.然后请不要更新colorOS，否则会跳REC重启</h1>
<h1 id="5针对r7t解释其他手机我没有">5.针对R7(t)解释，其他手机我没有。。。</h1>
<h1 id="6可以使用adb-getprop确认我在rec里面跑的">6.可以使用adb getprop确认（我在REC里面跑的）</h1>
<pre><code>PS C:\Users\xvsu\Desktop&gt; adb devices

List of devices attached

SKIZJBU8YHJV7SSS        device

PS C:\Users\xvsu\Desktop&gt; adb shell getprop ro.product.model

OPPO R7

PS C:\Users\xvsu\Desktop&gt; adb shell getprop ro.build.product

oppo6752_15011
#显然是联发科芯片mtk6752
</code></pre>
<h1 id="资源">资源</h1>
<p>在萤火虫资源站复活之前，可以直接看萤火虫的123pan<br>
<a href="https://www.123pan.com/s/lod3vd-9OKqd" target="_blank" rel="noopener nofollow">https://www.123pan.com/s/lod3vd-9OKqd</a><br>
路径：全部文件<br>
萤火虫资源站<br>
资源下载<br>
02-手机平板<br>
OPPO-----&gt;</p>
