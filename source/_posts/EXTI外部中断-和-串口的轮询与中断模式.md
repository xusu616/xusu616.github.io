---
title: EXTI 外部中断 和 串口的轮询与中断模式
date: 2026-07-28 20:00:00
tags:
  - 嵌入式
  - STM32
categories:
  - 嵌入式
  - STM32
excerpt: EXTI 外部中断、串口轮询模式和中断模式的相关知识，顺便讲讲为什么串口中断要走回调
---

# EXTI 外部中断

> EXTI = External Interrupt，外部中断/事件控制器

最典型的场景即**按键**。你不知道用户何时按，与其写个死循环一直读引脚，不如配置成"引脚电平一变化就中断我"。

### 触发方式

| 触发方式 | 含义 |
| --- | --- |
| 上升沿触发 | 低电平跳到高电平的那一瞬间触发 |
| 下降沿触发 | 高电平跳到低电平的那一瞬间触发 |
| 双边沿触发 | 上升、下降都触发 |

注意触发的是**边沿**（变化的那一刻），不是电平本身。即便你按住不放，它也只在"按下"和"松开"两个瞬间各触发一次。

### 一点小坑

- **EXTI 线和引脚号绑定**：PA0、PB0、PC0…… 这些同号引脚共用 EXTI0，同一时刻只能有一个生效。所以 PA0 和 PB0 不能同时用作外部中断。
- **中断服务函数是共享的**：EXTI5 到 EXTI9 共用一个 `EXTI9_5_IRQHandler`，EXTI10 到 EXTI15 共用 `EXTI15_10_IRQHandler`。进去后需自己判断是哪个 Pin 触发的。
- **按键抖动**：机械按键按下的瞬间电平会抖动多次，一次按下可能触发多次中断。软件消抖（加延时再 if 确认）或硬件消抖（电容）均可。

### 代码大概长这样

```c
void EXTI15_10_IRQHandler(void) {
    if (__HAL_GPIO_EXTI_GET_IT(GPIO_PIN_13)) {   // 判断是不是 PIN13 触发的
        __HAL_GPIO_EXTI_CLEAR_IT(GPIO_PIN_13);   // 清除中断标志位，不清会一直进
        // 这里直接写你的逻辑，比如翻转个 LED
    }
}
```

这里能**直接写逻辑**，后面讲串口的时候会对比着说为什么。

# 串口通信（USART）

> USART = 通用同步异步收发器，日常基本只用它的异步模式（UART）

串口就是一根线一个字节一个字节地收发数据。问题在于：数据何时来你不知道，怎么接？于是有了两种模式。

# 轮询模式（Polling）

即CPU 主动、反复地查询

```c
// 阻塞式接收，收不到就一直卡在这
HAL_UART_Receive(&huart1, buf, 1, HAL_MAX_DELAY);
```

优点是简单直白，代码顺序执行，好理解好调试。

缺点：轮询只适合那种"我发一条你必回一条"、时序很确定的简单场景。

# 中断模式（Interrupt）

换个思路：不问了，数据来了你叫我。

```c
// 开启中断接收，这行立刻返回，不阻塞
HAL_UART_Receive_IT(&huart1, buf, 1);
```

调完这行 CPU 就去干别的了。等收到数据，硬件自动触发中断，HAL 把数据搬进缓冲区，收够了再回调通知你。

# 重点：为什么中断模式要走回调，不能像 EXTI 那样直接写？

一开始最不明白的地方。EXTI 能在 `EXTI15_10_IRQHandler` 里直接写逻辑，串口为什么非得搞个 `HAL_UART_RxCpltCallback` 回调？

### 差别在于"中断事件的语义层级"

| | EXTI 中断 | 串口 RX 中断 |
| --- | --- | --- |
| 触发时机 | 引脚上来了一个**边沿** | 移位寄存器里来了**一个字节**，或者出错了 |
| 这事"有意义"吗 | 有。边沿本身就是你要的结果 | 没有。一个字节 ≠ 一条完整消息 |
| 需要状态机吗 | 不需要 | 需要（收了几个、满没满、有没有出错） |

EXTI 的中断是**成品事件**：边沿一到即终点，清个标志位就能干活。

串口的中断是**半成品的底层电气事件**：只是收到一个字节，需经过累积、判断、纠错，才能变成"一帧数据到齐"这种有意义的事。

HAL 库的这个函数内部帮你处理了这些状态和逻辑（参见下一节）。

### HAL 干了什么

一旦你调了 `HAL_UART_Receive_IT()`，CubeMX 生成的中断函数其实就一句话：

```c
void USART1_IRQHandler(void) {
    HAL_UART_IRQHandler(&huart1);   // 整个函数体就这一句
}
```

>`HAL_UART_IRQHandler` 内部在替你干一堆脏活：
- 读状态寄存器，判断这次中断到底是**哪个事件**（收到字节 RXNE？发送完 TXE？溢出错误 ORE？帧错误？）
- 维护接收状态机（收到第几个字节了、缓冲区指针、还差几个收满）
- 按正确顺序清标志位
- **只有当"收满一帧"这个有意义的时刻到了，才调用 `HAL_UART_RxCpltCallback` 通知你**

所以回调即 HAL 留给你的钩子：底层它处理，数据到齐了叫你。你若硬在 handler 里塞自己的逻辑，则会跟它的状态机冲突。

### 回调不是什么高级语言特性(不需要像kotlin那样将函数视作一等公民)

C 里的这个回调用的是 **weak 符号（`__weak`）**：

```c
__weak void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) { }
```

你在自己代码里写一个同名函数，链接器即用你的版本覆盖那个空壳。这不是"把函数当值传递"，而是**编译/链接期的符号替换**。

顺带一提，EXTI 也有对应的 `HAL_GPIO_EXTI_Callback` 回调链，只是它逻辑简单，很多人不走那套，直接在 handler 里清标志、写逻辑。

### 总结

回调的本质是**关注点分离**：寄存器级的底层操作（哪个事件、清标志、维护进度）交给 HAL，应用逻辑（拿到数据做什么）你在回调里写。串口需要这层分离，是因为它的原始中断太"碎"；EXTI 不需要，则是因为它的中断已经是成品。

~~DMA下次再说吧~~

# 总结的总结

- **EXTI**：引脚变化触发，事件是成品，能直接在中断里写逻辑
- **轮询串口**：CPU 傻等，简单但卡
- **中断串口**：数据来了才叫你，走回调是因为要把"碎字节"攒成"整帧"
- 数据量大了记得考虑 **DMA**

大概就这样，~~其实理解得太细感觉也不是很有用，总之记得调用轮询串口和中断串口调用方式不一样以及怎么调用就可以了~~。

# 总结的总结的总结

## 轮询串口

轮询就一个字：**卡**。CPU 在这行原地等，收/发完才继续。

```c
uint8_t txBuf[] = "hello\r\n";
uint8_t rxBuf[10];

// 发送：把 txBuf 发出去，超时 1000ms
HAL_UART_Transmit(&huart1, txBuf, sizeof(txBuf) - 1, 1000);

// 接收：收满 10 个字节才返回，收不满就一直等到超时
HAL_UART_Receive(&huart1, rxBuf, 10, HAL_MAX_DELAY);

// Transmit / Receive，没后缀 = 阻塞 = 轮询
```

## 中断串口

**三步**

```c
uint8_t rxData;   // 存收到的一个字节

// 第 1 步：首次调用中断，中断不能写while里面，否则不会阻塞
// 然后大概率用不了
HAL_UART_Receive_IT(&huart1, &rxData, 1);

//  2  写回调函数
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
    if (huart->Instance == USART1) {       // 判断是哪个串口来的
        // 这里处理 rxData
        HAL_UART_Transmit(&huart1, &rxData, 1, 100);

        // 3 再次回调
        HAL_UART_Receive_IT(&huart1, &rxData, 1);
    }
}
```

## EXTI 外部中断的配置（手动配引脚）

CubeMX 里点几下就配好，这里主要说它到底干了什么

**配 GPIO → 开 NVIC → 写中断函数**。

```c
void EXTI_Config(void) {
    // 1. 开时钟（GPIO 和 AFIO/SYSCFG 都要）
    __HAL_RCC_GPIOC_CLK_ENABLE();

    // 2. 配 GPIO：中断输入模式 + 下降沿触发
    GPIO_InitTypeDef gpio = {0};
    gpio.Pin  = GPIO_PIN_13;
    gpio.Mode = GPIO_MODE_IT_FALLING;   // IT = 中断, FALLING = 下降沿
    gpio.Pull = GPIO_PULLUP;            // 上拉，平时是高电平，按下拉低触发
    HAL_GPIO_Init(GPIOC, &gpio);

    // 3. 配 NVIC：设优先级 + 使能这条中断线
    HAL_NVIC_SetPriority(EXTI15_10_IRQn, 2, 0);  // 抢占优先级 2，子优先级 0
    HAL_NVIC_EnableIRQ(EXTI15_10_IRQn);
}
```

`Mode` 那行可选：`GPIO_MODE_IT_RISING`（上升沿）、`GPIO_MODE_IT_FALLING`（下降沿）、`GPIO_MODE_IT_RISING_FALLING`（双边沿）。

然后写中断函数（前面讲过，这里能直接写逻辑）：

```c
void EXTI15_10_IRQHandler(void) {
    HAL_GPIO_EXTI_IRQHandler(GPIO_PIN_13);  // HAL 帮你清标志 + 调回调
}

// 回调（可选，想走 HAL 风格就用它）
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin) {
    if (GPIO_Pin == GPIO_PIN_13) {
        HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);  // 翻转个 LED
    }
}
```
