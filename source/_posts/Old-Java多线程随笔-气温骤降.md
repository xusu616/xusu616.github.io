---
title: Old-Java多线程随笔 - 气温骤降
tags:
  - java
date: 2025-12-11 03:05:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19335065
---

1. Runnable / Future / FutureTask 关系 Runnable 接口 无返回值 不能抛出受检异常 只有： void run(); Future 接口：表示异步任务的结果 常用方法： V get(); // 阻塞等待获取结果 boolean cancel(); boolean isDone(); FutureTask 类 同时实现 Runnable + Future 作用：把一个 Callable 或 Runnable 包装成可提交给线程或线程池执行的任务 结构关系如下： Callable │ ▼ FutureTask <── implements ──...
<!-- more -->

<h1 id="1-runnable--future--futuretask-关系">1. Runnable / Future / FutureTask 关系</h1>
<h2 id="runnable">Runnable</h2>
<p>接口</p>
<p>无返回值</p>
<p>不能抛出受检异常</p>
<p>只有：</p>
```java
void run();
```
<hr>
<h2 id="future">Future</h2>
<p>接口：表示异步任务的结果</p>
<p>常用方法：</p>
```java
V get();         // 阻塞等待获取结果
boolean cancel();
boolean isDone();
```
<hr>
<h2 id="futuretask">FutureTask</h2>
<p>类</p>
<p>同时实现 Runnable + Future</p>
<p>作用：把一个 Callable 或 Runnable 包装成可提交给线程或线程池执行的任务</p>
<p>结构关系如下：</p>
<p>Callable<br>
│<br>
▼<br>
FutureTask  &lt;── implements ── Runnable, Future<br>
│<br>
▼<br>
Thread / ExecutorService</p>
<hr>
<h1 id="2-callable--futuretask--thread-执行流程">2. Callable → FutureTask → Thread 执行流程</h1>
<p>执行链条</p>
<p>Callable obj<br>
│ 传入<br>
▼<br>
FutureTask ft = new FutureTask(obj)<br>
│ 作为 Runnable<br>
▼<br>
Thread t = new Thread(ft)<br>
t.start()<br>
│<br>
▼<br>
ft.get()  // 获取 call() 的返回值</p>
<p>示例：Callable 有返回值</p>
```java
Callable<Integer> task = () -> {
    // do something...
    return 42;
};

FutureTask<Integer> futureTask = new FutureTask<>(task);
new Thread(futureTask).start();

Integer result = futureTask.get();
System.out.println(result);  // 42
```
<hr>
<h1 id="3-runnable--thread-执行流程">3. Runnable → Thread 执行流程</h1>
<p>执行链条</p>
<p>Runnable obj<br>
│ 传入<br>
▼<br>
Thread t = new Thread(obj)<br>
t.start()<br>
│<br>
▼<br>
obj.run()</p>
<p>示例：Runnable 无返回值</p>
```java
Runnable r = () -> System.out.println("Running...");
new Thread(r).start();
```
<hr>
<h1 id="4-线程的生命周期thread-life-cycle">4. 线程的生命周期（Thread Life Cycle）</h1>
<p>┌──────────────┐<br>
│   New(创建)   │<br>
└───────┬──────┘<br>
│ start()<br>
▼<br>
┌──────────────┐<br>
│ Runnable(就绪)│   ──► 获得 CPU<br>
└───────┬──────┘<br>
▼<br>
┌──────────────┐<br>
│ Running(运行) │<br>
└───────┬──────┘<br>
sleep()/wait()│<br>
▼<br>
┌──────────────┐<br>
│Blocked/Waiting│<br>
└───────┬──────┘<br>
▼<br>
run() 结束 / stop()<br>
▼<br>
┌──────────────┐<br>
│ Terminated(死亡) │<br>
└───────────────┘</p>
<p>状态解释：</p>
<p>New（创建）：new Thread()</p>
<p>Runnable（就绪）：调用 start()，等待 CPU 调度</p>
<p>Running（运行）：真正进入 run()</p>
<p>Blocked / Waiting（阻塞/等待）：遇到 sleep()、wait()、I/O 阻塞等</p>
<p>Terminated（死亡）：run 结束或异常退出（stop() 已废弃）</p>
<h1 id="手记">手记</h1>
<p><img src="https://img2024.cnblogs.com/blog/3673875/202512/3673875-20251211110421814-1166571159.jpg" alt="c8bfb45e5e416b219b6f9201607d8d96" loading="lazy"></p>
