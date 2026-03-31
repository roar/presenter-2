// The serialisable document model.
// Plain TypeScript types only — no framework dependencies, no UI state.
// This is exactly what gets written to / read from disk.

export type ElementId = string
export type SlideId = string
export type DocumentId = string

export interface Document {
  id: DocumentId
  title: string
  slides: Slide[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface Slide {
  id: SlideId
  elements: Element[]
}

// Union type — extend with more element kinds over time
export type Element = TextElement | ImageElement

export interface BaseElement {
  id: ElementId
  x: number // position from slide left, in points
  y: number // position from slide top, in points
  width: number
  height: number
  rotation: number // degrees
}

export interface TextElement extends BaseElement {
  kind: 'text'
  content: string // plain text for now; rich text later
  fontSize: number
  fontWeight: number
  color: string // CSS color string
  align: 'left' | 'center' | 'right'
}

export interface ImageElement extends BaseElement {
  kind: 'image'
  src: string // relative path (Electron) or data URL (web)
}

// Slide dimensions in points (same as Keynote default)
export const SLIDE_WIDTH = 1920
export const SLIDE_HEIGHT = 1080
