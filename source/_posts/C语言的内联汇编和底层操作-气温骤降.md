---
title: C语言的内联汇编和底层操作 - 气温骤降
tags:
  - C&amp;cpp
date: 2026-01-15 15:53:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19489540
---

0. start函数的内联汇编和底层操作 看到了这个视频，用及其底层的办法重写了sleep，我觉得这种靠近底层的C语言十分有意思，花了时间来学了一下这个东西 点击查看视频，不能内嵌我就没辙了,不过手机UI适合点这个 <iframe src="//player.bilibili.com/player.html?isOutside=true&aid=115687276152800&bvid=BV1gu2DBGEpT&cid=34606156579&p=1" scrolling="no" border="0" frameborder="no" framespacing="0"...
<!-- more -->

<h1 id="0-start函数的内联汇编和底层操作">0. start函数的内联汇编和底层操作</h1>
<blockquote>
<p>看到了这个视频，用及其底层的办法重写了sleep，我觉得这种靠近底层的C语言十分有意思，花了时间来学了一下这个东西</p>
</blockquote>
<details>
<summary>点击查看视频，不能内嵌我就没辙了,不过手机UI适合点这个</summary>
<p>&lt;iframe src="<a href="https://player.bilibili.com/player.html?isOutside=true&amp;aid=115687276152800&amp;bvid=BV1gu2DBGEpT&amp;cid=34606156579&amp;p=1" target="_blank" rel="noopener nofollow">//player.bilibili.com/player.html?isOutside=true&amp;aid=115687276152800&amp;bvid=BV1gu2DBGEpT&amp;cid=34606156579&amp;p=1</a>" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"&gt;\</p>
</details>
https://www.bilibili.com/video/BV1gu2DBGEpT/
<details>
<summary>防止懒得去下方的GitHub仓库看别人的源码，你可以点这里查看它</summary>
<pre><code class="language-C">#define SYS_write 1
#define SYS_nanosleep 35 
#define SYS_exit 60


typedef struct timespec {
    long tv_sec;
    long tv_nsec;
} timespec;

long syscall1(long number, long arg1) {
    long result;

    __asm__ __volatile__(
        "syscall"
        : "=a" (result)
        : "a" (number), "D" (arg1)
        : "rcx", "r11", "memory"
    );

    return result;
}


long syscall2(long number, long arg1, long arg2) {
    long result;

    __asm__ __volatile__(
        "syscall"
        : "=a" (result)
        : "a" (number), "D" (arg1), "S" (arg2)
        : "rcx", "r11", "memory"
    );

    return result;
}


long syscall3(long number, long arg1, long arg2, long arg3) {
    long result;

    __asm__ __volatile__(
        "syscall"
        : "=a" (result)
        : "a" (number), "D" (arg1), "S" (arg2), "d" (arg3)
        : "rcx", "r11", "memory"
    );

    return result;
}


int parse_int(const char *raw_int) {
    int result = 0;
    const char *cursor = raw_int;

    while (*cursor &gt;= '0' &amp;&amp; *cursor &lt;= '9') {
        result = result * 10 + (*cursor - '0');
        cursor++;
    }

    return result;
}


long unsigned strlen(const char *string) {
    const char *cursor = string;
    while (*cursor) {
        cursor++;
    }

    long unsigned result = cursor - string;
    return result;
}


void print(const char *string) {
    syscall3(SYS_write, 1, (long)string, strlen(string));
}


void sleep(long seconds) {
    timespec duration = {0};
    duration.tv_sec = seconds;

    syscall2(SYS_nanosleep, (long)(&amp;duration), 0);
}


int main(int argc, char *argv[]) {
    if (argc != 2) {
        print("Usage: sleep NUMBER\nPause for NUMBER seconds\n");
        return 1;
    }

    char *raw_seconds = argv[1];
    long seconds = parse_int(raw_seconds);

    print("Sleeping for ");
    print(raw_seconds);
    print(" seconds\n");
    sleep(seconds);

    return 0;
}

#ifdef __cplusplus  
extern "C" {
#endif

 void exit(int code) {
    syscall1(SYS_exit, code);

    for(;;) {}
}


__attribute__((naked)) void _start() {
    __asm__ __volatile__(
        "xor %ebp, %ebp\n"
        "mov (%rsp), %rdi\n"
        "lea 8(%rsp), %rsi\n"
        "and $-16, %rsp\n"
        "call main\n"
        "mov %rax, %rdi\n"
        "call exit\n"
    );
}

#1. ifdef __cplusplus
}
#endif
</code></pre>
</details>
<h2 id="11-asm__volatile__mov-rsp-0--rrsp">1.1 asm__volatile__("mov %%rsp, %0" : "=r"(rsp));</h2>
<h2 id="12-long-rsp-强制类型转换">1.2 (long *)rsp (强制类型转换)：</h2>
<p>rsp 本身只是一个长整型数字（比如 0x7fffffffe1a0）</p>
<p>编译器不知道这个数字代表什么<br>
再用*解引用</p>
<p>总的来说，就是通过数值到地址，再用这个地址来修改值</p>
<pre><code class="language-C">long argc =*(long *) rsp
</code></pre>
<h2 id="13-对argv的操作">1.3 对argv的操作</h2>
<p>我们通过+8来越过栈顶，到达argv[0]<br>
argv[0]：存储当前执行程序的名称<br>
argv[n-1]: 存储指向第n-1个参数的指针<br>
argv[n]: NULL</p>
<details>
<summary>还是不明白？点这里</summary>
假设你的程序名为 test，你在终端输入：
./test abc 123
<p>那么在程序运行时：</p>
<p>argc = 3</p>
<p>argv[0] = "./test"<br>
argv[1] = "abc"<br>
argv[2] = "123"</p>
</details>
<h2 id="14-char-">1.4 (char **)</h2>
<p>告诉编译器，“从这里开始，后面是一连串的指针，每个指针都指向一个字符串（参数本身）”</p>
<h1 id="2-为什么不写long-rsp--">2. 为什么不写long *rsp = ???;</h1>
<p>因为C语言没有语法能写“当前栈指针”<br>
就是说，C语言对底层的抽象做不到<br>
所以我们必须用asm__volatile__（大部分时间是这个函数</p>
<p>但是汇编可以</p>
<pre><code>mov 其他地方, rsp
把地址拷贝到其他地方
</code></pre>
<h1 id="3-编译器把rsp指向开辟的垃圾区域导致出问题">3. 编译器把rsp指向开辟的垃圾区域导致出问题</h1>
<p>进入 _start 时，栈顶本来存的是 argc。但编译器为了管理函数局部变量，先执行了 push 和 sub（管理内存，使用修饰词让编译器不要乱加之后，需要自己重写这些函数）</p>
<p>所以项目使用__attribute__((naked))修饰函数，相当于让编译器不要干任何多余的事情</p>
<blockquote>
<p><em>可以随便学点汇编？</em><br>
<em>寄存器：前面加 %（如 %rax）。</em><br>
<em>立即数（常数）：前面加 \$（如 $8）。</em><br>
<em>lea 8(%rsp), %rsi<br>
含义：计算 rsp + 8 的结果，然后把这个结果数字给 rsi</em><br>
其他的大概能猜到？我觉得标志位之类的都不用管？<br>
<strong>不过有一点挺有意思的，就是lea 8(%rsp), %rsi相比mov 8(%rsp), %rsi，少了一个访问内存的操作，后者则是最后让rsi变成了那个存着的值，简单说就是先算后找</strong></p>
</blockquote>
<p><s>写到这里吧我还要期末大复习的</s></p>
<h1 id="点此查看项目源码">点此查看项目源码</h1>
<p><a href="https://github.com/valignatev/sleep-from-scratch/blob/master/sleep.c" target="_blank" rel="noopener nofollow">https://github.com/valignatev/sleep-from-scratch/blob/master/sleep.c</a></p>
