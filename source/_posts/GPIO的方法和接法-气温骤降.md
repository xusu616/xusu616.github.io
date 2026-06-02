---
title: GPIO的方法和接法 - 气温骤降
tags:
  - 数电
  - 嵌入式
  - 嵌入式 / 数字电路基础
date: 2026-06-02 16:07:30
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19412193
---

一、所有状态 看这个反正也看不懂 建议直接去看例子 ALLIN 洋人缩写 什么玩意它这是 浮空输入 IN_FLOATING 引脚电平完全由外部决定。常用于 I2C、USART 等需要外部驱动的信号。缺点： 悬空时电平会乱跳 上拉输入 IPU 内部连接一个上拉电阻到 VCC。默认高电平。最常用于检测接地按键或低电平有效的传感器 下拉输入 IPD 内部连接一个下拉电阻到 GND。默认低电平。常用于检测高电平触发的信号 模拟输入 AIN 信号不经过触发器，直接进入内部 ADC（模数转换器）。用于测量具体的电压值（如 1.2V），而不是简单的 0 或 1。 开漏输出 Out_OD...
<!-- more -->

<h1 id="一所有状态">一、所有状态</h1>
<p><s>看这个反正也看不懂  建议直接去看例子</s></p>
<table>
<thead>
<tr>
<th>ALLIN</th>
<th>洋人缩写</th>
<th>什么玩意它这是</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>浮空输入</strong></td>
<td><strong>IN_FLOATING</strong></td>
<td>引脚电平完全由外部决定。常用于 I2C、USART 等需要外部驱动的信号。<strong>缺点：</strong> 悬空时电平会乱跳</td>
</tr>
<tr>
<td><strong>上拉输入</strong></td>
<td><strong>IPU</strong></td>
<td>内部连接一个上拉电阻到 VCC。<strong>默认高电平</strong>。最常用于检测<strong>接地按键</strong>或低电平有效的传感器</td>
</tr>
<tr>
<td><strong>下拉输入</strong></td>
<td><strong>IPD</strong></td>
<td>内部连接一个下拉电阻到 GND。<strong>默认低电平</strong>。常用于检测高电平触发的信号</td>
</tr>
<tr>
<td><strong>模拟输入</strong></td>
<td><strong>AIN</strong></td>
<td>信号不经过触发器，直接进入内部 <strong>ADC</strong>（模数转换器）。用于测量具体的电压值（如 1.2V），而不是简单的 0 或 1。</td>
</tr>
<tr>
<td><strong>开漏输出</strong></td>
<td><strong>Out_OD</strong></td>
<td>只能输出<strong>低电平</strong>或<strong>高阻态</strong>。如果要输出高电平，必须外接上拉电阻。常用于 I2C 总线或电平转换。</td>
</tr>
<tr>
<td><strong>推挽输出</strong></td>
<td><strong>Out_PP</strong></td>
<td>既能输出强劲的高电平，也能输出强劲的低电平。<strong>最常用</strong>，用于点灯（LED）、驱动蜂鸣器、数字通讯。</td>
</tr>
<tr>
<td><strong>复用开漏</strong></td>
<td><strong>AF_OD</strong></td>
<td>引脚不由 GPIO 寄存器控制，而是由片上外设（如 I2C）控制，且为开漏特性。</td>
</tr>
<tr>
<td><strong>复用推挽</strong></td>
<td><strong>AF_PP</strong></td>
<td>引脚由片上外设（如 SPI 的 SCK、USART 的 TX）控制，输出推挽信号。</td>
</tr>
</tbody>
</table>
<h1 id="二多种接法输入">二、多种接法输入</h1>
<blockquote>
<p>不同GPIO的输入和输出方式</p>
</blockquote>
<h2 id="例1按键">例1：按键</h2>
<p><img src="https://img2024.cnblogs.com/blog/3673875/202512/3673875-20251228154026491-598233631.png" alt="image" loading="lazy"><br>
例如第一种（左上方第一张图），举个按键检测的例子：<br>
按键按下：<strong>引脚与 GND 直接导通</strong> <em>（图上是不按下的情况）</em>，电流经上拉电阻流向地。此时 PA0 电平被拉低，程序一定读到 0（低电平）<br>
<strong>那么PA0 必须设置为上拉输入</strong><br>
此时，不按下时，这个Pin被上拉到高电平<br>
<em>省流：右上角相当于把上拉电阻放到外面，可以配置为浮空，也可以上拉<br>
左下角下拉，右下角浮空或者下拉</em></p>
<details>
<summary>点我 跳转详解的视频链接</summary>
精准空降链接（不懒就点这个）：
【STM32入门教程-2023版 细致讲解 中文字幕】 【精准空降到 13:43】
<p><a href="https://www.bilibili.com/video/BV1th411z7sn" target="_blank" rel="noopener nofollow">https://www.bilibili.com/video/BV1th411z7sn</a></p>
<p>啊我服了为什么嵌入的视频在预览里面能看发出来不行<br>
雪豹不要坏了我的好事！<br>
嵌入链接：<br>
&lt;iframe src="<a href="https://player.bilibili.com/player.html?isOutside=true&amp;aid=206940155&amp;bvid=BV1th411z7sn&amp;cid=411740847&amp;p=7" target="_blank" rel="noopener nofollow">//player.bilibili.com/player.html?isOutside=true&amp;aid=206940155&amp;bvid=BV1th411z7sn&amp;cid=411740847&amp;p=7</a>" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"&gt;&lt;/details&gt;</p>
<p><em>消除抖动加个延时.....</em><s>这有必要说吗</s></p>
<h2 id="例2-传感器">例2 传感器</h2>
<p>和按键一样的，<em>应该</em>都是输出高电平<br>
<img src="https://img2024.cnblogs.com/blog/3673875/202512/3673875-20251228160102083-2078066947.png" alt="image" loading="lazy"></p>
<h1 id="三输出">三、输出</h1>
<blockquote>
<p>推挽输出拥有比较强的拉动能力，能直接输出高电平点亮 LED，也能输出低电平熄灭它<br>
和上文一样，如果设置成开漏就得外接一个上拉电阻</p>
</blockquote>
<p>emmmm都没什么可讲的，其他的输入输出方法我也不会（）LOLLOOLOLOL</p>
</details>
