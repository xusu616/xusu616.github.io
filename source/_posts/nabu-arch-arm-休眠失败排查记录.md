---
title: nabu arch-arm 休眠失败排查记录
date: 2026-10-04 13:05:00
tags:
  - Linux
  - Android
  - 刷机
categories:
  - Linux
excerpt: 刷刷刷
---

# 小米 Pad 5 / Arch Linux ARM：休眠后黑屏与触摸失效的排查记录

记录日期：2026-10-04

小米 Pad 5 装上 Arch Linux ARM 后，我遇到了几种看起来很像的问题：屏幕关掉以后打不开，唤醒后画面正常但触摸失效，偶尔花屏，以及看起来像自动关机或重启的情况 

最初的处理办法是休眠前解绑触摸驱动，唤醒后重新绑定 它有时能恢复，有时又会留下一个“画面亮着，但触摸完全没反应”的桌面 这次继续看日志，发现恢复时机比“有没有执行绑定”更关键，于是把唤醒后的初始化交给一个独立的 systemd 服务 

ai把原因写得太繁杂了，其实就是旧文件 1: post 执行时，显示恢复未必已经完成；二是 sysfs 接受了 bind，不能证明触摸固件已经初始化成功 

<!-- more -->

## 现象：先分清熄屏、休眠和关机

这台机器是小米 Pad 5，设备代号 nabu，使用 Arch Linux ARM 和 Plasma Wayland 安装过程参考了 [nabu-alarm 的安装指南](https://github.com/nabu-alarm/installation-guide) 排查时的内核是 `6.14.0-mainline-sm8150-g841784eacbf9`，Plasma 是 `6.7.5` 

本文说的“休眠”指 KDE 菜单里的 `Sleep`，也就是 `systemctl suspend` 本机实际进入的是 `s2idle`；挂起到磁盘的 `hibernate` 没有在这次测试中验证 

| 现象 | 要看什么证据 | 是否经过 system-sleep 钩子 |
| --- | --- | --- |
| 屏幕关闭，系统仍在运行 | DRM 的 DPMS 状态、KWin 和触摸驱动日志 | 单纯熄屏不经过 |
| 真正进入系统休眠后唤醒 | `systemd-suspend.service`、内核的休眠进入与退出记录 | 经过 |
| 画面恢复，但触摸无反应 | 触摸固件下载、驱动绑定和实际触摸响应 | 要结合前两种情况判断 |
| 关机或重新启动 | logind、关机服务、内核末尾日志、pstore | 不能仅凭触摸报错判断原因 |

我之前把一些黑屏也叫作“休眠后自动关机”，但 SSH 还连得上、桌面进程还活着的时候，系统其实可能根本没有关机 先确认是哪条路径出了问题，后面的日志才有意义

## 排除：查看上一次启动的日志

先列出系统保留的启动记录：

```bash
journalctl --list-boots
```

查看上一次启动中最近 233 条 Error 及更高严重程度的日志：

```bash
journalctl -b -1 -p 3 -n 233 --no-pager
```

- `-b -1`：上一次启动 只有故障确实发生在上一次启动时，它才对应故障现场 
- `-p 3`：Error，以及比 Error 更严重的日志
- `-n 233`：最多显示最近 233 条符合条件的日志；想看更多，可以改成 `-n 9178` 
- `--no-pager`：直接输出，方便复制和保存

这里 `-b -1` 写一次就够了 要保留完整上下文，还需要看未过滤严重程度的内核和休眠服务日志：

```bash
journalctl -k -b -1 --no-pager
journalctl -b -1 -u systemd-suspend.service -u nabu-touch-resume.service --no-pager
```

如果机器已经重启过好几次，先从 `--list-boots` 找到那次启动的 ID，再用 `journalctl -b <启动ID>`，避免把另一次启动当作故障现场

要在当前启动中实时观察，可以提前开一个 SSH 终端：

```bash
sudo journalctl -k -b -f -o short-precise
```

`sudo dmesg -w` 也能持续观察内核消息；重启前后的对照以持久保存的 journal 更方便 真正进入系统休眠期间，SSH 会暂时没有响应，这本身不能说明崩溃

### 日志里出现了什么

最初注意到的异常集中在 Novatek 触摸驱动 下面保留原记录中的关键行，中间步骤省略：

<details>
<summary>展开触摸恢复日志片段</summary>

```text
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_ts_suspend 1707: suspend start
Mar 23 12:05:10 alarm kernel: [NVT-ts-spi] nvt_ts_suspend 1759: end
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_ts_resume 1784: resume start
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_check_fw_reset_state 537: error, retry=11, buf[1]=0x00
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_download_firmware_hw_crc 694: nvt_check_fw_reset_state...
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_update_firmware 821: Update firmware success! <438494 ...>
Mar 23 12:07:54 alarm kernel: [NVT-ts-spi] nvt_get_fw_info 639: fw_ver = 0x35, fw_type = 0x01, x_num=32
```

</details>

`nvt_ts_suspend` 和 `nvt_ts_resume` 说明触摸驱动进入过自己的休眠、恢复流程 它们也可能由显示熄屏、亮屏通知触发，因此不能单靠这两个函数名证明整机进入过休眠

`nvt_check_fw_reset_state` 报错表示恢复过程中没有读到预期的固件复位状态 后面即使又出现固件下载成功，也还要看后续是否继续报错，以及手指是否真的能操作 这个片段足以提示触摸恢复异常，但不足以证明它导致了整机自动关机

## 尝试解决：找到真正的模块名和驱动路径

先查 SPI 设备和它绑定的驱动：

```bash
ls /sys/bus/spi/devices/
readlink -f /sys/bus/spi/devices/spi0.0/driver
readlink /sys/bus/spi/devices/spi0.0/driver/module
```

本机得到的是：

```text
/sys/bus/spi/drivers/NVT-ts-spi
../../../../module/nt36523_ts
```

这里有三个名字，不能混用：

| 名字 | 本机的值 | 用途 |
| --- | --- | --- |
| SPI 设备 ID | `spi0.0` | 写入 `bind` / `unbind` |
| sysfs 驱动名 | `NVT-ts-spi` | 确定 `/sys/bus/spi/drivers/` 下的路径 |
| 内核模块名 | `nt36523_ts` | 用于 `modinfo`、`modprobe` |

继续检查模块：

```bash
lsmod | rg -i 'nt36523|novatek|nvt'
modinfo nt36523_ts
zcat /proc/config.gz | rg 'CONFIG_TOUCHSCREEN_NT36523_SPI'
```

本机有 `nt36523_ts.ko`，模块已经加载，而且内核配置是：

```text
CONFIG_TOUCHSCREEN_NT36523_SPI=m
```

[所以我原先猜“触摸驱动编译进了内核” （在这里） 并不准确 ](https://rd227.github.io/2026/03/23/Xiaomi-pad-5\(nabu\)%EF%BC%88%E6%88%96%E8%80%85%E5%85%B6%E4%BB%96Linux-arm%E8%AE%BE%E5%A4%87%EF%BC%9F%EF%BC%89%E5%B1%8F%E5%B9%95%E4%BC%91%E7%9C%A0%E6%97%B6Kernel-panic%E7%9A%84%E8%A7%A3%E5%86%B3%E5%8A%9E%E6%B3%95-%E6%B0%94%E6%B8%A9%E9%AA%A4%E9%99%8D/)`=m` 表示模块；对应配置为 `=y` 才表示编译进内核 本机的面板配置 `CONFIG_DRM_PANEL_NOVATEK_NT36523=y` 容易和触摸配置混淆

模块可以通过 `modprobe -r nt36523_ts` 和 `modprobe nt36523_ts` 卸载、加载 不过这次沿用了针对 `spi0.0` 的解绑、重绑方案，并没有改成整个模块反复卸载 即使是可加载模块，也可以用 sysfs 解绑设备

驱动路径必须以机器上的实际输出为准 这里是区分大小写的 `NVT-ts-spi`，不能照着示例写成 `nvt_ts_spi`

## 原来的钩子为什么有时没用

最初的思路大致如下 这是旧方案示意，用于解释问题：

```bash
#!/bin/bash

TOUCH_DEV=spi0.0
DRIVER_PATH=/sys/bus/spi/drivers/NVT-ts-spi

case "$1" in
    pre)
        if [ -e "$DRIVER_PATH/$TOUCH_DEV" ]; then
            printf '%s' "$TOUCH_DEV" > "$DRIVER_PATH/unbind"
        fi
        ;;
    post)
        if [ ! -e "$DRIVER_PATH/$TOUCH_DEV" ]; then
            printf '%s' "$TOUCH_DEV" > "$DRIVER_PATH/bind"
        fi
        ;;
esac
```

这个脚本有两个缺口：一是 `post` 执行时，桌面和显示恢复未必已经完成；二是 sysfs 接受了 `bind`，不能证明触摸固件已经初始化成功 

10 月 4 日的隔夜休眠日志把顺序暴露得比较清楚：

| 时间 | 事件 |
| --- | --- |
| 03:07:49 | 休眠前成功解绑，内核进入 `s2idle` |
| 09:47:12 | 电源键到达系统，内核退出休眠，旧 post 钩子开始重绑 |
| 09:47:13.158 | 触摸固件下载失败 |
| 09:47:13.203 | 旧钩子仍报告绑定成功 |
| 09:47:13.235 | `user.slice` 才解冻，桌面恢复运行 |
| 09:47:13.446 | 驱动报告 `Touch is already resume`，提前退出恢复 |

系统已经醒了，触摸却在桌面解冻前初始化失败 后来确认屏幕已经上电，再重新绑定一次，固件下载成功，实际触摸也恢复了

[systemd 官方说明](https://github.com/systemd/systemd/blob/main/man/systemd-suspend.service.xml)写明：运行 system-sleep 钩子期间，`user.slice` 默认仍被冻结，各钩子还会并行执行 因此不能在 post 钩子里同步等待 KWin 回应亮屏；给脚本加 `99-` 前缀也不能保证它在其他钩子之后执行

对照的 [Nabu 6.14.11 触摸驱动源码](https://github.com/SeimoDev/linux-xiaomi-nabu/blob/nabu/6.14.11/drivers/input/touchscreen/nt36523/nt36xxx.c)也支持这个解释：部分固件初始化失败不会让整个 probe 失败，恢复函数又可能因为内部 awake 状态提前返回 不过本机内核的精确提交源码没有取得，这里结合的是兼容分支、现场日志和重绑后的实际结果，不能据此断言所有黑屏都来自同一个原因

## 当前修复：把恢复放到休眠服务结束之后

现在的顺序是：

```text
休眠前解绑触摸，并记录成功标记
    ↓
系统进入休眠，随后被唤醒
    ↓
post 钩子只排队启动恢复服务，立即返回
    ↓
systemd 解冻桌面，结束系统休眠服务
    ↓
独立恢复服务请求亮屏，检查 DRM 和背光状态
    ↓
重新绑定触摸，检查本次固件下载和 probe 是否完成
    ↓
成功后删除标记；失败时保留标记并报告错误
```

这次改善的关键是恢复顺序，以及对绑定结果的检查 Python 用来执行这些检查和处理超时，systemd 负责把它安排在系统休眠服务之后

### 安装前保存旧文件

下面记录的是当前机器已经安装的方案 移植到其他机器时，需要先核对 SPI、DRM、背光路径和桌面环境；本机已经部署，不需要重复安装

依赖包括 `python3`、`kscreen-doctor`、`runuser` 和 systemd 的命令行工具 保存已有文件：

```bash
repair_backup_dir="/var/lib/nabu-repair/touch-resume-$(date +%Y%m%d-%H%M%S)"
sudo install -d -m 700 "$repair_backup_dir"

for original_path in \
    /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh \
    /etc/systemd/system/nabu-touch-resume.service \
    /usr/local/libexec/nabu-touch-resume
do
    if [ -f "$original_path" ]; then
        sudo cp -a --parents "$original_path" "$repair_backup_dir"
    fi
done
```

### 一、睡眠钩子

文件位置：`/usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh`

```bash
sudoedit /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh
```

内容如下：

```bash
#!/bin/bash
# Unbind before real system sleep. Restore from a service after user.slice thaws.
set -u
umask 077
TOUCH_DEV=spi0.0
DRIVER_PATH=/sys/bus/spi/drivers/NVT-ts-spi
STATE_FILE=/run/nabu-touch-fix-unbound
log() { printf 'nabu-touch-fix: %s\n' "$*" >&2; }

if [[ ${1:-} == --check ]]; then
    [[ -d "$DRIVER_PATH" && -e "$DRIVER_PATH/$TOUCH_DEV" ]] || exit 1
    log "check passed: $TOUCH_DEV is bound; post-resume recovery is deferred"
    exit 0
fi

case ${1:-} in
    pre)
        log "pre ${2:-unknown}: checking $TOUCH_DEV"
        if [[ -e "$DRIVER_PATH/$TOUCH_DEV" ]]; then
            if printf '%s' "$TOUCH_DEV" > "$DRIVER_PATH/unbind"; then
                : > "$STATE_FILE"
                log "unbound successfully"
            else
                log "ERROR: unbind failed"
                exit 1
            fi
        else
            log "device already unbound; preserving any pending recovery marker"
        fi
        ;;
    post)
        if [[ -f "$STATE_FILE" ]]; then
            if systemctl --no-block start nabu-touch-resume.service; then
                log "post ${2:-unknown}: queued recovery after desktop thaw; no immediate bind"
            else
                log "ERROR: unable to queue recovery; marker retained"
                exit 1
            fi
        else
            log "no successful pre-unbind recorded; leaving device alone"
        fi
        ;;
esac
```

只有 pre 解绑成功，才会创建 `/run/nabu-touch-fix-unbound` post 只用 `--no-block` 排队，避免阻塞钩子、等不到后面的恢复服务

### 二、恢复服务

文件位置：`/etc/systemd/system/nabu-touch-resume.service`

```bash
sudoedit /etc/systemd/system/nabu-touch-resume.service
```

内容如下：

```ini
[Unit]
Description=Restore Nabu touch after desktop and display resume
After=systemd-suspend.service systemd-hibernate.service systemd-hybrid-sleep.service systemd-suspend-then-hibernate.service
ConditionPathExists=/run/nabu-touch-fix-unbound

[Service]
Type=oneshot
ExecStart=/usr/local/libexec/nabu-touch-resume
TimeoutStartSec=45
UMask=0077
```

`After=` 让恢复服务在相应系统休眠服务完成后执行 `ConditionPathExists=` 保证没有待恢复标记时不会操作设备 它是 `oneshot` 服务，执行完就退出，由 post 钩子启动，不需要 `enable`

### 三、Python 恢复脚本

文件位置：`/usr/local/libexec/nabu-touch-resume`

```bash
sudo install -d -m 755 /usr/local/libexec
sudoedit /usr/local/libexec/nabu-touch-resume
```

这个脚本会找到当前活动的 Wayland 桌面，在需要时请求亮屏；等 DRM 和背光状态稳定后才绑定触摸，并检查本次新产生的固件下载日志

<details>
<summary>展开完整 Python 脚本</summary>

```python
#!/usr/bin/python3
"""Resume Nabu touch only after system sleep has finished and the panel is on."""
import json
import os
from pathlib import Path
import pwd
import stat
import subprocess
import sys
import time

DRM = Path('/sys/class/drm/card0-DSI-1')
BACKLIGHT = Path('/sys/class/backlight/ktz8866-backlight')
DRIVER = Path('/sys/bus/spi/drivers/NVT-ts-spi')
MARKER = Path('/run/nabu-touch-fix-unbound')
DEVICE = 'spi0.0'

def log(message):
    print('nabu-touch-resume: ' + message, flush=True)

def panel_ready():
    try:
        return ((DRM/'dpms').read_text().strip() == 'On'
                and (DRM/'enabled').read_text().strip() == 'enabled'
                and (BACKLIGHT/'bl_power').read_text().strip() == '0')
    except OSError:
        return False

def turn_panel_on():
    # This runs from a separate service AFTER systemd-sleep thaws user.slice.
    session = subprocess.check_output(['loginctl', 'show-seat', 'seat0', '-p', 'ActiveSession', '--value'], text=True, timeout=4).strip()
    if not session:
        raise RuntimeError('There is no active seat0 session.')
    kind = subprocess.check_output(['loginctl', 'show-session', session, '-p', 'Type', '--value'], text=True, timeout=4).strip()
    uid = int(subprocess.check_output(['loginctl', 'show-session', session, '-p', 'User', '--value'], text=True, timeout=4).strip())
    if kind != 'wayland' or uid == 0:
        raise RuntimeError('The active session is not a non-root Wayland desktop.')
    runtime = Path('/run/user')/str(uid)
    displays = sorted(p for p in runtime.glob('wayland-*') if stat.S_ISSOCK(p.stat().st_mode))
    if len(displays) != 1:
        raise RuntimeError('Unable to select a unique active Wayland socket.')
    user = pwd.getpwuid(uid).pw_name
    result = subprocess.run([
        '/usr/bin/runuser', '-u', user, '--', '/usr/bin/env',
        f'XDG_RUNTIME_DIR={runtime}', f'WAYLAND_DISPLAY={displays[0].name}',
        f'DBUS_SESSION_BUS_ADDRESS=unix:path={runtime}/bus', 'QT_QPA_PLATFORM=wayland',
        '/usr/bin/kscreen-doctor', '--dpms', 'on',
    ], capture_output=True, text=True, timeout=5)
    if result.returncode:
        raise RuntimeError('The desktop display-on request failed: ' + result.stderr.strip())
    log('display-on request completed for the active desktop')

def wait_for_panel(seconds):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if panel_ready():
            time.sleep(0.5)
            if panel_ready():
                return
        time.sleep(0.1)
    raise RuntimeError('Panel stayed off; refusing to load touch firmware while the panel is unpowered.')

def rebind_and_verify():
    if not panel_ready():
        raise RuntimeError('The panel turned off before touch initialization.')
    recent = subprocess.run(['journalctl', '-k', '-b', '-n', '1', '-o', 'json', '--no-pager'], check=True, capture_output=True, text=True, timeout=5)
    cursor = json.loads(recent.stdout.strip())['__CURSOR']
    if (DRIVER/DEVICE).exists():
        (DRIVER/'unbind').write_text(DEVICE)
        time.sleep(0.2)
    if not panel_ready():
        raise RuntimeError('The panel turned off before driver binding; marker retained for recovery.')
    (DRIVER/'bind').write_text(DEVICE)
    time.sleep(0.4)
    recent = subprocess.run(['journalctl', '-k', '-b', '--after-cursor', cursor, '-o', 'json', '--no-pager'], check=True, capture_output=True, text=True, timeout=5)
    messages = []
    for line in recent.stdout.splitlines():
        message = json.loads(line).get('MESSAGE', '')
        if isinstance(message, str) and '[NVT-ts-spi]' in message:
            messages.append(message)
    success = any('Update firmware success!' in line for line in messages)
    failure = any('Download Firmware failed' in line or 'download firmware failed' in line for line in messages)
    probe_finished = any('nvt_ts_probe' in line and ': end' in line for line in messages)
    if not ((DRIVER/DEVICE).exists() and success and probe_finished and not failure):
        raise RuntimeError('Driver binding did not verify a successful firmware download; marker retained.')
    return messages

def main():
    if sys.argv[1:] == ['--check']:
        log('read-only check: ' + json.dumps({'driver_present': DRIVER.is_dir(), 'bound': (DRIVER/DEVICE).exists(), 'panel_ready': panel_ready(), 'pending_resume': MARKER.exists()}))
        return
    if sys.argv[1:]:
        raise RuntimeError('Unexpected arguments.')
    if os.geteuid() != 0:
        raise RuntimeError('Administrator access is required.')
    if not MARKER.exists():
        log('no pre-unbind marker; nothing to restore')
        return
    if not panel_ready():
        try:
            turn_panel_on()
        except Exception as error:
            log('display-on request unavailable: ' + str(error))
    wait_for_panel(12)
    log('panel is powered on; initializing touch')
    messages = rebind_and_verify()
    MARKER.unlink()
    log('driver bound and firmware download verified; touch input still needs physical verification')
    for line in messages:
        if 'fw_ver' in line or 'Update firmware success!' in line:
            log(line)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log('ERROR: ' + str(error))
        sys.exit(1)
```

</details>

这里把 DRM 的 `On`、连接器启用和背光上电作为初始化前的条件 它们不能证明物理屏幕一定显示正常，也不能替代手指触摸测试，但可以避免已经知道的“屏幕还没准备好就初始化触摸”

### 四、设置权限并重新加载服务

```bash
sudo chown root:root \
    /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh \
    /etc/systemd/system/nabu-touch-resume.service \
    /usr/local/libexec/nabu-touch-resume

sudo chmod 755 \
    /usr/lib/systemd/system-sleep/99-nabu-touch-fix.sh \
    /usr/local/libexec/nabu-touch-resume
sudo chmod 644 /etc/systemd/system/nabu-touch-resume.service

sudo systemctl daemon-reload
```

确认当前状态：

```bash
/usr/local/libexec/nabu-touch-resume --check
systemctl cat nabu-touch-resume.service
```

`--check` 只读取状态 正常使用时不需要手动调用钩子的 `pre` / `post`；保存好工作后，从开始菜单执行 Sleep，或者运行 `systemctl suspend`，才是完整流程测试 

唤醒后查看：

```bash
journalctl -b -u systemd-suspend.service -u nabu-touch-resume.service --no-pager
/usr/local/libexec/nabu-touch-resume --check
```

预期能看到：pre 成功解绑、post 排队、桌面解冻、恢复服务开始、屏幕上电、固件下载成功 最后 `pending_resume` 应为 `false` 服务执行完显示 `inactive (dead)` 是正常的，不表示没有起作用 

## 补充：已经亮屏，但触摸还是不响应

如果设备已经绑定，再往 `bind` 写一次，可能得到：

```text
write error: Device or resource busy
```

这只说明设备已经被驱动占用 要重新初始化，通常需要先解绑，再绑定 

先保证画面已经恢复 如果是在 SSH 中操作，用当前桌面的普通用户登录；本机的 Wayland socket 是 `wayland-0`：

```bash
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
export WAYLAND_DISPLAY=wayland-0
export QT_QPA_PLATFORM=wayland

kscreen-doctor --dpms on
```

如果刚经历真正休眠，恢复标记仍在，可以让服务重试：

```bash
/usr/local/libexec/nabu-touch-resume --check
sudo systemctl restart nabu-touch-resume.service
sudo journalctl -b -u nabu-touch-resume.service --no-pager
```

如果没有标记，服务会跳过 本机另有一次性手动恢复脚本，会检查屏幕上电状态、执行一次重绑并保存结果：

```bash
sudo python3 ~/nabu-repair-20261004/recover-touch-after-display-on.py
```

这个文件是本次排查创建的工具，系统软件包不会自带 

原先手工处理的核心操作是下面两条 它们适用于已经确认屏幕上电、设备当前已绑定但触摸异常的现场；执行期间触摸设备会短暂移除：

```bash
sudo sh -c 'printf "%s" spi0.0 > /sys/bus/spi/drivers/NVT-ts-spi/unbind'
sudo sh -c 'printf "%s" spi0.0 > /sys/bus/spi/drivers/NVT-ts-spi/bind'
```

随后检查新日志，并实际测试触摸：

```bash
sudo journalctl -k -b --since '1 minute ago' --no-pager
```

手动重绑用于处理已经发生的故障 正常恢复流程由钩子和服务完成，不需要每次都手动操作 

## 另外两件容易混淆的事

### 单纯熄屏没有走这个恢复服务

KDE 的 `Turn off screen` 只关闭显示，不会触发 system-sleep 钩子 此前单纯熄屏后的黑屏、花屏，不能因为系统休眠的恢复改善了，就一起宣布修好 

排查过程中曾加入两个 KWin 环境设置，13:01 已将它们注释，准备恢复默认行为做对照：

```ini
#Environment=KWIN_DRM_NO_DIRECT_SCANOUT=1
#Environment=KWIN_DRM_USE_MODIFIERS=0
```

它们分别写在 `~/.config/systemd/user/plasma-kwin_wayland.service.d/90-nabu-graphics.conf` 和 `91-nabu-modifier-workaround.conf` 中 此前现场已经确认两个变量生效，并观察到线性输出缓冲，但之后仍发生过黑屏，因此不能把它们当作已证实的完整解决办法 性能影响没有做对比测量 

这次只注释两条图形参数，并运行 `systemctl --user daemon-reload`；`90-nabu-graphics.conf` 中锁屏输入法使用的 `UnsetEnvironment=QT_IM_MODULE` 继续保留 恢复默认需要注销并重新登录，重新加载配置不会改变已经运行的 KWin 环境 默认配置的结果尚待观察，也没有证据足以断言花屏由这两个参数引起 触摸休眠恢复服务仍然使用前文的方案 

目前充电和电池状态下，手动选择 `Turn off screen` 的短时间测试都正常 这个结果说明有成功样本，间歇性故障是否还会复发，要继续正常使用观察 

### 唤醒是否需要密码，和睡了多久不是一回事

启用休眠锁定时，KDE 在进入真正系统休眠前就请求立即锁屏，几秒后唤醒也应需要解锁 单纯熄屏则受独立的空闲锁屏设置影响；默认空闲五分钟触发自动锁屏 [KDE 休眠锁定实现](https://github.com/KDE/kscreenlocker/blob/v6.7.5/ksldapp.cpp)、[默认锁屏配置](https://github.com/KDE/kscreenlocker/blob/v6.7.5/settings/kscreenlockersettings.kcfg) 

所以“熄屏一分钟后直接回桌面”不一定是锁屏被绕过 电源管理页面中的显示关闭、自动 Sleep、锁屏，也需要分别核对 

## 自动关机、重启是否已经解释清楚

还没有 

这轮排查里，有两次日志明确记录了 KDE 的 `plasma-shutdown` 请求关机，系统随后走完了正常关机流程 之前电源键动作会显示退出菜单，黑屏时连续按电源键和键盘，存在在不可见界面确认关机的可能，但不能确定每次用户输入怎样触发了退出 

pstore 里还留下了关机末尾的两行：

```text
reboot: Power down
[Firmware Bug]: Unable to handle paging request in EFI runtime service
```

这提示关机调用固件时还发生了 EFI 异常 [Linux 6.14 的 ARM64 EFI 源码](https://github.com/torvalds/linux/blob/v6.14/arch/arm64/kernel/efi.c)有对应的异常处理 仅凭这两行还不能确定自动重启的完整机制，触摸恢复服务也没有修改 EFI、固件或内核 

要继续查这部分，保留故障启动的完整末尾日志，区分是否有主动关机请求、内核异常和固件报错 `-p 3` 的触摸日志只是线索，不能直接推导成“Novatek 驱动导致自动关机，现已修复” 

## 当前测试结果与后续验证

截至本文整理时，有下面这些结果：

| 测试 | 结果 |
| --- | --- |
| 开始菜单触发真实休眠，12:07 唤醒 | 恢复服务自动完成；画面和触摸正常 |
| 12:41、12:42 新增的两次真实休眠 | 日志显示 post 排队、桌面解冻、恢复服务执行，固件下载均成功 |
| 充电时 `Turn off screen` | 实际短时间测试正常 |
| 电池时 `Turn off screen` | 实际短时间测试正常 |
| 电池时休眠后立即唤醒 | 实际短时间测试正常 |
| 长时间、过夜休眠 | 待测试 |

新增两次固件下载分别约 168 ms 和 175 ms，服务都正常结束 日志结果与实际操作反馈要一起看，不能只看驱动目录是否出现了 `spi0.0` 

晚上有时间再做长时间测试：先休眠 10～30 分钟，再做一次过夜休眠；唤醒后确认锁屏、画面、触摸都正常，同时保存休眠服务和恢复服务的日志 之后在充电、电池两种状态下分别重复，观察是否有间歇性失败 

这次已经验证的是：延后到桌面解冻、屏幕上电后再恢复触摸，能够完成短时间真实休眠后的自动恢复 长时间可靠性、单纯熄屏的间歇性故障，以及关机后的 EFI 异常，还要继续记录
