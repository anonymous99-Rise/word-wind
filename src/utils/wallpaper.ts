/**
 * 在线壁纸数据源：https://wallpaper-daily-three.vercel.app
 * 接口 GET /api/random 返回 { date, category, title, url }
 * 该接口带 Access-Control-Allow-Origin: *，浏览器可以直接 fetch。
 * 注意：category 参数目前不会真正过滤（实测传 desktop/mobile 都返回随机分类），
 * 所以只使用无参数的随机接口，由用户点「换一张」刷新。
 */

export interface Wallpaper {
  date: string
  category: string
  title: string
  url: string
}

/** 背景设置：在线壁纸 或 纯色渐变 */
export type BackgroundSetting =
  | { kind: 'wallpaper'; url: string; title: string; date: string }
  | { kind: 'gradient'; index: number }

const API_BASE = 'https://wallpaper-daily-three.vercel.app'
const TIMEOUT_MS = 9000

// 优先走同源的 Pages Function 代理（Cloudflare 边缘能连上 Vercel，国内浏览器不一定），
// 代理不可用时再退回直连接口。
const ENDPOINTS = ['/api/wallpaper', `${API_BASE}/api/random`]

async function requestWallpaper(endpoint: string): Promise<Wallpaper | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      // 每次都想要新图，绕过 HTTP 缓存
      cache: 'no-store'
    })
    if (!res.ok) return null

    const data = (await res.json()) as Partial<Wallpaper> | null
    if (!data || typeof data.url !== 'string' || !data.url) return null

    return {
      date: typeof data.date === 'string' ? data.date : '',
      category: typeof data.category === 'string' ? data.category : '',
      title: typeof data.title === 'string' ? data.title : '',
      url: data.url
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 随机取一张壁纸。失败返回 null，由调用方回退到渐变背景。
 * 网络失败 / 接口 502 / JSON 解析失败都不该影响背单词。
 */
export async function fetchRandomWallpaper(): Promise<Wallpaper | null> {
  for (const endpoint of ENDPOINTS) {
    const result = await requestWallpaper(endpoint)
    if (result) return result
  }
  return null
}
