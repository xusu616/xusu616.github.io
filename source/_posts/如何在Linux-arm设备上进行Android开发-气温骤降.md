---
title: 如何在Linux arm设备上进行Android开发 - 气温骤降
tags:
  - Android
date: 2026-04-01 15:49:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19809032
---

PS:应该有替换的办法让Android studio能在arm设备上面使用，未知的对compose UI实时渲染和性能表现，你可以去试试！ 我使用的时IDEA的Linux arm版本，但是这样还不够，下面会补充如何让它正常跑起来（当然，对compose实时渲染的支持是没有的 但是，GitHub已经有支持苹果M1（arm架构芯片）的Android studio（unofficial），所以还是很有希望的！ 顺带一提，没有支持arm的NDK开发 下载 嗯，就是下载，下载arm版本的idea 安装 安装后，安装Android插件 在进入一些地方的时候会提示你补全插件应该 补全编译工具...
<!-- more -->

<blockquote>
<p>PS:应该有替换的办法让Android studio能在arm设备上面使用，未知的对compose UI实时渲染和性能表现，你可以去试试！<br>
我使用的时IDEA的Linux arm版本，但是这样还不够，下面会补充如何让它正常跑起来（当然，<strong>对compose实时渲染的支持是没有的</strong><br>
但是，GitHub已经有支持苹果M1（arm架构芯片）的Android studio（unofficial），所以还是很有希望的！<br>
顺带一提，没有支持arm的NDK开发</p>
</blockquote>
<h1 id="下载">下载</h1>
<p>嗯，就是下载，下载arm版本的idea</p>
<h1 id="安装">安装</h1>
<p>安装后，安装Android插件<br>
在进入一些地方的时候会提示你补全插件应该</p>
<h1 id="补全编译工具">补全编译工具</h1>
<p><a href="https://github.com/lzhiyong/android-sdk-tools" target="_blank" rel="noopener nofollow">https://github.com/lzhiyong/android-sdk-tools</a><br>
下载后，解压，放在对应的文件夹<br>
编译构建时要给它指定此aapt2的路径<br>
加入gradle.properties中</p>
```properties
android.aapt2FromMavenOverride=/YOUR_ANDROID_SDK_PATH/build-tools/aapt2
```
<p>顺带一提AGP似乎最高只支持8.12.0（目前（比正常电脑慢一点</p>
