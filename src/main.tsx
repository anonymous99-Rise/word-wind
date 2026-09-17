import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './utils/analytics'

// 部署更新后，浏览器里的旧页面会引用已经删掉的 /assets/* 文件，
// Pages 对找不到的路径回退成 index.html（text/html），浏览器拒绝执行 -> 白屏。
// 下面两处自愈：抢在报错之前强刷一次去拿最新版本。
// sessionStorage 在禁用 cookie / 隐私模式下会抛异常，统一包一层安全读写。
const retryFlag = {
  has(key: string) {
    try {
      return !!sessionStorage.getItem(key)
    } catch {
      // 存不了就当作“已重试过”，宁可保持现状也不陷入无限刷新
      return true
    }
  },
  set(key: string) {
    try {
      sessionStorage.setItem(key, '1')
    } catch {
      /* 忽略 */
    }
  },
  clear(key: string) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* 忽略 */
    }
  }
}

// 动态 import 的 chunk 加载失败时 Vite 会派发这个事件，阻止默认抛错并刷新一次
window.addEventListener('vite:preloadError', event => {
  const KEY = 'word-wind:chunk-retry'
  if (retryFlag.has(KEY)) return
  retryFlag.set(KEY)
  event.preventDefault()
  window.location.reload()
})

// 脚本跑到这里说明资源都加载成功了，清掉标记，让下次部署更新还能再自救一次
retryFlag.clear('word-wind:asset-retry')
retryFlag.clear('word-wind:chunk-retry')

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
