---
title: FPGA-其他的注意事项-禁止多驱动
date: 2026-10-15 20:05:00
tags:
  - 嵌入式
  - FPGA
categories:
  - 嵌入式
  - FPGA
excerpt: 哎，遇到什么问题就写一点吧
---

# 禁止多驱动

> 多驱动就是反复assign一个值

⚠️注意⚠️这里并没有C语言

所以它是不能反复被赋值的

实际上它基本上就是硬件组成的一些东西，它是天生并行的///////

例如

```Verilog
reg [7:0] cnt;
//后面会把它写成一个占用八个位宽的十进制
//不理解的话也简单说一下，就是八位宽的二进制线所表示的十进制，最大表示数为2^8-1（默认没有正负

always @(posedge clk) begin
    if (clear) cnt <= 8'd0;
end

always @(posedge clk) counter
    if (enable) cnt <= cnt + 1'b1;
end

```

# 后果
>其实它大概率会阻止编译

这在其他语言那里可能没有问题，但是在Verilog里面，这相当于在硬件的输出上接入了两个输入

这会产生不确定的输出状态，就是亚稳态

而且假设一个模块输出高电平，另外一个输出低电平，将它们相连就会短路

在vivado当中，它会抛出

```error
ERROR: [Synth 8-6859] multi-driven net 或 DRC MDRV-1 
```

在 quartus 中会报告

```error
Error 喵(10028喵): Can't resolve multiple constant drivers for net喵
```

# 正确方法，将类似的逻辑放在一个模块里面

>比如上面那个例子

```Verilog
reg [7:0] cnt;
always @(posedge clk) begin
    if (clear) cnt <= 8'd0;
    else if (enable) cnt <= cnt + 1'b1;
end

```

# emmmm没什么可说的，我去咸鱼店家那里买古董资料好了

>不过新一点的能用quartus 13.0 其实也是白菜价
