# 部署到 Cloudflare Pages（GitHub Actions）

本仓库已内置工作流 [`.github/workflows/deploy-cloudflare-pages.yml`](.github/workflows/deploy-cloudflare-pages.yml)：
推送到 `main` 时自动 `yarn build`，然后把 `dist/` 发布到 Cloudflare Pages。

## 当前状态

| 项 | 值 |
| --- | --- |
| 线上地址 | **https://word-wind-study.pages.dev** |
| Pages 项目名 | `word-wind-study` |
| 生产分支 | `main` |
| 仓库 Secret | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（已配置） |
| 仓库 Variable | `CLOUDFLARE_PAGES_PROJECT` = `word-wind-study` |

> 项目名全局唯一，原作者的 `word-wind` 已被占用，所以用了 `word-wind-study`。
> **改项目名**：先在 Pages 控制台新建项目，再改仓库 Variable `CLOUDFLARE_PAGES_PROJECT`，
> 最后把 `README.md` 里 2 处地址同步改掉（第 7 行、第 35 行）。

---

## 日常使用

改完代码直接：

```bash
git add -A && git commit -m "..." && git push
```

工作流自动构建 + 部署，约 1 分钟。也可以在仓库 **Actions** → **Deploy to Cloudflare Pages** → **Run workflow** 手动触发。
只改 `*.md` 的提交不会触发部署（工作流里配了 `paths-ignore`）。

---

## 凭据配置（重装或换账号时看这里）

### 1. Account ID

Cloudflare 控制台 → 右侧栏 **Account ID**。

### 2. API Token

控制台右上角头像 → **My Profile** → **API Tokens** → **Create Custom Token**：

- Permissions：
  - `Account` → `Cloudflare Pages` → **Edit** ← **必需**，只有 Read 会报 `Authentication error [code: 10000]`
  - `Account` → `Account Settings` → **Read**（可选）
- Account Resources：`Include` → 你的账号
- 创建后立刻复制（只显示一次）

### 3. 写进仓库

仓库 → **Settings** → **Secrets and variables** → **Actions**：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 上一步的 token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 第 1 步的 Account ID |
| Variable（可选） | `CLOUDFLARE_PAGES_PROJECT` | 项目名，默认 `word-wind-study` |

命令行等价操作：

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo anonymous99-Rise/word-wind
gh secret set CLOUDFLARE_ACCOUNT_ID  --repo anonymous99-Rise/word-wind
gh variable set CLOUDFLARE_PAGES_PROJECT --repo anonymous99-Rise/word-wind --body "word-wind-study"
```

工作流第一步会校验这两个 Secret，缺了会立刻失败并在 Summary 里写明缺哪个，不会白跑构建。

---

## 工作流做了什么

1. 校验 Cloudflare 凭据是否齐全
2. `actions/setup-node@v5`（Node 22，带 yarn 缓存）→ `yarn install --frozen-lockfile`
3. `yarn build`（`tsc -b && vite build`）产出 `dist/`
4. 查 Pages 项目是否存在，不存在则用 `wrangler pages project create` 创建
5. `wrangler pages deploy dist --project-name=<项目名> --branch=main`

---

## 备选方案：控制台 Git 集成

不想用 API Token 的话：Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**，
选 `anonymous99-Rise/word-wind`，构建配置：

| 项 | 值 |
| --- | --- |
| Build command | `yarn build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION` = `22` |

CF 侧自带 Git 集成，push 自动部署，不需要任何 GitHub Secret。
**两条路选一条即可**，同时开会部署两次。

---

## 关于项目里第三方账号的说明

以下两处仍指向**原作者**的账号，不影响本站部署，但建议知悉：

- `src/utils/supabase.ts`：反馈表单写入的是原作者的 Supabase 项目（`caftssprzybryhyvvxwi.supabase.co`）。
  妹妹的站要收集反馈的话，需自建 Supabase 项目并替换这里的 URL 与 publishable key。
- `index.html` 底部：Cloudflare Web Analytics 的 token 也属于原作者账号（统计数据会记到他那边）。可以删掉，或换成自己账号的 token。
