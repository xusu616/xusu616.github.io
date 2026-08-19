---
title: Linux-映射到0000监听所有网卡
date: 2026-08-19 17:00:00
tags:
  - Linux
  - d
  - WSL
categories:
  - Linux
excerpt: 把只监听 127.0.0.1 的服务改成 0.0.0.0，让局域网其他设备也能访问；记录 dsh 的安全限制、WSL2 端口转发和 SSH 隧道
---

# 先看监听网址

一般来说是需要

```Bash
ss -tlnp | grep 3080
# 或者
netstat -tlnp | grep 3080
```

但是我这里容器太精简（Debian：slim）就直接cat文件来看了

用 cat 直接查看监听地址(这里用3080举例)
在容器内执行：

```bash
grep -i ':0C08' /proc/net/tcp /proc/net/tcp6
#0C08 是 3080 的十六进制，你服务端口是 3080，所以用它过滤。
```

输出：

```Bash
root@DESKTOP-T9J8ELC:/xvsu# grep -i ':0C08' /proc/net/tcp /proc/net/tcp6
/proc/net/tcp:   1: 0100007F:0C08 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 31974 1 00000000f9f3d19b 100 0 0 10 0
/proc/net/tcp:   7: 0100007F:0C08 0100007F:D16E 01 00000000:00000000 00:00000000 00000000     0        0 20064 1 00000000ed8d19e2 20 4 31 10 -1
/proc/net/tcp:   8: 0100007F:0C08 0100007F:C8F8 01 00000000:00000000 00:00000000 00000000     0        0 49245 1 000000007c628bfe 20 4 31 10 -1
/proc/net/tcp:   9: 0100007F:0C08 0100007F:E00C 06 00000000:00000000 03:000011D0 00000000     0        0 0 3 00000000a4f168df
/proc/net/tcp:  10: 0100007F:0C08 0100007F:C8E8 01 00000000:00000000 00:00000000 00000000     0        0 49244 1 000000000569ee06 20 4 31 10 -1
/proc/net/tcp:  11: 0100007F:0C08 0100007F:D16C 01 00000000:00000000 00:00000000 00000000     0        0 20063 1 00000000ca1d92d1 20 4 31 10 -1
/proc/net/tcp:  13: 0100007F:0C08 0100007F:DFF4 06 00000000:00000000 03:000011D0 00000000     0        0 0 3 00000000dae199b0
/proc/net/tcp:  14: 0100007F:C8F8 0100007F:0C08 01 00000000:00000000 00:00000000 00000000     0        0 32509 1 00000000fa17419e 20 4 24 10 -1
/proc/net/tcp:  16: 0100007F:C8E8 0100007F:0C08 01 00000000:00000000 00:00000000 00000000     0        0 10031 1 000000000ebcd840 20 4 18 10 -1
/proc/net/tcp:  17: 0100007F:C8B2 0100007F:0C08 01 00000000:00000000 00:00000000 00000000     0        0 32508 1 000000007daebee7 20 4 0 10 -1
/proc/net/tcp:  18: 0100007F:D16C 0100007F:0C08 01 00000000:00000000 00:00000000 00000000     0        0 35932 1 000000006691024e 20 4 18 10 -1
/proc/net/tcp:  20: 0100007F:D166 0100007F:0C08 01 00000000:00000000 00:00000000 00000000     0        0 35928 1 00000000a2ace8db 20 4 20 10 -1
/proc/net/tcp:  23: 0100007F:0C08 0100007F:C8B2 01 00000000:00000000 00:00000000 00000000     0        0 49238 1 0000000080d98706 20 4 1 20 20
/proc/net/tcp:  24: 0100007F:D16E 0100007F:0C08 01 00000000:00000000 00:00000000 00000000     0        0 35934 1 00000000dd7f053a 20 4 24 10 -1
/proc/net/tcp:  25: 0100007F:0C08 0100007F:E004 06 00000000:00000000 03:000011D0 00000000     0        0 0 3 0000000022793f7a
/proc/net/tcp:  26: 0100007F:0C08 0100007F:D166 01 00000000:00000000 00:00000000 00000000     0        0 36875 1 0000000034444746 20 4 27 10 -1
/proc/net/tcp:  27: 0100007F:0C08 0100007F:DFE6 06 00000000:00000000 03:000011D0 00000000     0        0 0 3 00000000c16311e8
```

```TEXT
local_address 字段	含义
0100007F:0C08	127.0.0.1:3080（只绑定本机回环，外部无法访问）
00000000:0C08	0.0.0.0:3080（所有网卡，外部可访问）
00000000000000000000000000000000:0C08	[::]:3080（IPv6 所有接口，通常也包含 IPv4，可访问）
```

```bash
npx serve -l tcp://0.0.0.0:3080
```

使用 npm run dev（Vite）

```bash
npm run dev -- --host 0.0.0.0
```

使用 npm start（Create React App）

```bash
HOST=0.0.0.0 npm start
```

使用 webpack-dev-server

```bash
webpack-dev-server --host 0.0.0.0 --port 3080
```

如果是 next dev

```bash
next dev -H 0.0.0.0 -p 3080
```

# 好吧折腾半天，我意识到一个问题

似乎本机都没办法这样来的

# 问题

服务如果只监听 `127.0.0.1`，那就只有本机能访问，局域网里的手机、另一台电脑都连不进来。

判断方法很简单：

```bash
ss -tlnp | grep 3080
```

如果看到：

```text
127.0.0.1:3080
```

就是只绑定了回环地址，外部访问不到。

如果看到：

```text
0.0.0.0:3080
```

就是绑定了所有网卡，同一局域网内的其他设备理论上可以访问。

# 在精简容器里没有 ss 时

Debian slim 之类的镜像可能没有 `ss` / `netstat`，可以直接看内核连接表：

```bash
grep -i ':0C08' /proc/net/tcp /proc/net/tcp6
```

`0C08` 是 `3080` 的十六进制。

关键看 `local_address`：

| local_address | 含义 |
| --- | --- |
| `0100007F:0C08` | `127.0.0.1:3080`，只监听本机回环 |
| `00000000:0C08` | `0.0.0.0:3080`，监听所有网卡 |
| `00000000000000000000000000000000:0C08` | `[::]:3080`，IPv6 所有接口 |

# 常见开发服务器怎么监听 0.0.0.0

```bash
# serve
npx serve -l tcp://0.0.0.0:3080

# Vite
npm run dev -- --host 0.0.0.0

# Create React App
HOST=0.0.0.0 npm start

# webpack-dev-server
webpack-dev-server --host 0.0.0.0 --port 3080

# Next.js
next dev -H 0.0.0.0 -p 3080
```

# 程序不允许 0.0.0.0 怎么办：端口转发

有些程序出于安全原因，故意禁止监听 `0.0.0.0`，比如 dsh：

```text
error: --host 0.0.0.0 is intentionally not supported yet for safety:
it would expose remote code execution to the network; use 127.0.0.1 instead
```

这时候可以用一个本地转发代理，让代理监听 `0.0.0.0`，把流量转到 `127.0.0.1`。

## 用 socat

```bash
socat TCP-LISTEN:3081,bind=0.0.0.0,reuseaddr,fork TCP:127.0.0.1:3080
```

## 用 Node.js 内置代理

```js
const net = require('net')

const proxy = net.createServer((client) => {
  const upstream = net.connect(3080, '127.0.0.1')
  client.pipe(upstream).pipe(client)
  client.on('error', () => {})
  upstream.on('error', () => client.destroy())
})

proxy.listen(3081, '0.0.0.0', () => {
  console.log('0.0.0.0:3081 -> 127.0.0.1:3080')
})
```

这样访问 `http://<服务器IP>:3081` 就会转发到本机的 `127.0.0.1:3080`。

# WSL2 里还有一层 NAT

如果你的 Linux 跑在 WSL2 里，就算服务已经监听 `0.0.0.0:3081`，局域网手机仍然访问不到。

因为 WSL2 是 NAT 网络，`0.0.0.0` 只是监听在 WSL 的虚拟网卡上，手机到不了那里。

需要在 Windows 管理员 PowerShell 里做端口转发：

```powershell
# 先查 WSL IP
# WSL 里执行 hostname -I，比如得到 172.25.6.205
# 然后 Windows 管理员 PowerShell：

netsh interface portproxy add v4tov4 listenport=3081 listenaddress=0.0.0.0 connectport=3081 connectaddress=172.25.6.205
```

再放行防火墙：

```powershell
netsh advfirewall firewall add rule name="dsh-lan-3081" dir=in action=allow protocol=TCP localport=3081
```

更新 WSL IP 后，先删旧规则再加新的：

```powershell
netsh interface portproxy delete v4tov4 listenport=3081 listenaddress=0.0.0.0
netsh interface portproxy add v4tov4 listenport=3081 listenaddress=0.0.0.0 connectport=3081 connectaddress=<新WSL IP>
```

# 其他问题和允许手机访问

## 为什么用局域网 IP 访问 Web 还会报错

即使端口转发通了，有些 Web 应用还会因为“非 localhost 访问”拒绝敏感接口。

### 1crypto.randomUUID is not a function

浏览器只在 secure context 下开放 `crypto.randomUUID()`。

- `http://localhost` 算 secure context
- `http://192.168.x.x` 不算

所以局域网 IP 访问时，页面里用到 `crypto.randomUUID()` 的功能会报错。

解决办法就是

去chrome或者edge，输入

```address
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

在框框处把你想要白名单的网站加进去

然后点下面，可能有启用之类的选项

我这里是chrome，下面要点已启用

会提示已保存

### 2 HTTP 403

dsh 这类工具还会主动拒绝非 localhost 的 host 级 API，例如：

```text
/api/host.listDirectory: HTTP 403
```

这不是端口转发坏了，而是 dsh 在保护本机文件系统。

## 目前在用的允许手机联通的方案：SSH 隧道

如果只是想从手机/另一台电脑访问，又不想直接暴露到局域网，SSH 隧道最合适（（随便开一个终端比如Termux（要安装ssh）：

```bash
ssh -N -L 3081:127.0.0.1:3081 xvsu@192.168.0.100
```

然后在手机浏览器访问：

```text
http://127.0.0.1:3081
```

请求来自 `localhost`，不会触发 403，也满足 secure context，`crypto.randomUUID` 也能正常工作

*Termux 里先装 openssh：*

```plain
pkg install openssh
```

再跑上面的隧道命令。

# 总结

- 想让外部访问，优先让服务直接监听 `0.0.0.0`
- 程序禁止 `0.0.0.0` 时，用 `socat` 或 Node 代理做本地转发
- WSL2 还需要 Windows `netsh interface portproxy` 转发到 WSL IP
- 直接暴露局域网 HTTP 可能触发安全限制 / 浏览器 secure context 问题
- SSH 隧道是不需要删容器 能在手机上访问的方式
ash
next dev -H 0.0.0.0 -p 3080
ssh -N -L 3081:127.0.0.1:3081 hostname@192.168.0.100
