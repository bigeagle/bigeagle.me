---
title: Debian 网络安装内核参数
date: 2015-06-22 20:50:23
slug: debian-netinstall-kernel-parameter
tags: [linux, tips]
---

短文备忘。

Debian 系网络安装使用 preseed 实现自动化，类似于 Red Hat 系的 kickstart。
preseed 的参数不一定需要通过 preseed 文件设定，可以直接通过 kernel cmdline 设置。

比如 Debian 安装时设置 apt mirrors 的时候，不能改 debian-security 的 mirror，就可以通过 preseed 参数设置。

<!--more-->

参考我的 U 盘中 grub2 的 ubuntu 安装部分:

```
menuentry "Ubuntu 14.04 amd64 netinstall" {
    set root=(hd0,msdos1)
    linux /ubuntu-trusty-amd64/netinstall/linux mirror/http/hostname=mirrors.tuna.tsinghua.edu.cn apt-setup/security_host=mirrors.tuna.tsinghua.edu.cn
    initrd /ubuntu-trusty-amd64/netinstall/initrd.gz
}
```

