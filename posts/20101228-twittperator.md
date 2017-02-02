---
layout: post
title: 'twitter键盘控：Twittperator'
date: 2010-12-18
wordpress_id: 69
comments: true
tags: [toys, desktop]
---
最近Chrome很火，尤其是Chrome OS和Web Strore发布之后，连BigEagle这个忠实的Firefoxer都一个星期没有开Firefox。Chrome的确很漂亮，很快，很简洁，各种功能也都很齐全，插件质量也越来越高。但是BigEagle心中，Firefox仍然排在第一位，除了必不可少的Autoproxy之外，Vimperator也是重要原因。虽然chrome下vimium也能实现vim快捷键，但是功能比vimp相去甚远。

<span style="color: #339966;">/\* 此处略去10000字对vimperator的赞美 \*/</span>

今天在<a href="http://twitter.com/Icaoxi" target="_blank">@Icaoxi</a>处看见Twittperator这个名号，google之，原来是vimperator的twitter插件，用后感觉真是一个神器！

{% img center /images/twittperator.png 500 %}

一下子看不出来这是Firefox吧！
<!--more-->

## 安装
安装方法很简单，去<a href="https://github.com/vimpr/vimperator-plugins" target="_blank">github</a>下载twittperator的脚本，放到vimperator工作目录里的plugin文件夹（没有就自己建一个）

不过有一点要求，Firefox得能翻得出GFW，方法很多，此处不再重新发明轮子。

## 首次登录
重启Firefox后twittperator被自动激活，首先要和Twitter账户进行进行Oauth认证，输入：

    :tw -getPIN

这样就会跳出Twitter的认证页面。当然选择Allow。然后会跳出一个页面显示PINCODE，这个时候再输入：

    :tw -setPIN

就可以完成认证。接下来你就可以使用Twittperator发推了。

## 各种功能
    :tw 

发推。除了发推还是发推。如果没有写推的话，就是查看TL列表。缓存的保质期是90秒。即：你用这个刷了一次TL之后90秒内再用这条命令是不会刷TL的而是快速查看TL。

    :tw!

无论有没有到90秒，强制刷新TL，忽视保质期。当然，这个功能一旦启动Stream之后就失效了，后述。

    :tw!@username

查看某人的推。如果没写username就是查看自己的mentions。在这里，username是可以进行tab补全的，补全的搜索范围是所有的缓存里的推。比如说我想看@1wingedangel的推，只要你的TL缓存上有他的推，那么就可以通过:tw!@1w然后tab补全来快速选择用户名。

    :tw RT @username#ID

官方RT。其中的username#ID是可以通过tab补全的，范围和用法同上。

    :tw <COMMENT>  RT @username#ID

非官方RT。补全同上。

    :tw @username#ID

针对一个推回复。补全当然同上。

    :tw!delete{StatusID}

删除一个Tweet，这个木有补全

    :tw!+@username#ID
    :tw!-@username#ID

加入收藏/取消收藏。补全自然还是同上。

    :tw!?

搜索关键词。搜索和缓存无关。

    :tw! <URL>

打开推上的URL。补全跟着缓存走，补全的关键词是推的内容。

:tw!info

查看一条推的详细信息。大到内容，发件人，时间，小到URL，头像地址，背景颜色，回复对象，用户名详细信息等等。

## 最后
键盘控们看到这里觉得很爽吧? Twittperator功能不多，就是看推发推删推，以后也许会有更多功能。
