---
title: STM32 按键中断乱闪、消抖 和 中断里别用 HAL_Delay
date: 2026-07-29 21:00:00
tags:
  - 嵌入式
  - STM32
categories:
  - 嵌入式
  - STM32
excerpt: 按键外部中断乱闪的两个原因（悬空引脚、抖动沿被 pending 锁存），以及为什么中断里不该用 HAL_Delay
---

# 起因

给按键配了 EXTI 外部中断，进中断翻转 LED。结果一按就乱闪，有时候一次按下 LED 跳好几下。查下来是两个独立的问题叠在一起。

# 引脚悬空

现象：**不按按钮时快速乱闪，一按住反而正常。**

原因是 GPIO 配成了 `GPIO_NOPULL`（无上下拉）。我的按键一端接 PA10，另一端接 GND：

- **不按**：按钮断开，引脚悬空，电平靠噪声乱飘，即不停产生下降沿，中断被频繁触发。
- **按下**：引脚接到 GND，稳定低电平，反而不抖了。

<!-- more -->

所以"按住才正常"这个现象，即悬空的证据。

## 接法和上下拉、触发沿要配套

| 按键另一端接 | 平时电平 | 按下电平 | 内部上下拉 | 触发沿 |
| --- | --- | --- | --- | --- |
| 接 GND | 高 | 低 | 上拉 PULLUP | 下降沿 FALLING |
| 接 VCC | 低 | 高 | 下拉 PULLDOWN | 上升沿 RISING |

总结：**让引脚在没按时有个确定的电平**，别让它悬空。我这里接 GND，则把 `GPIO_NOPULL` 改成 `GPIO_PULLUP`：

```c
GPIO_InitStruct.Pin  = KEY_Pin;
GPIO_InitStruct.Mode = GPIO_MODE_IT_FALLING;  // 下降沿
GPIO_InitStruct.Pull = GPIO_PULLUP;           // 上拉，平时被拉高
HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);
```

> 注意：`gpio.c` 是 CubeMX 生成的，没有 USER CODE 保护区，直接改会被下次重新生成冲掉。正确做法是在 CubeMX 的 .ioc 里把这个引脚的 GPIO Pull-up/Pull-down 设成 Pull-up，再生成。

# 抖动沿被 pending 寄存器锁存

上拉加好，乱闪停了，但按一下可能还是 Toggle 好几次。这是**机械抖动**：按下的瞬间触点会弹跳，产生一连串下降沿。

最开始我在中断里这么写：

```c
void EXTI15_10_IRQHandler(void) {
    HAL_Delay(10);                              // 延时消抖
    if (HAL_GPIO_ReadPin(...) == GPIO_PIN_RESET)
        Toggle_Light();
    HAL_GPIO_EXTI_IRQHandler(KEY_Pin);          // 末尾才清标志
}
```

想法是"延时躲过抖动"。但问题在于：延时那 10ms 里，后续的抖动沿虽然没打断当前中断，却被 EXTI 的 **pending（挂起）寄存器逐个锁存**下来。等中断结尾把当前 pending 清掉，那些攒着的沿会让中断**立刻再次进入**，即一次按下 Toggle 多次。

也就是说：**延时只"躲过"了抖动，没"丢弃"抖动期间攒下的中断请求。**

# 中断里不要用 HAL_Delay

上面那段还有个更大的隐患：**在中断服务函数里调 `HAL_Delay` 本身就是坏习惯**。

`HAL_Delay` 靠 SysTick 中断累加的滴答计数来判断时间。如果 SysTick 的优先级**不高于**当前 EXTI 中断，则在 EXTI 里 SysTick 无法抢占进来，tick 不涨，`HAL_Delay` 直接**死循环卡死**。

我这次没卡死是因为：SysTick 默认优先级（`TICK_INT_PRIORITY` = 14）刚好比我 EXTI 的优先级（15，数字越大越低）高，tick 还能涨。但这种依赖优先级配置的写法很脆，配反即死机。

# 时间戳消抖，中断里不阻塞

不延时，改用 `HAL_GetTick()` 记时间戳，一个时间窗内只认第一次：

```c
void EXTI15_10_IRQHandler(void) {
    static uint32_t last_tick = 0;              // static 跨中断保留
    uint32_t now = HAL_GetTick();
    if (now - last_tick > 50) {                 // 距上次超 50ms 才处理
        last_tick = now;
        if (HAL_GPIO_ReadPin(...) == GPIO_PIN_RESET)
            Toggle_Light();
    }
    HAL_GPIO_EXTI_IRQHandler(KEY_Pin);
}
```

这样中断进出快、不阻塞。抖动期间不管进来多少次沿，50ms 窗内只有第一次生效，后面的被时间戳挡掉。窗口太灵敏则调大到 80~100ms，连按不灵则调小到 30ms。

> `Toggle_Light` 这种自定义函数记得放在 `main.c` 的 `USER CODE BEGIN 4` 区块里，不然 CubeMX 重新生成会把它冲掉，然后中断里调用它就报 `undefined reference` 链接错误。

# 总结

- **不按就乱闪、一按正常** → 引脚悬空，配上下拉（接 GND 用上拉，接 VCC 用下拉）。
- **一按 Toggle 好几次** → 抖动沿被 pending 锁存，用时间戳消抖，别用延时。
- **中断里永远不要用 `HAL_Delay`**，会依赖优先级、随时可能卡死。
- 自定义函数放进 `USER CODE` 区块，防止被 CubeMX 冲掉。
