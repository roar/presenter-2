import type {
  Document,
  SlideNode,
  TextElement,
  ImageElement,
  ShapeElement,
  Presentation,
  MsoMaster,
  MasterId,
  Content
} from './types'
import {
  createPresentation,
  createSlide,
  createMsoMaster,
  createAppearance,
  createTextContent
} from './factories'

type LeafElement = TextElement | ImageElement | ShapeElement

function flattenLeaves(nodes: SlideNode[]): LeafElement[] {
  const result: LeafElement[] = []
  for (const node of nodes) {
    if (node.kind === 'group') {
      result.push(...flattenLeaves(node.children))
    } else {
      result.push(node)
    }
  }
  return result
}

function contentFromElement(el: LeafElement): Content {
  if (el.kind === 'text') {
    return { type: 'text', value: createTextContent(el.content) }
  }
  if (el.kind === 'image') {
    return { type: 'image', src: el.src }
  }
  return { type: 'none' }
}

function masterFromElement(el: LeafElement): MsoMaster {
  const type = el.kind === 'text' ? 'text' : el.kind === 'image' ? 'image' : 'shape'
  const master = createMsoMaster(type)
  master.transform = {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation
  }
  master.content = contentFromElement(el)
  if (el.kind === 'text') {
    master.style = {
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontFamily: el.fontFamily,
      fill: el.color
    }
  }
  if (el.kind === 'shape') {
    master.geometry = { type: 'path', pathData: el.pathData }
    master.style = {
      fill: el.fill.color,
      stroke: el.stroke.color,
      strokeWidth: el.stroke.width,
      opacity: el.fill.opacity
    }
  }
  return master
}

/**
 * Converts a v0 Document (flat element tree) to the normalised Presentation
 * model. One MsoMaster is created per unique element. Elements that share a
 * legacy masterId are mapped to the same master across all slides.
 *
 * Cues and animations are dropped — they will be re-expressed using the new
 * animation model in Phase 3.
 */
export function migrateV0ToV1(legacyDoc: Document): Presentation {
  const presentation = createPresentation()
  presentation.id = legacyDoc.id
  presentation.title = legacyDoc.title
  presentation.ownerId = legacyDoc.ownerId
  presentation.isPublished = legacyDoc.isPublished
  presentation.createdAt = legacyDoc.createdAt
  presentation.updatedAt = legacyDoc.updatedAt
  if (legacyDoc.recording) presentation.recording = legacyDoc.recording

  // Maps legacy element.masterId → new MasterId (for MSO deduplication)
  const legacyMasterIdMap = new Map<string, MasterId>()

  for (const legacySlide of legacyDoc.slides) {
    const slide = createSlide()
    slide.id = legacySlide.id
    if (legacySlide.background) {
      slide.background = { color: legacySlide.background }
    }

    presentation.slideOrder.push(slide.id)
    presentation.slidesById[slide.id] = slide

    const leaves = flattenLeaves(legacySlide.children)

    for (const el of leaves) {
      let masterId: MasterId

      if (el.masterId && legacyMasterIdMap.has(el.masterId)) {
        // MSO element — reuse the master created for its first occurrence
        masterId = legacyMasterIdMap.get(el.masterId)!
      } else {
        const master = masterFromElement(el)
        masterId = master.id
        if (el.masterId) {
          legacyMasterIdMap.set(el.masterId, masterId)
        }
        presentation.mastersById[masterId] = master
      }

      const appearance = createAppearance(masterId, slide.id)
      slide.appearanceIds.push(appearance.id)
      presentation.appearancesById[appearance.id] = appearance
    }
  }

  return presentation
}

/**
 * Detects whether a raw JSON object is a v0 Document (pre-normalisation).
 * Used by the repository layer to decide whether to migrate on load.
 */
export function isLegacyDocument(raw: unknown): raw is Document {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'slides' in raw &&
    Array.isArray((raw as Record<string, unknown>).slides) &&
    !('slideOrder' in raw)
  )
}
