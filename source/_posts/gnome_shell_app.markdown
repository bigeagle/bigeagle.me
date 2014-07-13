---
layout: post
title: '利用tmpfs加速gnome-shell overview模式Applications索引'
date: 2011-7-29
wordpress_id: 226
dq_id: '226 http://bigeagle.me/?p=226'
comments: true
tags: [linux, desktop, tips]
---
gnome-shell的overview模式着实是个尤物，动态工作区和任务管理丝毫不输于Lion的Mission Control，而Applications与Lion的LaunchPad也是异曲同工。

然而有一点不爽，每次加载Applications都很慢，而且硬盘狂转，搞的这个很美丽的功能几乎不被使用。有必要加速一下。

考虑到速度瓶颈主要是磁盘读取 <span style="color: #666699;">/* 对MBA的SSD表示羡慕嫉妒恨 */ </span>，想到如果能预先把Applications里的内容缓存到内存里就好了，Applications里其实是加载了/usr/share/applications里的文件，于是想到了把/usr/share/applications 挂载为 tmpfs 。 <span style="color: #666699;">//总共不过[0-9]M的文件，这点内存咱还是有的 </span>

```bash
mkdir -p /tmp/app_temp
cp -aR /usr/share/applications/* /tmp/app_temp #先把文件备份出来
mount -t tmpfs none /usr/share/applications
cp -aR /tmp/app_temp/* /usr/share/applications
```

现在试试，速度是不是快多了？

<!--more-->
用tmpfs虽然速度快了，但只要一关机，所有数据就都丢失啦！<span style="color: #666699;">//就好像车头被掩埋了一样~</span>

解决办法也很简单，在合适的时候把内容拷贝回硬盘，每次开机时再拷贝回去就是。

对于“合适的时候”，笨一点的方法可以是用crond周期同步一下，本人用一种聪明点的办法 ---- 利用 inotify .

> Inotify一种强大的、细粒度的、异步文件系统监控机制，它满足各种各样的文件监控需要，可以监控文件系统的访问属性、读写属性、权限属性、删除创建 移动等操作。

也就是说，利用inotify监控/usr/share/applications目录，一旦发生变化，就想磁盘中同步数据，每次开机时从磁盘中恢复即可。生产环境中常用inotify+rsync实现实时同步，不过这种小hack要用rsync实在让我不爽，直接cp和rm得了。

```bash
#!/bin/bash
MEM_DIR="/usr/share/applications"
HD_DIR="/var/lib/app_db"
cp -aR ${HD_DIR}/* ${MEM_DIR}/
inotifywait -mrq --format '%e%%%f' \
   -e modify,delete,move,create ${MEM_DIR} \
  |while read raw_data
do
	DO=`echo $raw_data|cut -d% -f1`
	FILE=`echo $raw_data|cut -d% -f2`
	case "$DO" in
	  CREATE|MOVED_TO|MODIFY)
		cp ${MEM_DIR}/${FILE} ${HD_DIR}/
		;;
	  DELETE|MOVED_FROM)
		rm ${HD_DIR}/${FILE}
		;;
	esac
done
```

把这段脚本存为 `sync_tmpfs.sh` ，加入 `/etc/rc.loal` 中，使之开机自动运行:
    
    (bash /path/to/script/sync_tmpfs.sh ) &

再修改一下fstab

    tmpfs /usr/share/applications tmpfs defaults,mode=0755 0 0

重启一下，大功告成~
