---
title: py-lambda-map-list随笔
---
##匿名函数lambda
lambda 表达式用于创建 小型、匿名 的单行函数。
语法：lambda arguments: expression

>很方便的
##map()用于及其方便地映射
###把相同的操作（如lambda表达式）映射到后者（如列表上）
map() 函数接受两个主要参数：
map(function, iterable, ...)
比如：result_map = map(lambda x: x * x, numbers)
起连接作用
如果操作逻辑比较复杂，可以先定义一个普通函数。
>def to_uppercase(s):
>    return s.upper()
>
>names = ['alice', 'bob', 'charlie']
>
>result_list = list(map(to_uppercase, names))#将map()函数返回的结果从一个迭代器（map object）转换为一个标准的列表
>
>print(result_list) 

输出: ['ALICE', 'BOB', 'CHARLIE']

##list
###py里的list可以装入各种类型数据
>student_data = ["张伟", 21, True, [95, 88, 92]]
.# 列表中包含了: 字符串(姓名), 整数(年龄), 布尔值(是否在校), 另一个列表(成绩)

#总结与使用
##例如水仙花数数组的判断可以用这个轻松解决
先遍历一遍外部
r=map(lambda num:num**3,[num//100,num//10%10,num%10])
map返回一个列表,我们可以存着
再调用sum即可