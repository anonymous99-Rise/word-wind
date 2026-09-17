import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { fadeInUp, float } from './animations'

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

// 卡片容器
const Card = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 900px;
  width: 100%;
  animation: ${fadeInUp} 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  z-index: 1;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;

  @media (hover: hover) {
    &:hover {
      transform: translateY(-5px) rotateX(2deg);
    }
  }

  @media (max-width: 768px) {
    padding: 22px 16px;
    border-radius: 20px;
    animation-duration: 0.5s;
  }
`

// 标题样式
const Title = styled.h1<{ $textColor: string }>`
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0 0 26px;
  text-align: center;
  background: ${props =>
    props.$textColor === '#000'
      ? 'linear-gradient(135deg, #000 0%, #333 50%, #666 100%)'
      : 'linear-gradient(135deg, #fff 0%, #e0e7ff 50%, #c7d2fe 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: ${props =>
    props.$textColor === '#000' ? '0 0 40px rgba(0, 0, 0, 0.3)' : '0 0 40px rgba(255, 255, 255, 0.3)'};
  animation: ${float} 6s ease-in-out infinite;
  letter-spacing: -0.02em;
  line-height: 1.1;
  overflow-wrap: anywhere;

  @media (max-width: 768px) {
    font-size: clamp(2rem, 13vw, 3rem);
    margin-bottom: 18px;
  }
`

// 文本样式
const Text = styled.p`
  font-size: 1.1rem;
  font-weight: 400;
  margin: 15px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
`

// 列表样式
const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 15px 0;
`

const ListItem = styled.li`
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  margin: 8px 0;
  padding: 15px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.92);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  @media (hover: hover) {
    &:hover {
      transform: translateX(15px) scale(1.02);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      &::before {
        left: 100%;
      }
    }
  }

  @media (max-width: 768px) {
    padding: 12px 14px;
    margin: 6px 0;
  }
`

// 按钮样式
const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: 500;
  padding: 14px 28px;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  margin: 12px;
  min-height: 48px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  @media (hover: hover) {
    &:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 12px 35px rgba(102, 126, 234, 0.3);
      &::before {
        left: 100%;
      }
    }
  }

  &:active {
    transform: translateY(-1px) scale(1.02);
  }
`

const PlayButton = styled(Button)`
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 8px 25px rgba(245, 87, 108, 0.3);
  font-size: 15px;
  padding: 12px 20px;
  margin: 0;

  @media (hover: hover) {
    &:hover {
      box-shadow: 0 12px 35px rgba(245, 87, 108, 0.4);
    }
  }
`

const PhoneticRow = styled.div`
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    gap: 10px;
  }
`

const LoadingBox = styled.div<{ $textColor: string }>`
  text-align: center;
  font-size: 2rem;
  padding: 40px 0;
  color: ${props => props.$textColor};

  @media (max-width: 768px) {
    font-size: 1.4rem;
    padding: 24px 0;
  }
`

const FeedbackText = styled.div<{ type: 'success' | 'info' }>`
  min-height: 24px;
  margin-top: 2px;
  color: ${props => (props.type === 'success' ? '#bbf7d0' : '#fde68a')};
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
`

interface WordCardProps {
  word: string
  us: string
  uk: string
  translations: Translation[]
  phrases: Phrase[]
  sentences: Sentence[]
  textColor: string
  isLoading: boolean
  showContent: boolean
  onPlayPhonetic: (type: 'us' | 'uk') => void
  onDontKnow: (word: string, translations: Translation[]) => boolean
}

export const WordCard = ({
  word,
  us,
  uk,
  translations,
  phrases,
  sentences,
  textColor,
  isLoading,
  showContent,
  onPlayPhonetic,
  onDontKnow
}: WordCardProps) => {
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(
    null
  )
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setFeedback(null)
  }, [word])

  const handleDontKnow = () => {
    const added = onDontKnow(word, translations)

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
    }

    setFeedback({
      message: added ? '已加入不会的单词' : '这个单词已标记过',
      type: added ? 'success' : 'info'
    })
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null)
    }, 1800)
  }

  if (isLoading) {
    return (
      <Card>
        <LoadingBox $textColor={textColor}>Loading...</LoadingBox>
      </Card>
    )
  }

  return (
    <Card>
      <Title $textColor={textColor}>{word}</Title>
      <PhoneticRow>
        <PlayButton onClick={() => onPlayPhonetic('us')}>🇺🇸 🔊 {us}</PlayButton>
        <PlayButton onClick={() => onPlayPhonetic('uk')}>🇬🇧 🔊 {uk}</PlayButton>
      </PhoneticRow>
      {showContent && (
        <>
          <Text>
            <strong>翻译：</strong>
          </Text>
          <List>
            {translations.map((t, i) => (
              <ListItem key={i}>
                <strong>{t.type}:</strong> {t.translation}
              </ListItem>
            ))}
          </List>
          <Text>
            <strong>句子：</strong>
          </Text>
          <List>
            {sentences.map((s, i) => (
              <ListItem key={i}>
                <strong>{s.sentence}</strong>
                <br />
                {s.translation}
              </ListItem>
            ))}
          </List>
          {phrases.length > 0 && (
            <>
              <Text>
                <strong>短语：</strong>
              </Text>
              <List>
                {phrases.map((p, i) => (
                  <ListItem key={i}>
                    <strong>{p.phrase}:</strong> {p.translation}
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </>
      )}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button onClick={handleDontKnow}>不会</Button>
        <FeedbackText type={feedback?.type ?? 'success'} aria-live="polite">
          {feedback?.message}
        </FeedbackText>
      </div>
    </Card>
  )
}
