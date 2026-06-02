---
title: 在startForegroundService时RemoteServiceException$ForegroundServiceDidNotStartInTimeException - 气温骤降
tags:
  - java
  - Android
date: 2026-04-01 15:24:00
cnblogs_url: https://www.cnblogs.com/xvsu/p/19808998
---

日志 Explain: FATAL EXCEPTION: main Process: org.primftpd, PID: 18395 android.app.RemoteServiceException$ForegroundServiceDidNotStartInTimeException: Context.startForegroundService() did not then call Service.startForeground(): ServiceRecord{50d0a06 u0 org.primftpd/.services.SshServerService...
<!-- more -->

<h1 id="日志">日志</h1>
<pre><code class="language-bash">Explain: FATAL EXCEPTION: main
Process: org.primftpd, PID: 18395
android.app.RemoteServiceException$ForegroundServiceDidNotStartInTimeException: Context.startForegroundService() did not then call Service.startForeground(): ServiceRecord{50d0a06 u0 org.primftpd/.services.SshServerService c:org.primftpd}
at android.app.ActivityThread.generateForegroundServiceDidNotStartInTimeException(ActivityThread.java:2391)
at android.app.ActivityThread.throwRemoteServiceException(ActivityThread.java:2359) with tag AndroidRuntime
</code></pre>
<h1 id="原因">原因</h1>
<p>代码当中没有（在几秒钟内）立即调用startForeground，而是做了其他事情再来调用，运行时可能会超时</p>
<h1 id="解决">解决</h1>
<p>把类似于</p>
<pre><code class="language-Java"> 				// make service high priority
 				Notification notification = ServicesStartStopUtil.updateNonActivityUI(
 						service,
 						true,
 						service.prefsBean,
 						service.keyFingerprintProvider,
 						service.quickShareBean,
 						service.chosenIp);
 				service.startForeground(NotificationUtil.NOTIFICATION_ID, notification);
 			}
</code></pre>
<p>放前面即可</p>
