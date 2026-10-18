---
title: Android-内核修改设备树的打包解包和注意事项？
date: 2026-10-07 7:19:00
tags:
  - 嵌入式
  - FPGA
categories:
  - 嵌入式
  - FPGA
excerpt: 嗯，没什么，我还得找个时间焊一下那个东西，不过说实话，我应该先尝试仿真看一下，不过Intel板子也能烧
---

# 使用 case 要注意的

~~编译器会给你检查出上百个warning，但是这个可以注意下~~

在路径不完整的时候，编译器可能报告说 `[Synth 8-327] inferring latch for variable 'data_out'`

~~即综合工具可能推断出一个 Latch（电平敏感锁存器）~~

组合逻辑需要注意

说是会破坏时序，但是我不太理解

[【康奈尔大学】FPGA 硬件加速 链接 ](https://www.bilibili.com/video/BV1McYd6dEgM/?p=2&t=1202)

~~我把追踪部分删除了，希望没删错~~

## 就算写了 default，也不一定能避免 Latch

```verilog
always @(*) begin
    case (sel)
        2'b00: begin
            a = 1'b1;
            b = 1'b0;
        end

        2'b01: begin
            a = 1'b0;
            // 忘记给 b 赋值
        end

        default: begin
            a = 1'b0;
            b = 1'b0;
        end
    endcase
end
```


# 组合逻辑使用阻塞赋值 =，时序逻辑使用非阻塞赋值 <=

一个模块就应该单用一个

阻塞赋值就是 `assign signal = x;`

混用阻塞赋值和非阻塞赋值是危险的

