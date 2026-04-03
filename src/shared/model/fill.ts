import type {
  Color,
  ColorConstant,
  ColorConstantId,
  Fill,
  GradientStop,
  LinearGradientFill,
  RadialGradientFill
} from './types'

function isColorReference(
  color: Color | undefined | null
): color is { kind: 'constant'; colorId: ColorConstantId } {
  return typeof color === 'object' && color !== null && color.kind === 'constant'
}

function resolveSolidColorValue(
  color: Color | undefined,
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
): string | undefined {
  if (!color) return undefined
  if (typeof color === 'string') return color
  return colorConstantsById?.[color.colorId]?.value
}

export function isGradientFill(
  fill: Fill | undefined | null
): fill is LinearGradientFill | RadialGradientFill {
  return (
    typeof fill === 'object' &&
    fill !== null &&
    'kind' in fill &&
    (fill.kind === 'linear-gradient' || fill.kind === 'radial-gradient')
  )
}

export function createDefaultGradientFill(baseColor: Color = '#000000'): LinearGradientFill {
  return {
    kind: 'linear-gradient',
    rotation: 90,
    x1: 0.5,
    y1: 0,
    x2: 0.5,
    y2: 1,
    stops: [
      { offset: 0, color: baseColor },
      { offset: 1, color: '#ffffff' }
    ]
  }
}

function normalizeAngle(angle: number): number {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function buildEndpointsFromAngle(angle: number, centerX = 0.5, centerY = 0.5, halfLength = 0.5) {
  const radians = (angle * Math.PI) / 180
  const deltaX = Math.cos(radians) * halfLength
  const deltaY = Math.sin(radians) * halfLength

  return {
    x1: centerX - deltaX,
    y1: centerY - deltaY,
    x2: centerX + deltaX,
    y2: centerY + deltaY
  }
}

export function resolveLinearGradientEndpoints(fill: LinearGradientFill): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  if (fill.x1 != null && fill.y1 != null && fill.x2 != null && fill.y2 != null) {
    return {
      x1: fill.x1,
      y1: fill.y1,
      x2: fill.x2,
      y2: fill.y2
    }
  }

  return buildEndpointsFromAngle(fill.rotation)
}

export function getLinearGradientAngle(fill: LinearGradientFill): number {
  const { x1, y1, x2, y2 } = resolveLinearGradientEndpoints(fill)
  return normalizeAngle((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI)
}

export function setLinearGradientAngle(
  fill: LinearGradientFill,
  angle: number
): LinearGradientFill {
  const { x1, y1, x2, y2 } = resolveLinearGradientEndpoints(fill)
  const centerX = (x1 + x2) / 2
  const centerY = (y1 + y2) / 2
  const halfLength = Math.hypot(x2 - x1, y2 - y1) / 2 || 0.5

  return {
    ...fill,
    rotation: normalizeAngle(angle),
    ...buildEndpointsFromAngle(angle, centerX, centerY, halfLength)
  }
}

export function setLinearGradientEndpoints(
  fill: LinearGradientFill,
  endpoints: { x1: number; y1: number; x2: number; y2: number }
): LinearGradientFill {
  return {
    ...fill,
    rotation: normalizeAngle(
      (Math.atan2(endpoints.y2 - endpoints.y1, endpoints.x2 - endpoints.x1) * 180) / Math.PI
    ),
    ...endpoints
  }
}

export function resolveGradientStops(
  stops: GradientStop[],
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
): Array<{ offset: number; color: string }> {
  return stops.map((stop) => ({
    offset: stop.offset,
    color: resolveSolidColorValue(stop.color, colorConstantsById) ?? '#000000'
  }))
}

export function getFillSolidColor(fill: Fill | undefined): Color | undefined {
  if (!fill || isGradientFill(fill)) return undefined
  return fill
}

export function getResolvedFillColor(
  fill: Fill | undefined,
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
): string | undefined {
  if (!fill || isGradientFill(fill)) return undefined
  return resolveSolidColorValue(fill, colorConstantsById)
}

export function updateGradientStopColor(
  fill: LinearGradientFill,
  stopIndex: number,
  color: Color
): LinearGradientFill {
  return {
    ...fill,
    stops: fill.stops.map((stop, index) => (index === stopIndex ? { ...stop, color } : stop))
  }
}

export function normalizeGradientStops<T extends LinearGradientFill | RadialGradientFill>(
  fill: T
): T {
  const sortedStops = fill.stops
    .map((stop) => ({
      ...stop,
      offset: Math.max(0, Math.min(1, stop.offset))
    }))
    .sort((a, b) => a.offset - b.offset)

  return {
    ...fill,
    stops: sortedStops
  } as T
}

export function countGradientStopUsage(fill: Fill | undefined, colorId: ColorConstantId): number {
  if (!fill || !isGradientFill(fill)) return 0
  return fill.stops.reduce(
    (count, stop) =>
      count + (isColorReference(stop.color) && stop.color.colorId === colorId ? 1 : 0),
    0
  )
}

export function detachGradientColorUsages(
  fill: Fill | undefined,
  colorId: ColorConstantId,
  fallbackValue: string
): Fill | undefined {
  if (!fill || !isGradientFill(fill)) return fill

  return {
    ...fill,
    stops: fill.stops.map((stop) => ({
      ...stop,
      color:
        isColorReference(stop.color) && stop.color.colorId === colorId ? fallbackValue : stop.color
    }))
  }
}
