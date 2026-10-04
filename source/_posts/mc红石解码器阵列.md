---
title: mc红石解码器阵列
date: 2026-06-05 13:02:00
tags:
  - 数电
categories:
  - 数电
  - Minecraft红石电路
excerpt: 使用满五减三阵列实现移位操作
---

### 移位需要一个阵列 来代替流水线操作

（其实也可以使用寄存器来实现 存储 + 移位）

例如：

1000 0000

1''' ''''

10'' ''''

100' ''''

1000 ''''

> 0101

1 0110'''

> 0101

1 1001‘’‘

11 0010 ’‘

110 0100 ’

> 0101

1001 0100 ‘

1 0010 1000

即：1 2 8 

实际电路如图：

![满五加三逻辑加法器 组成 的 解码器阵列](/img/pasted-image-1780638211360.png "解码器")

### 如果还不理解

可以跑这个py脚本

```Python
import sys
import time


def bin_to_bcd_demo(value):
    """
    使用 Double Dabble 算法将整数转换为 BCD 码，并打印完整步骤。
    value: 整数
    """
    if value == 0:
        print("0 -> BCD: 0000")
        return


    # 计算二进制位数
    bits = value.bit_length()
    # 计算需要的十进制位数，进而得到 BCD 位数（每十进制位占 4 bit）
    dec_digits = len(str(value))  # 实际十进制位数，最终结果一定够用
    bcd_width = dec_digits * 4


    # 初始二进制字符串（左补齐到 bits 位）
    bin_str = format(value, f'0{bits}b')
    # 初始 BCD 部分为全 0
    bcd_str = '0' * bcd_width


    # 合并为完整的移位寄存器：BCD 部分 + 剩余二进制部分
    combined = bcd_str + bin_str


    print(f"输入整数: {value}")
    print(f"二进制: {bin_str}  (位宽 {bits})")
    print(f"BCD 位数: {dec_digits} (寄存器宽 {bcd_width} bit)")
    print("-" * 60)
    print("初始状态: ", format_combined(combined, bcd_width, bits, dec_digits))


    # 循环移位 bits 次
    for step in range(bits):
        # 1. 提取当前 BCD 部分，对每个 4 位组判断是否 >=5，若是则加 3
        bcd_val = int(combined[:bcd_width], 2) if bcd_width > 0 else 0


        # 计算要加的值（按原始值判断）
        add_val = 0
        for i in range(dec_digits):
            time.sleep(0.5)  # 模拟延迟
            # 从最高 4 位组开始
            shift = 4 * (dec_digits - 1 - i)
            nibble = (bcd_val >> shift) & 0xF
            if nibble >= 5:
                add_val += (3 << shift)


        if add_val > 0:
            bcd_val = (bcd_val + add_val) & ((1 << bcd_width) - 1)
            bcd_str = format(bcd_val, f'0{bcd_width}b')
            combined = bcd_str + combined[bcd_width:]
            print(f"步骤{step+1}a: 加3调整 -> ", format_combined(combined, bcd_width, bits, dec_digits))


        # 2. 整体左移 1 位
        combined = combined[1:] + '0'
        time.sleep(0.5)  # 模拟延迟
        print(f"步骤{step+1}b: 移位后   -> ", format_combined(combined, bcd_width, bits, dec_digits))


    # 最终结果：combined 的前 bcd_width 位即为 BCD 码
    final_bcd = combined[:bcd_width]
    # 按 4 位一组解析为十进制数字
    digits = []
    for i in range(dec_digits):
        nibble = final_bcd[i*4 : (i+1)*4]
        digits.append(str(int(nibble, 2)))
    print("-" * 60)
    print(f"最终 BCD: {final_bcd} -> {' '.join(digits)}")



def format_combined(combined, bcd_width, orig_bits, dec_digits):
    """美化输出：BCD 部分每 4 位加空格，二进制部分每 4 位加空格"""
    bcd_part = combined[:bcd_width]
    bin_part = combined[bcd_width:]


    # 格式化 BCD 部分
    bcd_spaced = ' '.join(bcd_part[i*4:(i+1)*4] for i in range(dec_digits))
    # 格式化二进制部分
    bin_len = len(bin_part)
    bin_spaced = ' '.join(bin_part[i*4:(i+1)*4] for i in range((bin_len + 3) // 4))
    return f"BCD:[{bcd_spaced}]  Bin:[{bin_spaced}]"



if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python bin2bcd.py <数字>")
        print("      数字可以是十进制整数，或纯二进制字符串（如 10000000）")
        sys.exit(1)


    arg = sys.argv[1]
    # 若全部由 '0' 和 '1' 组成且长度 > 1，视为二进制字符串
    if all(ch in '01' for ch in arg) and len(arg) > 1:
        value = int(arg, 2)
        print(f"(将输入视为二进制: {arg})")
    else:
        value = int(arg)


    bin_to_bcd_demo(value)
```
