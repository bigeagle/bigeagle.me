---
layout: post
title: "pulseaudio音量问题"
date: 2012-05-20 04:07
comments: true
tags: 
    - linux
    - pulseaudio
    - tips
---
话说Pulseaudio一直有一个问题困扰着我，好几年了，就是 **音量不连续** , 解释一下就是例如音量降到 16% 以下的时候会突然变成零，或者调整一下(下文解释)，那么 2%-16% 这一段虽然有声音但是几乎都是一个音量，然后 2%-0% 突变。 

p.s. 我对Linux的音频设备原理实在是一知半解，所以后文有好多 「俗」语，懂行的见到还请轻拍砖。

准确的说这个更应该是我声卡(驱动)的问题，Alsa的主音量将到 16% 之后会突然没有声音，就好像有一个 threshold 一样。不过之前纯用Alsa的时候我可以通过调整 PCM 音量来解决，但是 Pulseaudio 所有都一块儿调整了，只有一个主音量， 所以再开终端调alsamixer什么的实在烦死人。 

开头说到的 「调整一下」指的是输出设备选择，笔记本电脑自带了一个扬声器，也可以接耳机什么的，于是就有两个可以输出的 connector，不过就算选speaker的话耳机还是有声音的，这个是硬件控制的，pulse搞不定这个切换。  我这里的情况是 speaker 输出的时候 16% 以下有声音，但是音量几乎和 16% 没有区别（其实还是有区别的，只是 2% 的音量太大，1%的音量有太小，所以几乎不可用)。

话说pulseaudio对alsa的控制配置存放在`/usr/share/pulseaudio/alsa-mixer/paths/`里，其中`analog-output.conf.common` 里有一个对PCM的控制选项，默认是 `merge`，可以理解为「联调」什么的: 当主音量降低到「突变临界点」的时候pulse会去调整PCM音量，看起来很有用，可是实际却不work，就是因为alsamixer除了master和PCM两个音量外还有speaker和headphone， 这两项的调整优先级是高于PCM的，于是当master音量不能再降低的时候pulse会去调整speaker/headphone ，而这两个输出在我的本本上完全是鸡肋，因为它们也是和master是不独立的，也就是说当master降到门限时speaker/headphone的门限是100%，所以就会出现音量在16%处跳变的情况。 所以我只能将PCM控制选项设置为`ignore`，也就是让pulse不要去调整PCM音量，然后我再将PCM音量设置为60%什么的，master音量再16%时也就足够小了。好dirty的workaround……

今天无意间打开`analog-output-headphones.conf` ，想到其实 headphone/spaker 也是可以设置 merge/ignore 的，于是果断把headphone设置为`ignore`，果然，master音量降到16%之后pulse跳过headphone，直接调整PCM了，音量调整终于平滑了！

哈，真是无心插柳柳成荫。<span style='color:#8c8c8c'> #这么简单的解决方法你竟然用了一年时间才想起来笨死了! </span>
