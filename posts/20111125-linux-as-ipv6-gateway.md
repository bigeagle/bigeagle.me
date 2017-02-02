---
layout: post
title: 'Linux 用作 IPv6 网关'
date: 2011-11-25
wordpress_id: 295
dq_id: '295 http://bigeagle.me/?p=295'
comments: true
tags: [linux, network]
---
IPv6作为下一代互联网的核心技术，拥有众多新特性和优势，不仅解决了IPv4网络地址T 量不够的问题，还一并解决了很多其他问题。
本文将集中讨论在西电校园网环境下，将Linux PC作为IPv6网关，让局域网可以正常接入IPv6网络的解决方案。

## 网络结构
本文中的网络结构如下：

<pre>
<code>
2001:250:1006:6151::1/64
     +--------+               +---------+ 
     | 校园网  |          eth0 |  Linux  | 
     |        +---------------+  局域网  | 
     |  网关   |               |  网关    | 
     +--------+               +----+----+ 
                                   | eth1
                          +--------+--------+
                      +---+--------+--------+---+ 
                      | +-+-+    +-+-+    +-+-+ | 
                      | |   |    |   |    |   | | 
                      | |   |    |   |    |   | | 
                      | +---+    +---+    +---+ | 
                      |      局   域   网        | 
                      +-------------------------+ 
</code>
</pre>

<!--more-->

## 网络地址转换(NAT)

这是一种直接继承IPv4思路的办法，在局域网内使用私有地址，在网关上进行网络地址转换而接入网络。这样做有以下好处：

 - 不用向ISP申请单独的IPv6地址块
 - 隐藏局域网计算机，避免了一些安全问题

但是IPv6协议系统目前还不包含NAT，事实上，NAT技术是为了缓解IPv4地址短缺而提出的，对于地址空间几乎无限的IPv6来说，NAT技术不再作为协议标准技术。

于是通过一些Hack实现NAT即可让子网获得私有IPv6地址并顺利接入IPv6网络。

这里推荐Qycaitian的作品:[猛击我!](http://sourceforge.net/projects/ipv6nat/)

支持多种特性：

 - 局域网ipv6自动配置
 - 局域网端口映射
 - 多WAN口负载均衡

## IPv6 Only 网桥
通过自实现NAT虽然可以解决上网问题，但对于类似p2p下载等业务，就需要全局IPv6地址。同样的，从网络协议的优雅性来说，NAT破坏了网络层次关系，算是一种Dirty Hack。

一种解决方案是搭建一个ipv6透明网桥，将局域网网关作为一个二层IPv6设备使用，这种情况下局域网内的主机与外网处于一个广播域，可以收到校园网网关的路由配置信息，每一台主机便可以得到一个全局的IPv6地址。

在配置前需要先安装 `bridge-utils` 和 `ebtables` 两个软件包

    ifconfig eth0 down
    ifconfig eth2 down #关闭两块网卡
    brctl addbr br0
    ifconfig br0 up #启动网桥
    brctl addif br0 eth0
    brctl addif br0 eth2 #桥接两块网卡
    ebtables -t broute -A BROUTING -p ! ipv6 -j DROP #只允许ipv6包通过网桥
    ifconfig eth0 up
    ifconfig eth2 up #启动网卡

## IPv6 NDP Proxy
这里将网关作为一台IPv6路由器使用。

在大多数情况下，IPv6是通过邻居发现协议(NDP)进行网络地址和路由策略的自动配置的，这需要在网关上进行配置，使用 radvd 即可对局域网启用NDP。

###配置网关各项地址
 - eth0为网关WAN口，接入校园网
 - eth1为网关LAN口，接入局域网

```bash
sysctl net.ipv6.conf.all.forwarding=1 #打开IPv6转发，这样会使得IPv6自动配置失效
ip link set dev eth0 up #打开WAN网卡
ip addr add 2001:250:1006:6151::2/126 dev eth0 #配置eth0 IPv6地址
ip link set dev eth1 up #打开LAN网卡
ip addr add 2001:250:1006:6151::100/64 dev eth1 #配置eth1 IPv6地址
ip -6 route add default via 2001:250:1006:6151::1/64 dev eth0 #添加校园网网关
```

###配置radvd为局域网自动配置网络信息
用你最喜欢的编辑器编辑 `/etc/radvd.conf` , 将内容改为:

    interface eth1 { 
        AdvSendAdvert on; 
        prefix 2001:250:1006:6151::/64 {
          AdvOnLink on;
          AdvAutonomous on;
          AdvRouterAddr on;
        };
      };

打开 `radvd`:
    
    /etc/init.d/radvd start 

此时局域网内的计算机应该已经获得了 `2001:250:1006:6151:` 开头的IPv6地址。

###配置 NDP Proxy 接入全局网络
这是试着 ping 一下外部的IPv6地址，会发现不通，这时在网关上抓包分析:

    tcpdump -i eth0 -v ip6 

会发现类似于这样的包

    2001:250:1006:6151::1 > ff02::1:ffb5:2: [icmp6 sum ok] ICMP6, neighbor solicitation, length 32, who has 2001:250:1006:6151:215:f2ff:feb5:2 

也就是说，内部的网络已经可以向外网通信，但外网无法得知内网的路由。

由于没有向ISP申请单独的IPv6地址块，这里不可能在外网上添加路由，同时，由于内网与外网同属一个子网(2001:250:1006:6151/64)，也不可能想外网广播路由信息包，这样会造成路由混乱。

Linux 提供了一个 `proxy_ndp` 选项，可以让外网的ndp请求穿过网关。在网关上敲

    sysctl net.ipv6.conf.all.proxy_ndp=1
    ip -6 neigh add proxy 2001:250:1006:6151:221:70ff:fec0:ef3f dev eth0

其中，`2001:250:1006:6151:221:70ff:fec0:ef3f` 是局域网中一台客户机的ipv6地址。

对于局域网中每一个IPv6地址，都要运行一遍这个命令，才能使得整个局域网顺利接入IPv6网络, 非常繁杂，而我期望达到自动配置局域网，搜索发现npd6项目可以做到自动配置: [猛击我!](http://code.google.com/p/npd6/)

编译安装`npd6`

    svn checkout http://npd6.googlecode.com/svn/trunk/ npd6 
    cd npd6 
    make 
    sudo make install

配置`npd6`

    mv /etc/npd6.conf.sample /etc/npd6.conf

编辑`/etc/npd6.conf`, 做出一些修改

    prefix = 2001:250:1006:6151:
    interface = eth0 #这里要写WAN网卡

这时启动npd6

    sysctl net.ipv6.conf.all.proxy_ndp=1 #先打开proxy_ndp选项
    /etc/init.d/npd6 start

现在内网就已经可以与外网正常通信了
