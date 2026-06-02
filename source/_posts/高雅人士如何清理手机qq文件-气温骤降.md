---
title: 高雅人士如何清理手机qq文件 - 气温骤降
tags:
  - 刷机
  - Android架构和安全 / 刷机
date: 2026-06-02 16:07:25
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19631449
---

qq自带的聊天记录删除只能删除图片和视频文件，而且无法滑动勾选，无法按日期勾选，无法清理语音文件和其他文件，所以使用文件管理器清理 位置 qq语音文件位置/storage/emulated/0/Android/data/com.tencent.mobileqq/Tencent/MobileQQ/QQ号/ptt/ qq图像存储/storage/emulated/0/Android/data/com.tencent.mobileqq/Tencent/MobileQQ/chatpic/...
<!-- more -->

<blockquote>
<p>qq自带的聊天记录删除只能删除图片和视频文件，而且无法滑动勾选，无法按日期勾选，无法清理语音文件和其他文件，所以使用文件管理器清理</p>
</blockquote>
<h3 id="位置">位置</h3>
<p>qq语音文件位置/storage/emulated/0/Android/data/com.tencent.mobileqq/Tencent/MobileQQ/QQ号/ptt/<br>
qq图像存储/storage/emulated/0/Android/data/com.tencent.mobileqq/Tencent/MobileQQ/chatpic/<br>
qq文件存储位置/storage/emulated/0/Android/data/com.tencent.mobileqq/Tencent/QQfile_recv/<br>
...（以及其他文件，自行选择即可</p>
<h3 id="高版本限制">高版本限制</h3>
<p><strong>测试使用shizuku授权的文件管理器在高Android版本</strong>（<s>Android16测试的比Google家的Android手机还 “纯血Android” 的lineageOS23也无法访问其他目录</s>）<br>
<strong>基本上只能访问QQfile_recv的文件</strong> <s>而系统自带的清理又肯定不会处理，没有root的话就没办法了，qq自带的清理太垃圾了</s><br>
可以直接把聊天记录备份到电脑或者备用机<br>
似乎不像微信能从准备登录的界面导出聊天记录（没在多个版本测试），必须登录另一台设备，如果没有平板下见解决办法</p>
<h3 id="没有平板无法备份">没有平板，无法备份</h3>
<p><em>没有平板可以使用原子修补打包模块或者框架装模块（推荐开源的qa模块），伪装成平板，随时随地备份</em></p>
<p><em>PS: qq的漫游非常不好用，是往前翻聊天记录才会尝试加载，不然聊天记录甚至无法被搜索到，也不会主动加载以前的聊天记录</em></p>
<h3 id="测试说明">测试说明</h3>
<p>测试只有有根权限的文件管理器能真正访问chatpic和其他类似的目录的确切内容<br>
应该和qq版本无关，多次回滚qq也没用<br>
测试Android12 14 授予shizuku后就能访问这些目录</p>
<p><s>在忙其他的事，只能发个水笔了（）</s></p>
