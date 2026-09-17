# 部署到 Cloudflare Pages（GitHub Actions）

本仓库已内置工作流 [`.github/workflows/deploy-cloudflare-pages.yml`](.github/workflows/deploy-cloudflare-pages.yml)：
推送到 `main` 时自动 `yarn build`，然后把 `dist/` 发布到 Cloudflare Pages。

> 部署后的网址是 `https://<项目名>.pages.dev`。
> **项目名全局唯一**，原作者的 `word-wind` 已被占用，所以本仓库默认用 `word-wind-study`。

---

## 一、准备两个 Cloudflare 参数

### 1. Account ID

Cloudflare 控制台 → 右侧栏 **Account ID**（或 Workers & Pages → 概览页右下角），复制备用。

### 2. API Token

控制台右上角头像 → **My Profile** → **API Tokens** → **Create Token** → 选 **Custom token**：

- Permissions：
  - `Account` → `Cloudflare Pages` → **Edit**
  - `Account` → `Account Settings` → **Read**（用于读取 Account ID，可选）
- Account Resources：`Include` → 你的账号
- 创建后**立刻复制** token（只显示一次）

---

## 二、把参数写进 GitHub 仓库

仓库 → **Settings** → **Secrets and variables** → **Actions**：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 上一步的 token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 上一步的 Account ID |
| Variable（可选） | `CLOUDFLARE_PAGES_PROJECT` | 你想用的项目名，例如 `word-wind-study` |

> 不设 `CLOUDFLARE_PAGES_PROJECT` 时会用工作流里的默认值 `word-wind-study`。
> 要换名字只改这一个变量即可，不用改代码。

命令行等价操作：

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo anonymous99-Rise/word-wind
gh secret set CLOUDFLARE_ACCOUNT_ID  --repo anonymous99-Rise/word-wind
gh variable set CLOUDFLARE_PAGES_PROJECT --repo anonymous99-Rise/word-wind --body "word-wind-study"
```

---

## 三、触发部署

推送到 `main` 即自动触发；也可以在仓库 **Actions** → **Deploy to Cloudflare Pages** → **Run workflow** 手动触发。

工作流会自动创建 Pages 项目（已存在则跳过），然后执行：

```
wrangler pages deploy dist --project-name=<项目名> --branch=main
```

跑完后 Actions 运行摘要里会给出 `https://<项目名>.pages.dev`。

---

## 四、部署完成后的收尾

- [ ] 把 `README.md` 里 2 处 `https://word-wind.pages.dev` 换成你自己的 `https://<项目名>.pages.dev`
      （第 7 行「在线体验」、第 35 行「打开 Word Wind 在线版」）
- [ ] 如需绑定自有域名：Cloudflare Pages → 项目 → **Custom domains** → 添加

---

## 备选方案：不用工作流，走控制台直连

不想配 API Token 的话，Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**，
选 `anonymous99-Rise/word-wind`，构建设置填：

| 项 | 值 |
| --- | --- |
| Framework preset | None（或 Vite） |
| Build command | `yarn build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION` = `22` |

之后 CF 侧自带 Git 集成，每次 push 自动部署，不需要任何 GitHub Secret。
（两条路选一条即可，同时开会产生两次部署。）

---

## 关于项目里第三方账号的说明

以下两处目前仍指向**原作者**的账号，与本仓库部署无关，但建议知悉：

- `src/utils/supabase.ts`：反馈表单写入的是原作者的 Supabase 项目
  （`caftssprzybryhyvvxwi.supabase.co`）。妹妹的站如果要收集反馈，需要自建一个 Supabase 项目并替换这里的 URL 与 publishable key。
- `index.html` 底部：Cloudflare Web Analytics 的 token 也属于原作者账号（数据会记到他那边）。可以删掉，或换成自己账号的 token。
