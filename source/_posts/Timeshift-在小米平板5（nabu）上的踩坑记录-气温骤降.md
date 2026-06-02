---
title: Timeshift 在小米平板5（nabu）上的踩坑记录 - 气温骤降
tags:
  - 刷机
date: 2026-05-02 03:14:00
cnblogs_url: https://www.cnblogs.com/xvsu/p/19965964
---

设备：小米平板5（codename: nabu） 系统：Arch Linux ARM，内核 6.14 桌面：KDE Plasma 6（X11） 1 ｜安装时镜像源 404 安装 Timeshift 时遇到 rsync 包下载失败： 错误：无法从 mirrors.tuna.tsinghua.edu.cn 获取文件 'rsync-3.4.1-2-aarch64.pkg.tar.xz' The requested URL returned error: 404 原因：镜像源同步延迟，某个版本的包还没同步过来 ～～（虽然没必要提的，但是arch...
<!-- more -->

<blockquote>
<p>设备：小米平板5（codename: nabu）<br>
系统：Arch Linux ARM，内核 6.14<br>
桌面：KDE Plasma 6（X11）</p>
</blockquote>
<h2 id="1-安装时镜像源-404">1 ｜安装时镜像源 404</h2>
<p>安装 Timeshift 时遇到 rsync 包下载失败：</p>
<pre><code>错误：无法从 mirrors.tuna.tsinghua.edu.cn 获取文件 'rsync-3.4.1-2-aarch64.pkg.tar.xz'
The requested URL returned error: 404
</code></pre>
<p><strong>原因</strong>：镜像源同步延迟，某个版本的包还没同步过来　～～（虽然没必要提的，但是arch arm真的太难搞了，还是去arch上面折腾滚动更新好了）～～</p>
<p><strong>解决方法</strong>：</p>
<pre><code class="language-bash">sudo pacman -Syy        # 强制刷新数据库
sudo pacman -Syu        # 完整滚动更新后再装
sudo pacman -S timeshift
</code></pre>
<p>注意：不要只用 <code>-Sy</code> 然后装单包，这会导致 partial upgrade，可能引发 so 库版本不匹配。</p>
<p>---</p>
<h2 id="二gui-备份卡死各种奇怪位置卡住--我也不知道这是为什么反正写一下吧--arch-arm-很多包都是自动构建的出点问题也正常但是应该不是这个问题导致卡住的应该是快照同步完了的但是因为某些原因infojson无法写入">二：GUI 备份卡死，各种奇怪位置卡住  <s>（我也不知道这是为什么，反正写一下吧</s>  arch arm 很多包都是自动构建的，出点问题也正常，但是应该不是这个问题导致卡住的，应该是快照同步完了的，但是因为某些原因，info.json无法写入</h2>
<p><strong>（这些都不是问题，第四个应该才是问题的原因）</strong> ）</p>
<p>打开 Timeshift GUI 开始备份后，进度条卡在各种目录：</p>
<ul>
<li><code>/var/log/journal/</code>（journal 日志）</li>
<li><code>/var/lib/systemd/coredump/</code>（崩溃转储）</li>
<li><code>/var/spool/plymouth/</code>（开机动画临时文件）</li>
<li><code>/usr/src/linux-nabu</code>（内核源码，体积巨大）</li>
<li><code>/usr/share/zsh/site-functions/</code>（小文件但大量）</li>
</ul>
<p><strong>解决方法</strong>：在 Timeshift 设置 → 过滤器中添加排除项：</p>
<pre><code>/var/log/\*\*
/var/tmp/\*\*
/var/cache/\*\*
/var/spool/\*\*
/var/opt/\*\*
/var/lib/systemd/coredump/\*\*
/usr/src/\*\*
/proc/\*\*
/sys/\*\*
/dev/\*\*
/run/\*\*
/tmp/\*\*
/timeshift/\*\*
</code></pre>
<p>这些目录对系统回滚没有意义，全部排除。</p>
<p>顺手清理 journal 日志减少首次备份体积：</p>
<pre><code class="language-bash">sudo journalctl --vacuum-size=200M
</code></pre>
<p>---</p>
<h2 id="三rsync-被-oom-killer-杀死">三：rsync 被 OOM killer 杀死</h2>
<p>加了排除项后还是卡死。用另一个终端监控：</p>
<pre><code class="language-bash">watch -n 2 'free -h \&amp;\&amp; ps aux | grep rsync'
</code></pre>
<p>发现 rsync 进程消失了，内存从 2.9G 可用降到 200M 左右后进程消失。</p>
<p>查日志确认：</p>
<pre><code class="language-bash">sudo journalctl -b -1 | grep -i "oom\\|killed process\\|out of memory"
</code></pre>
<p>输出：</p>
<pre><code>kernel: OOM killer disabled.
kernel: OOM killer enabled.
</code></pre>
<p>Timeshift 备份时主动禁用了 OOM killer （但是这里也能讲一下</p>
<p><strong>解决方法</strong>：备份前释放内存，关掉大内存进程：</p>
<pre><code class="language-bash">sudo systemctl stop *****a
sudo sync \&amp;\&amp; echo 3 | sudo sh -c 'echo 3 &gt; /proc/sys/vm/drop\_caches'
</code></pre>
<p>或者切换到 TTY 关掉桌面环境：</p>
<pre><code class="language-bash"># Ctrl+Alt+F2 进入 TTY
sudo systemctl stop sddm
sudo timeshift --create --comments "首次快照"
</code></pre>
<p>---<br>
（这些都不是问题，第四个应该才是问题的原因）</p>
<h2 id="四rsync-成功但-infojson-没有写入">四：rsync 成功但 info.json 没有写入</h2>
<p>进了 TTY，内存充裕，rsync 跑完了（exit_code: 0），但 Timeshift 界面显示"0 个快照"。</p>
<p>查 Timeshift 日志：</p>
<pre><code class="language-bash">cat /var/log/timeshift.log
</code></pre>
<p>关键内容：</p>
<pre><code>\[12:29:11] export LC\_ALL=C.UTF-8 rsync -aii --recursive ...
\[12:32:55] AsyncTask: finish(): enter
\[12:32:55] exit\_code: 0
\[12:33:32] loading snapshots from '...snapshots': 0 found
</code></pre>
<p>rsync 成功结束，但 Timeshift 跳过了写 <code>info.json</code> 这一步，直接去扫描快照目录，发现空的就报"0 个快照"。</p>
<p>查看快照目录：</p>
<pre><code class="language-bash">ls /timeshift/snapshots/2026-05-01\_15-15-45/
# 输出：exclude.list  localhost  rsync-log  rsync-log-changes
# 缺少 info.json
</code></pre>
<p><strong>原因</strong>：推测是 Timeshift 在 ARM 平台上的 bug，rsync 子进程结束信号处理存在竞态条件，导致写 info.json 的步骤被跳过。</p>
<p><strong>解决方法</strong>：手动写 info.json：</p>
<pre><code class="language-bash">sudo nano /timeshift/snapshots/2026-05-01\_15-15-45/info.json
</code></pre>
<pre><code class="language-json">{
  "uuid" : "2026-05-01\_15-15-45",
  "name" : "2026-05-01\_15-15-45",
  "sys\_uuid" : "你的分区UUID",
  "date" : "2026-05-01 15:15:45",
  "date\_formatted" : "2026-05-01 15:15:45",
  "description" : "手动修复",
  "tags" : "O",
  "backup\_parent\_uuid" : "",
  "live\_snapshot" : false,
  "written\_to\_disk" : true
}
</code></pre>
<p>获取分区 UUID：</p>
<pre><code class="language-bash">sudo blkid /dev/sda32
</code></pre>
<p>日期格式参考 Timeshift 设置 → 杂项中显示的格式：<code>%Y-%m-%d %H:%M:%S</code>。</p>
<p>写完后重启 Timeshift GUI 即可识别到快照（时间显示可能有偏差，不影响回滚功能）（但是不知道为什么，这样设置之后仍然有bug，显示是1970年的快照（）</p>
<p>---</p>
<h2 id="五gui-备份彻底卡死timeshift-cpu-99rsync-不存在">五：GUI 备份彻底卡死（timeshift CPU 99%，rsync 不存在）</h2>
<p>最诡异的情况：Timeshift 进程 CPU 占用 99%，但 ps 里根本没有 rsync 子进程，界面显示"正在同步"但什么都没发生。</p>
<pre><code class="language-bash">sudo ps aux | grep rsync
# 只有 grep 自己，没有 rsync
</code></pre>
<p>同时 top 里出现：</p>
<pre><code>kworker/u32:1-ufs\_clkscaling\_0
</code></pre>
<p><strong>原因</strong>：nabu 的 UFS 存储时钟调频驱动（<code>ufs\_clkscaling</code>）在持续 IO 时可能触发问题，导致 Timeshift 在启动 rsync 之前就卡住了。这是底层驱动的已知问题，不是 Timeshift 本身的 bug （ <strong>但是原因真的是这个的话，我不认为nabu会在固定 20万个文件的时候卡住，20多万个文件应该是我总的需要备份的文件，备份完成之后没有写入info.json而已，因为我查看过进程，一切都是正常为0结束的</strong> ）</p>
<p><strong>解决方法</strong>：放弃 Timeshift GUI，直接用 rsync 手动备份：</p>
<pre><code class="language-bash">sudo rsync -aAXv \\
  --exclude='/proc/\*\*' \\
  --exclude='/sys/\*\*' \\
  --exclude='/dev/\*\*' \\
  --exclude='/run/\*\*' \\
  --exclude='/tmp/\*\*' \\
  --exclude='/var/log/\*\*' \\
  --exclude='/var/cache/\*\*' \\
  --exclude='/var/tmp/\*\*' \\
  --exclude='/var/spool/\*\*' \\
  --exclude='/usr/src/\*\*' \\
  --exclude='/home/\*\*' \\
  --exclude='/timeshift/\*\*' \\
  / /timeshift/snapshots/manual-backup-1/
</code></pre>
<p>这次完全没有卡，257,026 个文件，16.7GB，顺利完成。</p>
<p><strong>结论</strong>：Timeshift 的进程管理层在 nabu 上有问题，但底层 rsync 和 UFS 本身是正常的。</p>
<p>---</p>
<h2 id="回滚方法">回滚方法</h2>
<p>需要回滚时，从 OrangeFox Recovery 或其他外部环境执行：</p>
<pre><code class="language-bash">sudo rsync -aAXv \\
  --exclude='/proc/\*\*' \\
  --exclude='/sys/\*\*' \\
  --exclude='/dev/\*\*' \\
  --exclude='/run/\*\*' \\
  --exclude='/tmp/\*\*' \\
  / /timeshift/snapshots/manual-backup-1/localhost/ /
</code></pre>
<p>源和目标对调即可。</p>
<p>---</p>
<h2 id="增量备份方案">增量备份方案</h2>
<p>使用 <code>--link-dest</code> 参数实现硬链接增量，新快照中没有变化的文件直接硬链接到上一个快照，几乎不占额外空间：</p>
<pre><code class="language-bash">sudo rsync -aAXv --delete \\
  --exclude='/proc/\*\*' \\
  --exclude='/sys/\*\*' \\
  --exclude='/dev/\*\*' \\
  --exclude='/run/\*\*' \\
  --exclude='/tmp/\*\*' \\
  --exclude='/var/log/\*\*' \\
  --exclude='/var/cache/\*\*' \\
  --exclude='/var/tmp/\*\*' \\
  --exclude='/var/spool/\*\*' \\
  --exclude='/usr/src/\*\*' \\
  --exclude='/home/\*\*' \\
  --exclude='/timeshift/\*\*' \\
  --link-dest=/timeshift/snapshots/manual-backup-1/localhost/ \\
  / /timeshift/snapshots/manual-backup-2/localhost/
</code></pre>
<p>这就是 Timeshift rsync 模式的底层原理，手动实现完全等价。</p>
<p>---</p>
<h2 id="总结">总结</h2>
<table>
<thead>
<tr>
<th>问题</th>
<th>原因</th>
<th>解决方案</th>
</tr>
</thead>
<tbody>
<tr>
<td>镜像源 404</td>
<td>ARM 镜像同步延迟</td>
<td><code>pacman -Syy</code> 后完整更新</td>
</tr>
<tr>
<td>备份卡在特定目录</td>
<td>大文件/活跃写入文件</td>
<td>添加排除项</td>
</tr>
<tr>
<td>rsync 被杀</td>
<td>内存不足触发 OOM</td>
<td>关桌面进入 TTY 再备份</td>
</tr>
<tr>
<td>备份完成但找不到快照</td>
<td>info.json 未写入（ARM bug）</td>
<td>手动写 info.json</td>
</tr>
<tr>
<td>GUI 完全卡死不启动 rsync</td>
<td>UFS 驱动问题</td>
<td>放弃 GUI，直接用 rsync</td>
</tr>
</tbody>
</table>
