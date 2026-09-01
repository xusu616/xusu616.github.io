---
title: STM32-vscode编辑mx生成的cmake项目时遇到的可以烧录但是不能连接到设备的问题
date: 2026-08-18 14:14:00
tags:
  - STM32
  - 嵌入式
categories:
  - 嵌入式
excerpt: 使用vsc烧录cmake管理的stm32项目时遇到的问题排查方法
---

# 问题

可以烧录到stm32，但是debug core 报错连接不到设备

首先，尝试打开debug core 插件的日志

在下载了stm32的捆绑包之后

默认是打开的插件日志的

在下方查看out put 选项卡即可

![pam51t22-i25amg2-2026-09-01-10-25-51](/img/pam51t22-i25amg2-2026-09-01-10-25-51.png)

看见了

```bash
2026-08-29 17:55:24.693 [Info] [st-link-client-server] <== Starting server if not already running...
2026-08-29 17:55:25.313 [Info] [st-link-client-server] ==> Debug: 1 1 : Parse param : 97
Debug: 2 1 : --auto_exit 
Debug: 3 1 : create_listening_sockets
Debug: 4 1 : Entering create_listening_sockets()
Debug: 5 1 : Creating the list of sockets to listen for ...
Debug: 6 1 : interface, tcp port : (null) , 7184
Info : 7 1 : default port : 7184
Debug: 8 1 : getaddrinfo successful. Enumerating the returned addresses ...
Debug: 9 1 : Processing Address 009b68d0 returned by getaddrinfo(1) : (null) 
Debug: 10 2 : Created socket with handle = 432
Info : 11 2 : 127.0.0.1:7184
Error: 12 2 : bind failed. Error = 10013, exit

Debug: 13 2 : Freed the memory allocated for res by getaddrinfo
Debug: 14 2 : Exiting create_listening_sockets()
Debug: 15 2 : WSACleanup. Error = -4
```

可以看到端口被占用

# 但是实际上debug core并不提供更换端口的选项

所以除了更换对应占用进程的端口（这个端口也不一定时可以指定的

可以在debug core 的设置当中更换为离线调试
