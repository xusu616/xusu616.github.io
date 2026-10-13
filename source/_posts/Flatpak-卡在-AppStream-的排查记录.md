---
title: Flatpak 卡在 AppStream 的排查记录
date: 2026-10-13 21:21:00
tags:
  - Linux
  - Flatpak
  - 网络
categories:
  - Linux
  - 工具与配置
description: Flatpak 显示没有更新，却停在刷新 AppStream 这一行，从进程、镜像重定向、代理连接和缓存时间查清它在做什么
---

更新系统时，终端停在这里

~~shorin script~~

~~但是我只用了一部分好吧~~

```text
没有更新
正在为远程仓库 flathub 更新 appstream 数据
```

这两行可以同时成立

应用和运行时没有新版本，应用目录仍然需要刷新

AppStream 是软件商店和搜索使用的应用目录，普通 `flatpak update` 也会更新它

[官方说明](https://docs.flatpak.org/en/latest/flatpak-command-reference.html#flatpak-update)

<!-- more -->

## 先看进程在不在

```bash
ps -eo pid,ppid,stat,etimes,pcpu,args |
  rg '[f]latpak update|[s]ysup'
```

`etimes` 是进程已运行的秒数，`pcpu` 是 CPU 占用

现场的 `flatpak update -y` 已经跑了四分多钟，CPU 占用约 0.3%

这只能说明进程还在，单靠 CPU 占用查不出它卡在哪

## 看配置的源，再看实际去的地方

```bash
flatpak --system remotes --columns=name,url,options
flatpak --user remotes --columns=name,url,options
```

我这里的 Flathub 配置在系统级安装中，地址是

```text
https://mirror.sjtu.edu.cn/flathub
```

接着看服务器返回什么

```bash
curl -q -sSI --connect-timeout 5 --max-time 10 \
  https://mirror.sjtu.edu.cn/flathub/summary
```

这里先不加 `-L`，保留第一跳的响应

现场返回

```http
HTTP/2 301
location: https://dl.flathub.org/repo/summary
```

请求被转到了官方 Flathub

配置里写着国内镜像，实际下载地址已经变了

这个结果只针对当时的 `summary` 请求，其他文件和其他时间要重新检查

## 查进程继承的代理

桌面上的代理开关，不足以说明一个已经启动的进程怎么联网

先找 PID

```bash
pgrep -a -x flatpak
```

把下面的 PID 换成自己的

```bash
pid=178464

python3 - "$pid" <<'PY'
import sys
from pathlib import Path
from urllib.parse import urlsplit

data = Path(f'/proc/{sys.argv[1]}/environ').read_bytes()
for entry in data.split(b'\0'):
    key, _, value = entry.partition(b'=')
    if key.lower() in (b'http_proxy', b'https_proxy', b'all_proxy'):
        proxy = urlsplit(value.decode())
        print(key.decode(), proxy.hostname, proxy.port)
PY
```

现场的 Flatpak 继承了指向 `127.0.0.1:7897` 的代理变量

这些变量来自进程启动时的环境，后来关闭系统代理开关，也不会自动清掉旧进程里的变量

## 查 Clash 的实际连接

这台机器的 Mihomo 控制接口是 Unix socket

```bash
curl -q --unix-socket /tmp/verge/verge-mihomo.sock \
  -sS http://localhost/connections |
  python3 -c '
import json, sys
for connection in json.load(sys.stdin).get("connections", []):
    host = connection.get("metadata", {}).get("host", "")
    if "flathub" in host:
        print(json.dumps({
            "id": connection["id"],
            "host": host,
            "chains": connection.get("chains"),
            "download": connection.get("download"),
            "start": connection.get("start")
        }, ensure_ascii=False))
'
```

socket 路径以自己的安装为准

隔几秒执行两次，比较同一个 `id` 的 `download`

现场看到的目标是 `dl.flathub.org`，走香港代理节点，三秒采样期间下载计数没有增加

这条证据说明观察期间没有下载进展，原因还可能在代理链路、服务器响应或重试过程

另起一个 curl 能收到 HTTP 200，只能证明新请求拿到了响应头，不能证明旧连接正在传数据

## 判断结束，看落地结果

终端停在同一句，不够判断它是否还在运行

我最后查了这些文件的修改时间

```bash
stat -c '%y %n' \
  /var/lib/flatpak/appstream/flathub/x86_64/active \
  /var/lib/flatpak/appstream/flathub/x86_64/.timestamp \
  /boot/grub/grub.cfg
```

这是系统级安装的路径，用户级安装一般在 `~/.local/share/flatpak/appstream`，架构也要按实际机器调整

现场结果是

| 检查项 | 更新时间 |
| --- | --- |
| AppStream 的 active 和时间标记 | 21:17:27 |
| 后续步骤生成的 GRUB 配置 | 21:17:29 |

再查进程，`flatpak update` 和 `sysup` 都已退出

缓存已经更新，脚本也执行到了后续步骤

这次是在准备重连之前，原进程已经自行完成，检查时旧连接也已消失

## 顺手处理网络切换

后台还有一个定时脚本，会调整有线和 Wi-Fi 的优先级，Clash 日志记录了出口反复变化

我给它加了更新期间暂缓切换的判断

```bash
if pgrep -x 'pacman|flatpak' >/dev/null 2>&1; then
  exit 0
fi
```

这能减少更新途中换出口的干扰，服务器和代理是否稳定，仍然要单独验证

这次留下的排查顺序就是：看进程 → 看重定向 → 看代理连接 → 看缓存和后续步骤
