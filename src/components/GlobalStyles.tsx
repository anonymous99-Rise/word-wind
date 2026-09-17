import { createGlobalStyle } from 'styled-components'

// 全局样式
export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
    background: #111827;
  }

  body {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    background: #111827;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* 移动端点按不要出现灰色高亮块 */
    -webkit-tap-highlight-color: transparent;
    /* 滑动切词时避免触发浏览器下拉刷新 */
    overscroll-behavior-y: none;
  }

  button,
  input,
  select,
  textarea {
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  /* 移动端滚动更顺滑，并让 fixed 背景层不参与重绘 */
  @media (max-width: 768px) {
    html {
      scroll-behavior: smooth;
    }
  }
`
