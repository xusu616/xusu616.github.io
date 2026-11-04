---
title: "看看kernelSU最近的隐藏kernelSU的selinux特征然后改进....的提交（？"
date: 2026-10-31 23:35:00
tags:
  - "Linux"
categories:
  - "Linux"
excerpt: "简单（划去）粗略地说应该是 先加了一个tmp变量来尝试来在三个有特征的selinux相关的函数，占用为废弃的临时变量，只参与函数的副作用，然后这样处理之后，补上了全局 sidtab 的缺失....但是又带来了新的时间问题"
---

# 问题：

> _你难道不好奇吗_

简单（划去）粗略地说应该是 先加了一个tmp变量来尝试来在三个有特征的selinux相关的函数，占用为废弃的临时变量，只参与函数的副作用，然后这样处理之后，补上了全局 sidtab 的缺失….但是又带来了新的时间问题

具体是这样的！

> 引用如下

_我让ai润色了这一部分_

1.  构造冷门/新生成的合法 Context:  
    检测 App 在运行时动态生成一个合法但开机以来从未出现过的 Context（例如随机拼一个合法的 MLS 级别，如 u:r:untrusted\_app:s0:c888,c999）
2.  触发查询：  
    App 往 /sys/fs/selinux/context 写入这个字符串（即调用 security\_check\_context 验证该 Context 是否有效）  
    • 在正常未修改的内核中：  
    原生内核处理该请求时，必然会调用全局的 security\_context\_to\_sid，直接将该 Context 登记到全局 sidtab  
    • 在打了旧版 KernelSU 的内核中：  
    KernelSU 拦截了 App 的请求，直接用 backup\_sepolicy 校验后就返回了 0（有效）。但系统真正的全局 sidtab 中根本没有这个 Context！
3.  交叉验证抓现行：  
    检测 App 紧接着通过未被 KernelSU  
    拦截的其它内核途径（如尝试切换域、特定系统调用的凭据校验，或者通过时间侧信道判断是否走过了真正的全局缓存分配），就会发现：  
    │ “系统刚告诉我这个 Context 已经校验通过了，但在随后的全局内核状态里它竟然是一个未被登记的全新 Context！”

_润色结束_

## 等等，得莫得莫

KernelSU里面根本不是这样的！

为什么/selinux\_hide.c的写了行为完全覆写了原有内核的selinux行为？

我们使用lkm明明只修改了initboot里面的ramdisk

按道理来说，这里实际上知识拉起kernel/内核而已

**为什么会改变它对 security\_context\_to\_sid的行为？**

对的，它只是加载了一个内核模块

```bash
insmod /data/local/tmp/kernelsu.ko
```

因为在旧版代码里面，这里确实被写了三个函数….. 例如 `my_write_context`

相关的三个selinux的函数

因为你root了本来就需要其他的selinux放行规则，否则会被阻止

> 传统的 Magisk 要给 App 提权，必须在系统的 SELinux 策略（sepolicy）里注入几百条放行规则（比如允许 untrusted\_app 连接 root 守护进程、允许特定域提权等

# 具体是什么

```c
#if LINUX_VERSION_CODE >= KERNEL_VERSION(6, 6, 0)
    length = avc_has_perm(current_sid(), SECINITSID_SECURITY, SECCLASS_SECURITY, SECURITY__CHECK_CONTEXT, NULL);
    if (length)
        goto out;
    length = security_context_to_sid_with_policy(backup_sepolicy, buf, size, &sid, SECSID_NULL, GFP_KERNEL);
    if (length) {
        goto out;
    } else {
        // sync to global sidtab
        security_context_to_sid(buf, size, &tmp, GFP_KERNEL);//这里！！！！
    }

    length = security_sid_to_context_with_policy(backup_sepolicy, sid, &canon, &len);
    if (length)
        goto out;

    length = -ERANGE;
    if (len > SIMPLE_TRANSACTION_LIMIT) {
        pr_err("SELinux: %s:  context size (%u) exceeds "
               "payload max\n",
               __func__, len);
        goto out;
    }
#else
    length = avc_has_perm(&selinux_state, current_sid(), SECINITSID_SECURITY, SECCLASS_SECURITY,
                          SECURITY__CHECK_CONTEXT, NULL);
    if (length)
        goto out;

    length = security_context_to_sid(&fake_state, buf, size, &sid, GFP_KERNEL);
    if (length) {
        goto out;
    } else {
        // sync to global sidtab
        security_context_to_sid(&selinux_state, buf, size, &tmp, GFP_KERNEL);//和另外一个版本的内核！！
    }
```

这里就是tmp来的地方

## 等等！注意到一个很有意思的地方

为什么？，或者说凭什么

这里的length能被判断两次？一次不久没东西可以判断了吗

```c
length = avc_has_perm(current_sid(), SECINITSID_SECURITY, SECCLASS_SECURITY, SECURITY__CHECK_CONTEXT, NULL);
if (length)
    goto out;
length = security_context_to_sid_with_policy(backup_sepolicy, buf, size, &sid, SECSID_NULL, GFP_KERNEL);
if (length) {
    goto out;
} else {
    // sync to global sidtab
    security_context_to_sid(buf, size, &tmp, GFP_KERNEL);//这里！！！！
}
```

因为这里length被重新赋值了。。。

那它在干什么？

它在处理函数本身的报错！

在Linux都知道，因为Linux中0是最棒的！

所以当0是对的！

然后这里为0就不用被goto处理！

然后可以进入新的一轮对length的判断

# 具体的原理和副作用

旧的修改当中..这里使用的旧的备份的backup的seliunx策略进行转换

```c
//  转换
length = security_context_to_sid_with_policy(backup_sepolicy, buf, size, &sid, SECSID_NULL, GFP_KERNEL);
if (length) {
    goto out;
} else {
    //       手动调用一次，把该字符串再解析一次并塞入全局 sidtab
    u32 tmp; // 这里的 tmp 仅仅用来接原生函数的出参，随后丢弃
    security_context_to_sid(buf, size, &tmp, GFP_KERNEL);
}
```

## 当然在这里的代码当中你可以看到6.6.0内核版本的判断

这是因为，在更高的内核版本当中，selinux在selinux当中被大改了

比如这里的 security\_context\_to\_sid，之前第一个参数是 struct selinux\_state \*state的，而现在是 int security\_context\_to\_sid(const char \*scontext, u32 scontext\_len, u32 \*sid, gfp\_t gfp\_flags);

_此处由ai润色_

```c
1. 旧内核（< 6.6）：
    • Linux 内核原生的 SELinux 状态由一个全局结构体 selinux_state 管理。
    • 函数原型为：
      security_context_to_sid(&fake_state, buf, size, &sid, GFP_KERNEL);
      // 参数共 5 个：
      // 1. &fake_state (状态指针)
      // 2. buf (字符串)
      // 3. size (长度)
      // 4. &sid (输出的 SID)
      // 5. GFP_KERNEL (内存分配标志)

2. 新内核（≥ 6.6）：
    • Linux 官方上游在 6.6 对 SELinux 进行了大重构，将策略独立封装成了 struct selinux_policy。
    • 上游内核改用了 security_context_to_sid_with_policy，并增加了一个 def_sid（默认 SID）参数：
      security_context_to_sid_with_policy(backup_sepolicy, buf, size, &sid, SECSID_NULL, GFP_KERNEL);
      // 参数共 6 个：
      // 1. backup_sepolicy (策略指针)
      // 2. buf (字符串)
      // 3. size (长度)
      // 4. &sid (输出的 SID)
      // 5. SECSID_NULL (默认 SID 参数 def_sid，传 NULL 表示不使用默认值)
      // 6. GFP_KERNEL (内存分配标志)
```

_润色结束_

在最新代码（blob bec9c13 / PR #3877 之后)\[[https://github.com/tiann/KernelSU/blob/bec9c1347472e26d3d7c46cccb7be801a9c9a6b9/kernel/feature/selinux\_hide.c#L102\]中，tmp](https://github.com/tiann/KernelSU/blob/bec9c1347472e26d3d7c46cccb7be801a9c9a6b9/kernel/feature/selinux_hide.c#L102]%E4%B8%AD%EF%BC%8Ctmp) 变量meiyou了，是因为~KernelSU 对 SELinux Hide 进行了一次重构~因为执行时间问题藏不住了 然后将 从 外层二次调用 放 到了函数内部，消除了Timing Side-Channel

稍后…我要去睡觉了
