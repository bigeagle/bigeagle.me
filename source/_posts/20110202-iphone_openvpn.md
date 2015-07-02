---
layout: post
title: 'iPhone使用OpenVPN'
date: 2011-2-2
wordpress_id: 113
comments: true
tags: [networ, vpn]
---
目田的互联网一直是我的梦想，之前在iPhone上一直使用WFGinterceptor（为保护小站，那三个字母是倒序的），但是不能存cookie是一个问题，而且它依赖于GAE，一个在前途未卜的网络。想来还是VPN或者SSH比较靠谱。

前几日在Twitter上看到有人介绍<a
  href="https://twitter.com/#!/search?q=%23lolihosting">#lolihosting</a>（<a
  href="http://vpn.lolihosting.com/">传送门</a>），貌似很不错的样子，还支持ipv6，这对于"3G"时代的西电人是一个极大地利好。在计算机上测试一下，果然速度不凡，比之前在Linost上买的SSH快多了。
<!--more-->
## OpenVPN on iPhone
在iPhone上使用OpenVPN需要先越狱，纯果粉到这里可以不用往下看了。<span style="color: #3366ff;">//个人感觉iPhone不越狱就是小资货，越狱后就是Unix！</span>
<ol>
  <li>在cydia里下载下载必要的软件包：{% codeblock %}OpenSSL，OpenSSH，SBSettings，OpenVpn Toggle for SBSettings，Python{% endcodeblock %}</li>
  <li>去lolihosting下载OpenVPN的配置文件，我用的是卖家提供的公网默认配置。传进iPhone里，我放到了/var/mobile/Library/OpenVPN/conf.ovpn</li>
</ol>
由于Lolihosting使用的是user/pass的认证方式，而iphone openvpn又不支持从文件读取username/passwd，所以每次都要打开终端，从标准输入吧user/pass敲进去，相当麻烦。所谓想偷懒于是有创造，<a href="http://blogold.chinaunix.net/u/7667/showart_2357907.html">这位大哥</a>就采用了python脚本替代自己的工作。
<ol>
  <li>安装python的pexpect模块。去<a href="http://sourceforge.net/projects/pexpect/files/">http://sourceforge.net/projects/pexpect/files/</a>下载pexpect-2.3.tar.gz至iPhone中，切换至root用户，执行

```bash
  tar zxf pexpect-2.3.tar.gz
  cd pexpect-2.3
  python setup.py install
```

</li>
  <li>建立文件/var/mobile/Library/OpenVpn/startopenvpn, 并将该文件权限设置为755

```python 
  #!/usr/bin/pythonimport pexpect
  import syschild = pexpect.spawn('/usr/bin/openvpn-iphone --config /var/mobile/Library/OpenVpn/conf.ovpn')
  child.logfile = sys.stdout
  child.expect('Enter Auth Username:')
  child.sendline('你的用户名')
  child.expect('Enter Auth Password:')
  child.sendline('你的密码')
  child.expect(pexpect.EOF, timeout=None)
``` 

</li>

  <li>修改/var/mobile/Library/SBSettings/Commands/com.offinf.openvpnup

```bash 
  #!/bin/sh
  [[ -f /var/mobile/Library/SBSettings/Toggles/OpenVpn/OFF ]] && /bin/rm /var/mobile/Library/SBSettings/Toggles/OpenVpn/OFF
  cd /var/mobile/Library/OpenVpn/
  /var/mobile/Library/OpenVpn/startopenvpn > /var/mobile/Library/OpenVpn/ovpn.log &
``` 
  
  </li>

  <li>修改/var/mobile/Library/SBSettings/Commands/com.offinf.openvpndown为如下内容：

```   
  #!/bin/sh
  /bin/touch /var/mobile/Library/SBSettings/Toggles/OpenVpn/OFF
  /usr/bin/killall openvpn-iphone
```  

  </li>
  <li>在sbsetting中启用openvpn的管理,就可以通过sbsetting来启动和管理vpn了！</li>
</ol>

{% img center /images/IMG_0176.png 320 480 %}

## DNS配置
连上OpenVPN之后我发现了一个严重的问题<span style="color: #3366ff;">(不知道其他人是不是也这样)</span>，虽然我本身获得了自由，但DNS污染依然存在，各种网址不能被正确解析。我想到了改DNS，但iOS 只提供WiFi接入点的DNS配置，3G/EDGE的DNS是不让改的。

本着iOS也是Unix的思想，我天真的以为它会在/etc/resolv.conf中，事实证明我错了。其实要改也不难，Apple的一个系统配置工具叫scutil。<span style="color: #3366ff;">//由于对Mac OS X系列不太了解，我也不知道它的机制，但用起来大概也挺方便</span>
<ol>
  <li>进入终端环境，SSH或者MobileTerminal都可以</li>
  <li>取得root权限</li>
  <li># scutil 进入scutil环境，命令提示符是 &gt;</li>
  <li>&gt; list 看一下大概都有那些选项，有数个类似于
  State:/Network/Service/EBF2E739-C251-4B13-82AC-43187C1228A6/DNS
  对应于当前的网络接入点，至少3G/EDGE一个，WiFi一个，Bluetooth一个</li>
  <li>&gt; show State:/Network/Service/EBF2E739-C251-4B13-82AC-43187C1228A6/DNS
  对于以上几个接入点，看看DNS配置，<del datetime="2011-02-02T11:56:54+00:00">凭自己的感觉</del><span style="color: #3366ff;">（我承认我不了解iOS，不知道接入点命名规则）</span>找到对应于3G/EDGE的那一条。</li>
  <li>&gt; d.init</li>
  <li>&gt; get State:/Network/Service/EBF2E739-C251-4B13-82AC-43187C1228A6/DNS</li>
  <li>&gt; d.add ServerAddresses * 208.67.222.222 208.67.220.220</li>
  <li>&gt; set State:/Network/Service/EBF2E739-C251-4B13-82AC-43187C1228A6/DNS</li>
</ol>
去<http://www.opendns.com/welcome/>看看，看到以下画面，恭喜你，有干净的DNS了。

{% img center /images/IMG_0175.png 320 480 %}

现在去<https://m.facebook.com/>试试，我自由了～

{% img center /images/IMG_0178.png 320 480 %}
