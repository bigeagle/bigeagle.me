---
title: "把 CUPS 扔进 docker 里 "
date: 2020-01-28 00:00:00
slug: "cupsd-in-docker"
tags: ["linux", "cupsd", "docker"]
---

## 开头废话
看了一下我竟然整整 3 年没写过 blog 了！
有生之年能更新一下也是挺难得的。

其实我这几年没少写东西，只是和工作重合度太高，都发在内网论坛里了。

以下是正文。

----

故事是这样的，某年某月滚了一把 Arch，然后打印机就不听话了，会在打印机开始打印的瞬间任务失败……
由于打印机不常用，也不知道具体是哪次滚动，哪个库的更新引起的问题，很长时间都没搞定。

于是弃疗，把 `cups` 扔进 docker 里，固定一个版本解决。

<!--more-->

先记得把本地的 cups 禁用
```
sudo systmctl disable --now org.cups.cupsd.socket
sudo systmctl disable --now org.cups.cupsd.service
```

先拉镜像
```
docker pull olbat/cupsd
```

建一个 volume 存状态
```
docker volume create cupsd
```

然后建一个 cups docker 的服务 `/etc/systemd/system/cupsd.service`

```
[Unit]
Description=Docker container for cupsd
Wants=docker.service
After=docker.service
Conflicts=org.cups.cupsd.service
StartLimitInterval=200
StartLimitBurst=5

[Service]
Restart=always
ExecStartPre=-/usr/bin/docker rm -f cupsd
ExecStart=/usr/bin/docker run --rm --name=cupsd \
            -v /run/dbus:/var/run/dbus \
            -v cupsd:/etc/cups/ \
            --net=host olbat/cupsd
ExecStop=/usr/bin/docker stop -t 1 cupsd

[Install]
WantedBy=multi-user.target
```

启动
```
sudo systemctl enable --now cupsd.service
```

再在 `/etc/cups/client.conf` 里写上
```
ServerName 127.0.0.1:631
```

再打开 https://localhost:631/ 按一直以来的方法配好打印机即可。
