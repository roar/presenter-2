import React, { useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import { useDocumentStore } from '../../store/documentStore'
import { ImageView } from './ImageView'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import styles from './SlideCanvas.module.css'

export function SlideCanvas(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)

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

  const slide = selectedSlideId != null ? document?.slidesById[selectedSlideId] : null

  const appearances =
    slide != null && document != null
      ? slide.appearanceIds
          .map((id) => document.appearancesById[id])
          .filter(Boolean)
          .sort((a, b) => a.zIndex - b.zIndex)
      : []

  return (
    <div ref={outerRef} className={styles.outer}>
      {slide != null && document != null && (
        <div
          data-testid="slide"
          className={styles.inner}
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            backgroundColor: slide.background.color ?? '#ffffff',
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
          }}
        >
          {appearances.map((appearance) => {
            const master = document.mastersById[appearance.masterId]
            if (!master) return null
            if (master.type === 'shape')
              return <ShapeView key={appearance.id} master={master} appearance={appearance} />
            if (master.type === 'text')
              return <TextView key={appearance.id} master={master} appearance={appearance} />
            if (master.type === 'image')
              return <ImageView key={appearance.id} master={master} appearance={appearance} />
            return null
          })}
        </div>
      )}
    </div>
  )
}
