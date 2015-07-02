---
layout: post
title: "Scala 自定义控制结构"
date: 2012-09-24 16:44
comments: true
tags: [scala, programming]
---
写了两年Python了想换换口味，正好在coursera上参加[Functional Programming Principles in Scala](http://daily-scala.blogspot.com/)课程，考虑到[Scala](http://en.wikipedia.org/wiki/Scala_(programming_language))那一大票很诱人的特性就学Scala吧～ <span style="color:#5989e0">//golang 我对不起你... ...</span>

话说Scala被定义为 _**Sca**lable **La**nguage_ ,其实解释一下不就是可以扩展自己的语法么，作为Pythoner感觉这种事情一点也不算稀奇，然而当我真的看/用到这种特性的时候的确感觉惊叹，这不是静态或动态语言的区别，这是函数式与非函数式语言的区别。

虽然Python支持函数式的风格，但其编程思想终究是指令式为主的，所以有一些函数式特性并不能被真正发挥出来。

在 _Programming in Scala_ 的第14章讲到 _断言与测试_ ，其中给出一个关于测试的例子:

```scala
class ElementSuite extends FunSuite {
    test("elem result should have passed width") {
        val ele = elem('x', 2, 3) 
        assert(ele.width == 2)
    }    
}
```
<!--more-->

这其中的`test`并不是一个内建的的关键字，它是被自定义出来的，在常见的语言中，这样的功能被定义为一个函数，例如如果这段代码用javascript来写的话那么大概会长这样 <span style="color:#5989e0">/\* 原想用python写可惜lambda不支持多行 \*/</span>:

```javascript
function element_suite(){
    ele = elem('x', 2, 3);
    test( 'elem result should have passed width', function(){
        var ele = elem('x', 2, 3);
        assert( ele.width == 2 );  // javascript并没有内建的assert，这里只是意思一下
    })
}
```
也就是说在其他的支持函数式特性的语言中，同样的功能是可以被足够优雅的实现的，但是这个`test`并没有被扩展到语法中，多少令人感觉不够酷。

Scala提供了一颗很甜的语法糖，就是如果一个方法只有一个参数，那么可以把`()`替换为`{}`，例如 `println("Hello World")` 和 `println{"Hello World"}` 是等价的，但是多于一个参数的方法就不能这么用了。不过我们可以定义一个匿名函数，把语句封装到函数中，再将这个函数作为参数传入。例如:

```scala
def foo( bar: () => Unit ) = {
    bar()
}
foo{ () => { 
            println("hello world!") 
            printlin("hello world, again!") 
   }
}

```

现在的`foo`长得有点像控制符了，但是还是不太爽，因为 `() => {}` 暴露了匿名函数的存在，事实上这点语法也比较多余，然而scala提供了一块很甜的语法糖: _by-name parameter_ 。我们稍稍改写一下上面那段代码:

```scala
def foo2( bar: => Unit ) = {
    bar
}
foo2{ 
    println("hello world!") 
    printlin("hello world, again!") 
}

```

这里并没有指定`bar`是一个函数，而是使用了 _call-by-name_ 的一种求值策略( Evaluation Strategy )，也就是说参数被传入后再进行求值，于是`bar`被求值的过程中那两条println语句也被执行。

现在看看上面那段代码跟第一段代码中的`test`还是有区别，因为事实上`test`接受了两个参数，而上文说到使用`{}`代替`()`仅对单个参数有效，那么多个参数怎么办？ 于是我们需要用到函数式编程的大杀器: [currying](http://en.wikipedia.org/wiki/Currying)。

> currying is the technique of transforming a function that takes multiple arguments (or an n-tuple of arguments) in such a way that it can be called as a chain of functions each with a single argument
> -- Wikipedia

Currying就是将一个带多个参数的函数转化为一系列带一个参数的函数链，用数学公式表达即是 若有函数$f(x,y)$， 令$g=f(x,\cdot)$ 那么 $g(y)$ 等价于 $f(x,y)$，显然这里的 $g(\cdot)$ 是一个二阶函数。在scala中，我们可以使用currying扩展上一段代码:

```scala
def foo3(message: String)(bar: => Unit ) = {
    println(message)
    bar
}
foo3("I will say hello world~ "){ 
    println("hello world!") 
    printlin("hello world, again!") 
}

```

这里`foo3`是一个二阶函数，`foo3("baz")`才是一个`(bar: =>Unit)Unit`型的一阶函数，现在就完美的仿真了一个控制符，至少从外表看我们成功地扩展了Scala的语法。当然事实上我们并没有扩展，只是改了一个面貌，但不得不说这颗语法糖真的很甜。
