import { describe, it, expect } from 'vitest'
import { migrateV0ToV1 } from './migration'
import type { Document, LegacySlide, TextElement } from './types'

function makeTextEl(id: string, overrides: Partial<TextElement> = {}): TextElement {
  return {
    kind: 'text',
    id,
    x: 100,
    y: 100,
    width: 400,
    height: 100,
    rotation: 0,
    content: 'Hello',
    fontSize: 24,
    fontWeight: 400,
    color: '#fff',
    align: 'left',
    ...overrides
  }
}

function makeSlide(id: string, children: LegacySlide['children'] = []): LegacySlide {
  return { id, children, cues: [] }
}

function makeDoc(slides: LegacySlide[]): Document {
  return {
    id: 'doc-1',
    title: 'Test',
    slides,
    ownerId: null,
    isPublished: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
}

describe('migrateV0ToV1', () => {
  it('preserves document metadata', () => {
    const doc = makeDoc([])
    const pres = migrateV0ToV1(doc)
    expect(pres.id).toBe('doc-1')
    expect(pres.title).toBe('Test')
    expect(pres.ownerId).toBeNull()
    expect(pres.isPublished).toBe(false)
  })

  it('converts slide order correctly', () => {
    const doc = makeDoc([makeSlide('s-1'), makeSlide('s-2')])
    const pres = migrateV0ToV1(doc)
    expect(pres.slideOrder).toEqual(['s-1', 's-2'])
    expect(pres.slidesById['s-1']).toBeDefined()
    expect(pres.slidesById['s-2']).toBeDefined()
  })

  it('converts a legacy text element to one master and one appearance', () => {
    const doc = makeDoc([makeSlide('s-1', [makeTextEl('el-1')])])
    const pres = migrateV0ToV1(doc)

    expect(Object.keys(pres.mastersById)).toHaveLength(1)
    expect(Object.keys(pres.appearancesById)).toHaveLength(1)

    const appearance = Object.values(pres.appearancesById)[0]
    expect(appearance.slideId).toBe('s-1')
    expect(pres.slidesById['s-1'].appearanceIds).toHaveLength(1)
    expect(pres.slidesById['s-1'].appearanceIds[0]).toBe(appearance.id)
  })

  it('creates a text master with TextContent from element content', () => {
    const doc = makeDoc([makeSlide('s-1', [makeTextEl('el-1', { content: 'World' })])])
    const pres = migrateV0ToV1(doc)

    const master = Object.values(pres.mastersById)[0]
    expect(master.type).toBe('text')
    expect(master.content.type).toBe('text')
    if (master.content.type === 'text') {
      expect(master.content.value.blocks[0].runs[0].text).toBe('World')
    }
  })

  it('maps MSO elements with shared masterId to the same master across slides', () => {
    const doc = makeDoc([
      makeSlide('s-1', [makeTextEl('el-1', { masterId: 'mso-logo' })]),
      makeSlide('s-2', [makeTextEl('el-2', { masterId: 'mso-logo' })])
    ])
    const pres = migrateV0ToV1(doc)

    // One master shared across two slides
    expect(Object.keys(pres.mastersById)).toHaveLength(1)
    // Two appearances — one per slide
    expect(Object.keys(pres.appearancesById)).toHaveLength(2)

    const appearances = Object.values(pres.appearancesById)
    expect(appearances[0].masterId).toBe(appearances[1].masterId)
  })

  it('creates separate masters for elements without a masterId', () => {
    const doc = makeDoc([makeSlide('s-1', [makeTextEl('el-1'), makeTextEl('el-2')])])
    const pres = migrateV0ToV1(doc)

    expect(Object.keys(pres.mastersById)).toHaveLength(2)
    expect(Object.keys(pres.appearancesById)).toHaveLength(2)
  })

  it('preserves slide background color', () => {
    const slide: LegacySlide = { id: 's-1', children: [], cues: [], background: '#1a1a2e' }
    const pres = migrateV0ToV1(makeDoc([slide]))
    expect(pres.slidesById['s-1'].background.color).toBe('#1a1a2e')
  })

  it('copies transform from legacy element', () => {
    const el = makeTextEl('el-1', { x: 50, y: 60, width: 300, height: 150, rotation: 45 })
    const pres = migrateV0ToV1(makeDoc([makeSlide('s-1', [el])]))

    const master = Object.values(pres.mastersById)[0]
    expect(master.transform.x).toBe(50)
    expect(master.transform.y).toBe(60)
    expect(master.transform.width).toBe(300)
    expect(master.transform.height).toBe(150)
    expect(master.transform.rotation).toBe(45)
  })

  it('starts with revision 0', () => {
    const pres = migrateV0ToV1(makeDoc([]))
    expect(pres.revision).toBe(0)
  })

  it('initialises animationGroupTemplatesById as empty', () => {
    const pres = migrateV0ToV1(makeDoc([]))
    expect(pres.animationGroupTemplatesById).toEqual({})
  })
})
