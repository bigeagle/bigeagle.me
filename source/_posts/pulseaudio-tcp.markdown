---
layout: post
title: '用PulseAudio TCP Forwarding实现网络传声'
date: 2011-8-12
wordpress_id: 243
dq_id: '243 http://bigeagle.me/?p=243'
permalink: pulseaudio-tcp
comments: true
tags: [linux, pulseaudio, tips]
---
最近在实验室，同时用着自己的笔记本和实验室分配的台式机，双机工作的确很爽，计算能力基本没有障碍了。

话说我是一个音乐迷恋者，也习惯于带着耳机写程序<span style="color: #99cc00;">/*需要高密度思维的时候还是得安静思考的*/ </span>，台式机的耳机口太远，于是就插在本本上。偶尔我也偷个懒，在台式机上看个视频什么的，这时候就需要换插耳机，很是麻烦。

突然想起过去看到过PulseAudio有一个Killer feature，可以在网络上转发音频流，这不就不用换耳机了么！

配置起来还是比较简单的，在Server端编辑`/etc/pulse/default.pa` ，增加（或者取消注释）以下几行：
{% codeblock %}
load-module module-native-protocol-tcp auth-ip-acl=192.168.0.0/24;127.0.0.1
load-module module-zeroconf-publish  //可选
{% endcodeblock %}
zeroconf模块用于在开启avahi-daemon的情况下使用hostname定义Server。重启pulseaudio
{% codeblock %}
$ pulseaudio --kill
$ pulseaudio --start
{% endcodeblock %}
在Client端编辑/etc/pulse/client.conf，增加
{% codeblock %}
default-server = tcp:192.168.0.1:4713
{% endcodeblock %}
重启Pulseaudio。
现在，在客户端机器上放点什么~ 你听见了么？
