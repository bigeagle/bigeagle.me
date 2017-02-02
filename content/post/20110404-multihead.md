---
title: '多头多尾的Linux'
date: 2011-04-04 00:00:00
wordpress_id: 133
comments: true
slug: multihead
tags: [linux, tips]
---
人们常把一台主机(Host)比喻成一个人的身体，主体称为 <strong>身体</strong> (<em>Body</em>)，交互输出设备称为 <strong>头</strong>( <em>Head</em>) ，交互输入设备称为 <strong>尾</strong>(<em>Tail</em>) 。在大多数情况下，一个主机的“身体”总是完整的，但“头”与“尾”却多有变化，常见的，有这样一些变化：
<ul>
	<li>单头单尾(Single Head Single Tail) - 这是个人计算机用户最常见的情况了，一台显示器，一套键盘鼠标</li>
	<li>无头无尾(Headless and Tailess) - 系统管理员常常会遇到这样的计算机，常见的服务器，成群结队地呆在机柜里，组成集群(cluster)，这样的计算机总是没有独享的显示器和键鼠</li>
	<li>多头单尾(Multihead) - 目前个人计算机的显卡常有多个输出接口，钱包比较充裕的同学有时会使用多个显示器</li>
	<li>单头多尾(Multitail) - 大多数的笔记本电脑都配有触控板或指点杆，再加上一个外接的USB鼠标，就成为单头多尾的计算机</li>
	<li>多头多尾(Multihead Multitail) - 多台显示器，多键鼠的计算机</li>
</ul>
\*nix系统总灵活多变著称，在各种头、尾情况下，都有令人惊讶的表现。  今天BigEagle主要就带大家玩一下多头和多尾的配置。
<!--more-->

## X server 的多显示器支持
多数带有独立显卡的台式机都有多个显示器接口，常见的笔记本电脑也带有显示输出接口，那么，如果有额外的显示器，就可以利用这些接口，组成双屏或多屏的系统。（摆在桌上，多有气势）

大多数Linux发行版安装的 Xorg 默认支持多显示器工作，只需修改一些配置文件。对于Xorg 1.8以下版本，修改 /etc/X11/xorg.conf，对于Xorg 1.8 以上版本（2010年较晚些发布的发行版多为此类），编辑/etc/X11/xorg.conf.d/10-monitor.conf 。

由于BigEagle使用N卡，暂时给不出A卡和I卡的实测有效配置，各位非N卡用户谅解一下……Archwiki上给出的nvidia显卡的示例配置如下：
{% codeblock %}Section "ServerLayout"
   Identifier     "DualSreen"
   Screen       0 "Screen0"
   Screen       1 "Screen1" RightOf "Screen0"
   Option         "Xinerama" "1"
EndSection

Section "Monitor"
   Identifier     "Monitor0"
   Option         "Enable" "true"
EndSection

Section "Monitor"
   Identifier     "Monitor1"
   Option         "Enable" "true"
EndSection

Section "Device"
   Identifier     "Device0"
   Driver         "nvidia"
   Screen         0
EndSection

Section "Device"
   Identifier     "Device1"
   Driver         "nvidia"
   Screen         1
EndSection

Section "Screen"
   Identifier     "Screen0"
   Device         "Device0"
   Monitor        "Monitor0"
   DefaultDepth    24
   Option         "TwinView" "0"
   SubSection "Display"
       Depth          24
       Modes          "1280x800_75.00"
   EndSubSection
EndSection

Section "Screen"
   Identifier     "Screen1"
   Device         "Device1"
   Monitor        "Monitor1"
   DefaultDepth   24
   Option         "TwinView" "0"
   SubSection "Display"
       Depth          24
   EndSubSection
EndSection{% endcodeblock %}
但BigEagle使用的效果并不是很好，主要原因是nvidia显卡与Xinerma兼容性较差，造成所有的透明效果全都失效了，屏幕还时有闪动。如果将Xinerma关闭，则最终会使得其中一台显示器不能运行完整的X会话（例如gnome），处于黑屏状态，运行程序时需要手动指定display才可以将另外一块屏幕利用起来。例如：

    smpalyer -display :0.1

当然了，窗口也不能在显示器之间自由的托动和切换。<span style="color: #7dc03f;">//事实上，这正是Xinerma做的工作</span>

幸好，nvidia帮我们解决了这个问题，BigEagle现在使用的就是下面的配置文件,对于Xorg 1.8以上版本，写进`/etc/X11/xorg.conf.d/10-monitor.conf`：

{% codeblock %} Section "ServerLayout"
     Identifier     "Layout0"
     Screen      0  "Screen0" 0 0
     Option         "Xinerama" "0"
 EndSection

 Section "Monitor"
     Identifier     "Monitor0"
     Option         "DPMS"
 EndSection

 Section "Device"
     Identifier     "Device0"
     Driver         "nvidia"
 EndSection

 Section "Screen"
     Identifier     "Screen0"
     Device         "Device0"
     Monitor        "Monitor0"
     DefaultDepth    24
     Option         "TwinView" "1"
     Option         "TwinViewXineramaInfoOrder" "DFP-0"
     Option         "metamodes" "CRT: nvidia-auto-select +1280+0, DFP: nvidia-auto-select +0+0"
     SubSection     "Display"
         Depth       24
     EndSubSection
 EndSection{% endcodeblock %}
好了，现在，startx~

{% img center /images/dual_monitor.jpeg 500 %}

Nvidia的图形控制台提供了友好的界面来设置这些，害怕改动配置文件的同学，可以使用Nvidia控制中心来配置这一切。

## Xdmx: 分布式多头服务器
对于单台计算机，多显示器的支持并不稀奇，windows下也能完美支持，操作起来比linux还要更加方便和人性化，可是，如果想把多台计算机的X server共享出来，合并成一个屏幕呢？难道这也可以？

{% img right /images/xdmx.jpg 300 %}

是的，我们无所不能的X server有无穷的扩展性能，神奇的扩展xdmx就能实现分布式多头X 服务器。

简单说来，就是把多个X server整合成发一个 X Server 来用。Xdmx 还支持动态的增加和删除X server，比如原本是3 个X server组成一个大的X server，现在其中一个暂时要涌来做别的事情，你可以用一个命令删除这个X server，然后继续使用。

以下，一双机为例子简单介绍xdmx的使用。详细内容，可以参考IBM文档中心的一篇<a href="http://www.ibm.com/developerworks/cn/opensource/os-mltihed/index.html">教程</a>。

{% img left /images/xdmx2x2.jpg 300 %}

首先，你需要以下硬件：
<ul>
	<li>相对现代的CPU -- 一般能在市场上见到的CPU都能满足要求</li>
	<li>快速的网络连接 -- 至少得是局域网环境</li>
	<li>图形卡至少具备16位色深 -- 市面上能见到的图形卡一般都具备</li>
</ul>
也就是说，在同学们常见的环境（宿舍、实验室）里，硬件条件是完全可以满足的。

软件条件：
<ul>
	<li>能使用X server的操作系统，是的，windows被排除了…</li>
	<li>xdmx扩展</li>
</ul>
获取xdmx扩展的方法很简单，大多数发行版的软件源里已经有了：

    apt-get install xdmx             #Debian 系
    yum install xdmx                 #Red Hat 系
    pacman -S xorg-server-xdmx       #Archlinux

万事具备，只欠启动~别急，你的X server一般是工作在本地运行状态的，执行
    
    ps ax|gerp X

看看你的X是否带上了 `-nolisten tcp` 参数？ 那样，xdmx是无法连接到远端的X server去的，解决的办法也很简单，对于gnome桌面环境，修改`/etc/gdm/gdm.conf` 或`/etc/gdm3/daemon.conf` 加入：

    DisallowTCP = false

即可，对于修改了`daemon.conf` 的同学，这一句要加到`[security]`项里。

如果你没有登陆管理器，总是使用startx启动X server的话，修改 `/etc/X11/xinit/xserverrc` ,把`-nolisten tcp` 参数去掉即可。

现在，真的是万事具备了。首先，我们要说明，这里有一个 <em>主机</em> 和 <em>从机</em> 的概念，控制整个系统运行的权限在主机那里。运行xdmx的很简单：

首先，到从机处，运行一个X server，最好是最纯净的X server，当然，gnome或KDE桌面环境也可以。打开一个X终端，输入：
   
    xhost + control_node_ip

这里的`control_node_ip`是主机的IP地址，我们假定为 `192.168.0.1`，为方便叙述，再假定从机的IP地址为192.168.0.101。这句命令的意思是 赋予主机访问从机X server的权限。

接着，到主机处，运行一个X server，不管怎样，需要一个X终端，化腐朽为神奇的时刻就要到来，运行命令：
    
    startx `which twm` -- /usr/bin/Xdmx :1 -display 192.168.0.1:0 \
          -display 192.168.0.101:0 -ignorebadfontpaths +xinerama -noglxproxy

这是两块屏幕应该都黑了，但是有一个X形的鼠标指针，点一下，出现一个菜单，选择Xterm，出现一个终端窗口，试着把窗口托向显示器的侧边，见证奇迹的时刻：窗口进入了另外一台主机上的显示器！是的，这就是穿越。

xdmx的配置远不止这些，但大同小异，更多内容请参考IBM文档库。

## X 环境下多尾配置
大多数同学都是笔记本电脑的使用者，常常使用两个鼠标：外接的usb鼠标和笔记本的触控板。在默认的情况下，两个鼠标以一个光标的形式呈现在我们面前，常常不能同时操作，能不能让屏幕上出现两个光标，互不干扰呢？我们无所不能的X当然是可以的。

在终端中输入：
    
    xinput --list

你应该能看见一组硬件信息，例如BigEagle的就是：

    ⎡ Virtual core pointer                      	id=2	[master pointer  (3)]
    ⎜   ↳ Virtual core XTEST pointer              	id=4	[slave  pointer  (2)]
    ⎜   ↳ USB Optical Mouse                       	id=10	[slave  pointer  (2)]
    ⎜   ↳ DualPoint Stick                         	id=12	[slave  pointer  (2)]
    ⎜   ↳ AlpsPS/2 ALPS DualPoint TouchPad        	id=13	[slave  pointer  (2)]
    ⎣ Virtual core keyboard                    	id=3	[master keyboard (2)]
        ↳ Virtual core XTEST keyboard             	id=5	[slave  keyboard (3)]
        ↳ Video Bus                               	id=6	[slave  keyboard (3)]
        ↳ Power Button                            	id=7	[slave  keyboard (3)]
        ↳ Sleep Button                            	id=8	[slave  keyboard (3)]
        ↳ Dell Dell USB Keyboard                  	id=9	[slave  keyboard (3)]
        ↳ AT Translated Set 2 keyboard            	id=11	[slave  keyboard (3)]
        ↳ Dell WMI hotkeys                        	id=14	[slave  keyboard (3)]


接下来，输入

    xinput --create-master xxx

xxx是自己随便起的名字，这时你会看到屏幕上出现了一个新的光标，但是怎么都动不了，不要担心，这是因为还没有个这个光标加入任何新的设备。下面，我们输入：
    
    xinput --reattach 10 "xxx pointer"

这里，10是设备id，对应于上面的列表中，就是USB Optical Mouse，整体的意思就是，将USB Optical Mouse作为xxx组的光标。现在动动USB鼠标，动动触控板，怎么样，两个光标可以独立运动了吧~ 类似的，还可以加入独立的键盘：

    xinput --reattach 9 "xxx keyboard"

将Dell USB Keyboard加入xxx光标指向的键盘，这样，两个键盘也能独立工作了。

想要取消多光标的设置，只需要：
    xinput --remove-master xxx

即可。

## 写在最后
BigEagle今天也是第一次真正接触多头多尾的配置，过去在实验室一台windows和一台Linux用Synergy共享键盘鼠标就觉得很酷了，今天看到xdmx带着窗口穿越计算机才知道什么叫酷。

现在是越发地崇拜 X 的开发团队了，创造一种机制，而不是一种方法，正是这种哲学指引下，X 的工作模型才有如此高的健壮性和可定制性，真不敢相信，这么美妙的东西，还是20年前的成果。

对，创造一种机制，用机制去解决问题。
