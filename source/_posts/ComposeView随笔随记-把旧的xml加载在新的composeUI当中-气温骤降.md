---
title: ComposeView随笔随记-把旧的xml加载在新的composeUI当中 - 气温骤降
tags:
  - Kotlin
  - Android
date: 2026-03-29 15:09:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19792386
categories:
    - Android
    - 应用开发
---

在composeUI当中来预览 简单示例 @Preview @Composable fun OldStyFragmentUIPreview() { AndroidView( factory = { context -> LayoutInflater.from(context/*传入到这里*/).inflate(R.layout.preferences, null/*上一级元素*/) }, modifier = Modifier.fillMaxSize()//变大变高 ) } 此外，还有update选项可以加入 update = { view -> // 这里可以对 View...
<!-- more -->

<h1 id="在composeui当中来预览">在composeUI当中来预览</h1>
<p>简单示例</p>
```kotlin
@Preview
@Composable
fun OldStyFragmentUIPreview() {
    AndroidView(
        factory = { context ->
            LayoutInflater.from(context/*传入到这里*/).inflate(R.layout.preferences, null/*上一级元素*/)
        },
        modifier = Modifier.fillMaxSize()//变大变高
    )
}
```
<p>此外，还有update选项可以加入</p>
```kotlin
update = { view ->
            // 这里可以对 View 进行后续的更新操作
}
```
<h1 id="不使用id查找">不使用id查找</h1>
<p>使用ViewBinding</p>
<h1 id="多个fragment需要在resvaluesidsxml当中指定id">多个Fragment需要在res/values/ids.xml当中指定id</h1>
<p>否则退出删除界面就会删干净然后出问题（</p>
<p>然后就是Android developer的这个示例</p>
```kotlin
class ExampleFragmentMultipleComposeView : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = LinearLayout(requireContext()).apply {
        addView(
            ComposeView(requireContext()).apply {
                setViewCompositionStrategy(
                    ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
                )
                id = R.id.compose_view_x
                //jklhlhkjhkhj
            }
        )
        addView(TextView(requireContext()))
        addView(
            ComposeView(requireContext()).apply {
                setViewCompositionStrategy(
                    ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
                )
                id = R.id.compose_view_y
                // gyifvgvgyhguih
            }
        )
    }
}
```
```xml
<resources>
  <item name="compose_view_x" type="id" />
  <item name="compose_view_y" type="id" />
</resources>
```
<h1 id="区分">区分</h1>
<h2 id="在旧的布局fragment-里手动塞进一个compose区域-和-在compose-代码里塞进一个旧的xmlview">在旧的布局/Fragment 里手动塞进一个Compose区域 和 在Compose 代码里塞进一个旧的XML/View</h2>
<h1 id="前者">前者</h1>
<p>只是一个静态的UI（或者说组件？），有compose管理</p>
```kotlin
addView(ComposeView(...))
```
<h1 id="后者">后者</h1>
```kotlin
val composeViewInFragment = ComposeView(requireContext()).apply{}
```
<p>在Fragment继承的类当中<strong>使用requireContext()</strong>来获取context<br>
在@compose当中则使用本地组合变量</p>
```kotlin
val context = LocalContext.current
```
