---
title: Python-随笔函数笔记 - 气温骤降
tags:
  - Python
date: 2026-06-02 16:07:34
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19351827
---

Python的库函数 例如math库函数 **点击看看函数示例** 一些常用的方法 数学符号 Python 函数/常量 描述 $\ln x$ math.log(x) 自然对数（以 $e$ 为底）。这是计算 $\ln$ 的标准方法。 $e^x$ math.exp(x) 计算 $e$ 的 $x$ 次方。例如：math.exp(2) 用于计算 $e^2$。 $\pi$ math.pi 圆周率 $\pi$ 的常数值。 $\log_b x$ math.log(x, b) 计算以任意底数 $b$ 为底的对数。 lambda && def 1. 匿名函数 (Lambda Function) 定义:...
<!-- more -->

<h1 id="python的库函数">Python的库函数</h1>
<p>例如math库函数</p>
<details>
<summary>**点击看看函数示例**</summary>
<h1 id="一些常用的方法">一些常用的方法</h1>
<table>
<thead>
<tr>
<th style="text-align: left">数学符号</th>
<th style="text-align: left">Python 函数/常量</th>
<th style="text-align: left">描述</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align: left">$\ln x$</td>
<td style="text-align: left"><code>math.log(x)</code></td>
<td style="text-align: left">自然对数（以 $e$ 为底）。这是计算 $\ln$ 的标准方法。</td>
</tr>
<tr>
<td style="text-align: left">$e^x$</td>
<td style="text-align: left"><code>math.exp(x)</code></td>
<td style="text-align: left">计算 $e$ 的 $x$ 次方。例如：<code>math.exp(2)</code> 用于计算 $e^2$。</td>
</tr>
<tr>
<td style="text-align: left">$\pi$</td>
<td style="text-align: left"><code>math.pi</code></td>
<td style="text-align: left">圆周率 $\pi$ 的常数值。</td>
</tr>
<tr>
<td style="text-align: left">$\log_b x$</td>
<td style="text-align: left"><code>math.log(x, b)</code></td>
<td style="text-align: left">计算以任意底数 $b$ 为底的对数。</td>
</tr>
</tbody>
</table>
</details>
<h1 id="lambda--def">lambda &amp;&amp; def</h1>
<h2 id="1-匿名函数-lambda-function">1. 匿名函数 (Lambda Function)</h2>
<p>定义: 使用 lambda 关键字，结构简洁（单行表达式）。</p>
<p>特点: 没有名称（匿名），结果是单个表达式的值，隐式返回（无需 return）。</p>
<p>用途: 通常用于作为参数传递给其他高阶函数（如 map, filter, sorted 的 key），处理简单的、一次性的逻辑。</p>
<pre><code class="language-Python">from math import *
f=lambda r: (2*pi)/(1+log(r)) #lambda函数
n=int(input("Please Input n:"))
y=exp(2.0)
for r in range(1,n+1):
    y+=f(r)
print('y=%.5f'%y)
</code></pre>
<p>累加项为 $\frac{2\pi}{1+\ln r}$ <s>博客园预览看不到latex表达式？</s><em>右下角开启</em></p>
<h2 id="2-普通函数-defined-function">2. 普通函数 (Defined Function)</h2>
<p>定义: 使用 def 关键字。</p>
<p>特点: 必须有名称，可以包含多行语句（循环、条件判断等），使用 return 显式返回。</p>
<p>用途: 适用于处理复杂的、需要多步操作或清晰代码结构的逻辑。</p>
<pre><code class="language-Python">def add_ten(x):
    result = x + 10
    return result
</code></pre>
<h1 id="3其他复杂操作">3.其他复杂操作</h1>
<h2 id="结合-map-和-filter-进行数据处理链式操作">结合 map 和 filter 进行数据处理链式操作</h2>
<p>这个场景常用于数据清洗和转换。lambda 函数在这里作为处理逻辑的“插头”，<strong>传入一个匿名函数</strong>,定义了数据的处理规则。</p>
<pre><code class="language-Python">data_list = [1, 5, -2, 10, 8, 3, -7, 20]
positive_numbers = list(filter(lambda x: x &gt; 0, data_list))
</code></pre>
<p><strong>filter返回一个迭代器，需要给他转成一个列表</strong><br>
list() 函数是一个消费者。<strong>它不断地向迭代器索要下一个元素，直到迭代器耗尽为止</strong>。每得到一个元素，list() 就把它加入到它正在构建的新列表中。</p>
<blockquote>
<p>详细解释<br>
迭代器（filter 对象）的内部机制<br>
当执行 filter(lambda x: x &gt; 0, data_list) 时，filter 函数实际上创建了一个迭代器对象。<br>
没有携带“整坨”数据: 这个迭代器对象本身只存储了两个关键信息：<br>
原始数据源（data_list 的引用）。<br>
判断逻辑（lambda x: x &gt; 0 的引用）。<br>
不存储中间结果: 它不会立即计算出所有符合条件的元素并把它们存储在一个新的列表中。</p>
</blockquote>
<h2 id="元组多级排序">元组多级排序</h2>
<h3 id="解释">解释：</h3>
<ol>
<li>sorted() 函数的返回值类型<br>
sorted() 是 Python 的内置函数，它的主要作用是对任何可迭代对象（如列表、元组、集合等）进行排序，并始终返回一个新的列表（list）。</li>
</ol>
<p>输入: 可以是任何可迭代对象（在这个例子中，输入是一个列表 students）。</p>
<p>输出: 总是一个新的列表。</p>
<pre><code class="language-Python"># 验证 sorted_students 的类型
print(type(sorted_students))
# 输出: &lt;class 'list'&gt;
</code></pre>
<ol start="2">
<li>列表元素的类型</li>
</ol>
<pre><code class="language-Python">#贴一段作演示
# 数据：(姓名, 年龄, 分数)
students = [
    ('Alice', 25, 90),
    ('Bob', 30, 90),
    ('Charlie', 25, 85),
    ('David', 30, 95)
]

# 复杂排序需求：
# 1. 主要按分数降序排列（分数高的在前）**2号元素**
# 2. 次要按年龄升序排列（分数相同时，年龄小的在前）**1号元素**
#（0号元素不管）
# 使用 lambda 定义排序键
# 排序元组 (-score, age)：元组的第一个元素加负号实现降序
sorted_students = sorted(
    students, 
    key=lambda student: (-student[2], student[1])
)

print("\n--- 多级排序 (分数降序, 年龄升序) ---")
for student in sorted_students:
    print(student)
# 结果:
# ('David', 30, 95)  # 95分最高
# ('Alice', 25, 90)  # 90分中年龄小的
# ('Bob', 30, 90)    # 90分中年龄大的
# ('Charlie', 25, 85)
</code></pre>
<p><strong>sort()对列表元组集合排序后 就 返回列表</strong><br>
<em>虽然 sorted_students 是一个列表，但它内部的元素类型保持不变。</em></p>
<p><em>在原始数据中，students 列表的每个元素都是一个元组 (姓名, 年龄, 分数)。sorted() 函数只</em>是移动和排列这些元组，它不会改变这些元组本身的数据类型。*</p>
<p><em>因此：</em></p>
<p><em>sorted_students 是一个 列表。</em></p>
<p><em>sorted_students 中的每个项目（如 ('David', 30, 95)）都是一个 元组。</em></p>
