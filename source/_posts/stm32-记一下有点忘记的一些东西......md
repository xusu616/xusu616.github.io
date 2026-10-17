---
title: STM32-记一下有点忘记的一些东西.....
date: 2026-10-17 10:07:00
tags:
  - STM32
  - 汇总
categories:
  - 嵌入式
  - STM32
excerpt: 记忆一下？
---

# 4 个函数

| 函数 | 作用 | 特点 |
| --- | --- | --- |
| `HAL_UART_Transmit()` | 普通发送 | 阻塞，等待发送完成 |
| `HAL_UART_Transmit_DMA()` | DMA 发送 | 非阻塞，后台发送 |
| `HAL_UART_Receive_DMA()` | DMA 接收 | 接收指定字节数 |
| `HAL_UARTEx_ReceiveToIdle_DMA()` | DMA + 空闲检测接收 | 不必等缓冲区收满就能触发回调 |

## 发送数据

假设要向蓝牙模块发送 `Hello`：

```plain
static uint8_t txBuf[] = "Hello";

HAL_UART_Transmit_DMA(
    &huart2,
    txBuf,
    sizeof(txBuf) - 1
);
```

这个函数只负责启动发送，调用后 CPU 就能继续执行其他代码。

真正发送完毕之后，HAL 自动调用：

```plain
void HAL_UART_TxCpltCallback(
    UART_HandleTypeDef *huart)
{
    if (huart->Instance == USART2)
    {
        // 发送完成！
    }
}
```

即可发送完成后执行其他事情

在这里不写这个直接写到主循环里面，因为它是非阻塞的，所以在尝试发送之后就会直接执行你想要发送完毕后执行的

注意：DMA 发送完成前，`txBuf` 必须一直存在且不能被修改。

## 接收数据

首先定义缓冲区：

```plain
#define RX_SIZE 128

uint8_t rxDmaBuf[RX_SIZE];
```

初始化 USART2 后，启动 DMA 接收：

```plain
HAL_UARTEx_ReceiveToIdle_DMA(
    &huart2,
    rxDmaBuf,
    RX_SIZE
);
```

蓝牙发送数据后，UART 检测到空闲事件，HAL 就会调用：

```plain
void HAL_UARTEx_RxEventCallback(
    UART_HandleTypeDef *huart,
    uint16_t Size)
{
    if (huart->Instance == USART2)
    {
        // 接收到数据，进行处理
    }
}
```

区别：

- Normal DMA：`Size` 可表示本次接收到的字节数，回调后需要重新启动接收
- Circular DMA：`Size` 表示 DMA 缓冲区当前写入进度，不能直接认为每次都是新数据长度；需要记录上次位置

例如 Circular ：

```plain
static uint16_t oldPos = 0;

void HAL_UARTEx_RxEventCallback(
    UART_HandleTypeDef *huart,
    uint16_t Size)
{
    if (huart->Instance != USART2 || Size > RX_SIZE)
        return;

    if (Size > oldPos)
    {
        // 新数据位于 rxDmaBuf[oldPos]
        // 长度为 Size - oldPos
    }
    else if (Size < oldPos)
    {
        // DMA 发生了回绕
        // 先处理 oldPos 到缓冲区末尾
        // 再处理开头到 Size 的数据
    }

    oldPos = Size % RX_SIZE;//em,,,mmm就是0-127比如说，5%128 == 5
//然后刚好九四新的一组的长度---或者下一组接受的数
}
```

_实际代码中应在注释位置及时复制新增数据或放进软件队列，以免被 DMA 覆盖。上面只是演示记录位置的核心思路_

**这里使用oldpos的原因说一句可以更加清晰地理解整个逻辑**

**我让GPT画了一张图**

![](/img/20261017-101433.png)

![](/img/20261017-101611.png)

![处理了边界情况](/img/20261017-101651.png)

![](/img/20261017-101729.png)

Circular 模式只需要启动一次接收（

```plain
HAL_UARTEx_ReceiveToIdle_DMA(
    &huart2,
    rxDmaBuf,
    sizeof(rxDmaBuf)
);

```

）不需要每次回调都重新调用接收函数

## 意思

- `HAL_UART_Transmit_DMA()`：开始发送
- `HAL_UART_TxCpltCallback()`：发送完了
- `HAL_UARTEx_ReceiveToIdle_DMA()`：开始监听接收
- `HAL_UARTEx_RxEventCallback()`：接收到新数据了

回调函数一般定义在 `main()` 外面
