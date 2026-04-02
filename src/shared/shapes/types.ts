export interface ShapeLibraryEntry {
  libraryId: string
  name: string
  categories: {
    ids: number[]
    names: string[]
  }
  template: {
    type: 'path'
    name: string
    transform: {
      x: number
      y: number
      width: number
      height: number
      rotation: number
      scaleX: number
      scaleY: number
      anchorX: number
      anchorY: number
    }
    style: {
      fill: string
      stroke: string
      strokeWidth: number
      opacity: number
    }
    path: {
      baseWidth: number
      baseHeight: number
      d: string
    }
  }
}

export interface ShapeLibraryCategory {
  id: number
  key: string
  name: string
  count: number
}

export interface ShapeLibrary {
  version: number
  kind: string
  categories: ShapeLibraryCategory[]
  byCategory: Record<string, string[]>
  shapes: ShapeLibraryEntry[]
}
