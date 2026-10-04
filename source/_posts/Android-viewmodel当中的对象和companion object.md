---
title: Android-viewmodel当中的对象和companion object 
date: 2026-08-13 12:00:00
tags:
  - Android
  - Kotlin
categories:
  - Android
  - Kotlin
excerpt: 内联修饰词可能造成泄漏，在不同的viewmodel持有不同数据时可以抽离出单例对象作为小项目传递
---

# 内联

内联最好是写是编译时常量 const val 

或者运行时常量 val

但是 var 其实也能写，写了也不会报错（好像连警告也没有来着，忘了

但是如果不管好容易出问题

比如一个内联对象存在于activity，但是其中一个被销毁了，但是此时该var始终被另外一个伴生对象持有，会导致无法回收

```Kotlin
class MainActivity : AppCompatActivity() {
    companion object {
        var currentActivity: Activity? = null 
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        currentActivity = this 
    }
}

```

或者是一个内联的lambda变量，被赋值了外部引用（例如这里是字符串常量，还可能是list之类的，或者直接使用::引用函数或者其他东西）

```Kotlin
class DataManager {
    var data = "Some big data"

    init {
        MyConfig.onUpdateListener = {
            println(data) 
        }
    }
}

class MyConfig {
    companion object {
        var onUpdateListener: (() -> Unit)? = null
    }
}

```

# 正常对象在data作为小项目在viewmodel层和传递到ui层

传递一个就够了，不需要太多也不能要太多（

主要是某些东西，比如说，我在日志的viewmodel写了个日志记录

但是我为了方便，还想再在发出指令的地方写两句指令预览

这个时候要么都再传递一个viewmodel对象

但是这样完全用不着，而且这样做的冗余太多了

所以可以考虑写一个这个东西

```Kotlin
object LogData {
    private const val MAX_LOG_ENTRIES = 500
    //要限制大小

    private val nextLogId = AtomicLong(0L)
    private val _logs = mutableStateListOf<LogEntry>()
    val logs: List<LogEntry>
        get() = _logs

    fun displayedLogs(filter: LogFilter): List<LogEntry> = when (filter) {
        LogFilter.ALL -> _logs
        LogFilter.SENT -> _logs.filter { it.direction == LogDirection.SENT }
        LogFilter.RECEIVED -> _logs.filter { it.direction == LogDirection.RECEIVED }
    }
........
```

然后就很方便了

或者还是得设计的时候想好（？

但是基本上都不一样

就是想加一个东西而已

或者设计的时候应该把这种viewmodel单独拆出来

但是是临时的想法就很搞了
