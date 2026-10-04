---
title: Linux-docker 创建和丢agent随记
date: 2026-08-16 12:00:00
tags:
  - Linux
  - docker
categories:
  - Linux
  - Docker
excerpt: 下载到部署docker，为了放ds的harness进去（这里用得wsl演示（） ~~（我之前没有用过这么自动化的（（（啊这个这个（（总之就是比cc之类的还要持久（（但是给cc接入gpt-sol-5.6那种api还是很离谱的~~
---

# 下载docker

```Fish
sudo pacman -S docker
```

然后建立一个目录（即准备用于构建docker的（也不算？不过总要干净点

写一份Dockerfile文件

```Dockerfile
FROM node:22-alpine
#FROM node:24-alpine
RUN apk add --no-cache python3 make g++ linux-headers
#考虑模型是否联网，联网可以加curl git jq openssl bash
WORKDIR /xvsu
# 这里写自己想要的容器家目录名称即可

RUN npm install -g @deepseek-ai/dsh

# dsh 出于安全只允许监听 127.0.0.1，因此容器内用一层代理供端口映射使用
COPY docker-entrypoint.mjs /docker-entrypoint.mjs

EXPOSE 3081

ENTRYPOINT ["node", "/docker-entrypoint.mjs"]
CMD ["web", "--host", "127.0.0.1", "--port", "3080"]

```

>刚好这里的nvim没有写复制到剪切板的快捷键\
可以顺便写一下\
nvim ~/.config/nvim/init.lua\
lua:vim.keymap.set({'n', 'v'}, '<C-c>', '"+y', { desc = '复制到系统剪贴板' })

# 安装

先构建
然后打开

```Bash
sudo docker rm -f deepseek-dsh

sudo docker run -d --name deepseek-dsh \
        -p 127.0.0.1:3082:3081 \
        -v /mnt/d/Users/xvsu/AndroidStudioProjects/:/$home/project \
        deepseek-dsh

```

我没试过 `$home` 在这里到底有没有用，毕竟你现在本来就在一个终端里面，可能这个home大概率被解释为你自己的home目录，写自己Dockerfile 里面的 WORKDIR 就可以了

这里 `-v` 就是指定挂载的容器目录，准备把wsl挂载的windows目录挂载到容器指定目录里面

哦对了

这里 -v 所挂载的目录如果没有的话是会自动创建的

# 使用

推荐通过shell直接进入

不然在容器外部输入某些命令会得不到解释器的解释

比如

```Bash
xvsu@DESKTOP-T9J8ELC ~/TMP> sudo docker exec deepseek-dsh cd ~
OCI runtime exec failed: exec failed: unable to start container process: exec: "cd": executable file not found in $PATH
```

直接

```Bash
sudo docker exec -it deepseek-dsh sh
```

即可

没什么可说的了，就是容器可能没有那什么curl 或者 bash

是一个极简的 Alpine 

apk add --no-cache curl git jq openssl bash

或者加到构建里面