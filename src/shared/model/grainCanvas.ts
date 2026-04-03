// Canvas-based LCG grain tile generation.
// Requires browser context (document.createElement must be available).

import type { GrainEffect } from './types'

const tileCache = new Map<string, string>()

function buildLcgTileDataUrl(seed: number, size: number): string {
  const key = `${seed}|${size}`
  const cached = tileCache.get(key)
  if (cached) return cached
  if (tileCache.size > 32) tileCache.clear()

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
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
  ctx.putImageData(imageData, 0, 0)

  const url = canvas.toDataURL('image/png')
  tileCache.set(key, url)
  return url
}

function getGrainTileSize(scale: number): number {
  return Math.max(32, Math.min(256, Math.round(128 * scale)))
}

export function buildGrainBackgroundImage(grain: GrainEffect): string {
  const size = getGrainTileSize(grain.scale)
  return `url(${buildLcgTileDataUrl(grain.seed, size)})`
}

export function getGrainBackgroundSize(grain: GrainEffect): string {
  const size = getGrainTileSize(grain.scale)
  return `${size}px ${size}px`
}
