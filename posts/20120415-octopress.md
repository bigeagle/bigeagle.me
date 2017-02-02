---
layout: post
title: "迁移到Octopress"
date: 2012-04-15 04:00
comments: true
tags: web
---

如题～  迁移工作比较顺利，使用[这里](http://blog.fangjian.me/posts/2011/12/18/migrate-wordpress-to-octopress/) 提供的方法就好。

Disqus评论的导出花了一些心思，因为wordpress的disqus插件默认设定的`disqus_identifier`是形如`123 http://example.org/?p=123`这样的，`123`是 wordpress 文章 id ，这样的话即使最后给每个文章的链接都一样也不能正确显示评论。

解决的方法是修改`source/_includes/disqus.html`，把`disqus_identifier`那里改成:

{% raw %}
    var disqus_identifier = '{% if page.dq_id %}{{page.dq_id}}{% else %}{% if page.wordpress_id %}{{page.wordpress_id}} {{site.url}}/?p={{page.wordpress_id}}{% else %}{{ site.url }}{{ page.url }}{% endif %}{% endif %}';
{% endraw %}

我使用的wordpress导出脚本里为每个post都加入了`wordpress_id`属性，嘛，没有也没关系，换域名也没关系，自己添加一个`dq_id`属性就是了。

对markdown的解析引擎我是用了`kramdown`，主要是这货支持`MathJax`，这样就可以有一些公式，例如 $\LaTeX$ 。

当然也要有一点点折腾，跟着 [这里](http://chen.yanping.me/cn/blog/2012/03/10/octopress-with-latex/) 做就好啦。

剩下的例如改改主题什么的，我基本是follow了[这篇文章](http://melandri.net/2012/02/14/octopress-theme-customization/)，又用了一下 [slash](http://zespia.tw/Octopress-Theme-Slash/) 中的社交网站链接和 `fancybox` 插件，看起来比较舒服了，以后还要常折腾。
