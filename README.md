# Vault Base

Vault Base is a bidirectional WebDAV sync plugin for Obsidian. Use a NAS or self-hosted WebDAV server as the central store and keep desktop and mobile clients in sync.

Vault Base（项目名 `vault-base-plugin`）是面向 Obsidian 的双向 WebDAV 同步插件，同时兼容桌面端与移动端。适合以 NAS WebDAV 作为中央仓库，在多端之间同步。

## Features

- Three-way compare: local, remote, and last successful sync state
- Bidirectional sync, delete propagation, smart merge, and conflict strategies
- Startup sync, scheduled sync, and realtime sync
- Optional client-side encryption
- Remote directory picker and status bar progress
- Concurrency, rate limits, and large-file handling

## 功能

- 三方比较：本地、远端、上次成功记录
- 双向同步、删除传播、智能合并与冲突策略
- 启动同步、定时同步、实时同步
- 可选客户端加密
- 远程目录选择、状态栏进度
- 并发、速率与大文件限制

## Setup

1. Open **Settings → Community plugins → Vault Base**.
2. Enter your WebDAV server URL, account, and password.
3. Click **Check connection**, then choose a remote directory.
4. Run a manual sync or enable startup, scheduled, or realtime sync.

Back up your vault and test with a separate remote folder before syncing production data.

## 开发

```bash
npm install
npm run check
npm test
npm run dev
```

单元测试依赖 [Bun](https://bun.sh)。未安装时仍可进行类型检查与生产构建。

开发构建会写入 `dist/`，并同步复制到 `release/`。把 `release/` 里的 `main.js`、`manifest.json`、`styles.css` 放到测试库的 `.obsidian/plugins/vault-base/`，然后在 Obsidian 中启用插件。

## Build and release

Local artifacts:

```bash
npm run package
```

Obsidian store files land in `release/`: `main.js`, `manifest.json`, and `styles.css`.

To publish a version, bump first, then commit, tag, and push. The Git tag must match `manifest.json` exactly, with no `v` prefix. Pushing that tag runs GitHub Actions, which creates the GitHub Release the community directory downloads.

## 构建与发布

本地产物：

```bash
npm run package
```

Obsidian 商店产物在 `release/`：`main.js`、`manifest.json`、`styles.css`。

发新版本按下面做：**先改版本，再提交，再打 tag，再推送**。Git 标签必须与 `manifest.json` 版本完全一致，且不要加 `v` 前缀。把 tag 推到 GitHub 后，Actions 会自动建 Release；已经上架的插件不用再往商店提一次。

### 1. 改版本和说明

在 `CHANGELOG.md` 顶部加一节，标题里必须带目标版本号（Actions 靠它抽 Release notes）：

```markdown
## Vault Base v0.2.3 - 2026-08-19

- Prevented an empty new local vault from wiping an existing remote repository.
```

然后 bump 版本文件（把 `0.2.3` 换成实际版本）：

```bash
npm version 0.2.3 --no-git-tag-version
npm run ver
```

`npm run ver` 会同步 `manifest.json`、`versions.json`、`src/consts.ts`。核对这四处都是同一版本后再继续。

### 2. 提交、打 tag、推送

先提交全部改动，再打**注释 tag**，最后推分支和 tag。不要用 `v0.2.3`。

```bash
git add -A
git commit -m "Prevent empty local vault from wiping remote files."
git tag -a 0.2.3 -m "0.2.3"
git push origin main
git push origin 0.2.3
```

`origin` 会同时推 GitHub 和 Gitea。商店只认 GitHub：https://github.com/zinkiv/vault-base-plugin

### 3. 确认 Release

打开仓库的 Actions，等 **Release Plugin** 成功。完成后应出现：

https://github.com/zinkiv/vault-base-plugin/releases/tag/0.2.3

Release 资源里要有单独的 `main.js`、`manifest.json`、`styles.css`（不能只在 source zip 里）。

### 4. 商店怎么更新

| 情况 | 做什么 |
| --- | --- |
| 已经在 [community.obsidian.md](https://community.obsidian.md) 上架 | 不用再提交。用户端会按 GitHub 上最新 `manifest.json` 的 version，去对应 tag 的 Release 下载。 |
| 还没过审 / 第一次上架 | 用 Obsidian 账号登录社区站，绑定 GitHub `zinkiv`，仓库填 `https://github.com/zinkiv/vault-base-plugin`（不要带 `.git`），提交后按 Scorecard 改。 |

扫描可能要几小时。本机可在「第三方插件」里刷新，或用 [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) 先装 GitHub 上的新版本。

## Sync notes

- Conflicts default to smart merge. When merge is not possible, choose newest version, keep local, keep remote, or skip.
- `.obsidian`, `.git`, `.trash`, and similar paths are excluded by default. Use include rules to allow specific config files.
- WebDAV passwords are stored in the Obsidian secret storage.

## 同步说明

- 冲突默认走智能合并；无法合并的文件可选择最新版本、保留本地、保留远端或跳过。
- 默认排除 `.obsidian`、`.git`、`.trash` 等路径；可用包含规则单独放行配置文件。
- WebDAV 密码保存在 Obsidian 密钥链中。
- 首次使用前请备份 vault，并先用独立测试目录验证服务器兼容性。

## License and attribution

This project is based on [Obsidian WebDAV Sync](https://github.com/hesprs/obsidian-webdav-sync) and [Nutstore Sync](https://github.com/nutstore/obsidian-nutstore-sync), and is released under the GNU Affero General Public License v3.0. See [NOTICE](NOTICE) for attribution and [LICENSE](LICENSE) for the full terms.

## 许可证与来源

本项目基于 [Obsidian WebDAV Sync](https://github.com/hesprs/obsidian-webdav-sync) 与 [Nutstore Sync](https://github.com/nutstore/obsidian-nutstore-sync)，按 GNU Affero General Public License v3.0 发布。归属与修改说明见 [NOTICE](NOTICE)，完整条款见 [LICENSE](LICENSE)。
