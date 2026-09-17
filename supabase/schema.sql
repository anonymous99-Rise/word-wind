-- Word Wind 词库表结构
-- 用法：Supabase 控制台 → SQL Editor → 新建查询 → 整段粘贴 → Run（只需执行一次）
-- 说明：前端用 publishable/anon key 只读；service_role 绕过 RLS，用于批量导入数据。

-- ── 7 张词库表 ────────────────────────────────────────────────
-- 初中
create table if not exists public.chuzhong (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);
-- 高中
create table if not exists public.gaozhong (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);
-- 四级
create table if not exists public.cet4 (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);
-- 六级
create table if not exists public.cet6 (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);
-- 考研
create table if not exists public.kaoyan (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);
-- 托福
create table if not exists public.toefl (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);
-- SAT
create table if not exists public.sat (
  id integer primary key,
  word text not null,
  us text,
  uk text,
  translations jsonb not null default '[]'::jsonb,
  phrases jsonb not null default '[]'::jsonb,
  sentences jsonb not null default '[]'::jsonb
);

-- ── 按单词搜索的索引（前端「全词库搜索」用得到）────────────────
create index if not exists chuzhong_word_idx on public.chuzhong (word);
create index if not exists gaozhong_word_idx on public.gaozhong (word);
create index if not exists cet4_word_idx     on public.cet4     (word);
create index if not exists cet6_word_idx     on public.cet6     (word);
create index if not exists kaoyan_word_idx   on public.kaoyan   (word);
create index if not exists toefl_word_idx    on public.toefl    (word);
create index if not exists sat_word_idx      on public.sat      (word);

-- ── 行级安全：只开放匿名读 ────────────────────────────────────
alter table public.chuzhong enable row level security;
alter table public.gaozhong enable row level security;
alter table public.cet4     enable row level security;
alter table public.cet6     enable row level security;
alter table public.kaoyan   enable row level security;
alter table public.toefl    enable row level security;
alter table public.sat      enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['chuzhong','gaozhong','cet4','cet6','kaoyan','toefl','sat']
  loop
    execute format(
      'drop policy if exists "public read" on public.%I', t
    );
    execute format(
      'create policy "public read" on public.%I for select to anon, authenticated using (true)', t
    );
  end loop;
end $$;

-- ── 反馈表（可选）：只有把 VITE_FEEDBACK_ENABLED 设为 true 才会用到 ──
create table if not exists public.user_feedback (
  id bigserial primary key,
  email text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

-- 匿名用户只能提交，不能读取别人的反馈
drop policy if exists "anon can insert feedback" on public.user_feedback;
create policy "anon can insert feedback" on public.user_feedback
  for insert to anon, authenticated with check (true);
