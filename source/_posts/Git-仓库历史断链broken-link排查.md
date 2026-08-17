---
title: Git 仓库历史断链 broken link 排查 和 意外回退然后 rebase
date: 2026-08-17 12:00:00
tags:
  - Git
categories:
  - Linux
excerpt: git fsck 报 broken link 和 missing commit，排查半天才发现是本地浅层 clone 留下的断链，fork 在 GitHub 上一直好好的，最后把缺失对象重新拉回来就修好了
---

# 起因

Android studio git ui 失效，跑了个 `git fsck --full`

```
broken link from  commit aef60727d67f351b5033ae616781aad6cb5e84d8
              to  commit efe217b22c7f177ba43a91acd7b1f29598991eea
missing commit efe217b22c7f177ba43a91acd7b1f29598991eea
```

后面还跟着一大堆 dangling blob / dangling commit

broken link + missing commit，意思就是某个 commit（aef60727）的父提交（efe217b2）没了

# 第一次尝试（都失败了）

先试 `git gc --prune=now`，想让 git 自己收拾：

```
error: Could not read efe217b22c7f177ba43a91acd7b1f29598991eea
fatal: Failed to traverse parents of commit aef60727d67f351b5033ae616781aad6cb5e84d8
fatal: failed to run repack
```

repack 卡在遍历那个坏 commit 的父提交上

然后想手动把那个对象删掉：

```powershell
Remove-Item .git\objects\ae\f60727... -Force
```

报找不到路径因为对象早就不在散落目录（loose object）里了，被打进了 pack 文件，`.git/objects/xx/` 下面根本没有这个文件~~而且手动删对象本来也不是正经做法~~

顺手想 `ls -a` 看下 .git 里的隐藏文件，PowerShell 直接报 `-a` 参数有歧义PowerShell 里要看隐藏文件得用 `ls -Force`

# 排查：这个坏 commit 到底挂没挂在历史里

关键是搞清楚 aef60727 是真的在我 master 历史深处，还是只是个没人引用的悬空对象

`git log --oneline -5` 是正常的，因为它只看最近 5 条但 `git log master` 走到底就报：

```
fatal: Failed to traverse parents of commit aef60727...
```

说明 aef60727 确实挂在历史里，它的父提交丢了，所以历史在它这里被截断

`git cat-file -p aef60727` 一看，这是个 GitHub 的合并提交（committer 是 `GitHub <noreply@github.com>`，还带 gpgsig），parent 指向那个丢了的 efe217b2距离 master 有 182 个 commit（`git rev-list --count aef60727..master`）

# 能不能从远程找回来

想着 GitHub 上万一还有，`git fetch origin` 一下fetch 是成功了，但那个缺失对象还是没回来定向拉一把试试：

```
git fetch origin efe217b22c7f177ba43a91acd7b1f29598991eea
fatal: bad object efe217b22c7f177ba43a91acd7b1f29598991eea
error: https://github.com/rD227/shizuku-ftp did not send all necessary objects
```

~~即 GitHub 上也没有了，截断是本地和远程一起早就存在的~~ 后来发现这个结论错了：`did not send all necessary objects` 不是"GitHub 没有这个对象"，而是 GitHub 不按裸 SHA 发对象，efe217b2 其实一直躺在 fork 里，坏的只有本地

# 修复：git replace --graft

先把断链封上，让 `git log` 这类遍历历史的命令能正常工作：

```bash
git replace --graft aef60727d67f351b5033ae616781aad6cb5e84d8
```

它告诉 git：把 aef60727 当成没有父提交的根 commit之后 `git log` 就能走到底了

不过 `git gc`、`git fsck` 还是报 broken link——因为它们读的是原始对象（repack 不认 replace 嫁接），而 aef60727 原始对象里那个坏 parent 指针还在

~~想根治只能重写历史（filter-branch）把坏提交永久改成根，再强推到 GitHub，代价是它之后 182 个 commit 的 SHA 全变~~ 这个结论也是错的，真正的根因和修法在下面

# 正确的根因 + 最终修复


## 根因：本地是浅层 clone 留下的断链

本地这份 clone 当初是浅层 clone（shallow clone），浅层 clone 会故意不拉"边界提交"的父对象，改用 `.git/shallow` 文件记下边界在哪

后来这个 `.git/shallow` 文件没了（shallow 状态被清掉），git 就不再知道 aef60727 是边界提交，把它当成普通提交，于是它指向的父对象 efe217b2 就成了"丢失的对象"，报 broken link

~~别问我为什么没了我也不知道~~

关键：这只是本地的问题。fork 在 GitHub 上一直是完整的 1706 个提交（**我这里告诉ai它才相信，但是我最开始说仓库里面有1706个提交它也不相信，觉得我是说的之前fork的父仓库，我看它思维链才知道**），efe217b2 一直都在，别人 clone 从来没问题

## 之前那个报错很误导人

`git fetch origin efe217b2` 报 `did not send all necessary objects`，当时以为是 GitHub 没有这个对象，其实不是——GitHub 不按裸 SHA 发对象（只按分支/标签发），所以按 SHA 拉会报这个错，哪怕对象明明就在仓库里

## 正确的修法

最省事：删掉本地坏 clone，重新 `git clone https://github.com/rD227/shizuku-ftp.git` 一份就全好了，fork 本来就完整

不想重新 clone 的话，本质就是把 efe217b2 连同它之前的整条历史（1522 个提交）重新弄回本地，再删掉嫁接：

~~但是这里太奇怪了，为什么莫名其妙坏掉了~~

~~按道理来说是可以本地只保存我的提交就可以了~~

**但是为了防止再出现这种问题，我本地现在也存满了历史了**

**但是其实是没必要的，应该并不会影响到别人clone仓库之类的**

```bash
git replace -d aef60727d67f351b5033ae616781aad6cb5e84d8   # 删掉嫁接，让 aef60727 认回真父提交
```

弄回来之后本地就恢复成 1706 个提交（1522 + 184）、`git fsck` 干净，全程不需要重写历史、不需要强推

# 总结

- `git fsck` 报 broken link + missing commit，就是某个 commit 的父对象丢了
- 要判断坏 commit 是不是真的挂在你历史里：`git log` 走到底会不会报错（`-5` 这种限条数的不算）
- 对象可能在 pack 文件里，`.git/objects/xx/` 手动删不到，也别手动删
- PowerShell 看隐藏文件用 `ls -Force`，不是 `ls -a`
- `git replace --graft` 能让 `git log` 等命令绕过断链，但救不了 gc/fsck
- 报 `did not send all necessary objects` 不一定是远程缺对象，可能只是 GitHub 不按裸 SHA 发，先查清楚远程到底有没有
- 根因是本地浅层 clone 留下的断链，fork 一直好的；重新 clone 最省事，不用重写历史、不用强推

# 然后乱翻一圈发现还是有历史遗留问题

>git远程和本地的记录看起来都回退成了我的电脑名称

是我在Androidstudio里面绑定了GitHub账号，所以直接推送有信息，但是最近git UI，因为那两个空提交出问题用不了了，就自动以我电脑的身份提交了

可以rebase 或者 git-filter-repo

```Bash
# 查看当前生效的用户名和邮箱
git config user.name
git config user.email

# 检查一下其他项目文件夹

git rebase -i HEAD~9

edit af18652 readme and father floder check
pick 1ef21c5 Fix ShizukuFile.isWritable
pick 3fbea42 Use app package and debug flag

#改为edit或者e

git commit --amend --author="rD227 <xxxxx@gmail.com>" --no-edit
git rebase --continue

git push --force
```

记得就是 每 commit --amend 一下 就 rebase --continue 一下

# 然后ai说还可以~~不过其实很快就弄完了，没必要~~

pip install git-filter-repo


PowerShell7

git filter-repo --commit-callback '
    if commit.author_name == b"xvsu":
        commit.author_name = b"rD227"
        commit.author_email = b"xxxxx@gmail.com"
    if commit.committer_name == b"xvsu":
        commit.committer_name = b"rD227"
        commit.committer_email = b"xxxxx@gmail.com"
' --force
