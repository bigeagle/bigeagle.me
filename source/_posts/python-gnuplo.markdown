---
layout: post
title: 'Python 调用gnuplot的例子'
date: 2010-11-26
wordpress_id: 16
permalink: python-gnuplo
comments: true
tags: [python, programming]
---
最近和lvzongting一块儿做一些仿真，不想用matlab了，原因有：

* 商业软件，用破解版毕竟不好
* 难以实现分布式计算和并行计算
* 太慢
考虑之下决定用可爱的Python，因为


* God,it's so simple!
* 完善的类库，数学功能不亚于matlab
* 比matlab通用，再也不需要“一切都是矩阵”了
* 灵活
* 自由，开源

为了实现 网络变型的仿真，先做一个框架，也算为python练练手

```python
#!/usr/bin/env python
import numpy
import Gnuplot, Gnuplot.funcutils
import matplotlib.pyplot as pl
import time
import sys

def lzt_1(num,x):

    x=numpy.random.randint(0,100,[num,2])

    return x

def lzt(num,x):               #all the array of x
 
    xx=numpy.random.randint(-1,2,[num,2])
    #print xx
    x=x+xx
    
    return x

if __name__=='__main__':
    #the part of init #
    g = Gnuplot.Gnuplot(debug=1) #init of gnuplot

    #print sys.argv[1]
    step=10                      #default step is 10
    if len(sys.argv) > 1:
        step=int(sys.argv[1])    #first argv is step of simulation
    num=100                      #default num is 100
    if len(sys.argv) > 2:      
        num=int(sys.argv[2])     #second argv is step of simulation
    range_x_min=[-10,-10]
    range_x_max=[110,110]        #rang of simulation default is 100*100
    x=numpy.random.randint(0,100,[num,2])       #print x

    for i in range(0,step):      
        print i
        #the part of iterative #
        x=lzt(num,x)             #the function of controling the node
        #the part of plot #
        y=x.tolist()             #change to list in order to plot
        y.append(range_x_min)    #add de range point
        y.append(range_x_max)
        g.plot(y)                #point
        #raw_input('Please press return to continue...\n')
        time.sleep(0.1)
```

就是这样，程序没有什么实际意义，也没啥算法，几个类库的调用，一个仿真的框架而已。
