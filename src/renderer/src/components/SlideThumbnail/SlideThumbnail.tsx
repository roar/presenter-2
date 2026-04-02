import React, { useEffect, useRef, useState } from 'react'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'
import type { RenderedSlide } from '@shared/animation/types'
import { SlideLayer } from '../../../../viewer/src/components/SlideLayer/SlideLayer'

interface SlideThumbnailProps {
  renderedSlide: RenderedSlide
}

export function SlideThumbnail({ renderedSlide }: SlideThumbnailProps): React.JSX.Element {
  const [containerWidth, setContainerWidth] = useState(160)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width || 160)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = containerWidth / SLIDE_WIDTH
  const height = Math.round((containerWidth * SLIDE_HEIGHT) / SLIDE_WIDTH)

  return (
    <div ref={wrapperRef} style={{ width: '100%', height, overflow: 'hidden' }}>
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        <SlideLayer renderedSlide={renderedSlide} />
      </div>
    </div>
  )
}
