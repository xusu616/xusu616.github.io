---
title: shapeshifter 在 Android studio 的 使用和编辑 （AVD） - 气温骤降
tags:
  - Android
date: 2026-04-27 04:40:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19936396
---

提供两个网址 https://shapeshifter.design/ https://beta.shapeshifter.design/ 用于动态AnimatedVectorDrawable (AVD)编辑 pathData变换 https://www.cnblogs.com/guanxinjing/p/12810662.html 这篇文章写了很多 本文只写一点Android端的使用和注意 pathData 在 Android 设备里面和预览的里面状况可能不一样 为了优化，Android会在动画还没开始，AVD 也会渲染 path_1 的初始状态 path_1: M 302.983...
<!-- more -->

<blockquote>
<p>提供两个网址<br>
<a href="https://shapeshifter.design/" target="_blank" rel="noopener nofollow">https://shapeshifter.design/</a><br>
<a href="https://beta.shapeshifter.design/" target="_blank" rel="noopener nofollow">https://beta.shapeshifter.design/</a><br>
用于动态AnimatedVectorDrawable (AVD)编辑</p>
</blockquote>
<h1 id="pathdata变换">pathData变换</h1>
<p><a href="https://www.cnblogs.com/guanxinjing/p/12810662.html" target="_blank">https://www.cnblogs.com/guanxinjing/p/12810662.html</a><br>
<s>这篇文章写了很多</s><br>
<s>本文只写一点Android端的使用和注意</s></p>
<h1 id="pathdata-在-android-设备里面和预览的里面状况可能不一样">pathData 在 Android 设备里面和预览的里面状况可能不一样</h1>
<p>为了优化，Android会在动画还没开始，AVD 也会渲染 path_1 的初始状态<br>
path_1:</p>
```xml
M 302.983 434.683 C 302.983 414.047 318.817 397.318 338.35 397.318 C 341.14 397.318 343.855 397.659 346.459 398.305 C 349.063 398.95 351.556 399.9 353.903 401.116 C 356.25 402.332 358.451 403.815 360.47 405.527 C 362.49 407.239 364.327 409.18 365.948 411.313 C 367.568 413.446 368.972 415.771 370.123 418.251 C 371.274 420.73 372.173 423.364 372.784 426.116 C 373.395 428.867 373.718 431.735 373.718 434.683 C 373.718 455.318 357.882 472.046 338.35 472.046 C 318.817 472.046 302.983 455.318 302.983 434.683 C 302.983 434.683 302.983 434.683 302.983 434.683
```
<p>Android会在不想要的时间点渲染这个点，需要用path里面的 fillAlpha 来隐藏<br>
点击编辑器的 path组 的fillAlpha ，选择覆盖的时间，值 0 -&gt; 1</p>
<p>会生成这样的东西</p>
```xml
<objectAnimator
                    android:propertyName="fillAlpha"
                    android:duration="200"
                    android:valueFrom="0"
                    android:valueTo="1"
                    android:valueType="floatType"
                    android:interpolator="@android:interpolator/fast_out_slow_in"/>
```
<p><em>具体例子：<a href="https://github.com/rD227/shizuku-ftp/blob/cdf77fc5a62c978da4c652110bf72a8cfced8635/primitiveFTPd/src/main/res/drawable/avd_anim.xml" target="_blank" rel="noopener nofollow">https://github.com/rD227/shizuku-ftp/blob/cdf77fc5a62c978da4c652110bf72a8cfced8635/primitiveFTPd/src/main/res/drawable/avd_anim.xml</a></em></p>
<p><strong>除了 path 组，还有其他组</strong><br>
如 layer group，可以组合为 “一个图层”<br>
整体进行 旋转 等动画</p>
