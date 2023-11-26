---
title: 'macOS 按域名切换 DNS 解析'
date: 2023-11-26 00:00:00
comments: true
slug: mac-dns-resolver
---

在工作用的电脑上，为了访问公司内网，需要让内网域名走公司的 DNS 服务器，而其他域名走公共 DNS 服务器。

之前我一直使用 dnsmasq 实现按域名切换解析，这样的话有几个问题：
1. dnsmasq 的默认上游是静态配置，并不是在所有网络环境中都能直接用 114 了事，尤其是在一些需要认证的环境中
2. 需要改系统的 DNS 配置，同时每次系统更新之后又要重新改一遍

直到昨天我才知道 BSD 系支持一个按域名设置 resolver 的功能 ([`man 5 resolver`](https://www.manpagez.com/man/5/resolver/))，直接用就好了。

<!--more-->

假设我们要让 `*.internal.net` 都指定用 `192.168.8.8` 作为 DNS 服务器，其他域名则使用默认的 DNS 服务器。

```bash
mkdir -p /etc/resolver  # 默认不存在，需要手动创建
# 在 /etc/resolver/internal.net 中写入配置
cat > /etc/resolver/internal.net << EOF
nameserver 192.168.8.8
EOF
```

这样就可以了，不需要改系统的 DNS 配置，也不需要重启任何服务。

如果不放心的话，可以用 `scutil --dns` 查看确认一下。

```text
resolver #8
  domain   : internal.net
  nameserver[0] : 192.168.8.8
  flags    : Request A records, Request AAAA records
  reach    : 0x00000002 (Reachable)
```

另外在 macOS 下，`dig` 和 `nslookup` 等命令并不会遵守 resolver 配置，需要用 `dscacheutil -q host -a name <domain>` 来测试。

以上。
