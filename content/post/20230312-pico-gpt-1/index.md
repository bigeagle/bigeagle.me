---
title: "握着你的手训一个类GPT语言模型 (一)"
date: 2023-03-12 00:00:00
slug: pico-gpt-1
tags: ["gpt", "language-model", "torch"]
---

这段时间 ChatGPT 大有 AI 奇点将至的势头，它展现的各种能力也的确很惊人，让人忍不住想要复刻一个。不过我从来没搞过 NLP 相关领域，机缘巧合在 youtube 上看见 Andrew Karpathy 的视频 [Let's build GPT: from scratch, in code, spelled out][KarpathyYTB] ，非常详细地从零开始展示了如何实现一个 Decoder-Only 的 Transformer 语言模型。

原视频用的是 [TinyShakespeare](https://huggingface.co/datasets/tiny_shakespeare) 语料库，训完之后的语言模型可以鹦鹉学舌输出莎翁文风的文字。我周末花了几小时复现了一下原视频的工作，并把语料库换成《水浒传》《三体》之类的中文小说，也颇能像模像样地胡说八道一些东西出来。 Karpathy 有个开源项目叫 [NanoGPT][NanoGPT]，我这个小作业更小一些，就起名叫 [PicoGPT][PicoGPT] :)

{{<img class="center" src="threebody.png">}}

本文主要就是对原视频的简要概括，同时讲讲复现过程。

<!-- more -->

## 文字的向量化表示

Linus 有言: “烂程序员关心的是代码。好程序员关心的是数据结构和它们之间的关系。” 研究一个问题，先从研究对象的数据表示开始。假设 `input.txt` 是一份语料库，例如 [TinyShapespeare](https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt)，里面就是一个个英文字母和标点符号，因此可以我们可以搞一种最 Naïve 的数据表示: 字符序号表示。

```python
with open("input.txt") as f:
    text = f.read()
vocabulary = sorted(list(set(text)))
vocab_size = len(vocabulary)
char2idx = {c: idx for idx, c in enumerate(vocabulary)}
idx2char = {idx: c for idx, c in enumerate(vocabulary)}
```
在以上代码中，把语料库中的文字按字符去重、排序就得到了词汇表，这样每个字符就有了唯一序号。当我们想要表示一串文本的时候，直接每个文本查表得到一个序号表就行了，这个过程称为 tokenize。
```python
def tokenize(s: str) -> List[int]:
    return [char2idx(c) for c in s]
```

总之，经过 Tokenize 之后，一串文本就变成了一串整数组成的向量。更高级的 Tokenizer 原理其实也类似，只是编码效率更高、支持更大的词汇表、计算性能也更高，例如 OpenAI 的 [Tiktoken][tiktoken]。

## N-Gram 语言模型

给定一个词汇表，从概率角度考虑一个“语言”的建模。假设有一个胡说八道机器，如果它每次都从词汇表中均匀采样输出文本，显然它很容易输出无意义的乱码；但是如果它每次都能从一个“特定语言的概率分布”中完美地采样输出文本，那么每个样本看起来应该都是一段合理的文字。所以，一种简单的概率角度语言建模，就是每个字符的概率粉笔，以及在给定“前文”的情况下，后续字符的概率分布。

N-Gram 是一种经典的语言模型，不加公式地解释就是：“当前位置各字符的分布概率，和它之前的连续N个字符相关”。这样的分布在语料库中有大量的现成样本，写成代码很容易理解：
```python
end = torch.randint(len(text)-1)
context = text[end-N:end]
target = text[end+1]
print(f"when text is {context}, target is {target}")
```
任意取一段长度为N的文本 context 和它的后续字符 target，那么 `<context, target>` 就是 N-gram 模型的一个**样本**。基于深度学习的语言模型学习，就是从大量这样的样本中，尝试拟合出语言本身的概率分布，进而就可以使用采样方法，一本正经地胡说八道了。

## 词嵌入
前文提到，经过 Tokenize 之后，每一个字符都变成了一个整数，它的好处是连续、有序并且非常容易索引。但是我们尝尝希望字符的数学表示能有一些更高级的功能，例如:
* 字符的表示能通过简单的数学计算“连接”起来，表示一个“词”
* 不论一个“词”由多少字符组成，它都能在同一个空间内做计算，且计算结果也在同一个空间内
* 意思相近的词，在数学表示上也“近”

一种经典建模方法，就是从字符的整数索引为基础，查表得到一个向量，这样就很容易使用神经网络把一串字符向量处理成任意级别的向量。通过有监督学习的方式，很容易给这些向量赋予训练者想要的“功能”。这种“查表得到向量”的方式就成为**嵌入(Embedding)**，写成 torch 代码:

```python
embedding_table = torch.nn.Paramter(torch.randn((vocab_size, embed_size)))
idxes = tokenize("Some Text")
char_embedding = torch.index_select(embedding_table, dim=0)
```

## 最简示例

基于以上内容，就可以做一个最简单朴素的神经网络语言模型了:

```python
from torch import nn

class MinimumModel(nn.Module):

    def __init__(self, vocab_size: int, embedding_size: int = 128):
        super().__init__()
        self.embedding = nn.Embedding((vocab_size, embedding_size))
        self.fc_out = nn.Linear(embedding_size, vocab_size)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        # input: (batch_size, block_size), value ranges in [0, vocab_size)
        # output: (batch_size, block_size, vocab_size)
        token_emb = self.embedding(inputs)  # (batch_size, block_size, embedding_size)
        logits = self.fc_out(token_emb) # (batch_size, block_size, vocab_size)
        return logits

    def loss_fn(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # logits: (batch_size, block_size, vocab_size)
        # targets: (batch_size, block_size)
        return F.cross_entropy(logits, targets)

    def sample(self, max_size: int, start_token: int = 0) -> torch.Tensor:
        tokens = torch.tensor(start_token).reshape(1, -1)
        for _ in range(max_size):
            logits = self.forward(tokens)
            logit_next = logits[:, -1:, -1]
            prob = F.softmax(logit_next, dim=-1)
            token_next = torch.multinomial(prob, num_samples=-1)
            tokens = torch.cat([tokens, token_next], dim=1)
        return tokens[0]
```

上述代码搞了个只有两层的神经网络，`embedding` 完成前文提到的嵌入索引，`fc_out` 再把字符向量做一次变换，输出一个维度和字符表相等的向量。在采样(`sample`方法)时，神经网络每次输出的向量们我们只选最后一个，经过 `softmax` 归一化成一个概率分布，就认为它是 “下一个字符的概率分布” 了，从该分布中采样，就得到了下一个字符；把生成的字符和输入拼在一起，再次交给神经网络就完成了下一次推理。从一个种子开始，循环不断地推理、采样，一个胡说八道机器就做好了。

由于这个胡说八道机未经任何训练，所以它只会随机输出文本，因此需要从语料库中选取大量的成对样本 `<context, target>`，先把 `context` 输入网络，得到输出 `logits`，再调用 `loss_fn` 评价它和 `target` 的距离，使用优化器让 `loss` 越来越小，那么网络的输出就会逐渐地和 `target` 接近，渐渐地就会一本正经地胡说八道了。

## 小结
至此，我们建立了一个最简单的胡说八道机，基本上对应 Karpathy [视频][KarpathyYTB] 中前40分钟的内容。在这个最简模型中几乎只有一个“变换”步骤 (`fc_out`)，视频的后续内容介绍了 Transformer 结构，使用更复杂的计算从字符向量中提取有效信息，进而对语言做更准确地建模。

未完待续……

[KarpathyYTB]: https://www.youtube.com/watch?v=kCc8FmEb1nY
[NanoGPT]: https://github.com/karpathy/nanoGPT
[PicoGPT]: https://github.com/bigeagle/picoGPT
[tiktoken]: https://github.com/openai/tiktoken
