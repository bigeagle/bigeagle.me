---
layout: post
title: 'Conky从豆瓣获取MPD专辑封面'
date: 2011-10-3
wordpress_id: 255
dq_id: '255 http://bigeagle.me/?p=255'
comments: true
tags: [linux, desktop, tips]
---
{% img right /images/conky.png 145 conky %}

昨天回到Openbox了，GNOME3.2扩展不兼容让我这个不搞定不舒服司机的人实在太难受，又不想再去学gjs，所以干脆眼不见为净了。

过去在OB下最爱折腾的东西莫过于conky，昨天除了恢复了一下过去的conky配置，就是further折腾… 看conky-colors又出新版本，的确很炫，所以也想把自己的改改，不过实际需求上，估计也就是比较想要一个音乐的CoverArt。

我用的MPD，conky-colors里貌似不带mpd的cover脚本，google之，发现mpd的也<a href="http://sunjack94.deviantart.com/art/Conky-Panel-Mpd-CoverArt-154331369?moodonly=178">已经有人发明过啦</a>~

不过有一点不爽，这个脚本是从albumart下载封面，对中文支持有限，所以想从豆瓣获取封面，所以参考<a href="http://www.gracecode.com/archives/3009/">这个脚本</a>做了一些更改。

折腾控是不会喜欢压缩文件的，所以……直接贴代码吧
<!--more-->

cover.py：获取封面


```python
#!/usr/bin/python2
# -*- encoding:utf8 -*-

import os
import shutil
import commands
import urllib
import re
import sys
urlread = lambda url: urllib.urlopen(url).read()

def copycover(currentalbum, src, dest, defaultfile):
    _doubanSearchApi    = 'http://www.douban.com/search?search_text={0}'
    _doubanCoverPattern = '<img src="http://img[0-9].douban.com/spic/s(\d+).jpg"'
    _doubanConverAddr   = 'http://img3.douban.com/lpic/s{0}.jpg'
    searchstring = urllib.quote(currentalbum)
    
    if not os.path.exists(src):
        request = _doubanSearchApi.format(searchstring)
        result = urlread(request)
        match = re.compile(_doubanCoverPattern, re.IGNORECASE).search(result)
        if match:
            image = _doubanConverAddr.format(match.groups()[0])
            urllib.urlretrieve(image, src)
    
    if os.path.exists(src):
        shutil.copy(src, dest)
    elif os.path.exists(defaultfile):
        shutil.copy(defaultfile, dest)
    else:
        print ""

def escape(cmd):
    ''' escape bash special chars '''
    p=re.compile(r'([\$\(\)\ \;\'"`{}])')
    cmd = p.sub('XXXXX\g<1>',cmd)
    p=re.compile(r'XXXXX')
    esc_cmd = p.sub(r'\\\',cmd)
    return esc_cmd

def notify(cover):
    raw = commands.getoutput("mpc --format %title%---%artist%---%album% | head -n 1")
    raw = escape(raw)
    #print >> sys.stderr, raw
    title,artist,alb = raw.split( '---' )
    cmd="notify-send -i %s %s \"%s\\n%s\" " % (cover,title,artist,alb)
    #print >> sys.stderr, cmd
    os.system( cmd ) 

# Path where the images are saved
imgpath = os.getenv("HOME") + "/.covers/"

# image displayed when no image found
noimg = imgpath + "nocover.png"

# Cover displayed by conky
cover = "/tmp/cover"

# Name of current album
album = commands.getoutput("mpc --format %artist%-%album% | head -n 1")
title = commands.getoutput("mpc --format %title%|head -n 1")
# If tags are empty, use noimg.
if album == "":
    if os.path.exists(cover):
        os.remove(cover)
    if os.path.exists(noimg):
        shutil.copy(noimg, cover)
    else:
        print ""
else:

    filename = imgpath + album + ".jpg"
    if os.path.exists("/tmp/nowplaying") and os.path.exists("/tmp/cover"):
        nowplaying = open("/tmp/nowplaying").read()
        if nowplaying == album:
            open("/tmp/change","w").write('0')
            pass
        else:
            copycover(album, filename, cover, noimg)
            open("/tmp/change","w").write('1')
            open("/tmp/nowplaying", "w").write(album)
    else:
        copycover(album, filename, cover, noimg)
        open("/tmp/change","w").write('1')
        open("/tmp/nowplaying", "w").write(album)
    
    if os.path.exists("/tmp/nowsong"):
        nowsong = open("/tmp/nowsong").read()
        if nowsong != title:
            if(sys.argv[1]=="-n"):
                notify(cover)
            open("/tmp/nowsong","wc").write(title)
    else:
        if(sys.argv[1]=="-n"):
            notify(cover)
        open("/tmp/nowsong","wc").write(title)
```

conkyVinyl.sh：用imagemagick对图片做些修改

```bash
#!/bin/bash
#
# Album art with cd theme in conky
# by helmuthdu

player="/tmp/cover"
cover="/tmp/conkyCover.png"

picture_aspect=$(($(identify -format %w "$cover")-$(identify -format %h "$cover")))

if [ ! -f "$player" ]; then
	convert ~/.conky/Vinyl/base.png ~/.conky/Vinyl/top.png -geometry +0+0 -composite "$cover"
else
	cp "$player" "$cover"
	if [ "$picture_aspect" = "0" ]; then
		convert "$cover"  -thumbnail 86x86 "$cover"
	elif [ "$picture_aspect" -gt "0" ]; then
		convert "$cover"  -thumbnail 300x86 "$cover"
		convert "$cover" -crop 86x86+$(( ($(identify -format %w "$cover") - 86) / 2))+0  +repage "$cover"
	else
		convert "$cover"  -thumbnail 86x500 "$cover"
		convert "$cover" -crop 86x86+0+$(( ($(identify -format %h "$cover") - 86) / 2))  +repage "$cover"
	fi
	convert ~/.conky/Vinyl/base.png "$cover" -geometry +4+3 -composite ~/.conky/Vinyl/top.png -geometry +0+0 -composite "$cover"
fi

exit 0
```

使用的时候，在conky里加入

    #禁用图片缓存，这句加在conky的"TEXT"之前
    imlib_cache_size 0
    #这句插入到需要的地方
    ${texeci 10 ~/.conky/cover.py && ~/.conky/conkyVinyl.sh}${image /tmp/conkyCover.png -p 40,395}

写到这里突然想起来有两个二进制文件（图片素材），好吧，我还是把压缩包发上来把……
[conky\_mpd.zip](/files/conky.zip)
