---
title: Surfing 与 AdGuardHome 模块共存时的 DNS 抢占与节点掉线深度排查
date: 2026-10-28 17:30:00
tags:
  - Android
  - 刷机
  - Clash
  - DNS
  - ai-generated
  - archived
categories:
  - Android
  - 刷机
excerpt: 记录一次两台手机同机场同模块刷 X (Twitter) 速度天差地别的深度排查：从 iptables NAT 链顺序、redir-host 污染与 IPv6 抢跑，到 proxy-providers 忽略机场专用抗污染 DNS 导致 IEPL 节点全灭的完整解决过程 
---

# 背景现象

手头有两台已经 Root 的一加手机，连接同一个机场订阅、同样刷入了 `Surfing`（基于 `box_bll` / Mihomo 核心的透明代理模块） 但奇怪的是：

- 旧手机（一加 7 Pro）刷 X（Twitter）图片和视频秒开；
- 主力新机（额外刷入了 `AdGuardHome` 模块用于去广告）刷推特却总是转圈，冷门推文的图片加载极慢，甚至到了后来所有付费 IEPL 专线节点集体超时掉线（`delay: 0`），只能退回到慢速免费节点 

顺着数据包在内核 `iptables`、`AdGuardHome` 和 `Clash (Mihomo)` 之间的流转路径逐层排查后，发现这其实是 **`Surfing` 与 `AdGuardHome` 模块共存时的三层机制冲突** 

<!-- more -->

---

## 第一层冲突：`proxy_mode="core"` 下 DNS 被 `AdGuardHome` 提前截胡

### 1. 原因分析

对比两台手机的 `/data/adb/box_bll/scripts/box.config` 发现：

- 旧手机配置的是 `proxy_method="MIXED"` + `proxy_mode="blacklist"`；
- 新手机配置的是 `proxy_method="TPROXY"` + `proxy_mode="core"`（纯 TUN 内核转发） 

在 `Surfing` 的 `box.iptables` 脚本逻辑中，当 `proxy_mode="core"` 时，脚本**不会**往 `iptables -t nat OUTPUT` 链中插入 `CLASH_DNS_LOCAL` 和 `BOX_LOCAL` 规则，而是完全依赖虚拟网卡 `Meta`（TUN）去接管路由 

但新手机上同时运行着 `AdGuardHome` 模块的守护脚本 `/data/adb/agh/scripts/iptables.sh`，它在 `iptables -t nat OUTPUT` 链的最顶端插入了 `ADGUARD` 链，将本机所有发往 53 端口的 UDP/TCP 流量直接 `REDIRECT` 到了 `AdGuardHome` 的本地随机端口（例如 `127.0.0.1:48716`）：

```text
-P OUTPUT ACCEPT
-A OUTPUT -j ADGUARD
```

结果就是：本机发出的 DNS 请求在进入 `Meta` TUN 虚拟网卡之前，就已经在 `nat OUTPUT` 链被 `ADGUARD` 截胡送进了国内上游 DoH（`1.12.12.12`），根本没有进入 Clash 的 DNS 监听器（`1053` 端口） 

### 2. 解决办法

将 `/data/adb/box_bll/scripts/box.config` 改为与旧手机一致的 `MIXED` + `blacklist` 模式：

```ini
proxy_method="MIXED"
proxy_mode="blacklist"
enable_network_service_control="false"
```

重启 Surfing 后，`box.iptables` 会在 `iptables -t nat OUTPUT` 链头部执行 `-I OUTPUT`，将 `CLASH_DNS_LOCAL`（劫持至 Clash `1053` 端口）和 `BOX_LOCAL`（TCP `REDIRECT` 直达 `7891` 端口）挂载到 `ADGUARD` **之前**：

```text
-P OUTPUT ACCEPT
-A OUTPUT -j CLASH_DNS_LOCAL
-A OUTPUT -j BOX_LOCAL
-A OUTPUT -j ADGUARD
```

> **注意**：如果手机里安装了 Surfing 的磁贴管理端 App（`com.github.surfing`），它的私有配置 `/data/data/com.github.surfing/shared_prefs/ClashConfigPrefs.xml` 中可能还缓存着 `<boolean name="bare_core" value="true" />` 和 `<string name="proxy_mode">TUN</string>` 需要先把该 App 强行停止，将其中的 `bare_core` 改为 `false`、`proxy_mode` 改为 `MIXED`（以及 `OverviewsPrefs.xml` 中的 `cached_proxy_mode` 改为 `Mixed`），否则下次打开 App 或点击磁贴时，它又会把 `box.config` 覆盖回 `core` 模式 

---

## 第二层冲突：`AdGuardHome` 强制改写 `redir-host` 与 IPv6 抢跑延迟

改完 `MIXED` + `blacklist` 后，热门推文恢复了正常，但**一部分冷门推文、外链（`t.co`）和未缓存的图片子域名依然会慢半拍** 

### 1. 为什么 `fake-ip` 比 `redir-host` 更丝滑？

检查 `AdGuardHome` 模块的 `/data/adb/agh/scripts/ProxyConfig.sh` 发现，这个后台脚本每 5 秒轮询一次 `/data/adb/box_bll/clash/config.yaml`，做了两件事：
1. 把 Clash 配置里的 `enhanced-mode: fake-ip` 强行改写为 **`enhanced-mode: redir-host`**；
2. 把 Clash 里所有的 DNS 服务器全部替换为 `127.0.0.1:<AdGuardHome随机端口>` 

在 `redir-host` 模式下：
- 每次请求一个未缓存的冷门海外域名时，Clash 必须先向 `AdGuardHome` 发起 DNS 查询并等待国内上游（`1.12.12.12`）网络往返响应；
- 国内公共 DNS 对海外域名会返回**被污染的虚假 IPv4 和虚假 IPv6 地址**（例如经典的 Facebook 虚假 IPv6 `2a03:2880:...:face:b00c:...`） 客户端发起连接后，必须依赖 Clash 对 TLS 握手包做 **SNI 域名嗅探（Sniffer）** 二次修正回真实域名；
- 更糟糕的是，在 `MIXED` 模式下，安卓内核没有 `ip6table_nat` 表，`REDIRECT` 只接管 IPv4 TCP 如果 Clash 的 `dns.ipv6` 开启为 `true`，客户端优先尝试连接 IPv6 地址时会直接卡死在黑洞中，每次新建连接都要白白付出 **200ms～1000ms+ 的 Happy Eyeballs 回退延迟** 

而在 **`fake-ip`** 模式下：
- 当推特请求任何海外域名时，Clash **完全不需要查询上游 DNS**，直接在内存里 **0.1 毫秒内**秒回一个 `198.18.x.x` 的虚拟 IPv4 地址；
- 客户端拿到 `198.18.x.x` 立刻通过内核 `REDIRECT` 建连，Clash 从内存映射表直接还原出真实域名发给节点——**零 DNS 等待、零污染、零 IPv6 抢跑超时** 

### 2. 改回 `fake-ip` 会不会导致 `AdGuardHome` 去广告失效？

**完全不会 ** 拆解 `AdGuardHome` 模块与 `Surfing` 的配置可以看到去广告由 4 层机制组成：
1. **本地开屏广告目录锁定（`NoAdsService.sh`）**：通过 `chattr +i` 锁定国内几十款 App 的本地广告缓存路径，独立运行，与 DNS 模式无关；
2. **内核层 HTTPS SNI 队列过滤（`iptables.sh` 中的 `AGH_SNI`）**：通过 `filter` 表 `NFQUEUE` 直接检查 443/8443 端口的 TLS 握手域名，独立于 DNS；
3. **国内域名继续走 `AdGuardHome` DNS 过滤**：Surfing 的 `config.yaml` 中配置了 `fake-ip-filter: ["RULE-SET:CN_域", ...]`，意味着**所有国内域名（`CN_域`）在 `fake-ip` 模式下本来就不会分配虚拟 IP**，而是继续向 `nameserver-policy` 中的 `127.0.0.1:<AdGuardHome端口>` 请求真实解析，国内 DNS 去广告 100% 照常生效；
4. **海外域名走 Clash 内置广告规则集**：海外广告域名拿到 `fake-ip` 后，会在 Clash 内部直接命中 `RULE-SET,No-ads-all_域,广告拦截` 被直接拒绝（`REJECT`） 

---

## 第三层冲突（最隐蔽）：为什么在 Surfing App 里找不到“用机场 DNS 解析”的按钮，导致 IEPL 节点全灭？

### 1. 为什么所有专线节点会突然全部掉线？

排查过程中遇到一个更致命的现象：Clash 面板里所有的付费香港/日本/新加坡 IEPL 专线节点全部变成超时掉线（`alive: false, delay: 0`），只剩下慢速的免费节点能通 

打开机场下发的订阅文件 `/data/adb/box_bll/clash/proxies/1.主要地址.yaml`，在第 27–28 行发现了关键线索（以下域名与 IP 已做脱敏处理）：

```yaml
dns:
  ...
  nameserver-policy:
    +.entry-node.example.com: tcp://dns.airport-custom.example:8080
proxies:
  - {name: 🇭🇰 香港01 | IEPL, server: hk01.entry-node.example.com, port: 10001, type: ss, ...}
```

原来：
1. **机场使用了私有抗污染 DNS 来保护 IEPL 入口**：
   机场所有付费 IEPL 节点的入口域名（`*.entry-node.example.com`）在国内公共 DNS（如 `1.12.12.12`）下已经被污染成了无法连接的死 IP（或者在公共 DNS 中根本不存在），**必须向机场自己的专用 TCP DNS（`tcp://dns.airport-custom.example:8080`，假设其解析出的 IP 为 `203.0.113.10:8080`）查询，才能拿到真实的 IEPL 中转入口 IP** 
2. **Surfing 的 `proxy-providers` 机制会自动丢弃订阅里的 `dns:` 块**：
   Surfing 是用主配置 `/data/adb/box_bll/clash/config.yaml` 通过 `proxy-providers` 引用 `./proxies/1.主要地址.yaml` 的 而 Clash / Mihomo 核心在加载 `proxy-providers` 时，**只提取里面的 `proxies:` 节点列表，完全忽略订阅文件自带的 `dns:` 和 `nameserver-policy:` 配置** 因此 Surfing App 界面上也根本没有“使用订阅自带 DNS”的开关 
3. **`AdGuardHome` 覆盖了 `proxy-server-nameserver:`**：
   Clash 在解析节点自身的入口域名时，使用的是主配置 `config.yaml` 里的 `proxy-server-nameserver:`；而这一项又被 `AdGuardHome` 的 `ProxyConfig.sh` 强行改成了 `127.0.0.1:<AdGuardHome端口>`（上游为 `1.12.12.12`） 结果所有 IEPL 节点入口域名全部解析到了被污染的死 IP，导致**所有 IEPL 专线节点集体掉线**！

---

## 最终完整修改方案

只需要修改 `/data/adb/box_bll/clash/config.yaml` 和 `/data/adb/agh/scripts/ProxyConfig.sh` 两处，即可同时实现 **“IEPL 专线走机场专用 DNS + 海外应用走 `fake-ip` 秒开 + 国内应用走 `AdGuardHome` 去广告”**：

### 1. 修改 `/data/adb/box_bll/clash/config.yaml`

在 `dns:` 模块中：
- 将 `ipv6:` 设为 `false`（注释掉 `fake-ip-range6`，避免下发不通的 IPv6 Fake-IP 引起 200ms 回退延迟）；
- 将 `enhanced-mode:` 设为 `fake-ip`；
- 在专门负责**解析机场节点入口域名**的 `proxy-server-nameserver:` 下，填入从订阅文件 `/data/adb/box_bll/clash/proxies/1.主要地址.yaml` 中提取出来的机场专用 DNS：

```yaml
dns:
  enable: true
  ipv6: false
  listen: 0.0.0.0:1053
  fake-ip-range: 198.18.0.0/16
  #fake-ip-range6: fdfe:dcba:9876::/64
  enhanced-mode: fake-ip
  fake-ip-filter:
    - "RULE-SET:CN_域"
    - "RULE-SET:Private_域"
    - "RULE-SET:GoogleFCM_域"
    - "RULE-SET:自定义规则"
  proxy-server-nameserver:
    - tcp://203.0.113.10:8080
    # ↑ 替换为自己机场订阅文件 nameserver-policy 中提供的专用 DNS 地址（建议直接填其对应的 IP:端口，免去二次解析）
  nameserver-policy:
    "RULE-SET:CN_域,Microsoft_域,Apple_域":
      - 127.0.0.1:48716
  nameserver:
    - 127.0.0.1:48716
  direct-nameserver:
    - 127.0.0.1:48716
```

### 2. 修改 `/data/adb/agh/scripts/ProxyConfig.sh`

`AdGuardHome` 模块的 `ProxyConfig.sh` 默认带有 `chattr +i` 防篡改属性，且每 5 秒检查一次 `config.yaml` 我们需要：
1. 将其第 19 行的 `ALL_SECTIONS` 中的 `proxy-server-nameserver:` 移除，防止它每 5 秒把我们填好的机场专用节点解析 DNS 注释掉并塞回 `127.0.0.1:端口`；
2. 将第 34、62、63 行强制检查和改写的 `redir-host` 替换为 `fake-ip`，这样每次手机重启、`AdGuardHome` 重新随机端口时，它依然会自动把新端口同步给 `CN_域` 和 `direct-nameserver`，同时保持 `fake-ip` 模式不变 

可在 Root 终端下执行：

```sh
# 1. 解锁只读属性
chattr -i /data/adb/agh/scripts/ProxyConfig.sh

# 2. 从 ALL_SECTIONS 中移除 proxy-server-nameserver:
sed -i 's/proxy-server-nameserver: //' /data/adb/agh/scripts/ProxyConfig.sh

# 3. 将守护的目标模式从 redir-host 改为 fake-ip
sed -i 's/redir-host/fake-ip/g' /data/adb/agh/scripts/ProxyConfig.sh

# 4. 重新加锁并重启脚本与 Surfing 服务
chattr +i /data/adb/agh/scripts/ProxyConfig.sh
```

修改后的 `/data/adb/agh/scripts/ProxyConfig.sh` 关键片段如下：

```sh
# 提取共用section列表（已移除 proxy-server-nameserver:）
ALL_SECTIONS="direct-nameserver:  nameserver: default-nameserver: [Rr][Uu][Ll][Ee]-[Ss][Ee][Tt] [Gg][Ee][Oo][Ss][Ii][Tt][Ee] "
...
is_standard_config() {
    [ -f "$1" ] || return 1
    [ -z "$PROXY_URL" ] || grep -qF "$PROXY_URL" "$1" || return 1
    grep -q "^[[:space:]]*dns:" "$1" && grep -q "^[[:space:]]*enhanced-mode:[[:space:]]*fake-ip" "$1" || return 1
...
process_config() {
    ...
    (grep -q "^[[:space:]]*dns:" "$1" && grep -q "^[[:space:]]*enhanced-mode:[[:space:]]*fake-ip" "$1") || {
        sed -i '/^[[:space:]]*dns:/,/^[^[:space:]]/s/^\([[:space:]]*enhanced-mode:\).*/\1 fake-ip/' "$1" && modified=1
    }
```

---

## 修复后实测效果对比

完成上述修改并重启 Surfing 后，所有 IEPL 专线节点立即恢复在线，实测请求耗时对比：

| 测试项 | 修复前（`core` + `redir-host`） | 修复后（`MIXED` + `fake-ip` + 机场节点 DNS） |
| :--- | :--- | :--- |
| **冷门子域名 DNS 解析耗时** | `400ms ~ 4000ms+`（受污染且触发超时） | **`0.14 ms`**（本地内存秒回 `198.18.x.x`） |
| **TCP 建连耗时 (`Connect`)** | `206ms ~ 1200ms`（IPv6 黑洞回退） | **`2.2 ms ~ 4.6 ms`**（内核 `REDIRECT` 直达） |
| **`api.x.com` 总耗时** | 超时或 `> 3.5 s` | **`0.38 s`** ⚡ |
| **`pbs.twimg.com` 总耗时** | `4.15 s` | **`0.71 s`** ⚡ |
| **`bilibili.com`（国内直连）** | 正常 | **`0.28 s`**（照常经过 `AdGuardHome` 过滤） |

### 日常使用注意事项
尽量避免在 **Surfing App（`com.github.surfing`）的“配置”页面点击保存覆写**，因为该 App 每次点击保存都会用其内置模板重新生成 `config.yaml` 和 `box.config` 日常切换节点或策略组建议直接使用 Web 面板（`http://127.0.0.1:9090/ui/`） 

备份

   **ProxyConfig.sh**   https://drive.google.com/file/d/1a-OX8_QNks6eSyDFGktANN9wet4RVRSd/view?usp=drivesdk

   **AdGuardHome.yaml** https://drive.google.com/file/d/1a-OX8_QNks6eSyDFGktANN9wet4RVRSd/view?usp=drivesdk