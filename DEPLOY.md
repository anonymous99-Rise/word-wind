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

## 第三方依赖与数据归属

站点里原本有三处指向**原作者**的资源，目前状态：

| 位置 | 原状态 | 现状态 |
| --- | --- | --- |
| 反馈表单（`SettingsModal.tsx`） | 访客邮箱+内容写入原作者的 Supabase | ✅ **已默认关闭**，面板里不显示该表单；要开启需配自己的 Supabase 并设 `VITE_FEEDBACK_ENABLED=true` |
| Cloudflare Web Analytics（`index.html`） | 硬编码原作者的 beacon token | ✅ **已移除**脚本，改为 `VITE_CF_BEACON_TOKEN` 控制，留空则不加载任何统计脚本 |
| 词库数据（`src/utils/supabase.ts`） | 全部单词数据读自原作者的 Supabase 公开只读表 | ⚠️ **仍在使用**（见下） |

### 关于词库数据

站点取词、释义、例句、搜索、总数全部走 Supabase 的 REST 接口，读的是原作者的公开只读表：

- 规模：7 张表（chuzhong / gaozhong / cet4 / cet6 / kaoyan / toefl / sat），共 **54,356 条**，原始约 **66 MB**，gzip 后约 **20 MB**
- 性质：这些是 `KyleBing/english-vocabulary` 的**公开词库**，anonym key 本就是设计成公开的，不涉及访客隐私
- 风险：**依赖别人的项目**——原作者一旦关库、改 schema 或限流，站点就取不到词

换自己的数据源有三种做法，通过 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 切换（见 `.env.example`）：

1. **自建 Supabase**（最省事）：新建项目 → 按同样 schema 导入 7 张表 → 把 URL 和 publishable key 填进仓库变量
2. **打包成静态 JSON**（最独立、零后端）：把 54k 条导出为按词库切分的 JSON 放进 `public/data/`，切词库时懒加载。缺点是最大的 toefl 约 17 MB（gzip 约 5 MB），首次切换该词库要下载
3. **保持现状**：能用，但依赖对方

> 部署层面的构建期变量在 `.github/workflows/deploy-cloudflare-pages.yml` 的 Build 步骤里，
> 值来自仓库 **Settings → Secrets and variables → Actions → Variables**（变量名同上，留空即用默认）。

