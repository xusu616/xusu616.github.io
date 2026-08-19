---
title: Linux-docker不rm直接修改挂载的方法
date: 2026-08-18 12:00:00
tags:
  - Linux
  - docker
categories:
  - Linux
excerpt: 让ai写了脚本然后我发现每次挂载需要rm，上网找到了解决办法，顺带一个该办法的自动挂载脚本
---

# 解决办法
>https://blog.csdn.net/qq_34972627/article/details/125030964

记住要修改挂载项的容器id：

```Bash
docker ps
systemctl stop docker
cd /var/lib/docker/containers/容器id
```

## PS

~~这里看到了很多缓存的容器，可以删一下：~~

```Bash
xvsu@DESKTOP-T9J8ELC ~/debianDocker [1]> sudo ls /var/lib/docker/containers
[sudo] password for xvsu:
24fa39ef2f76a52d3d521e622971e244e51476ffcb2c32c214c56bb763589027
2a206084a3aefcb3f4d0d74fea35758b68cf0ab4841a112d2816c1f259308816
2de79e07f3b87d37b728819cc1d8c980fb68ddcbe7fb4d6f00ddc43c51413b5e
609247e6fba8e085ee4ee4a34af0abea8b77ade5dda1085c20ff4250b35cb714
6bb48a8dfa33a99a964ff1d6af67921387253bfca0e4e85f52bfed9adcadda61
786bd8e87f04b353cdec7621df59765e9ae7947154468f0029c52f2bb9de1344
bcc167ca2065b2cc569c32c65a757e547ff91d218696bf708175706b5cecadda
f72ea94f40d091b6301bd2c7a217ae18780fd87f20bfe6e55d11b75a4d796811
xvsu@DESKTOP-T9J8ELC ~/debianDocker> docker ps
CONTAINER ID   IMAGE             COMMAND                  CREATED        STATUS          PORTS     NAMES
786bd8e87f04   dsh-debian:slim   "node /docker-entryp…"   20 hours ago   Up 14 minutes             dsh-container
```

删掉

```Bash
xvsu@DESKTOP-T9J8ELC ~/debianDocker> docker container prune
WARNING! This will remove all stopped containers.
Are you sure you want to continue? [y/N] y
Deleted Containers:
bcc167ca2065b2cc569c32c65a757e547ff91d218696bf708175706b5cecadda
f72ea94f40d091b6301bd2c7a217ae18780fd87f20bfe6e55d11b75a4d796811
2de79e07f3b87d37b728819cc1d8c980fb68ddcbe7fb4d6f00ddc43c51413b5e
24fa39ef2f76a52d3d521e622971e244e51476ffcb2c32c214c56bb763589027
6bb48a8dfa33a99a964ff1d6af67921387253bfca0e4e85f52bfed9adcadda61
609247e6fba8e085ee4ee4a34af0abea8b77ade5dda1085c20ff4250b35cb714
2a206084a3aefcb3f4d0d74fea35758b68cf0ab4841a112d2816c1f259308816

Total reclaimed space: 858.7MB
# 然后删除镜像，包括悬空镜像和未使用镜像
xvsu@DESKTOP-T9J8ELC ~/debianDocker> docker images --filter dangling=true
                                                                                                    i Info →   U  In Use
IMAGE        ID             DISK USAGE   CONTENT SIZE   EXTRA
<untagged>   a8b2ba784590        465MB          114MB
<untagged>   d0c50826e825       1.75GB          379MB
<untagged>   d4db0d9c86a5       1.47GB          326MB
<untagged>   eddd1733d4e6       1.47GB          326MB
<untagged>   2c62618f591f        232MB         57.7MB
<untagged>   6bacd2e47f79        671MB          172MB
<untagged>   cb60e02e97bc        234MB         58.2MB
xvsu@DESKTOP-T9J8ELC ~/debianDocker> docker image prune
# 这一步会删除上面那些

xvsu@DESKTOP-T9J8ELC ~/debianDocker> docker images
                                                                                                    i Info →   U  In Use
IMAGE                   ID             DISK USAGE   CONTENT SIZE   EXTRA
busybox:latest          dc2d74b28e4c       6.81MB         2.23MB
deepseek-dsh:latest     283bafc160e4       1.47GB          326MB
dsh-debian:slim         7ebc12bb448d        862MB          170MB    U
node:22-alpine          c610fcdfb1d5        232MB         58.1MB
node:22-bookworm-slim   d649c27dae7b        329MB         82.6MB
node:24-alpine          d32cdf619f63        234MB         58.5MB

# 这里再有不想要的直接 `docker rmi $IMAGE 即可`

```

## 继续

打开hostconfig.json文件：

```Bash
vi hostconfig.json
```

在Binds中修改挂载项
打开config.v2.json文件：

```Bash
vi config.v2.json
```

在MountPoints中修改挂载项
启动docker：
```Bash
systemctl start docker
```

再跑一下dockerrun就行了，有run.sh跑runsh

## 脚本（测试能用

```Python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用法:
    sudo python3 change_docker_mount.py <容器id或名称> <旧宿主机路径> <新宿主机路径>

示例:
    sudo python3 change_docker_mount.py mynginx /old/data /new/data

说明:
    - 仅修改 bind mount 的宿主机源路径(Source)，不修改容器内目标路径(Target)
    - 修改前会自动备份 hostconfig.json 和 config.v2.json
    - 会停止/启动 Docker 服务；如果容器原本在运行，启动 Docker 后会恢复运行
"""

import json
import os
import shutil
import stat
import subprocess
import sys
import time

DOCKER_DEFAULT_ROOT = "/var/lib/docker"


def run(cmd):
    print("+", " ".join(cmd))
    return subprocess.run(cmd, check=True, text=True)


def normalize_path(p):
    return os.path.normpath(os.path.abspath(os.path.expanduser(p)))


def wait_docker_ready(timeout=60):
    for _ in range(timeout):
        try:
            subprocess.run(
                ["docker", "info"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            time.sleep(1)
    return False


def atomic_write_json(path, data):
    st = os.stat(path)
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.chmod(tmp_path, stat.S_IMODE(st.st_mode))
    os.chown(tmp_path, st.st_uid, st.st_gid)
    os.replace(tmp_path, path)


def update_binds(binds, old, new):
    changed = False
    if not isinstance(binds, list):
        return binds, changed

    new_binds = []
    for bind in binds:
        if isinstance(bind, str) and ":" in bind:
            parts = bind.split(":")
            # Binds 格式: /host/path:/container/path:ro
            if normalize_path(parts[0]) == normalize_path(old):
                parts[0] = new
                changed = True
            new_binds.append(":".join(parts))
        else:
            new_binds.append(bind)
    return new_binds, changed


def update_mounts(mounts, old, new):
    changed = False
    if not isinstance(mounts, list):
        return changed

    for mount in mounts:
        if isinstance(mount, dict):
            if normalize_path(str(mount.get("Source", ""))) == normalize_path(old):
                mount["Source"] = new
                changed = True
    return changed


def update_mount_point(mp, old, new):
    changed = False
    if not isinstance(mp, dict):
        return changed

    if normalize_path(str(mp.get("Source", ""))) == normalize_path(old):
        mp["Source"] = new
        changed = True

    # 新版 Docker 的 MountPoint 里会嵌套 Spec.Source，必须一起改
    spec = mp.get("Spec")
    if isinstance(spec, dict):
        if normalize_path(str(spec.get("Source", ""))) == normalize_path(old):
            spec["Source"] = new
            changed = True

    return changed


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)

    if os.geteuid() != 0:
        print("请使用 sudo 或以 root 用户运行此脚本")
        sys.exit(1)

    container = sys.argv[1]
    old_path = normalize_path(sys.argv[2])
    new_path = normalize_path(sys.argv[3])

    if old_path == new_path:
        print("新旧路径相同，无需修改")
        return

    # 在停 Docker 之前，先拿到完整容器 ID 和运行状态
    try:
        full_id = subprocess.check_output(
            ["docker", "inspect", "-f", "{{.Id}}", container],
            text=True,
        ).strip()
        was_running = (
            subprocess.check_output(
                ["docker", "inspect", "-f", "{{.State.Running}}", container],
                text=True,
            )
            .strip()
            .lower()
            == "true"
        )
    except subprocess.CalledProcessError:
        print("无法获取容器信息，请确认容器 ID/名称是否正确、Docker 服务是否正常运行")
        sys.exit(1)

    # 探测 Docker 数据根目录，不硬编码 /var/lib/docker
    try:
        docker_root = subprocess.check_output(
            ["docker", "info", "-f", "{{.DockerRootDir}}"],
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        docker_root = DOCKER_DEFAULT_ROOT

    if not docker_root:
        docker_root = DOCKER_DEFAULT_ROOT

    container_dir = os.path.join(docker_root, "containers", full_id)
    host_file = os.path.join(container_dir, "hostconfig.json")
    config_file = os.path.join(container_dir, "config.v2.json")

    if not os.path.isfile(host_file) or not os.path.isfile(config_file):
        print(f"找不到容器配置文件：{container_dir}")
        sys.exit(1)

    print(f"容器 ID: {full_id}")
    print(f"容器目录: {container_dir}")
    print(f"挂载源路径: {old_path} -> {new_path}")

    # 停止 Docker
    try:
        run(["systemctl", "stop", "docker"])
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"停止 Docker 服务失败: {e}")
        sys.exit(1)

    changed = False
    backup_suffix = time.strftime("%Y%m%d%H%M%S")

    try:
        # 1. 备份
        for f in (host_file, config_file):
            shutil.copy2(f, f"{f}.bak-{backup_suffix}")
        print(f"已备份配置文件，后缀: .bak-{backup_suffix}")

        # 2. 读取
        with open(host_file, "r", encoding="utf-8") as f:
            host_config = json.load(f)
        with open(config_file, "r", encoding="utf-8") as f:
            config_v2 = json.load(f)

        # 3. 修改 hostconfig.json 中的 Binds / Mounts
        changed1 = changed2 = changed3 = changed4 = changed5 = False

        if "Binds" in host_config:
            host_config["Binds"], changed1 = update_binds(
                host_config.get("Binds"), old_path, new_path
            )
        if "Mounts" in host_config:
            changed2 = update_mounts(host_config.get("Mounts"), old_path, new_path)

        # 4. 如果 config.v2.json 里也存了一份 HostConfig，一并修改
        config_v2_host = config_v2.get("HostConfig")
        if isinstance(config_v2_host, dict):
            if "Binds" in config_v2_host:
                config_v2_host["Binds"], changed3 = update_binds(
                    config_v2_host.get("Binds"), old_path, new_path
                )
            if "Mounts" in config_v2_host:
                changed4 = update_mounts(
                    config_v2_host.get("Mounts"), old_path, new_path
                )

        # 5. 修改 config.v2.json 中的 MountPoints
        mount_points = config_v2.get("MountPoints")
        if isinstance(mount_points, dict):
            for mp in mount_points.values():
                if update_mount_point(mp, old_path, new_path):
                    changed5 = True

        changed = any([changed1, changed2, changed3, changed4, changed5])

        if not changed:
            print(f"没有找到挂载源路径: {old_path}")
            print("可能原因：路径不匹配；该挂载不是 bind mount；或 Docker 版本存储格式不同")
            sys.exit(2)

        # 6. 写回
        atomic_write_json(host_file, host_config)
        atomic_write_json(config_file, config_v2)
        print("配置文件修改完成")

    finally:
        # 无论修改是否成功，都尽量把 Docker 拉起来
        print("正在启动 Docker 服务...")
        try:
            run(["systemctl", "start", "docker"])
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"启动 Docker 服务失败: {e}")
            print("请手动检查并启动 Docker，备份文件与 .tmp 文件保留在容器目录中")
            raise

        if not wait_docker_ready():
            raise RuntimeError("等待 Docker 服务就绪超时")

        # 如果容器原本在运行，恢复运行状态
        if was_running:
            try:
                now_running = (
                    subprocess.check_output(
                        ["docker", "inspect", "-f", "{{.State.Running}}", container],
                        text=True,
                    )
                    .strip()
                    .lower()
                    == "true"
                )
            except subprocess.CalledProcessError:
                now_running = False

            if not now_running:
                print(f"启动容器: {container}")
                run(["docker", "start", container])
            else:
                print(f"容器 {container} 已在运行，无需重复启动")


if __name__ == "__main__":
    main()
```

就是可能需要停一下docker.socket

```Bash
xvsu@DESKTOP-T9J8ELC ~/debianDocker> sudo python3 change_docker_mount.py mount_test /tmp/old_data /tmp/new_data
[sudo] password for xvsu:
容器 ID: b37819093c28f8638e62fb300774b18345e19f784a63d4cf30c7c0d25c3b915f
容器目录: /var/lib/docker/containers/b37819093c28f8638e62fb300774b18345e19f784a63d4cf30c7c0d25c3b915f
挂载源路径: /tmp/old_data -> /tmp/new_data
+ systemctl stop docker
Stopping 'docker.service', but its triggering units are still active:
docker.socket
已备份配置文件，后缀: .bak-20260819154657
配置文件修改完成
正在启动 Docker 服务...
+ systemctl start docker
容器 mount_test 已在运行，无需重复启动
xvsu@DESKTOP-T9J8ELC ~/debianDocker> docker inspect mount_test --format '{{json .Mounts}}'
[{"Type":"bind","Source":"/tmp/new_data","Destination":"/data","Mode":"ro","RW":false,"Propagation":"rprivate"}]
xvsu@DESKTOP-T9J8ELC ~/debianDocker>
```