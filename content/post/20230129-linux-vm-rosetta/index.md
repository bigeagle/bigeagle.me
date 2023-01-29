---
title: "Rosetta in Linux Virtual Machine on Apple Silicon"
date: 2023-01-29 00:00:00
slug: linux-vm-rosetta
tags: ["apple-silicon", "vm", "UTM", "linux", "rosetta"]
---

2021 年底我的主力设备换成 M1 Macbook Pro，整体上还是非常够用的，唯独就是一些 linux 开发搞不定了，所以被迫大小事情都得 ssh 到某个 linux 开发机解决。虽然可以跑 linux 虚拟机，但 linux x86_64 环境还是得用 qemu 跑，速度慢一大截，总是不太爽。

不过最近我在网上冲浪的时候发现 [UTM][utm] 支持[^1]了 guest 内使用 Rosetta 运行 x86_64 的 binary 了 ，喜大普奔。

<!-- more -->

### 基础配置

配置还是非常容易的，参照 UTM 的 multi-arch debian 的配置[教程](https://docs.getutm.app/guides/debian/) ，简要写一下。

首先用 Apple Virtualization Framework 作为 backend 创建一个虚拟机，勾上 Enable Rosetta，装一个 aarch64 的 Linux 发行版，比如 debian。

进入 guest，装上 `binfmt-support` 包，然后把 rosetta binary loader 挂上

```bash
sudo mkdir /media/rosetta
sudo mount -t virtiofs rosetta /media/rosetta

# 自动挂载
echo 'rosetta	/media/rosetta	virtiofs	ro,nofail	0	0' >> /etc/fstab
```

然后把 `rosetta` 注册成 x86_64 的 ELF loader 即可
```bash
sudo /usr/sbin/update-binfmts --install rosetta /media/rosetta/rosetta \
     --magic "\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x3e\x00" \
     --mask "\xff\xff\xff\xff\xff\xfe\xfe\x00\xff\xff\xff\xff\xff\xff\xff\xff\xfe\xff\xff\xff" \
     --credentials yes --preserve no --fix-binary yes
```

这时已经可以跑 x86_64 的 binary 了，但是系统缺库，可以参照 Debian 的[文档](https://wiki.debian.org/Multiarch/HOWTO) 把 amd64 的装上。

不过multi-arch debian有一些小坑，比如因为路径冲突，不能同时安装某个软件的 arm64 和 x86_64 版本，瞎折腾的话很容易就把系统弄得乱糟糟。

但是我们可以用 docker 呀！

### Docker

直接安装 ARM 的 docker 就可以了。拉镜像的时候指定 x86_64 的镜像，例如

```
docker pull --platform linux/amd64 ubuntu
```

运行的时候也需要加上 platform 选项，例如

```
docker run --platform linux/amd64 -it --rm ubuntu /bin/bash
```

一切都会丝滑运行。

验证一下是不是真的跑了个 x86_64 的 ubuntu:
{{<img class="center" src="20230129192410.png">}}

在 container 外面看下它是怎么跑起来的:
{{<img class="center" src="20230129192446.png">}}

可见 container 里的 binary 都是被 rosetta 加载运行了。

[utm]: https://mac.getutm.app
[^1]: 严格来说是 macOS 13 之后的 Apple Virtualization framework 支持了
