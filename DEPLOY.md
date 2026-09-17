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

## 部署链路（当前设置：Cloudflare 自动 + Actions 手动兜底）

| 场景 | 走哪条路 | 怎么触发 |
| --- | --- | --- |
| **日常推送** | **Cloudflare 自己的 Git 集成** | `git push` 到 `main`，约 40–75 秒 |
| **手动兜底 / 排查部署问题** | GitHub Actions 工作流 | 仓库 → Actions → **Deploy to Cloudflare Pages** → **Run workflow** |

这样安排之后，**push 时只有一条链路在跑**，不会再出现「两个部署在赛跑、谁后落地谁生效」的问题。

### 两边都必须配的环境变量（改数据源/开关时别漏）

| 变量 | 值 | 作用 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://bmddblhrrwxfbxvreirq.supabase.co` | 词库数据源 |
| `VITE_SUPABASE_ANON_KEY` | 自己的 anon key | 同上 |
| `NODE_VERSION` | `22` | Vite 7 要求 |
| `YARN_VERSION` | `1.22.22` | 仓库是 yarn v1 lockfile，不钉会撞 `YN0028` |
| `VITE_FEEDBACK_ENABLED` | `true` | 显示反馈表单；设为 `false` 或留空则隐藏 |

- **GitHub Actions 侧**：仓库 Settings → Secrets and variables → Actions → **Variables**
- **Cloudflare Git 构建侧**：Pages 项目 → Settings → **Environment variables**

> 这些是**构建期**变量（Vite 会内联进产物），两边都要配、改完都要重新构建才生效。

---

## ⚠️ 历史坑：为什么曾经白屏

Pages 项目**曾经同时开着两套部署**，而 CF 侧 `build_config` 是空的：

```
build_command: ""        destination_dir: ""        root_dir: ""
```

于是 CF 的 Git 构建**把仓库根目录当静态站发布**，首页引用的还是 `/src/main.tsx`，
浏览器拿到 `application/octet-stream` 拒绝执行 → `#root` 为空 → **整页白屏**。
Actions 那条是对的，两条交替生效 → 白页时有时无。

现已修复（配置见下表），并把 Actions 改成手动，从根上消除了赛跑。

正确的 `build_config`：

| 字段 | 值 |
| --- | --- |
| `build_command` | `yarn build` |
| `destination_dir` | `dist` |
| `root_dir` | （留空） |

**自查命令**：

```bash
# ① 最关键：首页必须引用 /assets/ 下的构建产物
curl -s https://learn.dfyx.click/ | grep -o 'assets/index-[^"]*\.js'

# ② 随机不存在的路径必须返回 404
curl -s -o /dev/null -w "%{http_code}\n" "https://learn.dfyx.click/no-such-path-$RANDOM"

# ③ 如果 ① 正常但 /src/main.tsx 仍是 200，先看 Age 头再下结论
curl -sI https://learn.dfyx.click/src/main.tsx | grep -iE 'age|cf-cache-status'
```

> ⚠️ **别只看 `/src/main.tsx` 的状态码**：破版期间这些仓库文件被 Cloudflare 按静态资源
> 缓存了（`Cache-Control: public, s-maxage=604800`，边缘 7 天）。即使部署已经修好，
> 缓存里的旧副本仍会返回 200 —— 响应头里带 `Age: >0` 就说明是旧缓存，**不是部署坏了**。
>
> 想立刻清掉：CF 控制台 → 你的域名 → **Caching → Configuration → Purge Everything**
> （清缓存只是让边缘回源重新拉，对 `wallpaper.dfyx.click` 那个站也无害）。
> 也可以用 API 定向清，但需要 token 有 `Zone → Cache Purge` 权限：
>
> ```bash
> curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
>   -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' \
>   --data '{"files":["https://learn.dfyx.click/src/main.tsx"]}'
> ```

---

## 关于那个 Cloudflare API Token

手动兜底工作流需要 `CLOUDFLARE_API_TOKEN`（权限：Account → Cloudflare Pages → **Edit**），
它存在仓库 Secrets 里。

**这个 token 曾经在聊天里明文出现过，建议轮换一次：**

1. CF 控制台 → My Profile → API Tokens → Create Custom Token（同样的 Pages:Edit 权限）
2. `gh secret set CLOUDFLARE_API_TOKEN --repo anonymous99-Rise/word-wind`（粘贴新 token）
3. 回控制台删掉旧 token

> 如果哪天不想要这个 token 了，把工作流文件删掉即可 —— CF 的 Git 集成完全不需要任何 token。

---

## 日常使用

改完代码直接：

```bash
git add -A && git commit -m "..." && git push
```

推送到 `main` 后，**Cloudflare 的 Git 集成**会自动构建 + 部署，约 40–75 秒。
需要重新部署时可以空提交一次（`git commit --allow-empty -m "redeploy"`），或在
**Actions** → **Deploy to Cloudflare Pages** → **Run workflow** 手动走兜底链路。

> Cloudflare 那边配的是 `path_includes: ["*"]`，所以**任何提交都会触发构建，包括只改文档**。
> 想省构建次数的话，可以在 Pages 项目的 Build 设置里把它改成只匹配相关路径。

> `dist/` 是**构建产物，已从版本控制移除**（在 `.gitignore` 里）。
> 两条部署链路都会在云端现场 `yarn build`，所以不需要也不应该把它提交进来。
> 本地想预览就自己 `yarn build`，产物不会污染提交记录。

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
| 反馈表单（`SettingsModal.tsx`） | 访客邮箱+内容写入原作者的 Supabase | ✅ **已改为写入自己的库**（表 `user_feedback`），并通过 `VITE_FEEDBACK_ENABLED=true` 开启 |
| Cloudflare Web Analytics（`index.html`） | 硬编码原作者的 beacon token | ✅ **已移除**脚本，改为 `VITE_CF_BEACON_TOKEN` 控制，留空则不加载任何统计脚本 |
| 词库数据（`src/utils/supabase.ts`） | 全部单词数据读自原作者的 Supabase 公开只读表 | ✅ **已迁移到自己的实例**（见下） |

### 词库数据（已迁移）

原来的 54356 条词条已完整迁移到自己的 Supabase 项目，站点不再依赖原作者：

| 项 | 值 |
| --- | --- |
| 项目 | `https://bmddblhrrwxfbxvreirq.supabase.co` |
| 表 | `chuzhong` 3223 / `gaozhong` 6008 / `cet4` 7508 / `cet6` 5651 / `kaoyan` 9602 / `toefl` 13477 / `sat` 8887 |
| 合计 | **54356 行**，逐表行数已与源库校验一致 |
| 权限 | 7 张表开启 RLS，只建了 `public read` 策略（anon 只读，不能改） |
| 索引 | 每张表都有 `(word)` 索引，供「全词库搜索」用 |

建表 SQL 在 `supabase/schema.sql`（已在控制台执行过）。

**两套构建都要配这两个变量**，否则会退回硬编码的旧库：

| 构建方 | 配置位置 |
| --- | --- |
| GitHub Actions | 仓库 Settings → Secrets and variables → Actions → **Variables**：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` |
| Cloudflare Git 构建 | Pages 项目 → Settings → Environment variables：同上两个（外加 `NODE_VERSION=22`、`YARN_VERSION=1.22.22`） |

> 这两个值是**构建期**注入的（Vite 会内联进产物），改完必须重新构建才生效。
> anon key 本来就是公开的（会打进前端包），放在 Variables 而不是 Secrets 是合适的；
> 真正的 `service_role` key 只在本地导入数据时用过，**绝不能进仓库或前端**。

### 反馈表的表名（容易踩）

`SettingsModal.tsx` 里写入的是 **`user_feedback`（下划线）**。
原作者用的是 `user-feedback`（连字符）——迁移时统一成了下划线，**改表名要两边同步**
（`schema.sql` 和 `SettingsModal.tsx`），否则提交会 404 失败。

反馈表的权限设计是**只写不读**：

| 角色 | INSERT | SELECT |
| --- | --- | --- |
| `anon`（前端用的 key） | ✅ 允许 | ❌ 读不到（返回 `[]`） |
| `service_role` | ✅ | ✅（只能在服务端用，别放进前端） |

看反馈只能去 Supabase 控制台 → Table Editor → `user_feedback`。

> 部署层面的构建期变量在 `.github/workflows/deploy-cloudflare-pages.yml` 的 Build 步骤里，
> 值来自仓库 **Settings → Secrets and variables → Actions → Variables**（变量名同上，留空即用默认）。

