---
title: Java流控制文件 - 气温骤降
tags:
  - java
date: 2025-12-13 03:44:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19345249
---

字节流 和 字符流 字节流（Byte Stream） 单位：字节（8 bit） 适用情况：不关心字符编码 适合： --->>图片、音频、视频、压缩包、二进制文件 点我看看代码 import java.io.*; public class Main { public static void main(String[] args) throws Exception { FileInputStream fis = new FileInputStream("test.txt"); //构造重载自动找路径，不需要File f = new File(路径) int b; while ((b =...
<!-- more -->

<h1 id="字节流-和-字符流">字节流 和 字符流</h1>
<h2 id="字节流byte-stream">字节流（Byte Stream）</h2>
<p>单位：字节（8 bit）<br>
<strong>适用情况：不关心字符编码</strong><br>
适合：<br>
---&gt;&gt;图片、音频、视频、压缩包、二进制文件</p>
<details>
<summary>点我看看代码</summary>
```java
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        FileInputStream fis = new FileInputStream("test.txt");
//构造重载自动找路径，不需要File f = new File(路径)
        int b;
        while ((b = fis.read()) != -1) {
            System.out.print((char) b);
        }
        fis.close();
    }
}
```
</details>
<blockquote>
<p>read() 一次读 1 个字节<br>
返回 -1 表示读完<br>
中文可能乱码（因为没处理编码）<br>
构造重载自动找路径，不需要File f = new File(路径)</p>
</blockquote>
<h2 id="字符流character-stream">字符流（Character Stream）</h2>
<p>单位：字符（char，16 bit）<br>
会自动处理 编码（UTF-8）<br>
适合：<br>
---&gt;&gt;文本文件（.txt / .java / .md）</p>
<details>
<summary>点我看看代码示例</summary>
```java
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        FileReader fr = new FileReader("test.txt");

        int c;
        while ((c = fr.read()) != -1) {
            System.out.print((char) c);
        }
        fr.close();
    }
}
```
</details>
<h1 id="操作过程">操作过程</h1>
<ol>
<li>创建流对象</li>
<li>读 / 写数据</li>
<li>处理数据<br>
<strong>4. 关闭流</strong><br>
<strong>不会自动把堆上这个对象关掉</strong></li>
</ol>
<h2 id="可以用try-with-resources">可以用try-with-resources</h2>
```java
try (FileInputStream fis = new FileInputStream("a.txt")) {
    //使用，关闭
}
```
<h2 id="以后真正要用的是bufferedreader这里随便贴一段代码吧">以后真正要用的是BufferedReader<s>这里随便贴一段代码吧</s></h2>
<details>
<summary>点击查看代码</summary>
```java
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new FileReader("test.txt"));

        String line;
        while ((line = br.readLine()) != null) {
            System.out.println(line);
        }

        br.close();
    }
}
//写文件
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedWriter bw = new BufferedWriter(new FileWriter("out.txt"));

        bw.write("Hello Java");
        bw.newLine();
        bw.write("字符流写入");
        bw.close();
    }
}
```
</details>
<details>
<summary>点我看看想法  **和Callable的关系**</summary>
<h3 id="就像futuretask-来接受callable实例">就像FutureTask 来接受Callable实例？</h3>
<p>哦我调查了一下，应该不太一样<br>
BufferedReader：装饰器模式</p>
```java
public class BufferedReader extends Reader {
    protected Reader in;
}
```
<p>它本身还是一个 Reader<br>
只是 内部持有另一个 Reader</p>
<p><strong>FutureTask：任务适配 + 状态机</strong><br>
FutureTask 的关系是：<br>
Callable<v>  → 提供计算逻辑<br>
FutureTask<v> → 管理执行、状态、结果</v></v></p>
```java
FutureTask<V> implements RunnableFuture<V>
```
<blockquote>
<p><strong>BufferedReader 是“能力增强型包装”，</strong><br>
<strong>FutureTask 是“执行语义转换型包装”</strong></p>
</blockquote>
</details>
<p><s>管道流之类的其实也学了，也有笔记，忘了，下次再翻着笔记写写吧</s></p>
<p>手记</p><details><p></p>
<summary>点击查看笔记图片</summary>
~~传两张得了~~
<p><img src="https://img2024.cnblogs.com/blog/3673875/202512/3673875-20251213113421327-886546714.png" alt="image" loading="lazy"><br>
<img src="https://img2024.cnblogs.com/blog/3673875/202512/3673875-20251213113458797-2084898722.png" alt="image" loading="lazy"></p>
</details>
