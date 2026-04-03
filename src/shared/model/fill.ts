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
    stops: [
      { offset: 0, color: baseColor },
      { offset: 1, color: '#ffffff' }
    ]
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
