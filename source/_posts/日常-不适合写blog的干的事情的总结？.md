---
title: 日常-不适合写博客干的事情的总结？
date: 2026-10-05 22:18:00
tags:
  - 文章
categories:
  - 日常
excerpt: 没怎么用过好的直接被的被6.1sol和Astra吓得震惊瘫坐了🥲🥲噢对了anthropic还我十万美刀😡😡😡
---

# 不排版了直接来吧

把app两个概率性的bug修好了
>老恶心了这玩意

把小米arch平板我折腾很久没成功的问题弄好了

包括但不限于
 - 弃用了元数据有误的timeshift改用 restic
 - 包装了 restic
 - 写了 tty 本地恢复（虽然只是再包一层（（
 - 完善了之前的休眠钩子的不正常状态，写了个service让它能100%成功，能够实现阻塞/等待
 - 和其他小问题（但是我真的没那么多精力（（

在我短接解锁失败的时候找到了bypass方案（有耐心应该能找到？但是很浪费时间

[redmi 4x bypass](https://github.com/rD227/santoni-recovery-bypass)

虽然也需要短接9008（x不过对于我来说是小问题

写了个开源的forkest（？

写了[自动识别文件系统来创建swap分区的模块](https://github.com/rD227/pocketswap)？

帮忙解决了FPGA zynq 7010蚂蚁矿机 （大的有2.54mm针脚的那一版）的部分问题

现在定位到了具体硬件问题？总之就是帮忙看看电路图？然后现在等我的TLV62130RGTT/TLV62130RGTR

修了博客其它问题，加了加载动画（（

给[locationSpoofer适配了Android 11](https://github.com/rD227/LocationSpoofer)

修了一下有线校园网的路由（等我把这个弄明白

然后就是其他的一些改改配置之类的

>然后实际上看起来也没有那么多......也有可能有漏的？

还有修复[meowmoewTerminal]( https://github.com/rD227/meowmeowTerminal)

但是PLT的偏移量因为安全问题不给我算😡😡

只能等待社区对5.15内核的更好支持了（ksuRoot和ghostLock都支持不完善），但是mtk的两个offset本身就是gpt算的，但是似乎确实有用，但是一直没办法正常提权，就是成功喷洒了恶意的内存部分，经常内核pacnic重启，但是不重启的时候又会 seLinux 越狱失败（写入失败

实在不行就只能给家里人用了.....已汽运

我唯一一台没有解锁bootloader的手机....结果越狱root也不行
>也是尝到监狱的滋味了


