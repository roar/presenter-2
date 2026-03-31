import React, { useRef, useState, useEffect } from 'react'
import type { FrameState, RenderedElement } from '@shared/animation/types'
import type { TextElement, ImageElement, ShapeElement } from '@shared/model/types'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'
import { SlideLayer } from '../SlideLayer/SlideLayer'
import { TextElementRenderer } from '../TextElementRenderer/TextElementRenderer'
import { ImageElementRenderer } from '../ImageElementRenderer/ImageElementRenderer'
import { ShapeElementRenderer } from '../ShapeElementRenderer/ShapeElementRenderer'
import styles from './SlideRenderer.module.css'

const elementRenderers = {
  text: TextElementRenderer,
  image: ImageElementRenderer,
  shape: ShapeElementRenderer
} as const

interface SlideRendererProps {
  frame: FrameState
}

export function SlideRenderer({ frame }: SlideRendererProps): React.JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const s = Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT)
      setScale(s)
      setOffsetX((width - SLIDE_WIDTH * s) / 2)
      setOffsetY((height - SLIDE_HEIGHT * s) / 2)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { front, behind, transition, msoElements } = frame

  const frontOpacity =
    transition?.kind === 'fade' ? transition.progress : transition?.kind === 'push' ? 1 : 1

  const frontTranslateX = transition?.kind === 'push' ? `${(1 - transition.progress) * 100}%` : '0'

  return (
    <div ref={outerRef} className={styles.outer}>
      <div
        className={styles.inner}
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
        }}
      >
        {/* Behind slide — visible during transition */}
        {behind && <SlideLayer renderedSlide={behind} style={{ opacity: 1 }} />}

        {/* Front (current/incoming) slide */}
        <SlideLayer
          renderedSlide={front}
          style={{
            opacity: frontOpacity,
            transform: `translateX(${frontTranslateX})`
          }}
        />

        {/* MSO layer — above transitions, unaffected by them */}
        <div className={styles.msoLayer} style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}>
          {msoElements.map((re: RenderedElement) => {
            const kind = re.element.kind as keyof typeof elementRenderers
            const Renderer = elementRenderers[kind]
            if (!Renderer) return null
            return (
              <Renderer
                key={re.element.id}
                element={re.element as TextElement & ImageElement & ShapeElement}
                state={re}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
