---
title: Old-Java类集框架随笔 - 气温骤降
tags:
  - java
date: 2025-12-10 16:09:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19333665
categories:
    - Java
---

结构 Map ├── HashMap │ └── LinkedHashMap ├── SortedMap (接口) │ └── TreeMap └── Hashtable (遗留类，线程安全) Collection ├── List（ListIterator可用） │ ├── ArrayList │ ├── LinkedList │ ├── Vector │ │ └── Stack ├── Set │ ├── HashSet │ │ └── LinkedHashSet │ └── TreeSet └── Deque (通常由 ArrayDeque 实现) └── ArrayDeque...
<!-- more -->

<h1 id="结构">结构</h1>
<h2 id="map">Map</h2>
<p>├── HashMap<br>
│   └── LinkedHashMap<br>
├── SortedMap (接口)<br>
│   └── TreeMap<br>
└── Hashtable (遗留类，线程安全)</p>
<h2 id="collection">Collection</h2>
<p>├── List（ListIterator可用）<br>
│   ├── ArrayList<br>
│   ├── LinkedList<br>
│   ├── Vector<br>
│   │   └── Stack<br>
├── Set<br>
│   ├── HashSet<br>
│   │   └── LinkedHashSet<br>
│   └── TreeSet<br>
└── Deque (通常由 ArrayDeque 实现)<br>
└── ArrayDeque</p>
<h1 id="选代器与类集">选代器与类集</h1>
<h2 id="两种多次循环时不同">两种多次循环时不同</h2>
```java
Iterator<String> iterator = list.iterator();
while (iterator.hasNext()) {
    String item = iterator.next();
    if ("B".equals(item)) {
        iterator.remove(); // SAFE
    }
}
```
<p>隐式遍历（for循环增强）会自动创建迭代器<br>
隐式遍历不使用迭代器会 modCount !=  expectedModcount<br>
ConcurrentModificationtExece<br>
ption</p>
<h2 id="创建迭代器时使用泛型">创建迭代器时，使用泛型</h2>
<p>否则会变成原始类型，变成object对象（raw类型），拿出时需要指定类型，不安全<br>
（当然，只读时foreach即可</p>
<h1 id="迭代器用法总结">迭代器用法总结</h1>
<p>多<br>
键值对Key-Value：Map (HashMap<br>
单<br>
去重?Set:        (HashSet<br>
重复且有顺序？List:     (ArrayList<br>
FIFO or LIFO ? Deue:             (ArrayDeque</p>
