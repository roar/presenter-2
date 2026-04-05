import type { ShapeTextLineSpan } from './shapeTextLayout'
import { resolvePathTextLineSpanFromPolyline } from './pathPolylineLayout'
import { sampleSvgPathPolyline } from './svgPathPolyline'

interface PathScanGrid {
  res: number
  cw: number
  ch: number
  data: Uint8Array
}

const MAX_CACHE_ENTRIES = 50
const gridCache = new Map<string, PathScanGrid>()
const svgPathCache = new Map<string, SVGPathElement>()
let svgMeasureRoot: SVGSVGElement | null = null

export function resolvePathScanlineSpan({
  pathData,
  baseWidth,
  baseHeight,
  frameWidth,
  frameHeight,
  lineY,
  lineHeight,
  minX,
  maxX
}: {
  pathData: string
  baseWidth: number
  baseHeight: number
  frameWidth: number
  frameHeight: number
  lineY: number
  lineHeight: number
  minX?: number
  maxX?: number
}): ShapeTextLineSpan | null {
  const polylinePoints = sampleSvgPathPolyline(pathData)
  if (polylinePoints) {
    const polylineSpan = resolvePathTextLineSpanFromPolyline(
      polylinePoints,
      ((lineY + lineHeight / 2) * baseHeight) / frameHeight,
      Number.isFinite(minX)
        ? ((minX as number) * baseWidth) / frameWidth
        : Number.NEGATIVE_INFINITY,
      Number.isFinite(maxX) ? ((maxX as number) * baseWidth) / frameWidth : Number.POSITIVE_INFINITY
    )
    if (polylineSpan) {
      return {
        x: (polylineSpan.x * frameWidth) / baseWidth,
        width: (polylineSpan.width * frameWidth) / baseWidth
      }
    }
  }

  const scan = getPathScanGrid(pathData, baseWidth, baseHeight, frameWidth, frameHeight)
  if (!scan) {
    return resolvePathSvgHitTestSpan({
      pathData,
      baseWidth,
      baseHeight,
      frameWidth,
      frameHeight,
      lineY: lineY + lineHeight / 2,
      minX,
      maxX
    })
  }

  const y = Math.round((lineY + lineHeight / 2) * scan.res)
  if (y < 0 || y >= scan.ch) {
    return null
  }

  let left = -1
  let right = -1
  for (let x = 0; x < scan.cw; x += 1) {
    if (scan.data[(y * scan.cw + x) * 4 + 3] > 128) {
      if (left < 0) {
        left = x
      }
      right = x
    }
  }

  if (left < 0 || right < 0) {
    return null
  }

  let spanLeft = left / scan.res
  let spanRight = (right + 1) / scan.res

  if (Number.isFinite(minX)) {
    spanLeft = Math.max(spanLeft, minX as number)
  }
  if (Number.isFinite(maxX)) {
    spanRight = Math.min(spanRight, maxX as number)
  }

  const width = spanRight - spanLeft
  if (width > 0) {
    return { x: spanLeft, width }
  }

  return resolvePathSvgHitTestSpan({
    pathData,
    baseWidth,
    baseHeight,
    frameWidth,
    frameHeight,
    lineY: lineY + lineHeight / 2,
    minX,
    maxX
  })
}

function getPathScanGrid(
  pathData: string,
  baseWidth: number,
  baseHeight: number,
  frameWidth: number,
  frameHeight: number
): PathScanGrid | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') {
    return null
  }

  const cacheKey = `${pathData}|${baseWidth}|${baseHeight}|${frameWidth}|${frameHeight}`
  const cached = gridCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const canvas = document.createElement('canvas')
  const res = Math.min(1, 800 / Math.max(frameWidth, frameHeight))
  const cw = Math.max(1, Math.ceil(frameWidth * res))
  const ch = Math.max(1, Math.ceil(frameHeight * res))
  canvas.width = cw
  canvas.height = ch
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  context.clearRect(0, 0, cw, ch)
  context.setTransform((frameWidth * res) / baseWidth, 0, 0, (frameHeight * res) / baseHeight, 0, 0)
  context.fillStyle = '#000'
  context.fill(new Path2D(pathData))

  const scan: PathScanGrid = {
    res,
    cw,
    ch,
    data: new Uint8Array(context.getImageData(0, 0, cw, ch).data.buffer)
  }

  gridCache.set(cacheKey, scan)
  if (gridCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = gridCache.keys().next().value
    if (oldestKey) {
      gridCache.delete(oldestKey)
    }
  }

  return scan
}

function resolvePathSvgHitTestSpan({
  pathData,
  baseWidth,
  baseHeight,
  frameWidth,
  frameHeight,
  lineY,
  minX,
  maxX
}: {
  pathData: string
  baseWidth: number
  baseHeight: number
  frameWidth: number
  frameHeight: number
  lineY: number
  minX?: number
  maxX?: number
}): ShapeTextLineSpan | null {
  if (typeof document === 'undefined' || typeof DOMPoint === 'undefined') {
    return null
  }

  const path = getOrCreateSvgPath(pathData)
  const geometryPath = path as SVGPathElement & {
    isPointInFill?: (point?: DOMPointInit) => boolean
  }
  if (typeof geometryPath.isPointInFill !== 'function') {
    return null
  }

  const scaleX = frameWidth / baseWidth
  const scaleY = frameHeight / baseHeight
  const leftBound = Math.max(0, Math.floor(minX ?? 0))
  const rightBound = Math.min(frameWidth, Math.ceil(maxX ?? frameWidth))
  const point = new DOMPoint(0, lineY / scaleY)

  let left = -1
  let right = -1

  for (let x = leftBound; x <= rightBound; x += 1) {
    point.x = x / scaleX
    if (geometryPath.isPointInFill(point)) {
      if (left < 0) {
        left = x
      }
      right = x
    }
  }

  if (left < 0 || right < 0) {
    return null
  }

  return {
    x: left,
    width: right + 1 - left
  }
}

function getOrCreateSvgPath(pathData: string): SVGPathElement {
  const cached = svgPathCache.get(pathData)
  if (cached) {
    return cached
  }

  if (!svgMeasureRoot) {
    svgMeasureRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgMeasureRoot.setAttribute('width', '0')
    svgMeasureRoot.setAttribute('height', '0')
    svgMeasureRoot.style.position = 'absolute'
    svgMeasureRoot.style.opacity = '0'
    svgMeasureRoot.style.pointerEvents = 'none'
    svgMeasureRoot.style.left = '-99999px'
    svgMeasureRoot.style.top = '-99999px'
    document.body.appendChild(svgMeasureRoot)
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathData)
  svgMeasureRoot.appendChild(path)
  svgPathCache.set(pathData, path)
  return path
}
