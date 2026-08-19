---
title: 重构Java项目到Kotlin遇到的问题 - 气温骤降
tags:
  - Android
  - Kotlin
  - Android开发
date: 2026-03-19 02:39:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19737643
categories:
    - Kotlin
---

防止我忘了吧~ 1.错误: 无法从最终MainTabsActivity进行继承 因为Java是默认可以继承的，而Kotlin不行，所以Kotlin要加open 也可以说Java的类默认open，Kotlin默认final 2.错误: 方法不会覆盖或实现超类型的方法 某些方法不正常，需要open，重写 override fun onCreateOptionsMenu(menu: Menu?): Boolean { return super.onCreateOptionsMenu(menu) } 3. 转Compose之后放弃了xml，放弃了对layout的引用...
<!-- more -->

<blockquote>
<p>防止我忘了吧~</p>
</blockquote>
<h1 id="1错误-无法从最终maintabsactivity进行继承">1.错误: 无法从最终MainTabsActivity进行继承</h1>
<p>因为Java是默认可以继承的，而Kotlin不行，所以Kotlin要加open<br>
也可以说Java的类默认open，Kotlin默认final</p>
<h1 id="2错误-方法不会覆盖或实现超类型的方法">2.错误: 方法不会覆盖或实现超类型的方法</h1>
<p>某些方法不正常，需要open，重写</p>
```kotlin
override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        return super.onCreateOptionsMenu(menu)
    }
```
<h1 id="3-转compose之后放弃了xml放弃了对layout的引用">3. 转Compose之后放弃了xml，放弃了对layout的引用</h1>
<p>某些ai转换工具会把用不到的东西删掉</p>
```bash
D:\Users\xvsu\AndroidStudioProjects\shizuku-ftp\primitiveFTPd\src\org\primftpd\ui\PftpdFragment.java:775: 错误: 找不到符号
            TabLayout.Tab tab = tabLayout.getTabAt(MainTabsActivity.INDEX_FINGERPRINTS);
                                                                   ^
  符号:   变量 INDEX_FINGERPRINTS
  位置: 类 MainTabsActivity
<a href="open.plugin.studio.bot">Explain with AI</a>
```
<p>可以先把变量加回去，再慢慢重构，把对应的使用的地方也重写为compose</p>
<h1 id="4edgetoedge之前那个">4.EdgeToEdge（之前那个</h1>
