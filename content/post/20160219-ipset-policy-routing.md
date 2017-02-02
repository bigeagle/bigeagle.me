---
title: 使用 dnsmasq 和 ipset 的策略路由
date: 2016-02-19 20:36:29
slug: ipset-policy-routing
tags: [dnsmasq, linux, network]
---

今天试了一把 dnsmasq 的 ipset 功能，配合 iptables 和 iproute2 即可实现基于域名的策略路由。
网上已有一些文章[介绍](https://blog.sorz.org/p/openwrt-outwall/)了这种方法，但多是面向 OpenWrt 在路由器上做，
我直接拿来则发现在本地跑其实有坑。

<!--more-->

## 基本需求和思路

我平时一直开着 VPN，配合 chnroute 实现策略路由。但是在学校里访问各类学术数据库需要用学校 IP，过去的做法是把几个常用数据库的
IP 加进路由表里，然而最近一些数据库开始使用 CDN 了，IP 三天两头的变化…… 所以基于域名实现策略路由势在必行。

Ipset 是一个可以和 iptables 配合使用的工具，可以把一系列 ip 放进一个集合中，iptables 则根据集合名进行规则匹配。Dnsmasq 从 2.66
版本之后就支持将一些域名的查询结果放进 ipset 中，这样就可以对这些域名对应的 IP 使用 iptables 处理。集合中的数据包在
iptables mangle 表打上 mark，再使用 iproute2 的规则(rule)，对该 mark 的数据包查询一个单独的路由表，从而实现策略路由。


## 配置流程

### VPN?

这个不用说了。

### IPSET

首先创建 ipset

    ipset create bypass_vpn hash:ip

这个每次重启就会丢失，可以 `ipset save` 导出配置文件，Arch Linux 的 ipset 包还带了 systemd  service，所以

    sudo ipset save | sudo tee /etc/ipset.conf
    sudo systemctl enable ipset.service

即可。


### DNSMASQ

配置 dnsmasq，这里推荐一下 @felixonmars 的 [dnsmasq-china-list](https://github.com/felixonmars/dnsmasq-china-list)，把国内
常见网站都涵盖了，自己再把常见学术数据库的域名加进去。但是这份配置中不包含 ipset 的配置，这个简单，简单的全文替换就好。

格式如下:

    server=/cn/114.114.114.114  # 这里指定域名的上级 DNS 
    ipset=/cn/bypass_vpn        # 这里指定查询结果要放入的 ipset
    server=/sciencedirect.com/166.111.8.28
    ipset=/sciencedirect.com/bypass_vpn

我自己是将`server=`和`ipset=`开头的配置分别放在了 `china.conf` 和 `china-ipset.conf` 两个文件中，`/etc/dnsmasq.conf` 中再使用
`conf-dir=/etc/dnsmasq.d` 配置。


### 路由表，IPTABLES, IP RULE

首先创建路由表（重启仍有效）

    echo "200 bypass_vpn" | sudo tee -a /etc/iproute2/rt_tables   # 这里数字在 1 到 252 之间，不要重复

再加 iptables 规则

    sudo iptables -t mangle -N fwmark
    sudo iptables -t mangle -A PREROUTING -j fwmark  # 对转发数据包有效
    sudo iptables -t mangle -A OUTPUT -j fwmark      # 对从本地发出的数据包有效
    sudo iptables -t mangle -A fwmark -m set --match-set bypass_vpn dst -j MARK --set-mark 1  # 给目标地址在 bypass_vpn 中的数据包打上mark 1

在 VPN 启动后，执行一些操作:
- 把默认物理路由设为 bypass_vpn 表的默认路由
- 让 mark=1 的数据包查询 bypass_vpn 表

我是在 VPN 的 post-up 脚本中加了这么几句:

```bash
OLDGW=$(ip route show 1/0 | head -n1 | sed -e 's/^default//')

gwdev=$(echo $OLDGW|awk '{print $4}')   # 物理设备
ip route show dev $gwdev | while read gwroute; do
	ip route add $gwroute dev $gwdev table bypass_vpn
done

ip rule add fwmark 1 table bypass_vpn
```

### 填坑

按理说到这里就该好了，但是实际是跑不起来的，抓包发现，虽然 iptables 的 mark 打上了，路由查询也是对的，但是发出去的包源IP竟然是我的 VPN 网卡地址。

然后 @shankerwangmiao 和 @hexchain 帮我找到了下面这张图还有[这份](http://linux-ip.net/html/routing-saddr-selection.html)文档。
![](https://upload.wikimedia.org/wikipedia/commons/3/37/Netfilter-packet-flow.svg)
大致意思就是，Linux 给数据包设置的源 IP 是通过查路由表决定的，而 Routing Decision 的过程发生在进入 iptables 之前，所以这时候根据规则，查询的是默认路由表，策略
路由没有起作用。在经过 mangle OUTPUT chain 之后，有一次 reroute check 过程，如果被打上了 mark，则再决定是不是要根据别的路由表发包，但是这时源地址<s>中央</s>已经
决定了。

解决的办法也比较简单，通过 NAT 把源地址改了就好

    sudo iptables -t nat -A POSTROUTING -m mark --mark 0x1 -j MASQUERADE
    # 或者使用
    sudo iptables -t nat -A POSTROUTING -m mark --mark 0x1 -j SNAT --to-source <your ip>

这时 tcpdump 发现 ICMP reply 已经收到了，但是 ping 仍然没反应。这是因为 Arch Linux 默认的 `rp_filter` 策略是严格路由匹配，即我收到 ICMP 包的网卡（物理网卡）并不是
最佳路径（默认路由表中VPN才是最佳路径）所以就丢掉了。所以把 `rp_filter` 改成宽松模式（路由可达即认为数据包合法）

    sudo sysctl net.ipv4.conf.{all,enp2s0}.rp_filter=2  # 你的网卡不一定叫 enp2s0

其实默认改成宽松也行，编辑 `/etc/sysctl.d/60-rp_filter.conf`
    
    net.ipv4.conf.default.rp_filter = 2
    net.ipv4.conf.all.rp_filter = 2


以上。

