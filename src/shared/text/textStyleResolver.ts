import type {
  TextMark,
  TextPosition,
  TextRange,
  TextStyle,
  TextStyleBinding,
  TextStyleDefinition,
  TextStyleProperties
} from '../model/types'

export interface ResolveTextStyleInput {
  boxStyle?: TextStyle
  styleDefinitionsById: Record<string, TextStyleDefinition>
  styleBindings: TextStyleBinding[]
  position: TextPosition
  marks: TextMark[]
}

function comparePositions(left: TextPosition, right: TextPosition): number {
  if (left.blockId !== right.blockId) {
    return left.blockId.localeCompare(right.blockId)
  }

  if (left.runId !== right.runId) {
    return left.runId.localeCompare(right.runId)
  }

  return left.offset - right.offset
}

function isPositionInRange(position: TextPosition, range: TextRange): boolean {
  return comparePositions(position, range.start) >= 0 && comparePositions(position, range.end) < 0
}

function applyPatch(
  base: TextStyleProperties,
  patch: Partial<TextStyleProperties> | undefined
): TextStyleProperties {
  return patch ? { ...base, ...patch } : base
}

function resolveMarks(base: TextStyleProperties, marks: TextMark[]): TextStyleProperties {
  let resolved = { ...base }

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        resolved = { ...resolved, fontWeight: 700 }
        break
      case 'italic':
        resolved = { ...resolved, fontFamily: resolved.fontFamily }
        break
      case 'underline':
        break
      case 'color':
        resolved = mark.value ? { ...resolved, color: mark.value } : resolved
        break
    }
  }

  return resolved
}

export function resolveEffectiveTextStyle(input: ResolveTextStyleInput): TextStyleProperties {
  let resolved = { ...(input.boxStyle?.defaultState ?? {}) }

  for (const binding of input.styleBindings) {
    if (!isPositionInRange(input.position, binding.range)) {
      continue
    }

    const definition = input.styleDefinitionsById[binding.styleId]
    if (!definition) {
      continue
    }

    resolved = applyPatch(resolved, definition.defaultState)
    resolved = applyPatch(
      resolved,
      binding.activeState ? definition.namedStates[binding.activeState] : undefined
    )
  }

  return resolveMarks(resolved, input.marks)
}
