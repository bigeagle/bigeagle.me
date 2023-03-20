---
title: "握着你的手训一个类GPT语言模型 (二)"
date: 2023-03-20 00:00:00
slug: pico-gpt-2
tags: ["gpt", "language-model", "torch"]
---

书接[上回]({{< ref "20230312-pico-gpt-1/index.md" >}})，我们搞了个最简单的胡说八道机，距离GPT其实只差更科学的模型结构了。本文中公式较多，嚼不动的同学建议参看一些[图文并茂的科普文](https://theaisummer.com/transformer/)。

## 上下文信息融合

考虑一个张量 $\boldsymbol{x} \in \mathbb{R}^{T\times C}$，这个张量可以用来表示一个 “上下文特征 (context feature)” ，其中 $T$ 是上下文长度[^context]，$C$ 是特征数。我们假定一种非常简单的，从上下文中整合信息的方式: 对于每一个位置 $t$，我们把所有 $t$ 之前的特征都取个平均值。写成数学公式就是:

$$
y_{t} = \sum_{t=1}^{T} \frac{x_{t}}{t}
$$

这个很容易直白地翻译成代码:
```python
y = torch.zeros_like(x)
for t in range(0, T):
    y[t] = torch.sum(x[:(t+1)]) / (t+1)
```

[^context]: 没错，就是各种 GPT 相关文章里提到的 context 长度，例如公开的 GPT-3.5 模型 T=4096

考虑一下，能不能用矩阵算式替换掉求和符号 (for 循环)？当然可以，利用我们小学二年级学过的矩阵相乘，令

$$
\boldsymbol{W} \in \mathbb{R}^{T\times T} = \left[ 
    \begin{array}{ccccc} 
    \frac{1}{1} & 0 & 0 & \cdots & 0 \\\\
    \frac{1}{2} & \frac{1}{2} & 0 & \cdots & 0 \\\\
    \frac{1}{3} & \frac{1}{3} & \frac{1}{3} & \cdots & 0 \\\\
    \vdots & \vdots & \ddots & \ddots & \vdots  \\\\
    \frac{1}{T} & \frac{1}{T} & \cdots & \cdots & \frac{1}{T} \\\\
    \end{array}
    \right]
$$

则有 $\boldsymbol{y} = \boldsymbol{W}\boldsymbol{x}$ ； 写成 python 代码:
```python
W = torch.tril(torch.ones((T, T)))  # 全1的下三角矩阵
W /= W.sum(dim=1, keepdim=True)     # 令第 t 行数值全为 1/t
y = W @ x
```
进一步的，我们可以把 $\boldsymbol{W}$ 矩阵的获得过程改写一下:
$$
\boldsymbol{W}  = \mathrm{softmax}_\text{per-row}(\left[ 
    \begin{array}{ccccc} 
    1 & 1 & -\inf & \cdots & -\inf \\\\
    1 & 1 & 1 & \cdots & -\inf \\\\
    \vdots & \vdots & \ddots & \ddots & \vdots  \\\\
    1 & 1 & \cdots & \cdots & 1 \\\\
    \end{array}
    \right])
$$

这里用到了机器学习中常用的 [softmax](https://pytorch.org/docs/stable/generated/torch.nn.Softmax.html) 函数，对于输入矩阵的每一行做softmax操作后，原本位置为 $-\inf$ 的变成了0，其他位置则完成了一次归一化：所有数值之和相加得 $1.0$ 。

聪明的同学应该想到了，现在我们有了一种更容易的“凑”出一个合理的 $\boldsymbol{W}$ 的方式:
1. 随便生成一个 $T\times T$ 的矩阵 $\boldsymbol{W}_0$
2. 给定一个全 $1$ 的下三角矩阵 $\boldsymbol{M}$，在 $M=0$ 的位置上，把 $\boldsymbol{W}_0$ 的对应位置都设置为 $-\inf$ 
3. 对 $\boldsymbol{W}_0$ 沿行方向做 $\mathrm{softmax}$ 归一化，得到 $\boldsymbol{W}$

写成代码:
```python
M = torch.tril(torch.ones((T, T)))
W = torch.ones((T, T))
W = W.mask_fill(M==0, float('-inf'))
W = F.softmax(W, dim=-1)
```

之所以说这种看起来步骤更多的方法更“容易”，是因为 $\boldsymbol{W}_0$ 当中的数值不再需要精心凑出来，而是在实数范围内随便什么数值都可以。更重要的是，用在神经网络中，$\boldsymbol{W}_0$ 可以是一个可学习的参数，这样$\boldsymbol{y} = \boldsymbol{W}\boldsymbol{x}$ 操作就升级成了 “对前文取**加权**平均”，且权重可以根据学习目标优化调整。

## Scaled Dot-Product Attention
除了从某个静态的 “参数” 获得上下文特征的加权融合方法外，另一种更高级的做法是让融合权重本身是从上下文特征中动态生成，写成公式就是
$$
\boldsymbol{y} = f_{W}(\boldsymbol{x}) \cdot \boldsymbol{x}
$$
这种从当前数据中直接生成某种权重的计算范式就被称为注意力(Attention)机制。不难发现 $f_W(\cdot): \mathbb{R}^{T\times C} \rightarrow \mathbb{R}^{T\times T}$ 的输入张量和被加权的张量是同一个 $\boldsymbol{x}$ ，这就称为 "self-attention"。

在论文 [Attention is All You Need](https://arxiv.org/abs/1706.03762) 提出了一种 $f_W(\cdot)$ 的定义形式，几乎达到了“一统天下”的地位，乃至于近几年在机器学习界说 "Attention" 指代的就是这篇文章中的结构。

假定有三个函数 $f_q(\cdot), f_k(\cdot): \mathbb{R}^{T\times C} \rightarrow \mathbb{R}^{T\times d_k}$ 和 $f_v(\cdot): \mathbb{R}^{T\times C} \rightarrow \mathbb{R}^{T\times d_v}$，把 $\boldsymbol{x}$ 输入给它们，就得到了三个新张量 $\boldsymbol{Q}, \boldsymbol{K}\in \mathbb{R}^{T\times d_k}$和$\boldsymbol{V} \in\mathbb{R}^{T\times d_v}$ ，分别称为 Query, Key 和 Value。定义
$$
f_{W|q,k}(\boldsymbol{Q}, \boldsymbol{K}) = \mathrm{softmax}(\frac{\boldsymbol{Q}\boldsymbol{K}^T}{\sqrt{d_k}})
$$
先忽略这个 $\frac{1}{\sqrt{d_k}}$ 的线性缩放操作[^scale]，可以和前文计算 $\boldsymbol{W}$ 的公式对比一下，可以看到张量维度和定义形式都是一一对应的。考虑一下矩阵乘的定义, $\boldsymbol{Q}\boldsymbol{K}^T$ 的第 $i$ 行 $j$ 列，就等于$\boldsymbol{Q}$的第 $i$ 行和 $\boldsymbol{K}$ 的第 $j$ 行的两个 $1\times d_k$ 向量的内积，也就是余弦相似度。再仔细想，$\boldsymbol{Q}$的第 $i$ 行和 $\boldsymbol{K}$ 的第 $j$ 行，就是在 “Query 上下文”中 $i$ 位置的特征和 “Key 上下文”中的第 $j$ 位置特征。所以，整个公式的“意义”就是：上下文中，不同位置信息整合的权重，由Query和Key在对应位置的相似程度决定。

[^scale]: 目的是为了保持“方差不变性”，有利于神经网络训练。

把 Value 也考虑进来，就得到了大名鼎鼎的  Scaled Dot-product Attention 公式:
$$
\boldsymbol{y} = \mathrm{softmax}(\frac{\boldsymbol{Q}\boldsymbol{K}^T}{\sqrt{d_k}})\boldsymbol{V}
$$
以上公式中没有考虑 “后文只能看前文信息” 这个要求，一并考虑上，写成python代码:
```python
def causal_attention(Q, K, V):
    T, dk = Q.shape
    M = torch.tril(torch.ones((T, T)))
    W = (Q @ K.transpose(-1, -2)) / math.sqrt(dk)
    W = W.mask_fill(M==0, float('-inf'))
    W = F.softmax(W, dim=-1)
    y = W @ V
    return y
```
 

## Multi-Head Attention and Transformer

Scaled Dot-Product Attention 结构对输入上下文特征做了 **一次** 上下文信息融合，我们就可以在此基础上堆叠这个操作。显然，我们可以**串联**或者**并联**多个这样的融合操作。其中，并联 Attention 操作就是对同一个输入特征张量独立地做多次特征融合，得到多个独立的输出特征张量，再把他们联接(concatenate)起来，这个并联结构就称为 Multi-Head Attention。

如果尺寸选得巧，例如输入特征 $\boldsymbol{x} \in \mathbb{R}^{T\times C}$, 一路输出特征 $\boldsymbol{y}  \in \mathbb{R}^{T\times d_v}$ 恰好满足 $C = h \cdot d_v$，且恰好有 $h$ 路并联，那么最终并联后的输出特征维度 $h\cdot d_v$ 就恰好与输入特征维度 $C$ 相等。

再加上一些神经网络常见的操作，例如层归一化 (LayerNorm)、残差连接 (SkipConnection)，再加一些基础的非线性激活单元和全连接层，就可以搭出一个以 Attention 为核心的神经网络，称为 Transformer 网络。

更多的代码在此不再赘述，到 [picoGPT](https://github.com/bigeagle/picoGPT/blob/master/model.py) 项目里查看就好。

回顾一下上回的最贱模型中，“采样”的过程是：每生成一个新的token，就把它合并前序token，一起送给模型得到下一个 token。在 Transformer 模型中，输入网络的最大 token 长度有了限制：不能超过预定义好的 $T$ 维，所以每次输入输入 token 需要先选取 “最近的 $T$ 个” 再输入网络。这也就是为什么在 ChatGPT 当中，如果一次给它说太多话，它就把早前的内容忘记掉了。

## 从 PicoGPT 到 GPT

往简单了说，我们的 picoGPT 模型和 OpenAI 的 GPT-1, GPT-2, GPT-3 本质上都是相同的，只是模型的规模 (堆叠的层数、head数、上下文大小等等)有明显区别，理论上来说，只要计算资源足够多，我们无脑地把picoGPT的参数量加大，那么它和 GPT-3 就没有本质区别。

当然，事情并没有那么简单。首先，计算资源是有限的，如何训练一个超大模型本身就是一个很大的工程挑战；为了让超大模型能够收敛，还要使用千奇百怪的训练技巧；其次，大模型需要大量高质量数据才能“喂饱”，如何建立和维护这种数据集同样非常困难。

最后，也是最重要的，如此“朴素”的、两篇blog就能大致说明的方法，依靠模型和数据“变大”，就展现出 GPT 系列非同凡响的表现，这件事本身就很“神奇”。[^thought]

[^thought]: 我有无数的感想，然而这里的空间写不下了。

## 小结
这一篇基本对应 Karpathy [视频][KarpathyYTB] 中40分钟之后的内容，主要就是从最原始的思想一步步推出 Transformer 网络结构。我本人亲测，使用单块 2080Ti 显卡，对于《红楼梦》这样的迷你语料，一个 GPT-1 级别的网络可以在10分钟左右就达到过拟合。强烈建议有条件的同学动手玩一玩。

本来想加一小段 “思考”，但一方面思考比较零碎，另一方面上周 GPT-4 发布后我有一种强烈的“人类面临百年未有之大变局”的预感，本人才学太浅，实在不敢讨论这么哲学的内容，等我想明白了再说吧。下次一定。

[KarpathyYTB]: https://www.youtube.com/watch?v=kCc8FmEb1nY
