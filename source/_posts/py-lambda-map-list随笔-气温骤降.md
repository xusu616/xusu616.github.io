---
title: py-lambda-map-list随笔 - 气温骤降
tags:
  - Python
date: 2025-12-09 12:14:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19328296
categories:
    - Python
---

py-lambda-map-list随笔 匿名函数lambda lambda 表达式用于创建 小型、匿名 的单行函数。 语法：lambda arguments: expression 很方便的 map()用于及其方便地映射 把相同的操作（如lambda表达式）映射到后者（如列表上） map() 函数接受两个主要参数： map(function, iterable, ...) 比如：result_map = map(lambda x: x * x, numbers) 起连接作用 如果操作逻辑比较复杂，可以先定义一个普通函数。 def to_uppercase(s): return...
<!-- more -->

<h1 id="py-lambda-map-list随笔">py-lambda-map-list随笔</h1>
<h2 id="匿名函数lambda">匿名函数lambda</h2>
<p>lambda 表达式用于创建 小型、匿名 的单行函数。<br>
语法：lambda arguments: expression</p>
<blockquote>
<p>很方便的</p>
</blockquote>
<h2 id="map用于及其方便地映射">map()用于及其方便地映射</h2>
<h3 id="把相同的操作如lambda表达式映射到后者如列表上">把相同的操作（如lambda表达式）映射到后者（如列表上）</h3>
<p>map() 函数接受两个主要参数：<br>
map(function, iterable, ...)<br>
比如：result_map = map(lambda x: x * x, numbers)<br>
起连接作用<br>
如果操作逻辑比较复杂，可以先定义一个普通函数。</p>
<blockquote>
<p>def to_uppercase(s):<br>
return s.upper()</p>
<p>names = ['alice', 'bob', 'charlie']</p>
<p>result_list = list(map(to_uppercase, names))#将map()函数返回的结果从一个迭代器（map object）转换为一个标准的列表</p>
<p>print(result_list)</p>
</blockquote>
<p>输出: ['ALICE', 'BOB', 'CHARLIE']</p>
<h2 id="list">list</h2>
<h3 id="py里的list可以装入各种类型数据">py里的list可以装入各种类型数据</h3>
<blockquote>
<p>student_data = ["张伟", 21, True, [95, 88, 92]]<br>
.# 列表中包含了: 字符串(姓名), 整数(年龄), 布尔值(是否在校), 另一个列表(成绩)</p>
</blockquote>
<h1 id="总结与使用">总结与使用</h1>
<h2 id="例如水仙花数数组的判断可以用这个轻松解决">例如水仙花数数组的判断可以用这个轻松解决</h2>
<p>先遍历一遍外部<br>
r=map(lambda num:num**3,[num//100,num//10%10,num%10])<br>
map返回一个列表,我们可以存着<br>
再调用sum即可</p>
