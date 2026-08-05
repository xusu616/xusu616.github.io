---
title: Linux-Luks2加密
date: 2026-08-05 12:00:00
tags:
  - Linux
categories:
  - Linux
excerpt: 新开一个分类好了。本文用于记录折腾luks2加密时候的配置问题
---

# 建立分区

清空 磁盘 并且建立新的分区

使用

```bash
lsblk

gdisk /dev/sda

# 或者使用cfdisk的交互式界面

cfdisk /dev/sda

# 记得选择gpt

```

建议 efi system 分区 建 1GB

加密的话swap分区不用急

我们会在加密的时候处理 @swap 子卷

也就是说 swap 实际是在 btrfs的子卷上建立的

如果是 ext4 这种不支持子卷的 文件类型的话就要在这里分区完毕

而且这样的话分区就不是像Android 那样一个大的super分区是动态的

我们这里建立 sda1 和sda 2即可

我这里原本是label：gpt，不用改

```bash
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
loop0    7:0    0 973.1M  1 loop /run/archiso/airootfs
sda      8:0    0 111.8G  0 disk 
├─sda1   8:1    0     1G  0 part 
└─sda2   8:2    0 110.8G  0 part 
sdb      8:16   0 931.5G  0 disk 
└─sdb1   8:17   0 931.5G  0 part 
sdc      8:32   1 117.2G  0 disk 
├─sdc1   8:33   1   1.2G  0 part 
└─sdc2   8:34   1   253M  0 part
```

# 打开 luks 容器

首先对sda2进行加密 

```
cryptsetup luksFormat --type luks2 /dev/sda2
``` 

输入 YES

然后输入要设置的密码

打开，映射为 cryptroot 

```bash
cryptsetup open /dev/sda2 cryptroot

```

>BTW

这里频繁出现的 cryp 就是指 dm-crypt

即 **Devices mapper crypt** (没找到官方翻译，我猜可以叫做设备根映射？)

~~或者理解为 cry page 哭泣的卷~~

# 格式化为btrfs

```bash
mkfs.btrfs /dev/mapper/cryptroot
```

然后我们就能在btrfs下愉悦地创建子卷了

先挂载

```bash
mount /dev/mapper/cryptroot /mnt

btrfs subvolume create /mnt/@
btrfs subvolume create /mnt/@home
btrfs subvolume create /mnt/@swap

```

然后卸载，按子卷重新挂载

```bash
umount /mnt
```

mount -o rw.noatime.compress=zstd:3,ssd,discard=async,subvol=@ /dev/mapper/cryproot /mnt

这一句就是压缩存储等级为3，discard=async代表异步丢弃，挂载@根卷 

这里是ssd盘，稍后我们会引入sdb的机械盘做示范 ~~但是我准备写到下一篇博客里面去了~~

然后我们再创建挂载点挂载其他子卷

```bash
mkdir -p /mnt/home /mnt/swap
mount -o rw.noatime.compress=zstd:3,ssd,discard=async,subvol=@home /dev/mapper/cryproot /mnt/home
mount -o rw,noatime,nodatacow,subvol=@swap /dev/mapper/cryptroot /mnt/swap
```

可以看到swap卷没有zstd 和 async

而且禁用了cow

然后就是别忘了处理sda1

```bash
mkfs.fat -F32 /dev/sda1
#或者 -F 32

mkdir -p /mnt/boot/efi
mount /dev/sda1 /mnt/boot/efi

```

# 安装基本工具

xiugai mirrorlist

/etc/pacman.d/mirrorlist

然后 pacstrap 即可

```bash
pacstrap -K /mnt base base-devel linux linux-headers linux-firmware intel-ucode grub efibootmgr btrfs-progs networkmanager sudo vim git
```

如果是amd，就用amd的微码

**忘说了，这是arch**

## 生成fstab

```bash
genfstab -U /mnt >> /mnt/etc/fstab
```

然后cat检查一下是否像上面那样生成了配置

# 接下来进入chroot

```bash
arch-chroot /mnt

# 设置时区和语言
vim /etc/locale.gen
# 删完之后locale-gen
echo "LANG=en_US.UTF-8" > /etc/locale.conf

ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
hwclock --systohc

echo "你的主机名" > /etc/hostname

passwd

useradd -m -G wheel,audio,video,storage -s /bin/bash xusu
passwd xusu

#配置sudo
EDITOR=vim visudo

# 删除为 %wheel ALL=(ALL:ALL) ALL

systemctl enable NetworkManager
```

# grub 引导和luks 解密配置

```bash
vim /etc/mkinitcpio.conf
```

**警告，这里有两种配置，不可混用 分为systemed和udev风格**
```conf
HOOKS=(base systemd autodetect microcode modconf kms keyboard sd-vconsole block sd-encrypt filesystems fsck)
HOOKS=(base udev autodetect microcode modconf kms keyboard keymap consolefont block encrypt filesystems fsck)
```

建议用udev。因为内核参数默认是udev的，不然还得改

```bash
# 重新生成initramfs：

mkinitcpio -P
```

# 编辑GRUB配置文件

```bash
vim /etc/default/grub
```

找到这行，去掉 `#`：
```
#GRUB_ENABLE_CRYPTODISK=y
```

改成：
```
GRUB_ENABLE_CRYPTODISK=y
```

保存后重新运行 `grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=GRUB `

# grub rescue

说实话我不知道我哪里做错了

或者在哪里应该怎么做，反正就是grub找到的是/ 而不是@ 子卷

但是这是小问题

可以指定

```what'sthis
grub rescue> set prefix=(crypto0)/@/boot/grub
grub rescue> insmod normal
grub rescue> normal
```

如果你在这里遇到了内核参数错误的话，我建议你去gnu grub界面

按 e 进入编辑模式

修改内核参数即可临时修改启动

然后进系统改

## 比如你遇到了两种风格HOOK的不兼容问题

这会导致 sd-encrypt hook没能解密根分区

原因是我们用了systemd风格的hook，但内核参数用的是 cryptdevice= 这个udev风格的参数——两套不匹配

systemd风格需要的参数是 rd.luks.uuid= 而不是 cryptdevice=

![](/img/a9c728349aa161ff15c6e621b6180990.jpg "gnu grub 启动界面")

在这个界面，选中 `Arch Linux`，按 `e` 进入编辑模式。

找到 `linux` 那行，里面有 `cryptdevice=UUID=...` 把它替换成：

```
rd.luks.uuid=xxxxx你设备的uuid
```

然后按 `Ctrl+X` 或 `F10` 启动

## 进入系统后先把问题修了

```bash
sudo vim /etc/default/grub
```

找到 `GRUB_CMDLINE_LINUX_DEFAULT` 那行，把 `cryptdevice=UUID=...` 替换成：

```
rd.luks.uuid=xxxxx你设备的uuid
```

同时确认 `root=/dev/mapper/cryptroot` 还在。完整那行类似：

```
GRUB_CMDLINE_LINUX_DEFAULT="loglevel=3 quiet rd.luks.uuid=xxxxx你设备的uuid "
```

不要指定 root=/dev/mapper/cryptroot

保存后重新生成GRUB配置：

```bash
grub-mkconfig -o /boot/grub/grub.cfg
```

这里 grub 已经安装了，我觉得应该不需要

sudo grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=GRUB --modules="luks2 btrfs part_gpt cryptodisk gcry_rijndael gcry_sha256"
  了

然后重启测试，看能不能直接进GRUB菜单不需要手动rescue

到此安装完成

后续就是联网和各种驱动安装

