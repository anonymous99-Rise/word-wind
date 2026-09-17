import styled from 'styled-components'
import { useState, useEffect } from 'react'
import { supabase, isFeedbackEnabled } from '../utils/supabase'
import type { BackgroundSetting } from '../utils/wallpaper'

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalContent = styled.div<{ isOpen: boolean }>`
  background: rgba(0, 0, 0, 0.5);
  color: white;
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-sizing: border-box;
  padding: 32px 40px;
  max-width: 500px;
  width: 90%;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: scale(1.05);
  transition:
    opacity 0.3s ease-out,
    transform 0.3s ease-out;
  position: relative;
  ${props =>
    props.isOpen &&
    `
    opacity: 1;
    transform: scale(1);
  `}

  @media (max-width: 768px) {
    padding: 24px 18px;
    width: calc(100% - 24px);
    border-radius: 20px;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 16px;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: white;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.6);
  }
`

const SectionTitle = styled.h2`
  font-size: 18px;
  margin: 24px 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SectionHint = styled.p`
  font-size: 13px;
  opacity: 0.7;
  margin: 0 0 12px;
  line-height: 1.5;
`

const WallpaperCard = styled.div<{ $active: boolean }>`
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid ${props => (props.$active ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.16)')};
  background: rgba(255, 255, 255, 0.08);
  transition: border-color 0.25s ease;
`

const WallpaperPreview = styled.div<{ $image: string }>`
  height: 130px;
  background-image: ${props => (props.$image ? `url('${props.$image}')` : 'none')};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
`

const WallpaperFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
`

const WallpaperTitle = styled.span`
  font-size: 13px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Button = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  min-height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  background: ${props =>
    props.$variant === 'ghost' ? 'rgba(255, 255, 255, 0.16)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: #fff;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 2px;
  }
`

const SwatchRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`

const Swatch = styled.button<{ $color: string; $active: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${props => props.$color};
  border: 2px solid ${props => (props.$active ? '#fff' : 'rgba(255, 255, 255, 0.2)')};
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
  box-shadow: ${props => (props.$active ? '0 0 0 3px rgba(255, 255, 255, 0.25)' : 'none')};

  &:hover {
    transform: translateY(-3px);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 2px;
  }
`

const ErrorText = styled.p`
  color: #fecaca;
  font-size: 13px;
  margin: 8px 0 0;
`

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }
`

const Label = styled.label`
  display: block;
  font-size: 14px;
  margin-bottom: 6px;
  opacity: 0.9;
`

interface SettingsModalProps {
  show: boolean
  onClose: () => void
  background: BackgroundSetting
  gradients: string[]
  gradientSwatchColors: string[]
  isWallpaperLoading: boolean
  wallpaperError: string | null
  onSelectGradient: (index: number) => void
  onEnableWallpaper: () => void
}

export const SettingsModal = ({
  show,
  onClose,
  background,
  gradients,
  gradientSwatchColors,
  isWallpaperLoading,
  wallpaperError,
  onSelectGradient,
  onEnableWallpaper
}: SettingsModalProps) => {
  const [isVisible, setIsVisible] = useState(show)
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setTimeout(() => setIsOpen(true), 0)
    } else {
      setIsOpen(false)
    }
  }, [show])

  const handleTransitionEnd = () => {
    if (!isOpen) {
      setIsVisible(false)
    }
  }

  const handleSubmit = async () => {
    if (!isFeedbackEnabled) return
    if (!email.trim() && !content.trim()) {
      alert('邮箱和内容不能为空')
      return
    }
    if (!email.trim()) {
      alert('邮箱不能为空')
      return
    }
    if (!content.trim()) {
      alert('内容不能为空')
      return
    }
    try {
      // 注意：表名是 user_feedback（下划线）。原作者用的是 user-feedback（连字符），
      // 迁移到自建实例后统一成下划线，改这里必须同步 schema.sql。
      const { error } = await supabase.from('user_feedback').insert({
        email,
        content,
        created_at: new Date()
      })

      if (error) {
        console.error('Insert failed:', error)
        alert('提交失败')
        return
      }

      alert('反馈提交成功')
      setEmail('')
      setContent('')
      onClose()
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('网络错误')
    }
  }

  if (!isVisible) return null

  const wallpaperActive = background.kind === 'wallpaper'
  const wallpaperUrl = wallpaperActive ? background.url : ''
  const activeGradientIndex = background.kind === 'gradient' ? background.index : -1

  return (
    <Modal onClick={onClose}>
      <ModalContent
        isOpen={isOpen}
        onClick={e => e.stopPropagation()}
        onTransitionEnd={handleTransitionEnd}
      >
        <CloseButton onClick={onClose} aria-label="关闭设置">
          ×
        </CloseButton>
        <p>
          喜欢这个网站？
          <br />
          <br />
          欢迎关注作者：
          <a
            href="https://github.com/anonymous99-Rise"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'orange' }}
          >
            https://github.com/anonymous99-Rise
          </a>
          <br />
          <br />
          请到{' '}
          <a
            href="https://github.com/anonymous99-Rise/word-wind"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'orange' }}
          >
            https://github.com/anonymous99-Rise/word-wind
          </a>{' '}
          点亮 star 进行收藏！
          <br />
          <br />
          欢迎将网站分享给身边的朋友！
        </p>

        <SectionTitle>背景</SectionTitle>
        <WallpaperCard $active={wallpaperActive}>
          <WallpaperPreview $image={wallpaperUrl}>
            {isWallpaperLoading
              ? '正在获取壁纸…'
              : wallpaperUrl
                ? ''
                : '点击右侧按钮获取一张在线壁纸'}
          </WallpaperPreview>
          <WallpaperFooter>
            <WallpaperTitle>
              {wallpaperActive && background.title ? background.title : '在线壁纸'}
            </WallpaperTitle>
            <Button
              $variant={wallpaperActive ? 'ghost' : 'primary'}
              onClick={onEnableWallpaper}
              disabled={isWallpaperLoading}
            >
              {isWallpaperLoading ? '加载中…' : wallpaperActive ? '换一张' : '使用在线壁纸'}
            </Button>
          </WallpaperFooter>
        </WallpaperCard>
        {wallpaperError && <ErrorText>{wallpaperError}</ErrorText>}
        <SectionHint>壁纸来自 wallpaper-daily，每次「换一张」随机获取一张。</SectionHint>

        <SectionHint>或者选一个纯色渐变：</SectionHint>
        <SwatchRow>
          {gradients.map((_, index) => (
            <Swatch
              key={index}
              type="button"
              $color={gradientSwatchColors[index]}
              $active={activeGradientIndex === index}
              aria-label={`渐变背景 ${index + 1}`}
              aria-pressed={activeGradientIndex === index}
              onClick={() => onSelectGradient(index)}
            />
          ))}
        </SwatchRow>

        {isFeedbackEnabled && (
          <>
            <SectionTitle>反馈</SectionTitle>
            <Label>
              邮箱：<span style={{ color: 'red' }}>*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="请输入您的邮箱"
              maxLength={100}
              required
            />
            <Label>
              内容：<span style={{ color: 'red' }}>*</span>
            </Label>
            <Input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="请输入反馈内容"
              maxLength={100}
              required
            />
            <Button onClick={handleSubmit}>提交</Button>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
