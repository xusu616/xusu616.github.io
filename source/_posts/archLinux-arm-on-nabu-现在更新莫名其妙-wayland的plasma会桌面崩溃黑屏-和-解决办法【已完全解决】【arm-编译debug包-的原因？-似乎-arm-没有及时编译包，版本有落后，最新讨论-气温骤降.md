---
title: archLinux arm on nabu 现在更新莫名其妙 wayland的plasma会桌面崩溃黑屏 和 解决办法【已完全解决】【arm 编译debug包 的原因？ 似乎 arm 没有及时编译包，版本有落后，最新讨论在GitHub的issue上】 - 气温骤降
tags:
  - 刷机
date: 2026-05-02 03:28:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19965982
categories:
    - Linux
    - 设备维护
---

【请点击阅读全文】 我重装系统也会出现这种问题，我确信是软件包问题 我已向 kde 发起（参与）错误报告： https://bugs.kde.org/show_bug.cgi?id=519874 现在你可以去看GitHub fcitx5的仓库的issue https://github.com/fcitx/fcitx5/issues/1573#issue-4558411007 解决办法在那里了，我直接复制过来 解决办法 升级后会遇到崩溃问题 请 sudo mv...
<!-- more -->

<blockquote>
<p>【请点击阅读全文】<br>
我重装系统也会出现这种问题，我确信是软件包问题<br>
我已向 kde 发起（参与）错误报告：<br>
<a href="https://bugs.kde.org/show_bug.cgi?id=519874" target="_blank" rel="noopener nofollow">https://bugs.kde.org/show_bug.cgi?id=519874</a><br>
现在你可以去看GitHub fcitx5的仓库的issue<br>
<a href="https://github.com/fcitx/fcitx5/issues/1573#issue-4558411007" target="_blank" rel="noopener nofollow">https://github.com/fcitx/fcitx5/issues/1573#issue-4558411007</a><br>
解决办法在那里了，我直接复制过来</p>
</blockquote>
<h1 id="解决办法">解决办法</h1>
<p>升级后会遇到崩溃问题<br>
请<br>
sudo mv /usr/lib/qt6/plugins/platforminputcontexts/libfcitx5platforminputcontextplugin.so ~/</p>
<p>如果有人能有足够时间的话<br>
<a href="https://bugs.kde.org/show_bug.cgi?id=519874" target="_blank" rel="noopener nofollow">https://bugs.kde.org/show_bug.cgi?id=519874</a><br>
请去这里反馈bug，目前需要使用debug包来gdb<br>
我正在努力找时间编译，如果你也遇到了这个问题，请一起提交反馈这个bug</p>
<h1 id="旧的解决办法换成x11不应该这样做-应该这样">旧的解决办法（换成x11（不应该这样做） 应该这样）</h1>
<p>It was resolved (It took me a few days but I finally solved it simply)</p>
<p>Uninstalling maliit-keyboard</p>
<p>Then I<br>
kwriteconfig6 --file kwinrc --group org.kde.kdecoration2 --key library ""<br>
kwriteconfig6 --file kwinrc --group org.kde.kdecoration2 --key NoPlugin true<br>
qdbus6 org.kde.KWin /KWin reconfigure</p>
<p>Then<br>
kwriteconfig6 --file kwinrc --group org.kde.kdecoration2 --key NoPlugin false<br>
kwriteconfig6 --file kwinrc --group org.kde.kdecoration2 --key library "org.kde.breeze"</p>
<p>BTW<br>
Just restart sddm isn't useful<br>
Doing a full system reboot</p>
<h2 id="状态">状态</h2>
<p>我的小米平板5装了个双系统，Android和Arch Linux ARM共存。某天更新完之后，KDE桌面进去就黑屏，什么都没有</p>
<h2 id="症状">症状</h2>
<p>进桌面就黑屏。不动它不崩，一打开窗口就崩。<code>journalctl</code>里一堆<code>SIGBUS (signal 7)</code>，<code>plasmashell</code>、<code>ksplashqml</code>、<code>konsole</code>轮流崩给你看，连负责报告崩溃的<code>drkonqi</code>自己也崩了。</p>
<h2 id="排查过程">排查过程</h2>
<ul>
<li>以为是<code>rav1e</code>库缺失（装上之后没用）</li>
<li>以为是DRM权限问题（加了<code>video</code>组之后没用）</li>
<li>以为是配置文件里引用了缺失的<code>icontasks</code> plasmoid（改掉之后还是崩）</li>
<li>回滚<code>plasma-workspace</code>和<code>kwin</code>（没用）</li>
<li>重置所有KDE配置文件（没用）</li>
<li>关闭kwin合成器（没用）</li>
<li>卸载虚拟键盘没有用</li>
<li>既然只是kde的系统窗口崩溃，那就禁用窗口装饰（但是也没用<br>
· 社区找的其他办法，关小东西之类的，也没用</li>
</ul>
<p>最后用<code>coredumpctl</code>看到崩溃发生在<code>libc.so.6</code>里，这在ARM64上通常意味着<strong>内存未对齐访问</strong>，是平台特有的bug，x86上大概不会复现（不知道，我又感觉是软件包问题）（应该是一个库问题（内存对齐），arm应该比x86严格）（或者你可以尝试去GitHub fork的仓库下载其他镜像（这是其中一个）：<a href="https://github.com/LancelotShire/images/actions" target="_blank" rel="noopener nofollow">https://github.com/LancelotShire/images/actions</a></p>
<h2 id="临时解决方案">临时解决方案</h2>
<p>切换到X11 session。</p>
<p>在SDDM登录界面左下角选<code>Plasma (X11)</code>就行。如果没有这个选项，装一下：</p>
```bash
sudo pacman -S plasma-x11-session
```
<p>X11下一切正常，就是拖窗口没Wayland丝滑</p>
<h2 id="其他问题">其他问题：</h2>
<p><strong>0x0.st挂了</strong>：这个常用来上传日志的粘贴站，因为AI bot垃圾上传太多，已经禁用文件上传了。可以用<code>https://paste.rs</code>代替。</p>
<p><strong>代理会拦截curl</strong>：如果你也用*****a之类的透明代理，<code>curl</code>上传日志时会报TLS错误，加<code>--noproxy '*'</code>绕过就行。</p>
<p><strong>linux-firmware不要ignore</strong>：我一直把<code>linux-firmware</code>加在<code>pacman.conf</code>的<code>IgnorePkg</code>里，理由是升级会报文件冲突。正确做法是用<code>--overwrite '*'</code>强制覆盖，不要ignore，否则固件更新会一直跳过 （会有钩子来更新nabu的固件，更新后会出休眠崩溃问题，可以参考我的这篇按博客https://www.cnblogs.com/xvsu/p/19764162<br>
）</p>
<h2 id="已提交bug报告">已提交bug报告</h2>
<p>这个问题已经提交到KDE的bug tracker（<a href="https://bugs.kde.org/show_bug.cgi?id=519874" target="_blank" rel="noopener nofollow">#519874</a>），等上游修复（或者修复不了，还是去折腾x86的arch吧 ）。如果你也是ARM64设备遇到同样问题，可以去那个bug下面+1</p>
