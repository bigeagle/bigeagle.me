---
title: 修复GTK3 CSD外观
date: 2014-05-17 13:53:46
slug: fix-gtk3-csd
tags: [linux, ]
---

GTK3 3.12 之后强制开启了CSD(Client-Side Decoration)，其实这个feature挺好的，但是在平铺式窗口下，GTK3程序的窗口边缘出现了大块留白，极其难看:

{{<img class="center" src="gtk3-csd.png">}}


貌似引起问题的原因是CSD接管了窗口阴影的渲染，窗口管理器就把阴影边缘包括在窗口之内了，
经 @xiaq 提醒，不开compton/xcompositor后由于直接不支持阴影了所以就没有这个问题。
但是这样的话窗口透明也就没有了。

<!--more-->

一个解决方式是修改GTK3的样式，编辑（或新建）`~/.config/gtk-3.0/gtk.css`，加入以下内容:

```css
.window-frame 
{  
    box-shadow: none;  
    margin: 0;
}
```

Done.



