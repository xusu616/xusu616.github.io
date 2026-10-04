---
title: Gradle-daemon的user.home变成C盘根目录导致构建失败
date: 2026-09-27 12:29:00
tags:
  - Gradle
  - Android
  - 构建
categories:
  - Android
  - 构建工具
excerpt: 构建报 C:\.android 权限不足，残留的 daemon 里 user.home 不对（红温了让ai写得了~~我要去吃大白饭了~~（讲得有点深的地方直接不管就行
---

# 现象

跑构建，直接死在应用插件这一步

```bash
./gradlew assembledebug

> Configure project :primitiveFTPd
Unable to initialize metrics, ensure C:\.android is writable

* What went wrong:
An exception occurred applying plugin request [id: 'com.android.application', version: '9.0.1']
> Failed to apply plugin 'com.android.internal.application'.
   > C:\.android
```

报错的位置指到 build.gradle 第 3 行

但那里只是 apply plugin

# 真正的报错

加 --stacktrace，最底下是这个

```bash
Caused by: java.nio.file.AccessDeniedException: C:\.android
	at com.android.prefs.AbstractAndroidLocations.getPrefsLocation(AbstractAndroidLocations.kt:80)
	at com.android.ide.common.signing.KeystoreHelper.defaultDebugKeystoreLocation(KeystoreHelper.java:83)
```

AGP 要往 Android 的 prefs 目录里写 debug keystore 和 analytics

它算出来的目录是 C:.android

也就是 C 盘根目录

普通用户没权限往那儿写

所以失败

# 为什么算成 C 盘根目录

这个目录是 user.home 拼上 .android 得来的

也就是说 user.home 变成了 C:\

写个 init script 打印一下，它是跑在 daemon 里的

```groovy
println System.getProperty("user.home")
```

```bash
./gradlew -I probe.gradle help

user.home = C:\
```

可同一个窗口里直接跑 java

```bash
java -XshowSettings:properties -version

user.home = C:\Users\xvsu
```

环境变量也都是对的，USERPROFILE HOMEDRIVE HOMEPATH 都在

所以是这个 daemon 自己的问题

# 原因

user.home 在 JVM 启动的时候就定死了

这个 daemon 启动的时候没加载到用户配置

Java 在 Windows 上取不到 profile，就退回系统盘根目录

而 daemon 会被后面所有构建复用

所以错一次就一直错

# 处理

把 daemon 停掉，再构建

```bash
./gradlew --stop
./gradlew assembledebug
```

```bash
BUILD SUCCESSFUL in 13s
```

新起来的 daemon 拿到的 user.home 是对的

不用改项目里任何文件

gradle.properties 里也别写 `-Duser.home=...`

那是本机路径，提交上去别人就挂了

# 以后再遇到

先 --stop 再构建就行

想彻底不依赖 user.home，可以设一个机器级的环境变量

```powershell
setx ANDROID_USER_HOME "C:\Users\xvsu\.android"
```

AGP 会优先读它

设完要重开 IDE 才生效

就这样
