---
title: C如何使用XOR运算 古法制作链表（异或链表） - 气温骤降
tags:
  - C&amp;cpp
  - 算法
date: 2026-02-01 15:29:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19561794
categories:
    - C
---

依旧是看到Tsoding的视频 链接如下 【编程派对小技巧 | Tsoding】 https://www.bilibili.com/video/BV1iu2mByEXB 点击下方的阅读全文 不过还是不如自己看源代码 手机UI点这个 <iframe src="//player.bilibili.com/player.html?isOutside=true&aid=115687024494780&bvid=BV1iu2mByEXB&cid=34604843364&p=1" scrolling="no" border="0" frameborder="no" framespacing="0"...
<!-- more -->

<blockquote>
<p>依旧是看到Tsoding的视频<br>
链接如下<br>
【编程派对小技巧 | Tsoding】 <a href="https://www.bilibili.com/video/BV1iu2mByEXB" target="_blank" rel="noopener nofollow">https://www.bilibili.com/video/BV1iu2mByEXB</a><br>
点击下方的阅读全文<br>
<s>不过还是不如自己看源代码</s></p>
</blockquote>
<details>
<summary>手机UI点这个</summary>
<p>&lt;iframe src="<a href="https://player.bilibili.com/player.html?isOutside=true&amp;aid=115687024494780&amp;bvid=BV1iu2mByEXB&amp;cid=34604843364&amp;p=1" target="_blank" rel="noopener nofollow">//player.bilibili.com/player.html?isOutside=true&amp;aid=115687024494780&amp;bvid=BV1iu2mByEXB&amp;cid=34604843364&amp;p=1</a>" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"&gt;\</p>
</details>
<h1 id="思路应该是">思路应该是：</h1>
<p>我们有异或运算符，（它的逆运算是自己）就是说它可以使用前两个值推导出第三个值：<br>
例如加入时可以替换掉end迭代器 <em>（和cpp指向最后一个元素的后面不同，这里☞最后一个元素）</em> 替换成加入的新地址，旧的变为^=新地址<br>
例如遍历时传入迭代器（传入end会反转）<s>？</s>更新表达式调用一个prev（每次操作前要更新为0）用于维护上一个值，然后Node <em>next = (Node</em>)(node-&gt;xorn ^ *prev);安全起见可以归零 <s>虽然这玩意本身就很难安全，没什么人用</s><br>
<em>指针不能直接异或运算</em>，我们可以使用结构体包含值 <em>（uintptr_t类型)</em>，然后辅助运算</p>
<h1 id="如下倒着看一遍">如下，倒着看一遍</h1>
<p>比如要先存入数据，就要维护一个当前值和一个prev值，在链表为空的时候，需要CreateNode函数创建节点再处理维护begin和end，不为空就可以正常异或赋值传值</p>
```c
Node* CreateNode(int value) {
    Node* node = (Node*)calloc(1, sizeof(Node));
    node->value = value;
    node->xorn = 0;
    return node;
}
void ll_append(XORLinkedList* ll,int value){
    if(ll->begin == NULL){
        assert(ll->end == NULL);
        Node *node = CreateNode(value);
        ll->begin = node;
        ll->end = node;
        return;
    }
    Node *node = CreateNode(value);
    ll->end->xorn ^= (uintptr_t)node;
    node->xorn = (uintptr_t)ll->end;
    ll->end = node;
}
```
<p>遍历时需要维护prev</p>
```c
Node* NodeNext(Node* node,uintptr_t * prev ){
    Node *next = (Node*)(node->xorn ^ *prev);
    //Node *next = (Node* )((Node*).xorn ^ (Node*)prev);
    *prev = (uintptr_t)node;
    return next;
}
```
<p>然后就</p>
```c
for(Node* iter = eg.begin; iter != NULL;iter = NodeNext(iter, &prev)) {
        printf("%d ", iter->value);
    }
```
<p>ll_append 0~9<br>
输出0 1 2 3 4 5 6 7 8 9<br>
其实还是看一遍源码更有用（）<br>
删除尾部（不然就遍历再把节点接上）</p>
```c
void ll_detach_end(XORLinkedList* ll){
    if (ll->end == NULL){
        assert(ll->begin == NULL);
        return;
    }
    
    if (ll->begin == ll->end) {//Only one node
        free(ll->end);
        ll->begin = NULL;
        ll->end = NULL;
        return;
    }
    Node* old_end = ll->end;
    Node* new_end = (Node*)(old_end->xorn); // old_end 的前一个节点的地址转换为节点指针
    //NULL<->...<->new_end<->old_end<->NULL
    //                           ↑xorn of it ==addresses of new_end ^ NULL

    new_end->xorn ^= (uintptr_t)old_end;  // 异或掉 old_end
    
    ll->end = new_end;
    free(old_end);
}
```
<p>删除特定节点</p>
```c

```
