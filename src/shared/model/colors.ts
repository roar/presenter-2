import type {
  Color,
  ColorConstant,
  ColorConstantId,
  Fill,
  MsoMaster,
  Presentation,
  Slide,
  TargetedAnimation,
  TextMark
} from './types'
import { countGradientStopUsage, detachGradientColorUsages, isGradientFill } from './fill'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isColorReference(
  color: Color | undefined | null
): color is { kind: 'constant'; colorId: ColorConstantId } {
  return isObject(color) && color.kind === 'constant' && typeof color.colorId === 'string'
}

export function resolveColorValue(
  color: Color | undefined,
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
): string | undefined {
  if (!color) return undefined
  if (typeof color === 'string') return color
  return colorConstantsById?.[color.colorId]?.value
}

function ensureColorConstant(
  presentation: Presentation,
  value: string,
  valueToId: Map<string, ColorConstantId>
): ColorConstantId {
  presentation.colorConstantsById ??= {}
  const existingId = valueToId.get(value)
  if (existingId) return existingId

  const id = crypto.randomUUID()
  const nextIndex = Object.keys(presentation.colorConstantsById).length + 1
  presentation.colorConstantsById[id] = {
    id,
    name: `Color ${nextIndex}`,
    value
  }
  valueToId.set(value, id)
  return id
}

function normalizeColorField(
  presentation: Presentation,
  current: Color | undefined,
  assign: (color: Color | undefined) => void,
  valueToId: Map<string, ColorConstantId>
): void {
  if (!current) return
  if (isColorReference(current)) return
  const id = ensureColorConstant(presentation, current, valueToId)
  assign({ kind: 'constant', colorId: id })
}

function normalizeFillField(
  presentation: Presentation,
  current: Fill | undefined,
  assign: (fill: Fill | undefined) => void,
  valueToId: Map<string, ColorConstantId>
): void {
  if (!current) return

  if (!isGradientFill(current)) {
    normalizeColorField(presentation, current, assign, valueToId)
    return
  }

  assign({
    ...current,
    stops: current.stops.map((stop) => {
      if (isColorReference(stop.color)) return stop

      const id = ensureColorConstant(presentation, stop.color, valueToId)
      return {
        ...stop,
        color: { kind: 'constant', colorId: id }
      }
    })
  })
}

function normalizeTextMarks(
  presentation: Presentation,
  marks: TextMark[],
  valueToId: Map<string, ColorConstantId>
): void {
  for (const mark of marks) {
    if (mark.type !== 'color' || !mark.value) continue
    normalizeColorField(
      presentation,
      mark.value,
      (value) => {
        mark.value = value
      },
      valueToId
    )
  }
}

function normalizeSlideColors(
  presentation: Presentation,
  slide: Slide,
  valueToId: Map<string, ColorConstantId>
): void {
  normalizeColorField(
    presentation,
    slide.background.color,
    (value) => {
      slide.background.color = value
    },
    valueToId
  )
}

function normalizeMasterColors(
  presentation: Presentation,
  master: MsoMaster,
  valueToId: Map<string, ColorConstantId>
): void {
  normalizeFillField(
    presentation,
    master.objectStyle.defaultState.fill,
    (value) => {
      master.objectStyle.defaultState.fill = value
    },
    valueToId
  )
  normalizeColorField(
    presentation,
    master.objectStyle.defaultState.stroke,
    (value) => {
      master.objectStyle.defaultState.stroke = value
    },
    valueToId
  )

  for (const state of Object.values(master.objectStyle.namedStates)) {
    normalizeFillField(
      presentation,
      state.fill,
      (value) => {
        state.fill = value
      },
      valueToId
    )
    normalizeColorField(
      presentation,
      state.stroke,
      (value) => {
        state.stroke = value
      },
      valueToId
    )
  }

  if (master.textStyle) {
    normalizeColorField(
      presentation,
      master.textStyle.defaultState.color,
      (value) => {
        if (master.textStyle) {
          master.textStyle.defaultState.color = value
        }
      },
      valueToId
    )
    normalizeColorField(
      presentation,
      master.textStyle.defaultState.textShadow?.color,
      (value) => {
        if (master.textStyle?.defaultState.textShadow) {
          master.textStyle.defaultState.textShadow.color =
            value ?? master.textStyle.defaultState.textShadow.color
        }
      },
      valueToId
    )

    for (const state of Object.values(master.textStyle.namedStates)) {
      normalizeColorField(
        presentation,
        state.color,
        (value) => {
          state.color = value
        },
        valueToId
      )
      normalizeColorField(
        presentation,
        state.textShadow?.color,
        (value) => {
          if (state.textShadow) {
            state.textShadow.color = value ?? state.textShadow.color
          }
        },
        valueToId
      )
    }
  }

  if (master.content.type === 'text') {
    for (const block of master.content.value.blocks) {
      for (const run of block.runs) {
        normalizeTextMarks(presentation, run.marks, valueToId)
      }
    }
  }
}

function normalizeAnimationColors(
  presentation: Presentation,
  animation: TargetedAnimation,
  valueToId: Map<string, ColorConstantId>
): void {
  if (animation.effect.type !== 'text-shadow') return
  normalizeColorField(
    presentation,
    animation.effect.to.color,
    (value) => {
      animation.effect.to.color = value ?? animation.effect.to.color
    },
    valueToId
  )
}

export function ensurePresentationColorConstants(presentation: Presentation): void {
  presentation.colorConstantsById ??= {}
  const valueToId = new Map<string, ColorConstantId>()

  for (const colorConstant of Object.values(presentation.colorConstantsById)) {
    valueToId.set(colorConstant.value, colorConstant.id)
  }

  for (const slide of Object.values(presentation.slidesById)) {
    normalizeSlideColors(presentation, slide, valueToId)
  }
  for (const master of Object.values(presentation.mastersById)) {
    normalizeMasterColors(presentation, master, valueToId)
  }
  for (const animation of Object.values(presentation.animationsById)) {
    normalizeAnimationColors(presentation, animation, valueToId)
  }
}

export function createOrReuseColorConstant(
  presentation: Presentation,
  value: string,
  preferredName?: string
): ColorConstantId {
  presentation.colorConstantsById ??= {}

  for (const colorConstant of Object.values(presentation.colorConstantsById)) {
    if (colorConstant.value === value) {
      if (preferredName && !colorConstant.name.trim()) {
        colorConstant.name = preferredName
      }
      return colorConstant.id
    }
  }

  const id = crypto.randomUUID()
  const nextIndex = Object.keys(presentation.colorConstantsById).length + 1
  presentation.colorConstantsById[id] = {
    id,
    name: preferredName?.trim() || `Color ${nextIndex}`,
    value
  }
  return id
}

function countColorUsageField(color: Color | Fill | undefined, colorId: ColorConstantId): number {
  if (isGradientFill(color)) return 0
  return isColorReference(color) && color.colorId === colorId ? 1 : 0
}

function detachColorField(
  color: Color | Fill | undefined,
  colorId: ColorConstantId,
  fallbackValue: string
): Color | Fill | undefined {
  if (isGradientFill(color)) return color
  if (isColorReference(color) && color.colorId === colorId) {
    return fallbackValue
  }
  return color
}

export function getColorConstantUsageCount(
  presentation: Presentation,
  colorId: ColorConstantId
): number {
  let count = 0

  for (const slide of Object.values(presentation.slidesById)) {
    count += countColorUsageField(slide.background.color, colorId)
  }

  for (const master of Object.values(presentation.mastersById)) {
    count += countColorUsageField(master.objectStyle.defaultState.fill, colorId)
    count += countGradientStopUsage(master.objectStyle.defaultState.fill, colorId)
    count += countColorUsageField(master.objectStyle.defaultState.stroke, colorId)

    for (const state of Object.values(master.objectStyle.namedStates)) {
      count += countColorUsageField(state.fill, colorId)
      count += countGradientStopUsage(state.fill, colorId)
      count += countColorUsageField(state.stroke, colorId)
    }

    if (master.textStyle) {
      count += countColorUsageField(master.textStyle.defaultState.color, colorId)
      count += countColorUsageField(master.textStyle.defaultState.textShadow?.color, colorId)

      for (const state of Object.values(master.textStyle.namedStates)) {
        count += countColorUsageField(state.color, colorId)
        count += countColorUsageField(state.textShadow?.color, colorId)
      }
    }

    if (master.content.type === 'text') {
      for (const block of master.content.value.blocks) {
        for (const run of block.runs) {
          for (const mark of run.marks) {
            if (mark.type === 'color') {
              count += countColorUsageField(mark.value, colorId)
            }
          }
        }
      }
    }
  }

  for (const animation of Object.values(presentation.animationsById)) {
    if (animation.effect.type === 'text-shadow') {
      count += countColorUsageField(animation.effect.to.color, colorId)
    }
  }

  return count
}

export function detachColorConstantUsages(
  presentation: Presentation,
  colorId: ColorConstantId
): void {
  const fallbackValue = presentation.colorConstantsById?.[colorId]?.value
  if (!fallbackValue) return

  for (const slide of Object.values(presentation.slidesById)) {
    slide.background.color = detachColorField(slide.background.color, colorId, fallbackValue)
  }

  for (const master of Object.values(presentation.mastersById)) {
    master.objectStyle.defaultState.fill = detachColorField(
      master.objectStyle.defaultState.fill,
      colorId,
      fallbackValue
    )
    master.objectStyle.defaultState.fill = detachGradientColorUsages(
      master.objectStyle.defaultState.fill,
      colorId,
      fallbackValue
    )
    master.objectStyle.defaultState.stroke = detachColorField(
      master.objectStyle.defaultState.stroke,
      colorId,
      fallbackValue
    )

    for (const state of Object.values(master.objectStyle.namedStates)) {
      state.fill = detachColorField(state.fill, colorId, fallbackValue)
      state.fill = detachGradientColorUsages(state.fill, colorId, fallbackValue)
      state.stroke = detachColorField(state.stroke, colorId, fallbackValue)
    }

    if (master.textStyle) {
      master.textStyle.defaultState.color = detachColorField(
        master.textStyle.defaultState.color,
        colorId,
        fallbackValue
      )
      if (master.textStyle.defaultState.textShadow) {
        master.textStyle.defaultState.textShadow.color =
          detachColorField(
            master.textStyle.defaultState.textShadow.color,
            colorId,
            fallbackValue
          ) ?? master.textStyle.defaultState.textShadow.color
      }

      for (const state of Object.values(master.textStyle.namedStates)) {
        state.color = detachColorField(state.color, colorId, fallbackValue)
        if (state.textShadow) {
          state.textShadow.color =
            detachColorField(state.textShadow.color, colorId, fallbackValue) ??
            state.textShadow.color
        }
      }
    }

    if (master.content.type === 'text') {
      for (const block of master.content.value.blocks) {
        for (const run of block.runs) {
          for (const mark of run.marks) {
            if (mark.type === 'color') {
              mark.value = detachColorField(mark.value, colorId, fallbackValue)
            }
          }
        }
      }
    }
  }

  for (const animation of Object.values(presentation.animationsById)) {
    if (animation.effect.type === 'text-shadow') {
      animation.effect.to.color =
        detachColorField(animation.effect.to.color, colorId, fallbackValue) ??
        animation.effect.to.color
    }
  }
}

export function deleteColorConstant(presentation: Presentation, colorId: ColorConstantId): void {
  detachColorConstantUsages(presentation, colorId)
  delete presentation.colorConstantsById?.[colorId]
}
