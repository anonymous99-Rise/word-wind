/**
 * Cloudflare Web Analytics：只有在设置了 VITE_CF_BEACON_TOKEN 时才注入 beacon。
 * 默认不加载任何第三方统计脚本，避免把访客数据上报到别人的账号。
 */
export function initAnalytics() {
  const token = import.meta.env.VITE_CF_BEACON_TOKEN
  if (!token) return

  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }))
  document.head.appendChild(script)
}
