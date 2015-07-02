layout: draft
title: "Libinput 与 Udev"
date: 2015-04-27 00:21:13
tags:
---

** Update **

Systemd 221 之后 已经有 trackpoint 的 hwdb 了，libinput 也支持 trackpoint 加速，我现在的配置是
```
evdev:name:*DualPoint Stick:dmi:bvn*:bvr*:bd*:svnDellInc.:pnLatitudeE7440*:pvr*
  POINTINGSTICK_CONST_ACCEL=2
```
** Update End **

近期 Arch Linux 升上了 Gnome 3.16，Wayland 相关组件开始大量启用，比如 GDM 默认使用 Wayland，Xorg 默认使用 libinput 替代 evdev 等。

Arch 更新之后我们首先关心的是：有没有东西坏掉？很~~幸运~~遗憾，这次鼠标速度不对了…… 
具体来说，我习惯使用 trackpoint ，之前使用 `xset m 5 2` 设置光标速度，
更新后此法无法调整光标速度，可见 `xf86-input-libinput` 不再接受这种设置，
同时即使 gnome 设置中把鼠标速度调到最快，trackpoint 的速度仍然很慢。

这个 bug 已经有 ~~好事者~~ 好心人[汇报](https://bugzilla.redhat.com/show_bug.cgi?id=1200717)，最近也有 patch 提交，下个版本的 libinput 就设置
trackpoint 的加速参数了。

可是我等不及啊老湿！而且怎么设置参数阿根本找不到在哪里调好不好！

<!-- more -->

于是找到[这里](http://who-t.blogspot.com/2014/12/building-a-dpi-database-for-mice.html)，读完发现，原来 libinput 是会通过 udev 的 hwdb 读取
特定硬件的参数调整，这个第一感觉好麻烦，不能像 xset 那样直接调整，第二感觉就很科学，因为不同鼠标 DPI 不一样，过去每次我把 usb 鼠标插上之后，
都要再把光标速度手动调慢，而用了 libinput 之后就没这个问题了。

所以参数要怎么调阿老湿！

首先看 [70-mouse.rules](file:///usr/lib/udev/rules.d/70-mouse.rules) 这个文件

	# mouse:<subsystem>:v<vid>p<pid>:name:<name>:*
	KERNELS=="input*", ENV{ID_BUS}=="usb", \
	        IMPORT{builtin}="hwdb 'mouse:$env{ID_BUS}:v$attr{id/vendor}p$attr{id/product}:name:$attr{name}:'", \
	        GOTO="mouse_end"
	KERNELS=="input*", ENV{ID_BUS}=="bluetooth", \
	        IMPORT{builtin}="hwdb 'mouse:$env{ID_BUS}:v$attr{id/vendor}p$attr{id/product}:name:$attr{name}:'", \
	        GOTO="mouse_end"
	DRIVERS=="psmouse", SUBSYSTEMS=="serio", \
	        IMPORT{builtin}="hwdb 'mouse:ps2::name:$attr{device/name}:'", \
	        GOTO="mouse_end"

大概意思就是说，如果有一个 usb/bluetooth 鼠标，就去找 hwdb 中匹配的 `mouse:$env{ID_BUS}:v$attr{id/vendor}p$attr{id/product}:name:$attr{name}:` 
项，如果是串口鼠标，就找 `mouse:ps2::name:$attr{device/name}:` 匹配的参数。

再看 [70-mouse.hwdb](file:///usr/lib/udev/hwdb.d/70-mouse.hwdb) 这个文件
	
	Match string format:
	mouse:<subsystem>:v<vid>p<pid>:name:<name>:
	
	Supported subsystems: usb, bluetooth
	vid/pid as 4-digit hex lowercase vendor/product
	
	if vid/pid is unavailable, use
	mouse:*:name:<name>:
	if name is unavailable, use
	mouse:<subsystem>:v<vid>p<pid>:*
	
	For example, the following 5 matches all match the same mouse:
	mouse:usb:v17efp6019:name:Lenovo Optical USB Mouse:
	mouse:usb:*:name:Lenovo Optical USB Mouse:
	mouse:usb:v17efp6019:*
	mouse:*:name:Lenovo Optical USB Mouse:

**坑爹之处** 在于，这里没说 serio 鼠标怎么管…… 在我看 `70-mouse.rules` 之前纠结了好半天。

所以设置步骤如下:

**Step.1**  找到鼠标对应的文件 `/dev/input/eventX`, 遍历X, cat 一下，动动鼠标看看哪个有输出，那个就是

**Step.2** 获得参数 `sudo mouse-dpi-tool /dev/input/eventX`，移动鼠标大约 1 英寸 (254mm)，`Ctrl-C`。

<pre><code>
Mouse DualPoint Stick on /dev/input/event14
Move the device 250mm/10in or more along the x-axis.
Pause 3 seconds before movement to reset, Ctrl+C to exit.
Covered distance in device units: 469 at frequency 100.0Hz - ^C
Estimated sampling frequency: 100Hz
To calculate resolution, measure physical distance covered
and look up the matching resolution in the table below

      29mm          1.17in           400dpi
      19mm          0.78in           600dpi
      14mm          0.59in           800dpi
      11mm          0.47in          1000dpi
       9mm          0.39in          1200dpi
       8mm          0.34in          1400dpi
       7mm          0.29in          1600dpi
       6mm          0.26in          1800dpi
       5mm          0.23in          2000dpi
       5mm          0.21in          2200dpi
       4mm          0.20in          2400dpi
If your resolution is not in the list, calculate it with:
        resolution=469/inches, or
        resolution=469/(mm * 25.4)

Entry for hwdb match (replace XXX with the resolution in DPI):
mouse:unknown bus type:v0002p0008:name:DualPoint Stick:
 MOUSE_DPI=XXX@100
</code></pre>

首先计算 DPI = deice units / physical distance, 复制最后两行，写到 `/etc/udev/hwdb.d/71-mouse-local.hwdb` 中，注意
把 `XXX` 替换成实际 DPI。

**Step.3** 你看到 bus type 是 unkown, 更具体来说，实际是 serio，根据刚才说的，规则应该写成 

	mouse:ps2::name:DualPoint Stick:
	 MOUSE_DPI=400@100

**Step.4** 执行以下命令

```bash
sudo udevadm hwdb --update  # 刷新hwdb
sudo udevadm trigger /dev/input/eventX   # 刷新设备
sudo udevadm info /dev/input/eventX  # 应该可以看到 MOUSE_DPI 这一行
```

**Step.5** 根据实际感受，调整一下 DPI 的值，重复 Step.4

最后，对于 trackpoint 来说，这其实只是个 workaround，等 libinput 下次更新之后，应该有更合适的方法。
