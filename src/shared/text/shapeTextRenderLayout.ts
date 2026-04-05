import type { ShapeGeometry } from '../model/types'
import { layoutShapeTextFlow, type ShapeTextFlowResult } from './shapeTextFlow'

export interface BuildShapeTextRenderLayoutOptions {
  text: string
  geometry: ShapeGeometry | null | undefined
  frameWidth: number
  frameHeight: number
  fontSize: number
  lineHeight: number
  measureTextWidth: (text: string, fontSize: number) => number
}

export function buildShapeTextRenderLayout(
  options: BuildShapeTextRenderLayoutOptions
): ShapeTextFlowResult {
  return layoutShapeTextFlow(options)
}
