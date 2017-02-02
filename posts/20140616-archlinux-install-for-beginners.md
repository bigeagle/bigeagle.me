title: 给妹子看的 Arch Linux 桌面日常安装
date: 2014-06-16 13:24:16
tags: linux
---

謝邀。

# 准备工作

首先，准备一张你参加活动得到的 Ubuntu 或者 Deepin ，或者其他什么发行版的安装光盘，是的它有包装很漂亮，哦别急着找光驱，找个打火机把它烧掉，以示决心。

然后，拿出你收藏多年的《鸟哥的Linux私房菜》，<s>不用翻开，啊烧掉有点可惜，把他送给你的冤家就好了。</s> 
鳥哥是 RedHat 玩家，而且内容太老了，作为新手的你用鳥哥指导 Arch Linux 安装只能误入歧途。 (鳥哥很萌哒，我不该黑他)

洗个手，沐浴更衣，斋戒三天，挑选良辰吉日，面向紫禁城方向摆好计算机，准备迎接挑战。

在开始之前，请在心中默念三遍:

> Arch Linux是世界上最好的发行版，我一定能掌握它！

<!-- more -->

# 安装

假设你的男朋友已经给你装过一个ArchLinux, 启动它，然后:

    # pacman -S arch-install-scripts

保证你能连接Internet，且`/mnt`没有被挂上什么奇怪的东西

## 准备磁盘
首先进行分区，你新买的ssd，假设是`/dev/sdb`，我们使用`fdisk`进行分区，

先安装工具

    # pacman -S fdisk parted

然后

    # fdisk /dev/sdb

按`g`建立分区表，然后`n`建立一个新分区，大小`200MB`，我们暂时不用它，
再`n`建立一个足够大的分区，如果你不需要交换空间，就把剩下的空间都分给他，
否则就再留下和内存大小相当的空间做swap。

于是我们得到了这样的分区结构:

* `/dev/sdb1`: 200M，空着
* `/dev/sdb2`: ~110G 用来装东西
* `/dev/sdb3`: 交换区

接下来设置引导标签，

<pre><code># parted /dev/sdb
set 1 bios_grub on
quit
</code></pre>

然后格式化分区，对SSD，使用4K的块大小

    # mkfs.ext4 -b 4096 /dev/sdb2

接下来就可以挂载了，使用`discard`和`noatime`选项对你的SSD有好处

    # mount -t ext4 -o discard,noatime /dev/sdb2 /mnt

## 安装基本系统

运行

    # pacstrap /mnt base base-devel vim

安装基本系统，`base`是基础软件包组，`base-devel`是基础开发包组，`vim`是世界上最好的编辑器。

## 配置基础系统

### 生成fstab
运行

    # genfstab -U -p /mnt >> /mnt/etc/fstab

你可以先打开`/mnt/fstab`查看一下，保证`/`的挂载点有`discard`和`noatime`选项，如果分了交换区，就

    # echo "$(blkid -o export /dev/sda3|grep '^UUID') swap swap defaults 0 0" >> /mnt/etc/fstab

### chroot
chroot到新安装的基本系统中，chroot就是进入某个目录，把它变成`/`的意思啦

    # arch-chroot /mnt

运行`passwd`，设置root密码，要敲两遍，不要忘了它。

### 主机名、时区、blah...
用vim打开`/etc/hostname`，往里面写一个作为主机名的名字，只要字母、横线和数字。

然后修改时区，

    #  ln -s /usr/share/zoneinfo/Asia/Shanghai  /etc/localtime

然后用vim打开`/etc/locale.gen`，然后找到以下四行，取消注释:

    en_US.UTF-8
    zh_CN.UTF-8
    zh_CN.GBK
    zh_CN.GB2312

然后运行`# locale-gen`

再编辑`/etc/locale.conf`，里面写上

    LANG="en_US.UTF-8"

现在生成启动要用到的ramdisk，

    # mkinitcpio -p linux

现在`# pacman -S wpa_supplicant dialog`，保证新系统可以联网。

现在你可以安装其他觉得需要的包，比如`bash-completion`什么的。

### 引导器

有很多引导器可以选，作为妹子的你，装`grub-bios`就好啦

    # pacman -S grub

然后

    # grub-install --target=i386-pc --recheck --debug /dev/sdb
    # grub-mkconfig -o /boot/grub/grub.cfg

### 重启

退出chroot环境,`exit`, 接着就可以reboot了。

## 欢迎来到新大陆

> 这是一片新大陆，一片荒芜，却充满生机，欢迎成为这里的开垦者。

### 基础

先使用`# wifi-menu`连接互联网。

#### 添加用户

    # useradd -m yooo
    # passwd yooo

你应该需要`sudo`，以运行`# visudo`，在`root ALL=(ALL) ALL`下面加一行`yooo ALL=(ALL) ALL`。

#### 装X

    # pacman -S xorg xorg-xinit xterm xorg-xeyes xorg-xclock

然后就可以`startx`一下看看有没有一个完爆win 3.1的图形界面了，如果没有就给我打电话...

#### 装yaourt
在`/etc/pacman.conf`里加入

```ini
[archlinuxcn]
SigLevel = Optional TrustedOnly
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinuxcn/$arch
```

然后 
    # pacman -Sy archlinuxcn-keyring yaourt

这里添加的 ArchLinuxCN 源是 archlinuxcn.org 的第三方源，包括了不少常用软件。

### 做出选择
现在，你可以选择简单模式，还是Hard模式。

### 简单模式

安装`gnome`

    # pacman -S gnome

完成之后，运行

    # systemctl enable gdm
    # systemctl start gdm

第一行是让`gdm`开机自启动，第二行是现在就启动它...

一切都应该work out of box, 如果没有的话，找gnome的人喷他们，他们觉得自己能造出普世的开箱即用桌面环境。

### 困难模式

安装`i3`窗口管理器

    # pacman -S i3

安装 `lightdm` 显示管理器，

    # pacman -S lightdm-gtk3-greeter

然后 

    # systemctl enable lightdm
    # systemctl start lightdm

登陆进i3之后会自动加载配置向导，基本上一路next即可。

安装网络管理器

    # pacman -S netork-manager-applet
    # systemctl enable NetworkManager.service
    # systemctl start NetworkManager.service

列个软件包列表，应该都是你需要的

* `firefox`, `flashplugin`: 浏览器和flash插件
* `xfce4-terminal`: 我推荐的终端模拟器
* `tmux`: 你懂的
* `nautilus`或`pcmanfm`或`nemo`: 文件管理器
* `rofi`: 启动器
* `compton`: 开透明什么的需要
* `pnmixer`: 调音量
* `gthumb`: 看图
* `gnome-screenshot`, `deepin-screenshot`: 截图
* `lxappearence`: 设置主题、外观
* `numix-theme`, `numix-circle-icon-theme-git`: 我喜欢的主题和图标，装完用lxappearence设置生效
* `nitrogen`: 设置壁纸
* `conky`: 系统状态监视
* `xfce4-power-manager`: 电源管理
* `mate-notification-daemon`: 桌面通知

还有好多日常软件日后慢慢告诉你...

#### 拷贝配置文件

把旧系统中，`/home/yooo/`里的以下文件拷到现在的`$HOME`对应的位置里:

* `.bashrc`: Shell配置
* `.xprofile`: 进入X时的环境文件
* `.i3/*`: i3的配置文件
* `.vimrc`, `.vim/`: vim配置文件
* `.tmux.conf`: tmux配置文件
* `.fonts/`: 一些字体
* `.config/fontconfig/`: 字体配置

其他的，例如壁纸之类，看着拷回来就是了...

#### 输入法

安装fcitx

    # pacman -S fcitx-im fcitx-sunpinyin fcitx-cloudpinyin fcitx-configtool

然后，确保自己的`~/.xprofile`里有以下三行:

    export GTK_IM_MODULE=fcitx
    export QT_IM_MODULE=fcitx
    export XMODIFIERS="@im=fcitx"

你的`~/.i3/autostart.sh`会再启动i3时自动运行fcitx，右键那个图标，把sunpinyin给enable了。

#### 多媒体

播放器和解码器:

    # pacman -S gstreamer ffmpeg smplayer

音频
    # pacman -S alsa-utils pulseaudio-alsa

把自己加到用户组里
    # gpasswd -a yooo audio
    # gpasswd -a yooo video

#### 一些字体

你现在的字体应该还比较难看，装上这些包:

    # pacman -S wqy-microhei ttf-dejavu ttf-droid cantarell-fonts adobe-source-han-sans-cn-fonts

你应该还需要写带中文的$\TeX$文档，

    # pacman -S texlive-most
    # yaourt -S acroread-fonts-systemwide


## 未完待续

以上。
