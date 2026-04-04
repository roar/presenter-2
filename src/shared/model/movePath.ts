import type { Animation, MovePath, Position } from './types'

function getMovePathEndpoint(path: MovePath | undefined): Position | null {
  if (!path || path.points.length === 0) return null
  return path.points[path.points.length - 1].position
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
