import type { MsoMaster } from '@shared/model/types'
import type { ShapeLibrary, ShapeLibraryEntry } from '@shared/shapes/types'
import libraryData from '../../../shared/shapes/keynote-shapes.library.json'

const shapeLibrary = libraryData as ShapeLibrary

function findShapeLibraryEntry(master: MsoMaster): ShapeLibraryEntry | null {
  if (master.type !== 'shape' || master.geometry?.type !== 'path') return null

  const pathData = master.geometry.pathData
  const baseWidth = master.geometry.baseWidth
  const baseHeight = master.geometry.baseHeight

  if (!pathData || baseWidth == null || baseHeight == null) return null

  return (
    shapeLibrary.shapes.find(
      (entry) =>
        entry.template.path.d === pathData &&
        entry.template.path.baseWidth === baseWidth &&
        entry.template.path.baseHeight === baseHeight
    ) ?? null
  )
}

export function getMasterDisplayName(master: MsoMaster | null | undefined): string {
  if (!master) return 'Object'
  if (master.name?.trim()) return master.name

  if (master.type === 'text' && master.content.type === 'text') {
    const firstRun = master.content.value.blocks[0]?.runs[0]?.text?.trim()
    if (firstRun) return firstRun
  }

  const shapeEntry = findShapeLibraryEntry(master)
  if (shapeEntry) return shapeEntry.name || shapeEntry.template.name

  return master.type.charAt(0).toUpperCase() + master.type.slice(1)
}
