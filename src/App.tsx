import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { GlobalStyle } from './components/GlobalStyles'
import { gradientShift, pulse } from './components/animations'
import { WordCard } from './components/WordCard'
import { SettingsModal } from './components/SettingsModal'
import { UnknownWordsModal } from './components/UnknownWordsModal'
import { supabase } from './utils/supabase'

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

// 主容器
const Container = styled.div<{ bg: string; textColor: string }>`
  min-height: 100vh;
  background: ${props => props.bg};
  background-size: 400% 400%;
  animation: ${gradientShift} 15s ease infinite;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  font-family: 'Inter', sans-serif;
  color: ${props => props.textColor};
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(120, 219, 226, 0.3) 0%, transparent 50%);
    animation: ${pulse} 8s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 80px 10px;
    align-items: stretch;
  }
`

// 下拉框容器
const Sidebar = styled.div`
  position: fixed;
  top: 80px;
  left: 20px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 10;

  @media (max-width: 768px) {
    position: static;
    width: 100%;
    margin-bottom: 20px;
    padding: 15px;
  }
`

// 下拉框样式
const Select = styled.select<{ textColor: string }>`
  padding: 10px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 16px;
  cursor: pointer;
  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.3);
  }
`

// 显示框样式
const DisplayBox = styled.div<{ textColor: string }>`
  padding: 10px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 16px;
  margin-top: 10px;
  white-space: pre-line;
`

const PageSelectorForm = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`

const PageInput = styled.input<{ textColor: string }>`
  min-width: 0;
  width: 92px;
  padding: 10px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 16px;

  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.3);
  }

  &::placeholder {
    color: currentColor;
    opacity: 0.7;
  }
`

const PageJumpButton = styled.button<{ textColor: string }>`
  padding: 10px 12px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 16px;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
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
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);

  @media (max-width: 768px) {
    position: static;
    transform: none;
    width: 100%;
    margin-bottom: 14px;
  }
`

const SearchInput = styled.input<{ textColor: string }>`
  min-width: 0;
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 16px;

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 1px;
    background: rgba(255, 255, 255, 0.3);
  }

  &::placeholder {
    color: currentColor;
    opacity: 0.68;
  }
`

const SearchButton = styled(PageJumpButton)`
  min-width: 72px;
`

const SearchMessage = styled.div<{ $isError: boolean }>`
  position: fixed;
  top: 78px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(20, 20, 20, 0.7);
  color: ${props => (props.$isError ? '#fecaca' : '#fff')};
  font-size: 14px;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    position: static;
    transform: none;
    width: 100%;
    margin: -6px 0 14px;
    text-align: center;
  }
`

// 固定设置按钮
const FixedSettingsButton = styled.button<{ textColor: string }>`
  position: fixed;
  top: 80px;
  right: 20px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
  }
  z-index: 10;

  @media (max-width: 768px) {
    position: static;
    padding: 8px 15px;
    font-size: 14px;
  }
`

// 不会单词按钮
const UnknownWordsButton = styled(FixedSettingsButton)`
  top: 150px;
`

// 大箭头按钮
const ArrowButton = styled.button<{ textColor: string }>`
  padding: 15px 30px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: ${props => props.textColor};
  font-size: 18px;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(10px);
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
  }
  &:disabled {
    opacity: 0.5;
  }
`

// 左箭头按钮
const LeftArrowButton = styled(ArrowButton)`
  position: fixed;
  bottom: 200px;
  left: 50px;
  z-index: 10;

  @media (max-width: 768px) {
    position: static;
  }
`

// 右箭头按钮
const RightArrowButton = styled(ArrowButton)`
  position: fixed;
  bottom: 200px;
  right: 50px;
  z-index: 10;

  @media (max-width: 768px) {
    position: static;
  }
`

// 箭头按钮容器（移动端）
const ArrowContainer = styled.div`
  @media (max-width: 768px) {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 20px;
  }
`

// 按钮容器（移动端）
const ButtonContainer = styled.div`
  @media (max-width: 768px) {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 20px;
  }
`

const BACKGROUND_STORAGE_KEY = 'selectedBackground'
const CONTENT_VISIBILITY_STORAGE_KEY = 'wordCardContentVisible'

const backgrounds = [
  'linear-gradient(-45deg, #f5f5dc, #ede0c8, #f5f5dc)',
  'linear-gradient(-45deg, #f39c12, #e67e22, #e74c3c, #c0392b, #f39c12)',
  'linear-gradient(-45deg, #1abc9c, #16a085, #2ecc71, #27ae60, #1abc9c)',
  'linear-gradient(-45deg, #2196f3, #21cbf3, #2196f3)',
  'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e, #533483)'
]

const themeColors = ['#f5f5dc', '#f39c12', '#1abc9c', '#2196f3', '#1a1a2e']

const libraryKeys = ['chuzhong', 'gaozhong', 'cet4', 'cet6', 'kaoyan', 'toefl', 'sat']

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

  // 从localStorage获取背景设置
  const getStoredBackgroundIndex = () => {
    const stored = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    const index = stored ? Number.parseInt(stored, 10) : 0
    return Number.isInteger(index) && index >= 0 && index < backgrounds.length ? index : 0
  }

  // 从localStorage获取内容显示设置
  const getStoredContentVisible = () => {
    return localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY) !== 'false'
  }

  // 处理背景切换
  const handleBackgroundChange = (index: number) => {
    setBgIndex(index)
    localStorage.setItem(BACKGROUND_STORAGE_KEY, index.toString())
  }

  // 处理词库切换
  const handleLibraryChange = (value: string) => {
    setSelectedLibrary(value)

    const index = getStoredIndex(value)
    setCurrentIndex(index)
    setPageInput(index.toString())

    localStorage.setItem('selectedLibrary', value)
  }

  const [word, setWord] = useState('')
  const [us, setUs] = useState('')
  const [uk, setUk] = useState('')
  const [translations, setTranslations] = useState<Translation[]>([])
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [bgIndex, setBgIndex] = useState(getStoredBackgroundIndex)
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
  const wordRequestLockedRef = useRef(false)
  const wordRequestIdRef = useRef(0)

  const clampIndex = useCallback(
    (index: number) => Math.min(Math.max(index, 1), Math.max(totalWords, 1)),
    [totalWords]
  )

  const libraryNames: { [key: string]: string } = {
    chuzhong: '初中',
    gaozhong: '高中',
    cet4: 'CET4',
    cet6: 'CET6',
    kaoyan: '考研',
    toefl: '托福',
    sat: 'SAT'
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
      <Container bg={backgrounds[bgIndex]} textColor={bgIndex === 0 ? '#000' : '#fff'}>
        <SearchForm onSubmit={handleWordSearch} role="search">
          <SearchInput
            textColor={bgIndex === 0 ? '#000' : '#fff'}
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
            textColor={bgIndex === 0 ? '#000' : '#fff'}
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
          <Select
            textColor={bgIndex === 0 ? '#000' : '#fff'}
            value={selectedLibrary}
            onChange={e => handleLibraryChange(e.target.value)}
          >
            <option value="chuzhong">初中</option>
            <option value="gaozhong">高中</option>
            <option value="cet4">CET4</option>
            <option value="cet6">CET6</option>
            <option value="kaoyan">考研</option>
            <option value="toefl">托福</option>
            <option value="sat">SAT</option>
          </Select>
          <DisplayBox textColor={bgIndex === 0 ? '#000' : '#fff'}>
            {`当前是${libraryNames[selectedLibrary]}词库\n第${currentIndex}个，共${totalWords}个`}
          </DisplayBox>
          <PageSelectorForm onSubmit={handlePageSelect}>
            <PageInput
              textColor={bgIndex === 0 ? '#000' : '#fff'}
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
              textColor={bgIndex === 0 ? '#000' : '#fff'}
              type="submit"
              disabled={isLoading || totalWords === 0}
            >
              跳转
            </PageJumpButton>
          </PageSelectorForm>
          <ContentToggleButton
            textColor={bgIndex === 0 ? '#000' : '#fff'}
            type="button"
            onClick={handleContentVisibilityToggle}
          >
            {showCardContent ? '隐藏释义' : '显示释义'}
          </ContentToggleButton>
        </Sidebar>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <WordCard
            word={word}
            us={us}
            uk={uk}
            translations={translations}
            phrases={phrases}
            sentences={sentences}
            bgIndex={bgIndex}
            isLoading={isLoading}
            showContent={showCardContent}
            onSettingsClick={() => setShowSettings(true)}
            onPlayPhonetic={playPhonetic}
            onDontKnow={handleDontKnow}
          />
        </div>
        <ArrowContainer>
          <LeftArrowButton
            textColor={bgIndex === 0 ? '#000' : '#fff'}
            onClick={() => changeWord(-1)}
            disabled={isLoading || currentIndex <= 1}
          >
            ⬅️ 上一个
          </LeftArrowButton>
          <RightArrowButton
            textColor={bgIndex === 0 ? '#000' : '#fff'}
            onClick={() => changeWord(1)}
            disabled={isLoading || currentIndex >= totalWords}
          >
            下一个 ➡️
          </RightArrowButton>
        </ArrowContainer>
        <ButtonContainer>
          <FixedSettingsButton
            textColor={bgIndex === 0 ? '#000' : '#fff'}
            onClick={() => setShowSettings(true)}
          >
            设置&反馈
          </FixedSettingsButton>
          <UnknownWordsButton
            textColor={bgIndex === 0 ? '#000' : '#fff'}
            onClick={() => setShowUnknown(true)}
          >
            不会的单词
          </UnknownWordsButton>
        </ButtonContainer>
        <SettingsModal
          show={showSettings}
          onClose={() => setShowSettings(false)}
          backgrounds={backgrounds}
          themeColors={themeColors}
          onSelectBackground={handleBackgroundChange}
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
