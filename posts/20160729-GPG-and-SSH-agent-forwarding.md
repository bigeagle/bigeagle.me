title: GPG 与 SSH Agent 转发
date: 2016-07-29 17:52:14
tags: [linux, yubikey, gpg]
---

我一直有这样的问题，当我 SSH 到某个远程主机时，就很难进一步进行 SSH 和 GPG 相关操作，因为远端没有我的私钥，如果直接把私钥拷贝到远程，则非常不安全。
自从有了[yubikey](/2016/02/yubikey-4/)之后，这个问题更加严重：私钥在 yubikey 里，根本不可能“拷贝到远程”。

过去我的一些做法是使用 [usbip](http://usbip.sourceforge.net/)，相当于把 yubikey “挂载”到远程的机器上，这个太 hacky 了，并且配置麻烦，不灵活。

直到我发现了 SSH 已经可以转发 UNIX Domain Socket。

<!-- more -->

首先 SSH Agent 的转发非常简单，只要你使用 SSH Agent 保存密钥，那么用 `ssh -A` 连接主机，或者在 `~/.ssh/config` 里写上 `ForwardAgent yes` 即可。

GPG Agent 的转发相对麻烦一些，版本要求是: OpenSSH >6.7 以及 GnuPG >2.1 。

首先，本地的 GPG Agent 要加上 `--extra-socket` 选项，用于 SSH 转发。文档的解释是：

> --extra-socket name
>
>   Also listen on native gpg-agent connections on the given socket. The
> intended use for this extra socket is to setup a Unix domain socket
> forwarding from a remote machine to this socket on the local machine. A gpg
> running on the remote machine may then connect to the local gpg-agent and
> use its private keys. This allows to decrypt or sign data on a remote
> machine without exposing the private keys to the remote machine. 

一般在 `~/.gnupg/gpg-agent.conf` 里加上 `extra-socket /path/to/extra/socket` 就好。

然后使用 SSH Remote Forwarding 将远端 socket 转发到本地，也就是让 SSH 在把远程主机的一个 unix socket 转发到本地 GPG Agent 监听的 extra socket 上即可。
这里需要注意几点: 
1. [GPG 2.1](https://www.gnupg.org/faq/whats-new-in-2.1.html) 之后，不再使用 `GPG_AGENT_INFO` 环境变量，而是一定会连接 `$GNUPGHOME/S.gpg-agent` (一般是 `~/.gnupg/S.gpg-agent`)。
2. [GPG 2.1.13](https://lists.gnupg.org/pipermail/gnupg-announce/2016q2/000390.html) 之后，如果存在 `/run/user/$UID/gnupg` 目录，
   则会把 gpg-agent 的 socket 放过去，如果不存在，则 fallback 到 `$GNUPGHOME` 里。
3. 如果远端已经跑着一个 gpg-agent 了，就需要先关掉，否则 ssh 就无法监听需要转发的 socket 了

所以，使用以下命令进行 SSH 连接，才能成功转发 gpg agent

```bash
ssh -R /run/user/REMOTE_UID/gnupg/S.gpg-agent:/path/to/S.gpg-agent.extra \
    -o StreamLocalBindUnlink=yes user@example.com
```
这里的 `StreamLocalBindUnlink` 是让 ssh 连接断开的时候，把远端监听的 socket unlink 掉，不然下次连接就会转发失败了。

这个参数比较长，很麻烦，所以也可以在 `~/.ssh/config` 里加上

```
StreamLocalBindUnlink yes
RemoteForward /run/user/REMOTE_UID/gnupg/S.gpg-agent /path/to/S.gpg-agent.extra
```

亲测，在使用 yubikey 的情况下，远程主机可以正常进行签名、解密等操作，但是`gpg --card-edit`是被禁止的。

p.s. 测试的时候，确保远端没有 gpg-agent 在运行，执行一下 `gpg-connect-agent /bye`，
如果提示说 `no running gpg-agent - starting '/usr/bin/gpg-agent'` 就说明转发失败了。

以上。

