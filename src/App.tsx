import { type FormEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { GlobalStyle } from './components/GlobalStyles'
import { gradientShift, pulse } from './components/animations'
import { WordCard } from './components/WordCard'
import { SettingsModal } from './components/SettingsModal'
import { UnknownWordsModal } from './components/UnknownWordsModal'
import { supabase } from './utils/supabase'
import { fetchRandomWallpaper, type BackgroundSetting } from './utils/wallpaper'

interface Translation {
  type: string
  translation: string
}

interface Phrase {
  phrase: string
  translation: string
}

interface Sentence {
  sentence: string
  translation: string
}

interface UnknownWord {
  word: string
  translations: Translation[]
  library?: string
  index?: number
}

// 背景设置：在线壁纸 或 纯色渐变（类型定义在 utils/wallpaper.ts）

// ── 背景层（固定铺满，不参与文档流）─────────────────────────────
const BackgroundLayer = styled.div<{ $image: string; $gradient: string; $animate: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 0;
  background-image: ${props => (props.$image ? `url('${props.$image}')` : props.$gradient)};
  background-size: ${props => (props.$image ? 'cover' : '400% 400%')};
  background-position: center;
  background-repeat: no-repeat;
  animation: ${props => (props.$animate ? css`${gradientShift} 15s ease infinite` : 'none')};
`

// 壁纸压暗层：保证白字在任意图片上都读得清
const Scrim = styled.div<{ $show: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(8, 10, 20, 0.62) 0%,
    rgba(8, 10, 20, 0.34) 42%,
    rgba(8, 10, 20, 0.7) 100%
  );
  opacity: ${props => (props.$show ? 1 : 0)};
  transition: opacity 0.5s ease;
`

// 渐变背景的装饰光晕（只在纯色渐变时出现）
const GradientGlow = styled.div<{ $show: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: ${props => (props.$show ? 'block' : 'none')};
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 226, 0.3) 0%, transparent 50%);
  animation: ${pulse} 8s ease-in-out infinite;
`

// 主容器
const Container = styled.div<{ $textColor: string }>`
  min-height: 100vh;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  font-family: 'Inter', sans-serif;
  color: ${props => props.$textColor};
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 20px 12px 108px;
  }
`

// 词库选择区
const Sidebar = styled.div`
  position: fixed;
  top: 80px;
  left: 20px;
  width: 264px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  z-index: 10;

  @media (max-width: 768px) {
    position: static;
    width: 100%;
    margin-bottom: 14px;
    padding: 14px;
  }
`

const SidebarLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.75;
  margin-bottom: 8px;
`

// 词库胶囊选择器：固定 4 列网格，行宽一致，不会出现半截按钮
const LibraryTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;

  @media (max-width: 768px) {
    gap: 6px;
  }
`

const LibraryTab = styled.button<{ $active: boolean; $textColor: string }>`
  padding: 8px 4px;
  min-height: 38px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13.5px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  color: ${props => props.$textColor};
  font-weight: ${props => (props.$active ? 700 : 500)};
  border: 1px solid
    ${props => (props.$active ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.24)')};
  background: ${props =>
    props.$active ? 'rgba(255, 255, 255, 0.34)' : 'rgba(255, 255, 255, 0.1)'};
  box-shadow: ${props =>
    props.$active ? '0 6px 18px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.35)' : 'none'};
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.15s ease;

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    min-height: 42px;
    font-size: 14px;
  }
`

// 当前进度显示
const DisplayBox = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 14px;
  margin-top: 12px;
  white-space: pre-line;
  line-height: 1.5;
`

const PageSelectorForm = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`

const PageInput = styled.input<{ $textColor: string }>`
  min-width: 0;
  flex: 1;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  color: ${props => props.$textColor};
  font-size: 16px;

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 1px;
    background: rgba(255, 255, 255, 0.26);
  }

  &::placeholder {
    color: currentColor;
    opacity: 0.6;
  }
`

const PageJumpButton = styled.button<{ $textColor: string }>`
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  color: ${props => props.$textColor};
  font-size: 15px;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.28);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
  }
`

const ContentToggleButton = styled(PageJumpButton)`
  width: 100%;
  margin-top: 10px;
`

const SearchForm = styled.form`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  width: min(420px, calc(100vw - 40px));
  padding: 8px;
  gap: 8px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 14px;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  @media (max-width: 768px) {
    position: static;
    transform: none;
    width: 100%;
    margin-bottom: 12px;
  }
`

const SearchInput = styled.input<{ $textColor: string }>`
  min-width: 0;
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.18);
  color: ${props => props.$textColor};
  font-size: 16px;

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 1px;
    background: rgba(255, 255, 255, 0.28);
  }

  &::placeholder {
    color: currentColor;
    opacity: 0.68;
  }
`

const SearchButton = styled(PageJumpButton)`
  min-width: 76px;
  border-radius: 9px;
`

const SearchMessage = styled.div<{ $isError: boolean }>`
  position: fixed;
  top: 78px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(20, 20, 20, 0.72);
  color: ${props => (props.$isError ? '#fecaca' : '#fff')};
  font-size: 14px;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    position: static;
    transform: none;
    width: 100%;
    margin: -4px 0 12px;
    text-align: center;
  }
`

// 固定设置按钮（桌面端右上角）
const FixedSettingsButton = styled.button<{ $textColor: string }>`
  position: fixed;
  top: 80px;
  right: 20px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  color: ${props => props.$textColor};
  font-size: 15px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }

  z-index: 10;

  @media (max-width: 768px) {
    position: static;
  }
`

const UnknownWordsButton = styled(FixedSettingsButton)`
  top: 150px;
`

// 大箭头按钮（桌面端左右悬浮）
const ArrowButton = styled.button<{ $textColor: string }>`
  padding: 15px 30px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  color: ${props => props.$textColor};
  font-size: 18px;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(12px);
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.28);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
  }
`

const LeftArrowButton = styled(ArrowButton)`
  position: fixed;
  bottom: 200px;
  left: 50px;
  z-index: 10;
`

const RightArrowButton = styled(ArrowButton)`
  position: fixed;
  bottom: 200px;
  right: 50px;
  z-index: 10;
`

// 卡片区域：移动端左右滑动的命中区
const SwipeArea = styled.div<{ $dragging: boolean; $offset: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  width: 100%;
  touch-action: pan-y;
  transform: translateX(${props => props.$offset}px);
  transition: ${props => (props.$dragging ? 'none' : 'transform 0.22s ease')};
`

// 滑动提示：浮在底部操作栏上方，不占文档流，免得被长卡片挤到屏幕外
const toastIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
`

const SwipeHint = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    left: 50%;
    bottom: calc(86px + env(safe-area-inset-bottom, 0px));
    z-index: 31;
    padding: 9px 16px;
    border-radius: 999px;
    background: rgba(10, 10, 20, 0.74);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 13px;
    white-space: nowrap;
    pointer-events: none;
    animation: ${toastIn} 0.4s ease both;
  }
`

// 移动端底部操作栏
const MobileBar = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    gap: 8px;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: rgba(10, 10, 20, 0.6);
    backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255, 255, 255, 0.16);
    z-index: 30;
  }
`

const BarButton = styled.button<{ $textColor: string; $icon?: boolean }>`
  min-height: 48px;
  min-width: ${props => (props.$icon ? '56px' : 'auto')};
  flex: ${props => (props.$icon ? '0 0 auto' : '1 1 0')};
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  color: ${props => props.$textColor};
  font-size: ${props => (props.$icon ? '20px' : '14px')};
  font-weight: 500;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${props => (props.disabled ? 0.4 : 1)};
  white-space: nowrap;

  &:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }
`

// 桌面端才显示的两组容器
const DesktopOnly = styled.div`
  @media (max-width: 768px) {
    display: none;
  }
`

const ArrowContainer = styled(DesktopOnly)``

const ButtonContainer = styled(DesktopOnly)``

const BACKGROUND_STORAGE_KEY = 'wordWindBackground'
const LEGACY_BACKGROUND_STORAGE_KEY = 'selectedBackground'
const CONTENT_VISIBILITY_STORAGE_KEY = 'wordCardContentVisible'
const SWIPE_HINT_STORAGE_KEY = 'wordWindSwipeHintSeen'

const gradientBackgrounds = [
  'linear-gradient(-45deg, #f5f5dc, #ede0c8, #f5f5dc)',
  'linear-gradient(-45deg, #f39c12, #e67e22, #e74c3c, #c0392b, #f39c12)',
  'linear-gradient(-45deg, #1abc9c, #16a085, #2ecc71, #27ae60, #1abc9c)',
  'linear-gradient(-45deg, #2196f3, #21cbf3, #2196f3)',
  'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e, #533483)'
]

// 设置面板里每个渐变的代表色
const gradientSwatchColors = ['#f5f5dc', '#f39c12', '#1abc9c', '#2196f3', '#1a1a2e']

const libraryKeys = ['chuzhong', 'gaozhong', 'cet4', 'cet6', 'kaoyan', 'toefl', 'sat']

const libraryNames: { [key: string]: string } = {
  chuzhong: '初中',
  gaozhong: '高中',
  cet4: 'CET4',
  cet6: 'CET6',
  kaoyan: '考研',
  toefl: '托福',
  sat: 'SAT'
}

const clampedGradientIndex = (value: number) =>
  Number.isInteger(value) && value >= 0 && value < gradientBackgrounds.length ? value : 0

/** 读取背景设置，兼容旧版本的纯数字索引存档 */
const readStoredBackground = (): BackgroundSetting => {
  try {
    const raw = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BackgroundSetting> | null
      if (parsed?.kind === 'wallpaper' && typeof parsed.url === 'string') {
        return {
          kind: 'wallpaper',
          url: parsed.url,
          title: parsed.title ?? '',
          date: parsed.date ?? ''
        }
      }
      if (parsed?.kind === 'gradient' && typeof parsed.index === 'number') {
        return { kind: 'gradient', index: clampedGradientIndex(parsed.index) }
      }
    }

    const legacy = localStorage.getItem(LEGACY_BACKGROUND_STORAGE_KEY)
    if (legacy !== null) {
      const index = Number.parseInt(legacy, 10)
      if (Number.isInteger(index)) return { kind: 'gradient', index: clampedGradientIndex(index) }
    }
  } catch {
    // 存档损坏时忽略，用默认值
  }

  // 默认：在线壁纸（url 为空时先用渐变兜底，挂载后立刻拉一张）
  return { kind: 'wallpaper', url: '', title: '', date: '' }
}

const getRequestedLocation = () => {
  const params = new URLSearchParams(window.location.search)
  const library = params.get('library')
  const index = Number.parseInt(params.get('index') || '', 10)

  if (library && libraryKeys.includes(library) && Number.isInteger(index) && index > 0) {
    return { library, index }
  }

  return null
}

function App() {
  // 从localStorage获取词库位置
  const getStoredIndex = (library: string) => {
    const stored = localStorage.getItem(`wordLibrary_${library}`)
    return stored ? parseInt(stored, 10) : 1
  }

  // 存储词库位置到localStorage
  const storeIndex = (library: string, index: number) => {
    localStorage.setItem(`wordLibrary_${library}`, index.toString())
  }

  // 从localStorage获取当前词库
  const getStoredLibrary = () => {
    const requestedLocation = getRequestedLocation()
    if (requestedLocation) return requestedLocation.library

    const stored = localStorage.getItem('selectedLibrary')
    return stored || 'cet4'
  }

  // 从localStorage获取内容显示设置
  const getStoredContentVisible = () => {
    return localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY) !== 'false'
  }

  /** 是否还该显示「左右滑动」提示 */
  const getShowSwipeHint = () => localStorage.getItem(SWIPE_HINT_STORAGE_KEY) !== '1'

  const [word, setWord] = useState('')
  const [us, setUs] = useState('')
  const [uk, setUk] = useState('')
  const [translations, setTranslations] = useState<Translation[]>([])
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [background, setBackground] = useState<BackgroundSetting>(readStoredBackground)
  const [isWallpaperLoading, setIsWallpaperLoading] = useState(false)
  const [wallpaperError, setWallpaperError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showUnknown, setShowUnknown] = useState(false)
  const [showCardContent, setShowCardContent] = useState(getStoredContentVisible)
  const [selectedLibrary, setSelectedLibrary] = useState(getStoredLibrary)
  const [currentIndex, setCurrentIndex] = useState(
    () => getRequestedLocation()?.index ?? getStoredIndex(selectedLibrary)
  )
  const [pageInput, setPageInput] = useState(() => currentIndex.toString())
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState<{
    text: string
    isError: boolean
  } | null>(null)
  const [totalWords, setTotalWords] = useState(0)
  const [unknownWords, setUnknownWords] = useState<UnknownWord[]>(() => {
    const data = localStorage.getItem('unknownWords')
    return data ? JSON.parse(data) : []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(getShowSwipeHint)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const wordRequestLockedRef = useRef(false)
  const wordRequestIdRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const draggedRef = useRef(false)

  const clampIndex = useCallback(
    (index: number) => Math.min(Math.max(index, 1), Math.max(totalWords, 1)),
    [totalWords]
  )

  // ── 背景 ─────────────────────────────────────────────────
  const activeGradient =
    background.kind === 'gradient' ? gradientBackgrounds[background.index] : gradientBackgrounds[0]
  const wallpaperUrl = background.kind === 'wallpaper' ? background.url : ''
  // 只有第一个渐变是浅色，需要深色文字；壁纸一律白字（有压暗层兜底）
  const textColor = background.kind === 'gradient' && background.index === 0 ? '#000' : '#fff'

  const loadWallpaper = useCallback(async () => {
    setIsWallpaperLoading(true)
    setWallpaperError(null)

    const next = await fetchRandomWallpaper()

    setIsWallpaperLoading(false)
    if (!next) {
      setWallpaperError('壁纸加载失败，已暂时使用纯色背景')
      return
    }

    setBackground({ kind: 'wallpaper', url: next.url, title: next.title, date: next.date })
  }, [])

  // 选了壁纸但还没拿到图片时，自动拉一张
  useEffect(() => {
    if (background.kind !== 'wallpaper' || wallpaperUrl) return
    loadWallpaper()
  }, [background.kind, wallpaperUrl, loadWallpaper])

  useEffect(() => {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(background))
    localStorage.removeItem(LEGACY_BACKGROUND_STORAGE_KEY)
  }, [background])

  const handleSelectGradient = (index: number) => {
    setBackground({ kind: 'gradient', index })
  }

  const handleEnableWallpaper = () => {
    if (background.kind === 'wallpaper') {
      loadWallpaper()
      return
    }
    setBackground({ kind: 'wallpaper', url: '', title: '', date: '' })
  }

  // 处理词库切换
  const handleLibraryChange = (value: string) => {
    if (value === selectedLibrary) return

    setSelectedLibrary(value)

    const index = getStoredIndex(value)
    setCurrentIndex(index)
    setPageInput(index.toString())

    localStorage.setItem('selectedLibrary', value)
  }

  useEffect(() => {
    const requestedWord = new URLSearchParams(window.location.search).get('word')
    if (!requestedWord) return

    let cancelled = false

    const findRequestedWord = async () => {
      const libraries = [selectedLibrary, ...libraryKeys.filter(key => key !== selectedLibrary)]

      for (const library of libraries) {
        const { data, error } = await supabase
          .from(library)
          .select('id')
          .eq('word', requestedWord)
          .limit(1)
          .maybeSingle()

        if (cancelled) return
        if (!error && data?.id) {
          setSelectedLibrary(library)
          setCurrentIndex(data.id)
          setPageInput(data.id.toString())
          return
        }
      }
    }

    findRequestedWord()
    return () => {
      cancelled = true
    }
    // This query is intentionally resolved only once when a direct word link opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchTotalWords = async () => {
      const { count, error } = await supabase
        .from(selectedLibrary)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Failed to fetch total words:', error)
        return
      }

      setTotalWords(count as number)
    }

    fetchTotalWords()
  }, [selectedLibrary])

  useEffect(() => {
    const fetchWord = async () => {
      const requestId = wordRequestIdRef.current + 1
      wordRequestIdRef.current = requestId
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from(selectedLibrary)
          .select('*')
          .eq('id', currentIndex)
          .single()

        if (wordRequestIdRef.current !== requestId) {
          return
        }

        if (error) {
          console.error(error)
          return
        }

        setWord(data.word)
        setUs(data.us)
        setUk(data.uk)
        setTranslations(data.translations)
        setPhrases(data.phrases)
        setSentences(data.sentences)
      } finally {
        if (wordRequestIdRef.current === requestId) {
          setIsLoading(false)
          wordRequestLockedRef.current = false
        }
      }
    }

    fetchWord()
  }, [selectedLibrary, currentIndex])

  useEffect(() => {
    storeIndex(selectedLibrary, currentIndex)
  }, [selectedLibrary, currentIndex])

  useEffect(() => {
    setPageInput(currentIndex.toString())
  }, [currentIndex])

  const handleContentVisibilityToggle = () => {
    setShowCardContent(current => {
      const next = !current
      localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY, String(next))
      return next
    })
  }

  const playPhonetic = (type: 'us' | 'uk') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      const voices = speechSynthesis.getVoices()
      const voice = voices.find(v => v.lang === (type === 'us' ? 'en-US' : 'en-GB'))
      if (voice) {
        utterance.voice = voice
      }
      speechSynthesis.speak(utterance)
    } else {
      alert('Speech synthesis not supported in this browser.')
    }
  }

  const handleDontKnow = (word: string, translations: Translation[]) => {
    const existing = JSON.parse(localStorage.getItem('unknownWords') || '[]')
    if (existing.some((item: { word: string }) => item.word === word)) {
      return false
    }

    existing.push({ word, translations, library: selectedLibrary, index: currentIndex })
    localStorage.setItem('unknownWords', JSON.stringify(existing))
    setUnknownWords(existing)
    return true
  }

  const handleRemoveUnknown = (index: number) => {
    const existing = [...unknownWords]
    existing.splice(index, 1)
    localStorage.setItem('unknownWords', JSON.stringify(existing))
    setUnknownWords(existing)
  }

  const changeWord = useCallback(
    (step: -1 | 1) => {
      if (isLoading || wordRequestLockedRef.current) {
        return
      }

      const nextIndex = clampIndex(currentIndex + step)

      if (nextIndex === currentIndex) {
        return
      }

      wordRequestLockedRef.current = true
      setCurrentIndex(nextIndex)
    },
    [clampIndex, currentIndex, isLoading]
  )

  // ── 移动端左右滑动切词 ───────────────────────────────────
  const markSwipeHintSeen = () => {
    if (!showSwipeHint) return
    setShowSwipeHint(false)
    localStorage.setItem(SWIPE_HINT_STORAGE_KEY, '1')
  }

  // 提示浮在底部栏上方，7 秒后自动收起，别一直挡着
  useEffect(() => {
    if (!showSwipeHint) return
    const timer = setTimeout(() => {
      setShowSwipeHint(false)
      localStorage.setItem(SWIPE_HINT_STORAGE_KEY, '1')
    }, 7000)
    return () => clearTimeout(timer)
  }, [showSwipeHint])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    draggedRef.current = false
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    if (!start || event.touches.length !== 1) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (!draggedRef.current) {
      // 横向位移不够明显时不动手，把纵向留给页面滚动
      if (Math.abs(deltaX) < 12 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
      draggedRef.current = true
      setIsDragging(true)
    }

    // 到头了就加阻尼，给出「拉不动」的反馈
    const atStart = currentIndex <= 1 && deltaX > 0
    const atEnd = totalWords > 0 && currentIndex >= totalWords && deltaX < 0
    setDragOffset(atStart || atEnd ? deltaX * 0.25 : deltaX)
  }

  const handleTouchEnd = () => {
    const start = touchStartRef.current
    touchStartRef.current = null

    if (!start || !draggedRef.current) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }

    const deltaX = dragOffset
    const elapsed = Date.now() - start.time
    draggedRef.current = false
    setIsDragging(false)
    setDragOffset(0)

    // 距离够远，或者快速轻扫，都算一次翻页
    const isFlick = elapsed < 260 && Math.abs(deltaX) > 28
    if (Math.abs(deltaX) < 55 && !isFlick) return

    markSwipeHintSeen()
    changeWord(deltaX < 0 ? 1 : -1)
  }

  const handlePageSelect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLoading || wordRequestLockedRef.current || totalWords === 0) {
      return
    }

    const requestedIndex = Number.parseInt(pageInput, 10)
    if (Number.isNaN(requestedIndex)) {
      setPageInput(currentIndex.toString())
      return
    }

    const nextIndex = clampIndex(requestedIndex)
    setPageInput(nextIndex.toString())

    if (nextIndex === currentIndex) {
      return
    }

    wordRequestLockedRef.current = true
    setCurrentIndex(nextIndex)
  }

  const handleWordSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requestedWord = searchInput.trim().toLowerCase()
    if (!requestedWord || isSearching) {
      return
    }

    setIsSearching(true)
    setSearchMessage(null)

    const searchLibrary = async (library: string) => {
      const { data, error } = await supabase
        .from(library)
        .select('id, word')
        .eq('word', requestedWord)
        .limit(1)
        .maybeSingle()

      return { library, data, error }
    }

    try {
      const currentResult = await searchLibrary(selectedLibrary)
      let match = currentResult.data ? currentResult : null
      let hadError = Boolean(currentResult.error)

      if (!match) {
        const otherResults = await Promise.all(
          libraryKeys
            .filter(library => library !== selectedLibrary)
            .map(library => searchLibrary(library))
        )

        match = otherResults.find(result => result.data) ?? null
        hadError = hadError || otherResults.some(result => result.error)
      }

      if (!match?.data) {
        setSearchMessage({
          text: hadError ? '搜索失败，请稍后重试' : `未找到“${searchInput.trim()}”`,
          isError: true
        })
        return
      }

      const nextIndex = Number(match.data.id)
      setSelectedLibrary(match.library)
      setCurrentIndex(nextIndex)
      setPageInput(nextIndex.toString())
      setSearchInput(match.data.word)
      localStorage.setItem('selectedLibrary', match.library)

      const params = new URLSearchParams()
      params.set('library', match.library)
      params.set('index', nextIndex.toString())
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)

      setSearchMessage({
        text: `已跳转到 ${match.data.word}`,
        isError: false
      })
    } catch (error) {
      console.error('Failed to search for word:', error)
      setSearchMessage({ text: '搜索失败，请稍后重试', isError: true })
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isEditable =
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'

      if (isEditable) {
        return
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        changeWord(-1)
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault()
        changeWord(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [changeWord])

  return (
    <>
      <GlobalStyle />
      <BackgroundLayer
        $image={wallpaperUrl}
        $gradient={activeGradient}
        $animate={background.kind === 'gradient'}
      />
      <Scrim $show={Boolean(wallpaperUrl)} />
      <GradientGlow $show={background.kind === 'gradient'} />

      <Container $textColor={textColor}>
        <SearchForm onSubmit={handleWordSearch} role="search">
          <SearchInput
            $textColor={textColor}
            type="search"
            value={searchInput}
            placeholder="搜索英文单词"
            onChange={event => {
              setSearchInput(event.target.value)
              setSearchMessage(null)
            }}
            aria-label="搜索单词"
            autoComplete="off"
          />
          <SearchButton
            $textColor={textColor}
            type="submit"
            disabled={isSearching || !searchInput.trim()}
          >
            {isSearching ? '搜索中…' : '搜索'}
          </SearchButton>
        </SearchForm>
        {searchMessage && (
          <SearchMessage $isError={searchMessage.isError} role="status" aria-live="polite">
            {searchMessage.text}
          </SearchMessage>
        )}

        <Sidebar>
          <SidebarLabel>选择词库</SidebarLabel>
          <LibraryTabs role="group" aria-label="选择词库">
            {libraryKeys.map(key => (
              <LibraryTab
                key={key}
                type="button"
                $active={key === selectedLibrary}
                $textColor={textColor}
                aria-pressed={key === selectedLibrary}
                onClick={() => handleLibraryChange(key)}
              >
                {libraryNames[key]}
              </LibraryTab>
            ))}
          </LibraryTabs>
          <DisplayBox>
            {`当前是${libraryNames[selectedLibrary]}词库\n第${currentIndex}个，共${totalWords}个`}
          </DisplayBox>
          <PageSelectorForm onSubmit={handlePageSelect}>
            <PageInput
              $textColor={textColor}
              type="number"
              min={1}
              max={totalWords || undefined}
              inputMode="numeric"
              value={pageInput}
              placeholder="页码"
              onChange={event => setPageInput(event.target.value)}
              aria-label="选择页码"
            />
            <PageJumpButton
              $textColor={textColor}
              type="submit"
              disabled={isLoading || totalWords === 0}
            >
              跳转
            </PageJumpButton>
          </PageSelectorForm>
          <ContentToggleButton
            $textColor={textColor}
            type="button"
            onClick={handleContentVisibilityToggle}
          >
            {showCardContent ? '隐藏释义' : '显示释义'}
          </ContentToggleButton>
        </Sidebar>

        <SwipeArea
          $dragging={isDragging}
          $offset={dragOffset}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <WordCard
            word={word}
            us={us}
            uk={uk}
            translations={translations}
            phrases={phrases}
            sentences={sentences}
            textColor={textColor}
            isLoading={isLoading}
            showContent={showCardContent}
            onPlayPhonetic={playPhonetic}
            onDontKnow={handleDontKnow}
          />
        </SwipeArea>

        {showSwipeHint && <SwipeHint>← 左右滑动切换单词 →</SwipeHint>}

        <ArrowContainer>          <LeftArrowButton
            $textColor={textColor}
            onClick={() => changeWord(-1)}
            disabled={isLoading || currentIndex <= 1}
          >
            ⬅️ 上一个
          </LeftArrowButton>
          <RightArrowButton
            $textColor={textColor}
            onClick={() => changeWord(1)}
            disabled={isLoading || currentIndex >= totalWords}
          >
            下一个 ➡️
          </RightArrowButton>
        </ArrowContainer>

        <ButtonContainer>
          <FixedSettingsButton $textColor={textColor} onClick={() => setShowSettings(true)}>
            设置&反馈
          </FixedSettingsButton>
          <UnknownWordsButton $textColor={textColor} onClick={() => setShowUnknown(true)}>
            不会的单词
          </UnknownWordsButton>
        </ButtonContainer>

        <MobileBar>
          <BarButton
            $icon
            $textColor="#fff"
            aria-label="上一个"
            onClick={() => changeWord(-1)}
            disabled={isLoading || currentIndex <= 1}
          >
            ⬅️
          </BarButton>
          <BarButton $textColor="#fff" onClick={() => setShowUnknown(true)}>
            不会的单词
          </BarButton>
          <BarButton $textColor="#fff" onClick={() => setShowSettings(true)}>
            设置
          </BarButton>
          <BarButton
            $icon
            $textColor="#fff"
            aria-label="下一个"
            onClick={() => changeWord(1)}
            disabled={isLoading || currentIndex >= totalWords}
          >
            ➡️
          </BarButton>
        </MobileBar>

        <SettingsModal
          show={showSettings}
          onClose={() => setShowSettings(false)}
          background={background}
          gradients={gradientBackgrounds}
          gradientSwatchColors={gradientSwatchColors}
          isWallpaperLoading={isWallpaperLoading}
          wallpaperError={wallpaperError}
          onSelectGradient={handleSelectGradient}
          onEnableWallpaper={handleEnableWallpaper}
        />
        <UnknownWordsModal
          show={showUnknown}
          onClose={() => setShowUnknown(false)}
          unknownWords={unknownWords}
          onRemove={handleRemoveUnknown}
        />
      </Container>
    </>
  )
}

export default App
