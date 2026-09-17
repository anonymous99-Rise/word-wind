// Cloudflare Pages Function：把壁纸接口代理到同源 /api/wallpaper
//
// 为什么要代理：
//   1. 壁纸接口在 vercel.app 上，国内直连经常被重置（Connection was reset），
//      而 Cloudflare 边缘到 Vercel 是通的；
//   2. 同源请求没有跨域问题，也不用把第三方域名写进前端。
// 图片本身走 cdn.jsdelivr.net，国内可直连，不需要代理。
const UPSTREAM = 'https://wallpaper-daily-three.vercel.app/api/random'

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
}

export async function onRequestGet() {
  try {
    const res = await fetch(UPSTREAM, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`upstream ${res.status}`)

    const data = await res.json()
    if (!data || typeof data.url !== 'string' || !data.url) {
      throw new Error('upstream payload missing url')
    }

    return new Response(JSON.stringify(data), { headers: jsonHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: jsonHeaders
    })
  }
}
