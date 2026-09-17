import { createClient } from '@supabase/supabase-js'

// 词库数据源（只读）。
// 默认值是原作者的公开只读词库；要换成自己的实例，在 .env.local 里设置
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY（见 .env.example）。
const DEFAULT_SUPABASE_URL = 'https://caftssprzybryhyvvxwi.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_RGNy0edI12QPXe2TyJjL2w_XEhYjBda'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
)

// 反馈表单默认关闭：访客填写的邮箱和内容不应该落到非本项目的数据库里。
// 配置了自己的 Supabase 后，设置 VITE_FEEDBACK_ENABLED=true 即可开启。
export const isFeedbackEnabled = import.meta.env.VITE_FEEDBACK_ENABLED === 'true'
