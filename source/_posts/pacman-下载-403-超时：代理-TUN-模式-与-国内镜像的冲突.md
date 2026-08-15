---
title: pacman 下载 403 与超时：代理 TUN 模式与国内镜像的冲突
date: 2026-08-15 12:00:00
tags:
  - Linux
  - 网络
categories:
  - Linux
excerpt: pacman 下载 403 或超时，往往不是环境变量问题，而是 VPN 的 TUN 模式在网络层劫持了国内镜像流量。记录一次完整排查。
---

# 起因

在 WSL 的 Arch 里装包，`pacman` 一直从清华镜像报 403，换成别的源又变成超时。一开始怀疑是环境变量没传给 `sudo`，或者代理配置有问题，排查下来跟这些都没关系。

# 现象

- `http_proxy` / `https_proxy` / `no_proxy` 都设了，`sudo env` 里也能看到，但 pacman 依旧 403。
- 用 `curl -x http://172.25.0.1:7890 https://www.baidu.com` 却能通，看起来代理没问题。
- 清掉所有代理环境变量之后，pacman 还是 403。

<!-- more -->

# 排查

## 先看代理的出口 IP

curl 走代理能通，只说明代理服务在工作。真正要看的是「出口 IP」——代理转发之后，目标网站看到的是哪个 IP：

```bash
curl -x http://127.0.0.1:7890 https://api.ipify.org
```

`api.ipify.org`（或 `ip.sb`、`ipinfo.io/ip`）这类服务只返回「它看到的来源 IP」。带上代理去请求，返回的就是代理出口节点的 IP，而不是本机 IP。这不是 ping，ping 测的是连通性，不返回这种身份信息。

实测返回 `141.11.146.76`，查一下归属：

```
country: Hong Kong
isp:     IKUUU NETWORK LTD
```

即流量被绕到了香港的节点。

## 逐个镜像直接测状态码

不靠猜，直接对每个镜像发请求看返回码：

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://mirrors.ustc.edu.cn/archlinux/core/os/x86_64/core.db
curl -s -o /dev/null -w '%{http_code}\n' https://mirrors.aliyun.com/archlinux/core/os/x86_64/core.db
curl -s -o /dev/null -w '%{http_code}\n' https://mirrors.tuna.tsinghua.edu.cn/archlinux/core/os/x86_64/core.db
```

| 镜像 | 状态码 |
|------|--------|
| 中科大 USTC | 200 |
| 阿里云 | 200 |
| 清华 TUNA | 403 |

同一个网络下有的镜像 200、有的 403，差异在于代理对它们的路由规则不同。

## 确认是 TUN 模式在劫持

在 Windows 侧看代理客户端的状态：系统代理（注册表 `ProxyEnable`）是关闭的，但有一张 `iKuuuVPN Tunnel` 虚拟网卡处于 Up 状态。即客户端用的是 TUN 模式，不是系统代理模式。

TUN 在网络层劫持所有流量，环境变量对它无效——`http_proxy` / `no_proxy` 只对「读这些变量」的程序生效，而 TUN 根本不看它们。这就是为什么清掉环境变量之后 pacman 依旧 403。

# 根因

清华镜像（以及所有被路由到香港节点的源）会拒绝非大陆 IP。TUN 把国内镜像的流量也劫持到了香港节点，于是 403。跟环境变量传没传、`sudo` 认不认，都没有关系。

# 解决

两条路，任选其一：

1. 换一个被代理正确路由成直连的镜像（如 USTC / 阿里云），把 mirrorlist 里其他源删掉。pacman 走国内直连，不经过机场节点。
2. 装包时临时退出 TUN。国内镜像本来就在国内，不需要 VPN；退了 TUN 之后连清华都能直连。VPN 留给真正要翻墙的服务（GitHub、npm 源、archlinux.org 等）。

# 总结

- 代理「通不通」要看出口 IP 是不是预期，而不是 curl 能通就完事。
- TUN 模式和系统代理 / 环境变量是两套机制，前者在网络层、后者在应用层；`no_proxy` 对 TUN 无效。
- 国内镜像不该走 VPN：装包要么退 TUN，要么选被正确直连的镜像。
- 看「代理把我当成哪个 IP」用 IP echo 服务，不是 ping。

一个容易混淆的点：WSL 里 `cat /etc/resolv.conf` 的 `nameserver`（DNS 服务器）和 `ip route show` 的默认网关是两回事。前者负责把域名翻译成 IP，后者才是通往 Windows 宿主机的路。要连宿主机上的代理，用默认网关的 IP，别用 nameserver 的 IP。
