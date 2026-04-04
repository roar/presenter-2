import React, { useEffect, useRef } from 'react'
import type { GrainEffect } from '@shared/model/types'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'

interface GrainCanvasProps {
  grain: GrainEffect
}

const imageDataCache = new Map<number, ImageData>()

function getGrainImageData(seed: number): ImageData {
  const cached = imageDataCache.get(seed)
  if (cached) return cached
  if (imageDataCache.size > 8) imageDataCache.clear()

  const imageData = new ImageData(SLIDE_WIDTH, SLIDE_HEIGHT)
  const data = imageData.data

  let s = (seed | 0) >>> 0 || 1
  for (let i = 0; i < data.length; i += 4) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const v = s >>> 24
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }

  imageDataCache.set(seed, imageData)
  return imageData
}

export function GrainCanvas({ grain }: GrainCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.putImageData(getGrainImageData(grain.seed), 0, 0)
  }, [grain.seed])

  return (
    <canvas
      ref={canvasRef}
      width={SLIDE_WIDTH}
      height={SLIDE_HEIGHT}
      style={{
        position: 'absolute',
        inset: 0,
        mixBlendMode: grain.blendMode,
        opacity: grain.intensity,
        pointerEvents: 'none'
      }}
    />
  )
}
