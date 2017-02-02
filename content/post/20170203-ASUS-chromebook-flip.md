---
title: "ASUS Chromebook Flip "
date: 2017-02-03 00:35:00
slug: ASUS-chromebook-flip
tags: ["linux", "chromebook", "toy"]
---

从很早开始，我就一直想要一个方便携带的生产力工具，在任何我需要的时候，拿出来就能干活的那种；我尝试过随身背着笔记本，奈何Latitude 7440总还是太重，我椎间盘突出的腰受不了；尝试过 termux + 蓝牙键盘，但总还是不够给力。

年初在[康哥](http://scateu.me/)的[安利](http://scateu.me/2016/10/09/chromebook-rocks.html)下，购入了 [ASUS Chromebook Flip](https://www.amazon.com/Chromebook-10-1-Inch-Convertible-Touchscreen-Rockchip/dp/B00ZS4HK0Q/ref=sr_1_1?s=pc&ie=UTF8&qid=1474962276&sr=1-1&keywords=chromebook+flip)，Amazon Prime 含税仅需 ￥2060 元，大约十天到货。10.1 英寸的 Flip，基本满足了我的需求:

- 非常轻便，放在单肩包里走南闯北无压力，且9小时续航非常给力
- 移动办公/写代码，yubikey, gpg, ssh, X 转发等各种我需要的都有了
  - 通过 [crouton](https://github.com/dnschneid/crouton) 安装 chroot 的 Linux 环境，该有的都能有
  - 原生的 Google Play，兼容绝大多数 Android 应用
- 键盘虽然小点，但是还能用，没有 super 键，但 search 键 (caps lock) 可以重定义为 ctrl

<!--more-->

网上各种教程，包括康哥的安利，资料已经很全面了，我大概记一点自己踩过的坑，还有一些 Tips。强烈建议先看看[康哥的安利](http://scateu.me/2016/10/09/chromebook-rocks.html)，内容很详细。

## Chroot 环境

首先打开 Developer 模式，这里不再赘述。

ChromeOS 本身是基于 gentoo 的，打开 Developer 模式后，按 `Ctrl+Shift+T` 即可打开一个终端窗口，用 `shell` 命令即可打开一个 bash。不过这里面首先是个只读环境，也没有包管理器，工具也不全，所以用 chroot 安装一个更经典的 Linux 环境更好一些。

crouton 是一个用来在 Chromebook 中安装 chroot 环境的工具，虽然有一个自动下载的脚本，我还是更建议把他 clone 下来编译一份，原因一会儿再说。编译 crouton 需要一个完整的 Linux 桌面。

    git clone https://github.com/dnschneid/crouton
    cd crouton
    make

然后把编译出来的 `crouton` 二进制文件拷贝到 chromebook 的 Downloads 目录里，然后开个 shell

    cd ~/Downloads
    sudo sh crouton -t cli-extra -m https://mirrors.tuna.tsinghua.edu.cn/debian/ -r sid  

这里 `-t`  是指 target，`-t list` 可以列出可用的 targets，同理，`-r list` 可以列出可用的发行版和版本。

Flip 内部存储非常小，只有 16GB，我曾想过把 chroot 装到 SD 卡上，但是速度非常慢，因此使用的时候要注意省着点。之后开 shell 运行

    sudo enter-chroot

就进入了 chroot 环境。

## Shadowsocks

虽然ChromeOS有一个shadowsocks APP，但是不支持 chahca20，因此我用的是 chroot 中 debian sid 仓库里的 shadowsocks-libev。

Android 环境中的网络和外面是隔离的，因此需要去 Play 装一个 Android Shadowsocks.

## 运行 X 程序

Chrome 自带的终端本身并不太好用，比如不支持输入法，同时因为工作上的需求，我必须要有 X。crouton 有两种模式运行 X: 运行一个完整的桌面环境，或在一个 ChromeOS 窗口中运行若干个 X 程序。

我用的是第二种方式，学名 xiwi。官方文档请看<a href="https://github.com/dnschneid/crouton/wiki/crouton-in-a-Chromium-OS-window-(xiwi)">这里</a>。


首先需要安装一个 [Chrome 扩展](https://chrome.google.com/webstore/detail/crouton-integration/gcpneefbbnfalgjniomfjknbcgkbijom)，然后把 xiwi 装进 chroot 里。
目前 (2017-02-03) crouton 的 xf86-video-dummy 版本为 0.3.7，有 bug 跑不起来，有人提的 [pull request](https://github.com/dnschneid/crouton/pull/2953) 也迟迟没 merge，因此我们手动 merge 编译一个正常的。

    git remote add xiwi https://github.com/nxtr/crouton
    git fetch xiwi
    git merge xiwi/xiwi-xf86-video-dummy-0.3.8
    make

和刚才一样把`crouton` 弄进Downloads里，开shell

    sudo sh crouton -u -t xiwi

即可。

进入 chroot 后，

    xiwi xeyes

看看～

我目前的习惯，是按 `Ctrl+Alt+F2` 进入 Developer 终端，在里面开一个 tmux，运行必要的服务 (shadowsocks, syncthing, dnsmasq 等)，同时用 `xiwi xfce4-terminal` 得到一个完整的 linux 终端。 

## OpenVPN

因为连回公司工作需要使用 OpenVPN，但自带的 OpenVPN 不支持特殊配置（端口、协议），思来想去还是用 chroot 里的 openvpn 靠谱，但是这需要首先让 ChromeOS 暂停接管 `tun0` 设备。

    sudo stop shill
    sudo start shill BLACKLISTED_DEVICES=tun0

## 输入法

在 ChromeOS 里使用自带的输入法即可，但是在 chroot 中这个输入法是不能用的。解决办法很简单，在 xiwi 中，运行 fcitx 即可，实测能用，这里不再赘述。


