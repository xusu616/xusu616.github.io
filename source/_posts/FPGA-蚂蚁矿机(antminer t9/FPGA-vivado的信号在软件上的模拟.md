---
title: FPGA-vivado的信号在软件上的模拟
date: 2026-11-09 20:05:00
tags:
  - FPGA
  - 嵌入式
categories:
  - 嵌入式
excerpt: 算了这个破板子。以我的硬件能力是真的有点不好修，，，我主要是暑假被焊接/重植CPU这件事情恶心到了，有时间再焊吧。。刷机比搬板有意思多了
---

# 算了先记一下怎么写模拟

> 然后记录怎么看模拟

*怎么说呢，是之前写的了，当时也没记什么，估计也忘了*

算了不管不管了

现在停电了没办法截图

我雷戈，，，远程链接用热点卡得不能动了

流水灯代码需要另外写，具体需要创建其他文件

## 具体的创建方法就是，

ai写的这一段，我懒得打了。。

**稍后能连上我的电脑再检查一下…………＊**

1. 点击添加源文件：
   - 在 Vivado 最左侧的 Flow Navigator 导航栏（顶部 PROJECT MANAGER 分类下），点击 Add Sources（或者按快捷键 Alt + A）
2. 选择仿真类型：
   - 在弹出的对话框中，勾选 Add or create simulation sources，然后点击 Next
3. 新建文件：
   - 点击 Create File 按钮；
   - File type 选择 Verilog 或 SystemVerilog，输入文件名（例如 tb_my_test.v），点击 OK，最后点 Finish
4. 开始编写模拟代码：
   - 回到主界面，在 Sources 面板展开 Simulation Sources -> sim_1；
   - 双击刚新建的文件，就可以在 Vivado 中编写测试激励了（如生成时钟 `#10 clk = ~clk;`、给初始输入等）
5. 运行仿真查看波形：
   - 写完保存后，点击左侧导航栏 SIMULATION 分类下的 Run Simulation → Run Behavioral Simulation 即可调出波形

# 调出窗口

上一步的第五步结束后会调出仿真窗口

如何使用这个窗口呢，在最左侧的 scope 当中，选择最顶层，或者只选择你要模拟的对象？

然后在objects当中，选择你想要观察的对象

然后在objects当中摁ctrl多选你想要添加的对象，然后右键 点击add ,x,swdjiwjid to sjidjaiojfio，就可以模拟波形了

emmm

应该就这样了

# 仿真文件与工程文件的区别

#### 1. 设计文件（底层）：led.v

```verilog
`timescale 1ns / 1ps

module led #(parameter times = 28'b1111_1111_1111_1111_1111_1111_1111)
(
    input clk,
    input rst_n,
    output reg [3:0] led
);

    reg [27:0] cnt = 28'b0;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            cnt <= 28'b0;
        else begin
            if (cnt >= times)
                cnt <= 28'b0;
            else
                cnt <= cnt + 1;
        end
    end

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            led <= 4'b0;
        else begin
            if (cnt >= times)
                case (led)
                    4'b0001: led <= 4'b0010;
                    4'b0010: led <= 4'b0100;
                    4'b0100: led <= 4'b1000;
                    4'b1000: led <= 4'b0001;
                    default: led <= 4'b0001;
                endcase
            else
                led <= led;
        end
    end
endmodule
```

---

#### 2. 设计文件（顶层）：LED_twinkle.v

```verilog
`timescale 1ns / 1ps

module LED_twinkle(
    output [3:0] led
);

parameter times = 28'b0010_1111_1010_1111_0000_1000_0000;
wire clk;
wire [3:0] led_n;

ipcore u_ipcore(
    .FCLK_CLK0_0(clk)
);

led #(.times(times)) u_led
(
    .clk    (clk),
    .rst_n  (1'b1),
    .led    (led_n)
);

assign led = led_n;
endmodule
```

---

#### 3. 仿真文件（时钟源模型）：ipcore_clock_model.v

> 作用：在电脑仿真里模拟 ARM/ZYNQ 核心吐出的 50MHz 连续时钟脉冲

```verilog
`timescale 1ns / 1ps

// 仅用于仿真的时钟源模型（模拟替代实际的 PS IP 核）
module ipcore(output wire FCLK_CLK0_0);
    reg clock_enabled = 1'b0;
    reg clock_value = 1'b0;

    // 产生 50 MHz 时钟周期（每 10ns 翻转一次）
    always #10 begin
        if (clock_enabled)
            clock_value = ~clock_value;
        else
            clock_value = 1'b0;
    end

    assign FCLK_CLK0_0 = clock_value;
endmodule
```

---

#### 4. 仿真文件（测试激励顶层）：tb_led.sv

> 作用：生成时钟、发出复位电平、把计数参数缩小到 4、自动比对波形是否正确

```verilog
`timescale 1ns / 1ps

module tb_led;
    // 将计数周期参数设为 4，以便快速在波形上看到跳变（无需等待 5000 万个周期）
    localparam integer TEST_TIMES = 4;

    reg unit_clk = 1'b0;
    reg unit_rst_n = 1'b1;
    wire [3:0] unit_led;
    wire [3:0] top_led;
    reg [3:0] held_led;
    reg [27:0] held_count;
    integer checks = 0;
    reg tests_passed = 1'b0;

    // 产生 50MHz 时钟
    always #10 unit_clk = ~unit_clk;

    // 实例化独立单元
    led #(.times(TEST_TIMES)) dut_unit (
        .clk(unit_clk),
        .rst_n(unit_rst_n),
        .led(unit_led)
    );

    // 实例化工程顶层模块
    LED_twinkle #(.times(TEST_TIMES)) dut_top (.led(top_led));

    // 任务：检查单元状态是否按预期翻转
    task automatic check_unit_period(input [3:0] expected_led);
        reg [3:0] previous_led;
        integer edge_index;
        begin
            previous_led = unit_led;
            for (edge_index = 0; edge_index < TEST_TIMES; edge_index = edge_index + 1) begin
                @(posedge unit_clk);
                #1;
                if (unit_led !== previous_led)
                    $fatal(1, "LED changed before the complete counting period");
                checks = checks + 1;
            end
            @(posedge unit_clk);
            #1;
            if (unit_led !== expected_led)
                $fatal(1, "Wrong unit LED sequence: got %b, expected %b", unit_led, expected_led);
            checks = checks + 1;
        end
    endtask

    // 任务：检查顶层状态是否按预期翻转
    task automatic check_top_period(input [3:0] expected_led);
        reg [3:0] previous_led;
        integer edge_index;
        begin
            previous_led = top_led;
            for (edge_index = 0; edge_index < TEST_TIMES; edge_index = edge_index + 1) begin
                @(posedge dut_top.clk);
                #1;
                if (top_led !== previous_led)
                    $fatal(1, "Top-level LED changed before the complete counting period");
                checks = checks + 1;
            end
            @(posedge dut_top.clk);
            #1;
            if (top_led !== expected_led)
                $fatal(1, "Wrong top LED sequence: got %b, expected %b", top_led, expected_led);
            checks = checks + 1;
        end
    endtask

    initial begin
        // 1. 测试上电异步复位
        #2;
        unit_rst_n = 1'b0;
        #1;
        if (unit_led !== 4'b0000 || dut_unit.cnt !== 28'd0)
            $fatal(1, "Asynchronous reset did not clear the LED and counter");
        checks = checks + 1;

        @(negedge unit_clk);
        #1;
        unit_rst_n = 1'b1;
        check_unit_period(4'b0001);
        check_unit_period(4'b0010);
        check_unit_period(4'b0100);
        check_unit_period(4'b1000);
        check_unit_period(4'b0001);
        $display("[PASS] Reset, complete counting period, LED order and wraparound");

        // 2. 测试运行中突发复位（也就是你看到的波形“抖了一下”的地方）
        repeat (2) @(posedge unit_clk);
        #3;
        unit_rst_n = 1'b0;
        #1;
        if (unit_led !== 4'b0000 || dut_unit.cnt !== 28'd0)
            $fatal(1, "Reset during operation did not clear the state immediately");
        checks = checks + 1;
        @(negedge unit_clk);
        #1;
        unit_rst_n = 1'b1;
        check_unit_period(4'b0001);
        $display("[PASS] Reset during operation restarts the sequence");

        // 3. 测试顶层模块在没有时钟时是否保持原样
        if (dut_top.u_led.cnt !== 28'd0 || top_led !== 4'bxxxx)
            $fatal(1, "Unexpected top state before any clock or reset");
        checks = checks + 1;
        $display("[INFO] No FCLK: counter stays at zero; unreset RTL LED state is X");

        // 4. 打开时钟，测试真实顶层恢复并正常移位
        dut_top.u_ipcore.clock_enabled = 1'b1;
        check_top_period(4'b0001);
        check_top_period(4'b0010);
        check_top_period(4'b0100);
        check_top_period(4'b1000);
        check_top_period(4'b0001);
        $display("[PASS] Original top recovers from X on its first completed period and rotates");

        // 5. 测试暂停时钟与恢复时钟
        @(negedge dut_top.clk);
        dut_top.u_ipcore.clock_enabled = 1'b0;
        held_led = top_led;
        held_count = dut_top.u_led.cnt;
        #200;
        if (top_led !== held_led || dut_top.u_led.cnt !== held_count)
            $fatal(1, "Top state advanced while the clock was stopped");
        checks = checks + 1;
        dut_top.u_ipcore.clock_enabled = 1'b1;
        check_top_period(4'b0010);
        $display("[PASS] Stopping FCLK freezes the state; resuming it continues the sequence");

        tests_passed = 1'b1;
        $display("ALL TESTS PASSED (%0d checks)", checks);
        $finish;
    end

    initial begin
        #10000;
        $fatal(1, "Simulation timed out before all checks completed");
    end
endmodule
```
