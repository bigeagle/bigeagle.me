---
title: "为什么说 GPT 是无损压缩"
date: 2023-03-26 00:00:00
slug: llm-is-compression
tags: ["gpt", "language-model", "compression", "NNCP"]
---

上周一从 [Tim](https://twitter.com/zxytim) 处听到一个“暴论”：大语言模型本质上是无损压缩。可惜聊天的时间太短了，Tim 说不完这个理论。经过一段时间的网上冲浪，我也从多个地方找到了这个理论的来源。

首先是 [Jack Rae](https://twitter.com/drjwrae) 在 Stanford MLSys 研讨会上的[报告][MLSys-76] ，他大约用了10分钟时间简短的介绍了 "LLM = Compression" 理论，并且给了一个 "Proof by construction"，即构造了一种使用 LLM 做压缩的方法以证明该理论。不过报告本身讲得很快，后面的提问环节第一个问题就是让他再详细讲讲，本人愚笨，听他详细解释之后还是没有完全get到。

不过 Jack 在报告中提到有一个叫 [NNCP][NNCP] 的工作，看完之后的确更容易理解这个数学本质。 

## 一些背景知识

Shannon 祖师爷在[信息论][shannon1948]中给出了“信息量”的定义，对于一个服从概率分布 $p$ 的离散随机变量 $X$ ，词汇表为 $\mathcal{X}$，我们说 $X$ 的信息量为 $H(X)$ bits，其中 
$$
H(X) = -\sum_{x\in\mathcal{X}} p(x) \log_2 p(x).
$$
也就是说，对于一个“事物”，它的本质信息就包含在了它的概率密度 $p(x)$ 中。

我们可以任意假设一个词汇表，比如各种二进制数据都很容易分割成字节，它有0-255共256种可能，我们很容易用 8bit 来表示一个字节。这里其实隐含了一种假设： 0-255 每种字符是均匀分布的，也就是
{{<raw>}}
$$
-\sum_{x\in\mathcal{X}_{256}} \frac{1}{256}\log_2\frac{1}{256}= 8\, \text{bits}, \quad\mathcal{X}_{256} = \{0, 1, \ldots, 255\}
$$
{{</raw>}}


不难证明，$H(X)$ 在 $p(x)$为均匀分布时取最大值，当 $X$ 为一个字节时，$H(X_{256})\le 8\,\text{bits}$，也就是说，当 $p(x)$ 不是均匀分布时，我们可以用小于 8bit 的编码来表示一个字节。这也就是各种“压缩”算法的理论基础。

如果我们已知一个 $p(x)$，是否能构造一种最优的编码方式，使得编码长度无限逼近 $H(X)$ 呢？一个现成的答案是[算术编码](arithmetic_coding)。算术编码的科普文很容易找到，这里不再赘述了。我们只需知道：完成算术编码-解码的前提条件是知道随机变量 $X$ 的完整概率分布 $\boldsymbol{p}_{X} = [P(X=0), P(X=1), \ldots]$ 。

## 如何使用语言模型做压缩

本节内容是对 [NNCP][NNCP] 中过于简练的的 Introduction 的解读，也是对 Jack 视频中压缩编解码传输的一个更细致的解释。

假定 Alice 有一个文本数据集 $\mathbb{D} = [x_0, x_1, \ldots, x_N]$ 需要发送给 Bob，他们俩都有很强的计算机，但是他俩之间的传输带宽很低，怎样做一种基于神经网络的压缩方法，让 Bob 能无损地接收到 $\mathbb{D}$ 呢？

我们构造这样一种方法。Alice 手上有一份 “语言模型的训练代码”，例如 [PicoGPT]({{< ref "20230312-pico-gpt-1/index.md" >}})，根据语言模型的定义，它总能输出 “给定前文的情况下，下一个字符的概率分布” $\boldsymbol{q}(x_i|x_{i-1},x_{i-2},\ldots,x_{0}).$ 我们要求这段“训练代码”有以下性质: 
1. 能确定性地输出 $\boldsymbol{q}(x_0)$，即在没有任何前文的情况下，第一个字符的完整概率分布
2. 不存在“随机性”，只要输入数据相同，它在 Alice 和 Bob 的计算机上要能运行出相同的结果
这两个要求都不难做到，只要认真写代码，并且 Alice 和 Bob 他俩把自己的计算机软硬件环境都事先对齐了就行。

由此，Alice (发送端、编码端) 可以如下完成自己的编码过程:
1. {{<raw>}} 以初始状态运行自己的训练代码 $f(\emptyset)$，得到 $\boldsymbol{q}_0$ {{</raw>}}
2. {{<raw>}} 用算术编码，根据 $\boldsymbol{q}_0$ 得到第一个字符的编码 $z_0$ 发送给 Bob {{</raw>}}
3. {{<raw>}} 用 $\langle\emptyset, x_0\rangle$ 作为训练样本，对自己的语言模型 $f(\cdot)$ 做一次梯度下降，得到更新后的语言模型 $f_1(\cdot)$ {{</raw>}}
4. {{<raw>}} 运行 $f_1([\emptyset, x_0])$，得到 $\boldsymbol{q}_1$  {{</raw>}}
5. {{<raw>}} 用算术编码，根据 $\boldsymbol{q}_1$ 得到第二个字符的编码 $z_1$ 发送给 Bob {{</raw>}}
6. {{<raw>}} 用 $\langle[\emptyset, x_0], x_1\rangle$ 作为训练样本，对自己的语言模型 $f(\cdot)$ 再做一次梯度下降，得到更新后的语言模型 $f_2(\cdot)$ {{</raw>}}
7. {{<raw>}} 运行 $f_2([\emptyset, x_0, x_1])$，得到 $\boldsymbol{q}_2$  {{</raw>}}
8. {{<raw>}} 用算术编码，根据 $\boldsymbol{q}_2$ 得到第二个字符的编码 $z_2$ 发送给 Bob {{</raw>}}
9. {{<raw>}} 不断重复以上过程：每发出一个字符 $x_i$，就用 $\langle[\emptyset, x_0, \ldots, x_{i-1}], x_i\rangle$ 更新一下语言模型，得到 $f_{i+1}(\cdot)$，
   再预测出下一个字符的概率密度 $\boldsymbol{q}_{i+1}$， 调用算术编码，将 $z_{i+1}$ 发送给 Bob 直到整个数据集 $\mathbb{D}$ 发送完毕{{</raw>}}

Bob 如何完成解码呢？
1. {{<raw>}}  以初始状态运行自己的训练代码 $f(\emptyset)$，得到 $\boldsymbol{q}_0$ {{</raw>}}
2. {{<raw>}}  从 Alice 处收到码字 $z_0$，使用算术编码，根据 $\boldsymbol{q}_0$ 解码得到 $x_0$ {{</raw>}}
3. {{<raw>}}  用 $\langle\emptyset, x_0\rangle$ 作为训练样本，对自己的语言模型 $f(\cdot)$ 做一次梯度下降，得到更新后的语言模型 $f_1(\cdot)$ {{</raw>}}
4. {{<raw>}}  运行 $f_1([\emptyset, x_0])$，得到 $\boldsymbol{q}_1$  {{</raw>}}
5. {{<raw>}}  从 Alice 处收到码字 $z_1$，使用算术编码，根据 $\boldsymbol{q}_1$ 解码得到 $x_1$  {{</raw>}}
6. {{<raw>}}  不断重复以上过程: 每解出一个字符  $x_i$，就用 $\langle[\emptyset, x_0, \ldots, x_{i-1}], x_i\rangle$ 更新一下语言模型，得到 $f_{i+1}(\cdot)$，再预测出下一个字符的概率密度 $\boldsymbol{q}_{i+1} = \boldsymbol{q}$  ，从 Alice 处收到 $z_{i+1}$，调用算术编码，解得下一个字符 $x_{i+1}$ {{</raw>}}
7. {{<raw>}}  直到整个数据集 $\mathbb{D}$ 解码完成 {{</raw>}}

我们不难发现，在整个“发送-接收”的过程中，Alice 并不需要把语言模型的参数发送给 Bob，他们需要提前共享的只是语言模型的训练代码。

## 为什么模型越大，压缩率越高

除了训练代码之外，Alice 和 Bob 之间总共发送了多少 bit 的信息呢？由于语言模型不可能完美地拟合数据集的实际概率，我们假定实际概率为 {{<raw>}}$\boldsymbol{p}_i=\boldsymbol{p}(x_i|x_{i-1},x_{i-2},\ldots,x_{0})$ {{</raw>}}，
根据算术编码的最优性，可以估算出每个编码字符 $z_i$ 的bit数为 

{{<raw>}}
$$
-\sum_{x\in \mathcal{X}} \boldsymbol{p}_{i}\log \boldsymbol{q}_{i}
$$
{{</raw>}}

眼力好的同学会惊讶的发现：这可不就是 {{<raw>}}$\boldsymbol{p},\boldsymbol{q}${{</raw>}}的交叉熵嘛!

回忆一下类GPT语言模型的训练目标：**最小化**训练集上实际分布$\boldsymbol{p}$ 和预测分布 $\boldsymbol{q}$ 的交叉熵。巧了，这可不就等价于 “最小化 Alice 和 Bob 之间传输数据 $z_i$ 的长度” 嘛！

我们再对交叉熵做个变形:

{{<raw>}}
$$
\begin{align*}
H_{\boldsymbol{p},\boldsymbol{q}}(X) &= -\sum_{x\in \mathcal{X}}\boldsymbol{p}(x)\log \boldsymbol{q}(x) = -E_{\boldsymbol{p}}\log \boldsymbol{q} \\
&= E_{\boldsymbol{p}}\log \frac{1}{\boldsymbol{q}} = E_{\boldsymbol{p}}\log\frac{\boldsymbol{p}}{\boldsymbol{p}\boldsymbol{q}}  \\
&=E_{\boldsymbol{p}}\log(\frac{1}{\boldsymbol{p}}\cdot\frac{\boldsymbol{p}}{\boldsymbol{q}})  \\
&={\color{blue}-E_{\boldsymbol{p}}\log{\boldsymbol{p}}} + {\color{red}E_{\boldsymbol{p}}\log\frac{\boldsymbol{p}}{\boldsymbol{q}}} \\
&={\color{blue} H_{\boldsymbol{p}}(X)} + {\color{red} D_{K-L}(\boldsymbol{p}||\boldsymbol{q})}
\end{align*}
$$
{{</raw>}}


不难发现，蓝色部分正是 $X$ 的熵，也就是最优编码长度；红色部分恰好是 $\boldsymbol{p},\boldsymbol{q}$ 的 K-L 散度，当且仅当 $\boldsymbol{p} = \boldsymbol{q}$ 时 $D_{K-L}(\boldsymbol{p}||\boldsymbol{q}) = 0$ ，换句话说，Alice和Bob共享的语言模型 $f(\cdot)$ 预测出的分布 $\boldsymbol{q}$ 与实际分布 $\boldsymbol{p}$ 越接近，那么他们之间的数据传输长度就越接近最优下限。

所以，并不是“模型越大、压缩率就越高”，而是“模型越强、压缩率就越高”。当然，把模型放大(Scale Up)是一种“增强模型”的有效手段，所以“大模型的压缩率更高”从一般意义上说也是对的。

## 小结与感想
近两年“大模型”层出不穷，包括我在内的不少人都会直观地以为：超大的参数量就是把数据集背下来了。包括前段时间有一个很火的文章 《[ChatGPT is a blurry JPEG of the web](https://www.newyorker.com/tech/annals-of-technology/chatgpt-is-a-blurry-jpeg-of-the-web)》。然而压缩理论从数学上证明了：
1. 语言模型是“无损压缩”，而不是“有损压缩”
2. 大语言模型超大的参数量只是副产物，“压缩”的过程并不需要考虑参数量
3. 大语言模型的目的，并不是尝试“拟合”训练集，而是无损地找到训练集所代表的本质规律(概率分布)，从而可以生成出哪怕在训练集之外的内容

同时，压缩理论也印证了，为什么 BERT 的 “预测中间词” 从最终应用效果上比不上 GPT 系列始终坚持的“预测下一个词”。

本文基本上是我的一份学习笔记，为了真正弄懂它，我把十多年前的信息论课本都翻出来了。做机器学习这么多年，这是第一个让我觉得“感动”的理论：**AI 不是神秘学炼丹，而是真正的科学**。

Jack 的报告中还有更多内容，现在中文网络上也已经有一些解读文章，例如 [@xxr3376](https://zhuanlan.zhihu.com/p/616903436), [@wangguan](https://mp.weixin.qq.com/s/hQmvltuMlClBonM6UJmtLg) 的解读。不过我不想定性地给出某种 “压缩即是智能” 这样模糊的描述，待我深入理解一些，能给出精确地数学描述之后再更新吧。

未完待续。

[NNCP]: https://bellard.org/nncp/
[MLSys-76]: https://www.youtube.com/watch?v=dO4TPJkeaaU
[arithmetic_coding]: https://en.wikipedia.org/wiki/Arithmetic_coding
[shannon1948]: https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf


