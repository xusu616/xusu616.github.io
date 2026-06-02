---
title: （arch）linuxArm设备回滚· - 气温骤降
tags:
  - 刷机
date: 2026-04-15 12:26:00
cnblogs_url: https://www.cnblogs.com/xvsu/p/19873835
---

LinuxArm 一般没有 btrfs 文件系统（至少我尝试过，它拒绝格式化为这种文件类型，所以快照回滚肯定不行 arch官方并没有arm的回滚机 第三方回滚镜像站 如果问题不是特别严重，最好先尝试 sudo pacman -U /var/cache/pacman/pkg/<软件包名>-<版本号>.pkg.tar.zst 回滚你觉得有问题的那个包 sudo nano /etc/pacman.d/mirrorlist Server = https://pkgmirror.sametimetomorrow.net/$arch/repos/2026/03/08/$repo...
<!-- more -->

<blockquote>
<p>LinuxArm 一般没有 btrfs 文件系统（至少我尝试过，它拒绝格式化为这种文件类型，所以快照回滚肯定不行<br>
arch官方并没有arm的回滚机</p>
</blockquote>
<h1 id="第三方回滚镜像站">第三方回滚镜像站</h1>
<blockquote>
<p>如果问题不是特别严重，最好先尝试 sudo pacman -U /var/cache/pacman/pkg/&lt;软件包名&gt;-&lt;版本号&gt;.pkg.tar.zst<br>
回滚你觉得有问题的那个包</p>
</blockquote>
<pre><code class="language-Bash">sudo nano /etc/pacman.d/mirrorlist
</code></pre>
<pre><code class="language-Bash">Server = https://pkgmirror.sametimetomorrow.net/$arch/repos/2026/03/08/$repo
#注释掉你用的其他镜像
</code></pre>
<pre><code class="language-Bash">pacman -Syy &amp;&amp; pacman -Syuu
</code></pre>
<p>或者</p>
<pre><code class="language-Bash">pacman -Syyuu
</code></pre>
<p>我感觉是一样的<br>
如果不行，而且能确定目标版本安全，我觉得遇到问题不用一个一个改</p>
<pre><code class="language-Bash">pacman -Syyuu --overwrite "*"
</code></pre>
<p>我不确定这对滚动发行版有什么致命的问题，反正我是这样回滚的, 没什么事</p>
<h1 id="tty">tty</h1>
<p>如果滚挂到了桌面都进不去的底部，可以尝试按 ctrl alt + F2 (F1 -F6都可以试试)<br>
进入虚拟终端，按ctrl alt F1退出</p>
<h1 id="高dpi的设备字体可能很小">高DPI的设备字体可能很小</h1>
<p>先看有哪些字体</p>
<pre><code class="language-Bash">ls /usr/share/kbd/consolefonts/
</code></pre>
<p>应该尝试带 32 字样的字体</p>
<pre><code class="language-Bash">sudo setfont NAME_OF_FONT
</code></pre>
<h1 id="回滚时候如果网络挂了">回滚时候如果网络挂了</h1>
<p>在tty里面</p>
<pre><code class="language-Bash">sudo nmcli --ask device wifi connect "NAME_OF_YOUR_WIFI"
</code></pre>
<p>然后输入密码</p>
