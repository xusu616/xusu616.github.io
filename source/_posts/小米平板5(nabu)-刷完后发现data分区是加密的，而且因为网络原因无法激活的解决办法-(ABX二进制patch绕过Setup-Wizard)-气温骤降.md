---
title: 小米平板5(nabu) 刷完后发现data分区是加密的，而且因为网络原因无法激活的解决办法 (ABX二进制patch绕过Setup Wizard) - 气温骤降
tags:
  - 刷机
  - Android
date: 2026-05-02 02:52:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19965932
categories:
    - Linux
    - 设备维护
---

背景 刷入第三方ROM（如DerpFest）后，首次开机会进入Google激活向导（Setup Wizard）。如果网络无法连接Google服务器，系统会卡在"正在准备您的平板电脑 / 无法连接到互联网"界面，无法进入桌面。 常规解决思路（连VPN、设置WiFi代理）在激活界面操作受限，加上data分区加密，导致大多数ADB绕过方法失效。 本文记录一种通过直接patch ABX二进制设置文件来绕过激活的方法 环境 设备：小米平板5（nabu） ROM：DerpFest Android 16 + arch arm Recovery：PitchBlack...
<!-- more -->

<h2 id="背景">背景</h2>
<p>刷入第三方ROM（如DerpFest）后，首次开机会进入Google激活向导（Setup Wizard）。如果网络无法连接Google服务器，系统会卡在"正在准备您的平板电脑 / 无法连接到互联网"界面，无法进入桌面。</p>
<p><sub>常规解决思路（连VPN、设置WiFi代理）在激活界面操作受限，加上data分区加密，导致大多数ADB绕过方法失效。</sub></p>
<p>本文记录一种通过直接patch ABX二进制设置文件来绕过激活的方法</p>
<hr>
<h2 id="环境">环境</h2>
<ul>
<li>设备：小米平板5（nabu）</li>
<li>ROM：DerpFest Android 16 + arch arm</li>
<li>Recovery：PitchBlack Recovery（TWRP变种）(你可以在这里找到它  <a href="https://github.com/nabu-alarm/installation-guide/releases" target="_blank" rel="noopener nofollow">https://github.com/nabu-alarm/installation-guide/releases</a></li>
</ul>
<hr>
<h3 id="wifi代理方法">WiFi代理方法</h3>
<p>激活界面可以添加WiFi并设置HTTP代理，理论上可以走电脑的***代理出去。操作步骤：</p>
<ol>
<li>电脑***开启Allow LAN</li>
<li>平板添加WiFi时设置代理主机名为电脑局域网IP（如<code>192.168.1.63</code>），端口<code>7890</code></li>
</ol>
<p><strong>问题</strong>：Android激活时发出的是HTTPS请求，HTTP代理对系统级连通性检测（<code>connectivitycheck.gstatic.com</code>）不一定生效，即使手机可以用这个方法，平板的DerpFest版本仍然报告无法连接互联网。</p>
<h3 id="adb直接写入settings">ADB直接写入settings</h3>
<p>通常的绕过方法：</p>
```bash
adb shell settings put global device\_provisioned 1
adb shell settings put secure user\_setup\_complete 1
```
<p><strong>问题</strong>：系统首次启动前ADB默认关闭，进入系统后才有ADB权限，形成死锁。</p>
<h3 id="recovery里执行settings命令">Recovery里执行settings命令</h3>
<p>进入PitchBlack Recovery后ADB可用，但：</p>
```
/system/bin/sh: settings: inaccessible or not found
```
<p>settings命令依赖<code>cmd</code>，而<code>cmd</code>依赖<code>libandroid\_runtime.so</code>等完整Android运行时库，在recovery环境里这些库不存在，无法执行。</p>
<h3 id="挂载其他分区修改文件">挂载其他分区修改文件</h3>
<p>Recovery里尝试挂载product、system_ext分区寻找SetupWizard APK并删除，但：</p>
<ul>
<li><code>mount</code>被fstab锁定，无法手动挂载</li>
<li>data分区加密，首次开机前无法直接访问</li>
</ul>
<p>---</p>
<h2 id="正确思路boot进pitchblack-recovery挂载data">正确思路：Boot进PitchBlack Recovery挂载Data</h2>
<p>PitchBlack Recovery（或TWRP）在Mount界面可以直接勾选Data分区挂载，即使加密也能解密挂载（需要设备没有设置锁屏密码，出厂状态默认可以）。</p>
<p>挂载后通过ADB可以访问<code>/data</code>目录。</p>
<p>---</p>
<h2 id="关键发现settings文件是abx二进制格式">关键发现：settings文件是ABX二进制格式</h2>
<p>Android将settings存储在：</p>
```
/data/system/users/0/settings\_global.xml
/data/system/users/0/settings\_secure.xml
```
<p>虽然扩展名是<code>.xml</code>，实际是**ABX（Android Binary XML）**格式，无法用普通文本编辑器或sed修改。</p>
<p>用<code>grep</code>可以确认：</p>
```bash
grep -i "device\_provisioned" /data/system/users/0/settings\_global.xml
# 输出：Binary file matches
```
<p>---</p>
<h2 id="解决方案python-patch-abx文件">解决方案：Python patch ABX文件</h2>
<h3 id="第一步把文件pull到电脑">第一步：把文件pull到电脑</h3>
```bash
adb pull /data/system/users/0/settings\_global.xml C:\\Desktop\\settings\_global.bin
adb pull /data/system/users/0/settings\_secure.xml C:\\Desktop\\settings\_secure.bin
```
<h3 id="第二步分析二进制结构">第二步：分析二进制结构</h3>
```python
f = open(r'C:\\Desktop\\settings\_global.bin', 'rb')
d = f.read()
f.close()

idx = d.find(b'device\_provisioned')
print('context:', d\[idx:idx+40])
```
<p>输出：</p>
```
context: b'device\_provisioned/\\x00\\x05\\x00\\x010/\\x00\\x06\\x00\\x07android/\\x00\\x07\\x00'
```
<p>可以看到<code>device\_provisioned</code>的值<code>0</code>紧跟在固定的字节序列<code>/\\x00\\x05\\x00\\x01</code>之后，直接替换这个字节即可。</p>
<h3 id="第三步patch-settings_globalxmldevice_provisioned">第三步：patch settings_global.xml（device_provisioned）</h3>
```python
f = open(r'C:\\Desktop\\settings\_global.bin', 'rb')
d = bytearray(f.read())
f.close()

target  = b'device\_provisioned/\\x00\\x05\\x00\\x010'
replace = b'device\_provisioned/\\x00\\x05\\x00\\x011'

pos = d.find(target)
if pos >= 0:
    d\[pos:pos+len(target)] = replace
    print('patched!')

f = open(r'C:\\Desktop\\settings\_global\_patched.bin', 'wb')
f.write(d)
f.close()
```
<h3 id="第四步patch-settings_securexmluser_setup_complete">第四步：patch settings_secure.xml（user_setup_complete）</h3>
```python
f = open(r'C:\\Desktop\\settings\_secure.bin', 'rb')
d = bytearray(f.read())
f.close()

target  = b'user\_setup\_complete/\\x00\\x05\\x00\\x010'
replace = b'user\_setup\_complete/\\x00\\x05\\x00\\x011'

pos = d.find(target)
if pos >= 0:
    d\[pos:pos+len(target)] = replace
    print('patched!')

f = open(r'C:\\Desktop\\settings\_secure\_patched.bin', 'wb')
f.write(d)
f.close()
```
<h3 id="第五步push回设备">第五步：push回设备</h3>
```bash
adb push C:\\Desktop\\settings\_global\_patched.bin /data/system/users/0/settings\_global.xml
adb push C:\\Desktop\\settings\_secure\_patched.bin /data/system/users/0/settings\_secure.xml
```
<h3 id="第六步重启">第六步：重启</h3>
```bash
adb reboot
```
<p>重启后直接进入桌面，Setup Wizard不再出现。</p>
<p>---</p>
<h2 id="注意事项">注意事项</h2>
<ul>
<li><strong>进入Recovery后记得在Mount界面勾选Data</strong>，否则<code>/data</code>目录为空</li>
<li><strong>两个文件都要patch</strong>，只改一个可能仍然触发激活流程</li>
<li>进入桌面后建议尽快连网完成Google账号登录，让激活状态同步到服务器</li>
<li>本方法适用于data分区未设置锁屏密码的首次刷机状态</li>
</ul>
<p>---</p>
<h2 id="总结">总结</h2>
<table>
<thead>
<tr>
<th>步骤</th>
<th>操作</th>
</tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>重启进入PitchBlack Recovery</td>
</tr>
<tr>
<td>2</td>
<td>Mount界面勾选Data分区</td>
</tr>
<tr>
<td>3</td>
<td>ADB pull两个settings文件到电脑</td>
</tr>
<tr>
<td>4</td>
<td>Python脚本patch二进制ABX文件</td>
</tr>
<tr>
<td>5</td>
<td>ADB push回设备</td>
</tr>
<tr>
<td>6</td>
<td>重启进入系统</td>
</tr>
</tbody>
</table>
<p>整个过程不需要格式化data，不丢失已有数据。 <strong>（格式化data当然只影响userdata分区）</strong></p>
<p><s>（文章很多都是ai帮我总结的  而且我感觉自己写的话 逻辑也没有ai清晰 而且我已经折腾得很累了  我把文章审查了一遍保证没有错误 把关键得地方强调补充了一遍</s></p>
