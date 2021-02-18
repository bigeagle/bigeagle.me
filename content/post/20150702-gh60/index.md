---
title: 定制GH60机械键盘
date: 2015-07-02 21:48:26
slug: gh60
tags: [toy, tips]
---

引: 年初时开源哥搞了个喜闻乐见的[团购定制vim键盘的活动](http://z-shang.github.io/kbd-for-vim.html)，
我饶有兴致地参团了，然而这事儿最后被厂家(TEX)放了鸽子，也就不了了之了。

不过我对键盘的购买欲倒是被激活了，原有的FC660M是个好键盘，但是不能定制键位，切稍微比我的挎包长了那么一点点，
加之最近股市大跌，愈发觉得钱不花真不值钱（谁来打醒我），便总是想买个新的。

挑了半天，poker2 和即将上市的 poker3 还是不够灵活，不能为所欲为…… 所以目光转向了硬件开源的 GH60。

<!--more-->

## 在哪儿买的

首先调研了一番，在[这里](https://hguan.me/2015/02/27/my-gh-60-keyboard.html)看见博主推荐一个
[常州的卖家](http://yikewaishe.taobao.com/)，于是也就找这个卖家做了。掌柜很nice，我对键盘并不是很懂，
也是第一次买定制键盘，掌柜给我科普了挺多。

最后选了无钢板茶轴+塑料外壳+HHKB配列（左shift和backspace拆成两个按键），卖家帮我焊接组装，3天搞定发货了。

上王道。

{{<img src="gh60.jpg" class="center">}}

先说下手感吧，感觉远不如原先的FC660M手感好，轴感觉有些「松」，不知是不是没有钢板的原因，虽然同为原厂茶轴，
这块键盘的轴感觉很硬，按键不干脆，有一种「没上润滑油」的摩擦感。另外就是空格键，卫星轴做过工很一般，左边
稍微用点力敲，右边就会脱出，需要再按回去。

卫星轴的问题，想了个土办法解决了，在空格键右边卫星轴孔处塞了点纸巾 -&#95;-||| 。轴太硬的问题，淘宝买了WD40
润滑剂，打算加点试试。

所以如果想follow自己也去买的话，注意一定要买带钢板的，当然有能力的同学就自己组装了。

## 刷固件

说完不开心的，来说点开心的。GH60最爽的就是完全可编程。中国买到的GH60基本都是satan的版本，与GeekHack的有所不同，
需要用[tmk_keyboard_custom](https://github.com/kairyu/tmk_keyboard_custom) 这个项目编译出来的固件，
并且在`config.h`中加入一行

```c
#define GH60_REV_CHN 1
```

你可以选择自己定义keymap或者已有的keymap，不过 tmk_keyboard_custom 的 gh60 中 `keymap_common.h` 有些问题，
建议手动跟 [tmk_keyboard](http://github.com/tmk/tmk_keyboard) 中的代码 merge 一下。另外，即使不少自带的keymap
也会报 `keys_count` 找不到的错，需要在对应的 `keymap_xxx.c` 中加入以下代码

```c
#ifdef KEYMAP_IN_EEPROM_ENABLE
uint16_t keys_count(void) {
    return sizeof(keymaps) / sizeof(keymaps[0]) * MATRIX_ROWS * MATRIX_COLS;
}

uint16_t fn_actions_count(void) {
    return sizeof(fn_actions) / sizeof(fn_actions[0]);
}
#endif
```

也可以直接使用我 fork 的 [tmk_keyboard_custom](https://github.com/bigeagle/tmk_keyboard_custom)，就不用改那么多代码了。

```
git clone --recursive https://github.com/bigeagle/tmk_keyboard_custom.git
```

计算机上要装 `avr-gcc` 和 `dfu-programmer`，Arch 的话源和 AUR 里就有。进入 `keyboard/gh60` 目录可以看到一群 `keymap_xxx.c`,
首先把固件编译出来:

```
make KEYMAP=xxx
```

刷固件时需要按下键盘背面的按钮进入dfu模式。

```bash
sudo sleep 5; sudo make KEYMAP=xxx dfu # 先把 sudo 密码敲了，在之后的 5 秒期间，按下键盘背面的按钮进入 dfu 模式
```

可以看到内部其实就是一个Atmel的单片机。

另外比较坑的一点就是，刷完之后一定要清空EEPROM，否则keymap不生效。清空的方法是，刷完dfu之后，
拔USB，按住space+backspace，插USB，等三秒，松开。注意这里的 space 和 backspace 都是键位刷新之前对应的键位。
而某次和 @jeasinema 折腾的时候，把 space 键给弄没了，于是无法刷新键位，解决办法是，把 `tmk_core/common/bootmagic.h`
中的 `BOOTMAGIC_KEY_SALT` 定义到别的按键上去，再用 `X+backspace` 刷新键位……

更高级的用法可以参见项目[文档](https://github.com/bigeagle/tmk_keyboard_custom/blob/bigeagle/doc/keymap.md)。

## 我的Keymap

这里发一下我的keymap，除了Fn0之外，把数字键3也变成了一个Fn键，也就是正常按时候是3，按住不放就是一个Fn，于是
3+hjkl = 左下上右（vim用户都懂的）。

{{<img src="gh60_keymap.png" class="center">}}

代码在[这里](https://github.com/bigeagle/tmk_keyboard_custom/blob/bigeagle/keyboard/gh60/keymap_bigeagle.c)，实现了 tricky_esc 功能（就是shift+ESC=~)。

