---
title: lambda 自动推断内部类 和 内部类 - 气温骤降
tags:
  - java
  - Android
date: 2026-04-06 10:29:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19825804
categories:
    - Kotlin
---

接口可以自动推断内部类 if (StringUtils.isNotEmpty(prefsBean.getPassword()) || prefsBean.isAnonymousLogin()) { final AndroidPrefsUserManager userManager = new AndroidPrefsUserManager(prefsBean); //这是一个匿名内部类，没有new，由lambda自动推断 sshServer.setPasswordAuthenticator((username, password, session) -> {...
<!-- more -->

<h1 id="接口可以自动推断内部类">接口可以自动推断内部类</h1>
```java
if (StringUtils.isNotEmpty(prefsBean.getPassword())
				|| prefsBean.isAnonymousLogin())
		{
			final AndroidPrefsUserManager userManager = new AndroidPrefsUserManager(prefsBean);
            //这是一个匿名内部类，没有new，由lambda自动推断
			sshServer.setPasswordAuthenticator((username, password, session) -> {
			Authentication authentication = prefsBean.isAnonymousLogin()//做判断
				? new AnonymousAuthentication()
				: new UsernamePasswordAuthentication(username, password);
			logger.debug("auth type '{}' for user: {}", authentication.getClass().getName(), username);
			try {
				userManager.authenticate(authentication);
			} catch (AuthenticationFailedException e) {
				logger.debug("AuthenticationFailed", e);
				return false;
			}
			return true;
			});
		}
```
<p>可以在匿名类里面做更复杂的逻辑<br>
//实现 PasswordAuthenticator 接口，告诉 SSH 服务器在收到用户的登录请求时，应该如何判断这个用户提供的密码（或匿名请求）是否合法</p>
<h1 id="一般类要正常创建对象">一般类要正常创建对象</h1>
<p>比如这个</p>
```java
public class SessionFactory extends AbstractSessionFactory
```
<p>所以</p>
```java
sshServer.setSessionFactory(new SessionFactory() {
			@Override
			protected AbstractSession createSession(IoSession ioSession) throws Exception {
				SocketAddress remoteAddress = ioSession.getRemoteAddress();
				boolean ipAllowed = RemoteIpChecker.ipAllowed(remoteAddress, pftpdService, logger);
				return ipAllowed ? super.createSession(ioSession) : null;
			}
		});
```
<p>这里调用了SessionFactory()构造方法实例化对象，再重写这个方法，达到白名单的效果</p>
<h1 id="补一句java注解">补一句Java注解</h1>
<p>Java注解里面可能会遇到因为尖括号的存在无法正常在IDEA当中渲染的问题：</p>
```kotlin
/**
*
 这个玩意其实是可以用 <code>AndroidFragment<org.primftpd.prefs.FtpPrefsFragment>()</code> 代替的。摆了不想改了
 */
```
<p>不会渲染尖括号里面的内容，就算转义尖括号似乎也没有用<br>
用单引号就行了</p>
```kotlin
/**
 * 这个玩意其实是可以用 `AndroidFragment<org.primftpd.prefs.FtpPrefsFragment>()` 代替的。摆了不想改了
 */
```
<p><s>顺便吐槽一句：Android studio的侧边栏开启取消停靠就会变得贼卡</s><br>
<s>最新的panda 3也是一堆侧边栏Bug</s></p>
