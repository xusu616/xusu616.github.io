---
title: Android系统架构 - 气温骤降
tags:
  - Android架构和安全
date: 2025-12-15 16:34:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19354857
categories:
    - Android
---

没办法基础的东西还是要写一下的 Android架构及拓展图 贴一张官网上修改过后的图片（我会尽量精简内容 其实就是懒得写 总结 我自己写似乎不大好看，直接让ai帮我总结制表了，放前面方便比对看看 建议开电脑看 模块 交互对象 交互方式 稳定性 解释 Android Framework (AOSP/保护) HAL Implementation (Vendor) Binder IPC (橙色) 稳定 上层框架通过标准的 AIDL 接口，利用 Binder 机制调用 HAL 服务。这是 Android 跨进程、跨边界通信的标准方式。 Android Framework (AOSP/保护)...
<!-- more -->

<p><s>没办法基础的东西还是要写一下的</s></p>
<h1 id="android架构及拓展图">Android架构及拓展图</h1>
<p>贴一张官网上修改过后的图片（我会尽量精简内容  <s>其实就是懒得写</s><br>
<img src="https://img2024.cnblogs.com/blog/3673875/202512/3673875-20251216003012919-1988312213.jpg" alt="IMG_20251216_002944" loading="lazy"></p>
<h1 id="总结">总结</h1>
<p><s>我自己写似乎不大好看，直接让ai帮我总结制表了，放前面方便比对看看</s><br>
<strong>建议开电脑看</strong></p>
<table>
<thead>
<tr>
<th style="text-align: left">模块</th>
<th style="text-align: left">交互对象</th>
<th style="text-align: left">交互方式</th>
<th style="text-align: left">稳定性</th>
<th style="text-align: left">解释</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align: left"><strong>Android Framework</strong> (AOSP/保护)</td>
<td style="text-align: left"><strong>HAL Implementation</strong> (Vendor)</td>
<td style="text-align: left"><strong>Binder IPC</strong> (橙色)</td>
<td style="text-align: left"><strong>稳定</strong></td>
<td style="text-align: left">上层框架通过标准的 AIDL 接口，利用 Binder 机制调用 HAL 服务。这是 Android <strong>跨进程、跨边界</strong>通信的标准方式。</td>
</tr>
<tr>
<td style="text-align: left"><strong>Android Framework</strong> (AOSP/保护)</td>
<td style="text-align: left"><strong>Generic Kernel</strong> (AOSP/保护)</td>
<td style="text-align: left"><strong>Binder IPC</strong> (橙色)</td>
<td style="text-align: left"><strong>稳定</strong></td>
<td style="text-align: left">Framework 通过 JNI 或系统调用（System Calls）间接或直接与内核交互，很多系统服务依赖 Binder 驱动。</td>
</tr>
<tr>
<td style="text-align: left"><strong>HAL Implementation</strong> (Vendor)</td>
<td style="text-align: left"><strong>Generic Kernel</strong> (AOSP/保护)</td>
<td style="text-align: left">系统调用/驱动接口</td>
<td style="text-align: left"><strong>稳定</strong></td>
<td style="text-align: left">HAL 进程通过标准 Linux 系统调用或 Binder IPC（调用内核驱动）与内核交互。这个接口必须稳定。</td>
</tr>
<tr>
<td style="text-align: left"><strong>Generic Kernel</strong> (AOSP/保护)</td>
<td style="text-align: left"><strong>GKI Modules</strong> (AOSP/保护)</td>
<td style="text-align: left"><strong>内部内核 API</strong> (虚线)</td>
<td style="text-align: left"><strong>不稳定</strong></td>
<td style="text-align: left">两者共同构成 GKI 内核，由 Google/AOSP 统一维护和发布，内部接口无需承诺稳定。</td>
</tr>
<tr>
<td style="text-align: left"><strong>GKI Modules</strong> (AOSP/保护)</td>
<td style="text-align: left"><strong>Vendor Modules</strong> (Vendor)</td>
<td style="text-align: left"><strong>KMI</strong> (粗黑箭头)</td>
<td style="text-align: left"><strong>稳定</strong></td>
<td style="text-align: left">GKI 架构的<strong>核心</strong>。GKI 内核对 Vendor Modules 暴露的二进制接口是稳定的，允许两者独立更新。</td>
</tr>
<tr>
<td style="text-align: left"><strong>HAL Implementation</strong> (Vendor)</td>
<td style="text-align: left"><strong>Vendor Modules</strong> (Vendor)</td>
<td style="text-align: left"><strong>驱动调用</strong> (虚线)</td>
<td style="text-align: left"><strong>不稳定</strong></td>
<td style="text-align: left">HAL 运行时加载或直接调用 Vendor Modules (驱动程序) 提供的功能。这是<strong>厂商内部</strong>的实现细节，接口稳定性由厂商自行维护。</td>
</tr>
</tbody>
</table>
<h1 id="内核ack到gki">内核（ACK到GKI）</h1>
<h3 id="1旧的内核版本中54以前">1.旧的内核版本中（<strong>5.4以前</strong>）</h3>
<p>Android内核由LTS（Linux那家伙）打补丁而来，导致”一大坨“不一样的内核四处可见，即<strong>内核的碎片化</strong><br>
<strong>可以在图上看到</strong></p>
<h3 id="2gki统一了核心内核">2.GKI统一了核心内核</h3>
<p>将<em>soc和板级支持</em>等作为供应商模块加载</p>
<h1 id="binder">Binder</h1>
<p><strong>进程间的通信机制</strong><br>
基于引用实现，OOP设计，进程抽象为客户端 服务端 和 中间代理<br>
如Android框架与HAL通信（图上）</p>
<h1 id="kmi">KMI</h1>
<p>可以看到，<strong>KMI接口</strong> 将 <strong>Vendor Modules</strong> 和 <strong>GKI Modules</strong>相连接<br>
<em>使得厂家可以不用频繁适配自己的vendor module</em></p>
<h1 id="hal">HAL</h1>
<p>负责硬件和上层应用，<strong>无需调用硬件本身可以实现硬件功能</strong></p>
<h1 id="其他安全相关下次可以随便写写">其他安全相关<s>下次可以随便写写</s></h1>
<p>Context---&gt;SELinux<br>
AVB 早期的DM(dm-verity)机制</p>
