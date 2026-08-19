---
title: Java对象序列化与serialVersionUID - 气温骤降
tags:
  - java
date: 2025-12-14 14:41:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19350081
categories:
    - Java
---

一、 对象序列化的目的与必要性 ​定义：序列化是将内存中复杂的对象结构（包含多个字段和引用）转换成一种连续的、标准的字节数据流的过程。 ​与 int 的区别：int是简单、标准的数据，其二进制形式本身就是它的存储格式（所以不需要序列化操作确保） ​对象是复杂的结构，在内存中可能分散，并包含内存地址（引用）。 ​序列化就是将这种分散的、带有地址信息的结构“扁平化”，去除地址依赖，使其可传输/存储。 总结：为了兼容，便于重新加载，传递对象数据再调用本地类当中的方法（比如两个类一样serialVersionUID） 二、 SerialVersionUID 的机制与作用...
<!-- more -->

<h1 id="一-对象序列化的目的与必要性">一、 对象序列化的目的与必要性</h1>
<blockquote>
<p>​定义：序列化是将内存中复杂的对象结构（包含多个字段和引用）转换成一种连续的、标准的字节数据流的过程。<br>
​与 int 的区别：int是简单、标准的数据，其二进制形式本身就是它的存储格式（所以不需要序列化操作确保）<br>
​对象是复杂的结构，在内存中可能分散，并包含内存地址（引用）。<br>
​序列化就是将这种分散的、带有地址信息的结构“扁平化”，去除地址依赖，使其可传输/存储。</p>
</blockquote>
<p>总结：为了兼容，<em>便于重新加载</em>，<strong>传递对象数据</strong>再调用本地类当中的方法（比如两个类一样serialVersionUID）</p>
<h1 id="二-serialversionuid-的机制与作用">二、 SerialVersionUID 的机制与作用</h1>
<p>​##核心作用：SerialVersionUID是用于标识类结构版本的<strong>唯一ID</strong>，它<strong>确保序列化端和反序列化端的类结构是兼容的</strong>。<br>
​工作流程： <strong>序列化时：</strong> SerialVersionUID被写入数据流。<br>
​<strong>反序列化时：</strong> 读取数据流中的 ID，并与本地类的 ID 进行比较。<br>
<strong>​关键比较对象：</strong> 它比较的是类结构的版本，而不是Java JDK 的版本。JDK 版本通常有良好的兼容性，而类结构的变化才是序列化失败的关键因素。<br>
<em>ps：不指定会按哈希计算生成</em><br>
<strong>指定需要人为确定类能否兼容</strong></p>
<blockquote>
<p>​自动生成（默认）： 如果不手动定义，JVM 会根据类名、字段、方法签名等信息自动计算一个哈希值。对类进行任何微小改动都会使这个 ID 发生变化。</p>
</blockquote>
```java
private static final long serialVersionUID = 1L;
```
<blockquote>
<p>修改时机：当进行重大、不兼容的结构修改时（如重命名或者删除字段），应手动递增 ID，避免数据错乱（消除兼容性</p>
</blockquote>
<h1 id="三--serializable接口">三  Serializable接口</h1>
<blockquote>
<p>如果父类实现了 Serializable 接口：<br>
所有子类自动实现序列化。<br>
父类的所有字段都会被序列化。</p>
</blockquote>
<p>要求覆写两个方法</p>
```java
private void writeObject(ObjectOutputStream out)
private void readObject(ObjectInputStream in)
```
<h2 id="要求有一个空参数的构造函数">要求有一个空参数的构造函数</h2>
<p><strong>当 Java 虚拟机（JVM）反序列化（即调用 readExternal() 方法来重建对象）一个实现了 Externalizable 的对象时，它首先需要一个对象的实例来调用 readExternal() 方法<br>
如果还要实例化对应的对象，再写一个让它重载即可</strong></p>
```java
public Person(){}
public Person(String name, int age){
    this.name=name;
    this.age=age;
}
```
