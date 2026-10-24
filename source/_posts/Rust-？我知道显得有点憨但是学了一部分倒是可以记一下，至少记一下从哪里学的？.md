---
title: 自控原理与算法前置-拉普拉斯变换-负指数和其他引入
date: 2026-10-24 09:38:00
tags:
  - Rust
  - 模式匹配
  - 空值处理
categories:
  - Rust
excerpt: 可能是跟风或者觉得好玩吧？（当然跟风也算跟晚了
---

# 模式匹配

[模式匹配和python的一些比较](https://otokini.annevella.com/writing/sometimes-read-rust-like-a-chinese-character/)

基本上可以把这种模式抽象成一种摸具来说，总之是为了安全

同时其实也可以借kotlin来看看

在kotlin当中这种最具有特色的办法大概就是....lambda表达式了

但是因为lambda表达式的原因，需要对匹配值展开，或者说在内部重新命名，但是这样也会让lambda内部更加清晰

```Kotlin
val value: Int? = 42

value?.let { x ->
    println(x)
}
```

在 Kotlin 中：

- Int? 表示可空的整数类型 
- ?. 是安全调用运算符，只有左侧不是 null 时才继续执行 
- let { x -> ... } 把非空值传递给 Lambda 表达式，命名为 x

在rust当中同样的类型匹配就更加方便了（？

```rust
let value: Option<i32> = Some(42);

if let Some(x) = value {
    println!("{x}");
}
```

# 空值和kotlin

其实上面这篇文章的最后一部分也可以用 `kotlin` 来进行描述

因为现代的编程语言都是十分在意空值的

比如说最后一段

>在 Rust 中，标准的 let 赋值必须是不可反驳的，意味着左侧的模式 100%能保证与右侧数据匹配（如令（a， b） = （1， 2）） 但试图从选项中提取 Some（） 是一个可否认的模式 可能会失败！数据可能为无 ：

```rust
// what if x is None?
fn foo(x: Option<i32>) {
    let Some(y) = x;
}
```

因为我想，在这里，此类型就是在rust当中是一个结构体，在kotlin里面也有对应的更加上层的东西

这里rust就是

```rust
// Here's the Option enum
enum Option<T> {
    Some(T),
    None,
}
```

这里的T就可以是i32

就相当于 kotlin 当中的 `int?`

int在这里是可以为null的

编译器在你写的时候就会反复警告你 int 和 int? 的调用

即使你采用了Java风格的处理办法，编译器也会提示你哪里有问题

比如，嗯我暂时想不到什么好例子，随便写一点好了

```kotlin
int? x = getnum()//假设这里可能返回空值

@Composable
fun Glass (int radius){
    draw(radius);
}

Glass(x)
//这里会直接报错，因为这里不能调用可能为空值的地方，要这样传入可能为空值的话要么修改函数签名，然后再函数里面处理
//要么直接传入不为null的值
```

