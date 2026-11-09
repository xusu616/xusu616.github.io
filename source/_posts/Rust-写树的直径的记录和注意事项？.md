---
title: Rust-写树的直径的记录和注意事项？
date: 2026-11-09 21:35:00
tags:
  - Rust
  - 算法
categories:
  - Rust
  - 算法
excerpt: "树的直径 纯属跟风，，因为rs不适合写算法感觉（（ ~~不过博客确实是让ai直接写的（（（~~ 看了一遍倒是 --然后加点东西？"
---

# 准备把一段 C++ 树的直径转成 Rust

在 C++ 里写两遍 DFS 求树的直径通常直接用全局变量：

```cpp
vector<vector<int>> adj;
int max_length = -1;
int fartherest_node = 0;

void dfs(int u, int p, int len) {
    if (len > max_length) {
        max_length = len;
        fartherest_node = u;
    }
    for (int v : adj[u]) {
        if (v != p) dfs(v, u, len + 1);
    }
}
```

直接挂全局变量，`main` 里面建图搜两次就行 

转到 Rust 之后有些处理方式不太一样，顺便记一下遇到的问题 

<!-- more -->

# 全局变量与 usize 索引

Rust 默认不允许直接读写全局可变变量 

如果定义 `static mut`，每次访问都需要写 `unsafe`；算法题里也没有必要去套 `Mutex` 互斥锁 

所以直接通过参数传引用进 DFS：

- 邻接表传不可变借用 `&adj`
- 需要更新的最大长度和节点传可变借用 `&mut max_length`、`&mut fartherest_node`

另外 Rust 的数组和切片索引必须是 `usize` 类型 

如果节点编号定义成 `i32`，每次作为下标访问都需要写 `u as usize`，比较繁琐，所以节点编号最好直接全部定义为 `usize` 

# 传引用显式解引用与无 void

在 C++ 中形参传引用时：

```cpp
void dfs(int &max_length) {
    if (current_length > max_length) { ... }
}
```

可以直接当作普通变量进行比较 

但在 Rust 中传可变引用 `&mut usize` 时，必须显式加 `*` 解引用：

```rust
if current_length > *max_length { ... }
```

如果不加 `*`，编译器会报类型不匹配错误（无法将 `usize` 与 `&mut usize` 直接比较） 

另外 Rust 中没有 `void` 关键字 表示无返回值时对应的是单元类型 `()`（unit type），函数签名中直接省略 `-> ...` 即可

# 把 with_capacity 误写成 capacity 导致的类型推导报错

预分配 vector 容量时，把 `Vec::with_capacity(n)` 误写成了：

```rust
let mut adj = Vec::capacity(n);
```

导致 rust-analyzer 产生了一系列报错：

```text
1. the trait bound &Vec<_, _>: FromStr is not satisfied
2. cannot add {integer} to &Vec<_, _>
3. expected i32, found &Vec
4. no method named push found for type usize
```

![](/img/1794230966926312645.png)

原因在于 `Vec` 自身包含一个方法 `fn capacity(&self) -> usize`，用于获取已分配的容量 

当写成关联函数形式 `Vec::capacity(n)` 时，Rust 会将 `n` 视为 `&self` 传入，从而反向推导 `n` 的类型为 `&Vec`：

- 前面读取输入并使用 `tokens.parse()` 解析 `n` 的地方，被判定为尝试解析成 `&Vec`；
- 后续的 `n + 5` 被视为向量引用与整数相加；
- `Vec::capacity()` 的返回值为 `usize`，导致变量 `adj` 被推导为整数类型，后续调用 `adj.push()` 报错找不到方法 

在解析输入时显式写明类型注解 `let n: usize = ...` 可以避免此类推导偏差 

# 切片传参和胖指针

在写 DFS 函数参数时：

```rust
fn dfs(adj: [Vec<usize>]) // 报错：size cannot be known at compilation time
```

C/C++ 中形参写 `int a[]` 会退化为指针 `int*`，但 Rust 不会自动退化 

`[T]` 属于动态大小类型（DST），在编译期无法确定具体大小，不能直接在栈上传值 

需要使用切片借用 `&[Vec<usize>]` `&[T]` 底层是一个胖指针（fat pointer），包含数据指针和长度，固定占 16 字节，大小确定后即可正常传参

~~Neovim 复制粘贴卡死 5 秒的问题~~

~~在远程环境使用 Neovim 时，按 `p` 粘贴或 `yy` 复制时底部提示：~~

~~``text~~
~~Waiting for OSC 52 response from the terminal. Press Ctrl-C to interrupt...~~
~~```~~

~~随后编辑器无响应约 5 秒 ~~

~~检查配置发现 `init.lua` 中启用了：`~~

~~```lua~~
~~vim.g.clipboard = "osc52"``~~
~~vim.opt.clipboard = "unnamedplus"~~
~~```~~

~~该配置会导致默认寄存器操作通过终端转义码（OSC 52）同步剪贴板 ~~

~~粘贴时 Neovim 向终端发送读取剪贴板的请求，但 Windows Terminal 出于安全策略默认禁止远程读取本地剪贴板，未作响应 Neovim 在等待回复超时后才回退~~

~~处理方式是将 `paste` 设为空操作，常规粘贴不走 OSC 52；仅在需要同步到本地时单独触发 `copy` ~~

# stdin read_to_string 终端等待输入

在终端进行测试时，输入数据并回车：

```text
5
1 2
2 4
4 5
2 3
```

回车后程序未输出结果且未退出 

问题出在输入读取方式：

```rust
io::stdin().read_to_string(&mut input).unwrap();
```

`read_to_string` 会持续读取直到遇到文件结束符（EOF） 终端中按下回车仅发送换行符 `\n`，需要按下 `Ctrl + D` 发送 EOF 信号，程序才会完成读取并继续执行

# 第二次 DFS 之前 max_length 是否需要归零

两遍 DFS 求树的直径的通常步骤为：
1. 从任意点出发搜索，找到距离最远的点 $u$；
2. 将统计的最大距离重置为 0，再从 $u$ 出发搜索，得到的最远距离即为树的直径 

如果第二轮搜索前未重置 `max_length`，直接沿用上一轮的最大值，得到的结果也是正确的：

1. 设整棵树的直径为 $D$；
2. 第一轮搜索得到的最大距离为 $L_1$；
3. 第二轮从最远点出发搜索，根据直径性质，能到达的最远距离即为直径 $L_2 = D$；
4. 直径为树中最长简单路径，因此恒有：

$$L_2 \ge L_1$$

5. 未重置 `max_length` 时，最终结果等价于 $\max(L_1, L_2) = L_2 = D$ 

在仅需要求出直径长度而不需要记录具体路径端点的情况下，两轮 DFS 共享 `max_length` 变量不影响最终结果 

emmm差不多就这样了
