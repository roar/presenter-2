import type { Animation, MovePath, Position } from './types'

export function getMovePathEndpoint(path: MovePath | undefined): Position | null {
  if (!path || path.points.length === 0) return null
  return path.points[path.points.length - 1].position
}

export function withMovePathEndpoint(
  path: MovePath | undefined,
  endpoint: Position
): MovePath | undefined {
  if (!path) return undefined
  if (path.points.length === 0) return { points: [] }

  return {
    points: path.points.map((point, index, points) =>
      index === points.length - 1 ? { ...point, position: endpoint } : point
    )
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function sampleCubic(a: number, b: number, c: number, d: number, t: number): number {
  const mt = 1 - t
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d
}

export function getMovePathPositionAt(
  path: MovePath | undefined,
  progress: number
): Position | null {
  if (!path || path.points.length === 0) return null
  if (path.points.length === 1) return path.points[0].position

  const clampedProgress = Math.min(Math.max(progress, 0), 1)
  const segmentCount = path.points.length - 1
  const scaled = clampedProgress * segmentCount
  const segmentIndex =
    clampedProgress >= 1 ? segmentCount - 1 : Math.min(Math.floor(scaled), segmentCount - 1)
  const localT = clampedProgress >= 1 ? 1 : scaled - segmentIndex
  const start = path.points[segmentIndex]
  const end = path.points[segmentIndex + 1]

  if (!start || !end) return getMovePathEndpoint(path)

  if (!start.outHandle && !end.inHandle) {
    return {
      x: lerp(start.position.x, end.position.x, localT),
      y: lerp(start.position.y, end.position.y, localT)
    }
  }

  const control1 = start.outHandle ?? start.position
  const control2 = end.inHandle ?? end.position
  return {
    x: sampleCubic(start.position.x, control1.x, control2.x, end.position.x, localT),
    y: sampleCubic(start.position.y, control1.y, control2.y, end.position.y, localT)
  }
}

export function getMoveEffectDelta(effect: Extract<Animation, { type: 'move' }>): Position {
  const endpoint = getMovePathEndpoint(effect.path)
  if (endpoint) return endpoint
  if ('delta' in effect) return effect.delta
  return effect.fromOffset
}

export function syncMoveEffectDelta(
  effect: Extract<Animation, { type: 'move' }>,
  delta: Position
): void {
  effect.delta = delta

  const endpoint = effect.path?.points[effect.path.points.length - 1]
  if (endpoint) {
    endpoint.position = delta
  }
}

export function syncMoveEffectPath(
  effect: Extract<Animation, { type: 'move' }>,
  path: MovePath | undefined
): void {
  effect.path = path
  effect.delta = getMoveEffectDelta(effect)
}
