import { describe, it, expect } from 'vitest'
import {
  createPresentation,
  createSlide,
  createMsoMaster,
  createAppearance,
  createTextContent,
  createAnimationGroupTemplate
} from './factories'

describe('createPresentation', () => {
  it('creates a presentation with empty maps and revision 0', () => {
    const p = createPresentation()
    expect(p.slideOrder).toEqual([])
    expect(p.slidesById).toEqual({})
    expect(p.mastersById).toEqual({})
    expect(p.appearancesById).toEqual({})
    expect(p.animationsById).toEqual({})
    expect(p.animationGroupTemplatesById).toEqual({})
    expect(p.textDecorationsById).toEqual({})
    expect(p.revision).toBe(0)
  })

  it('assigns a unique id', () => {
    const a = createPresentation()
    const b = createPresentation()
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})

describe('createSlide', () => {
  it('creates a slide with empty appearanceIds and background', () => {
    const s = createSlide()
    expect(s.appearanceIds).toEqual([])
    expect(s.background).toEqual({})
    expect(s.id).toBeTruthy()
  })
})

describe('createMsoMaster', () => {
  it('creates a master with the given type and version 0', () => {
    const m = createMsoMaster('text')
    expect(m.type).toBe('text')
    expect(m.version).toBe(0)
    expect(m.id).toBeTruthy()
  })
})

describe('createAppearance', () => {
  it('creates an appearance linking masterId and slideId', () => {
    const a = createAppearance('master-1', 'slide-1')
    expect(a.masterId).toBe('master-1')
    expect(a.slideId).toBe('slide-1')
    expect(a.animationIds).toEqual([])
    expect(a.zIndex).toBe(0)
    expect(a.initialVisibility).toBe('visible')
    expect(a.version).toBe(0)
    expect(a.id).toBeTruthy()
  })
})

describe('createAnimationGroupTemplate', () => {
  it('creates a template with the given name and empty members', () => {
    const t = createAnimationGroupTemplate('Pop In')
    expect(t.name).toBe('Pop In')
    expect(t.members).toEqual([])
    expect(t.id).toBeTruthy()
  })

  it('assigns a unique id each time', () => {
    const a = createAnimationGroupTemplate('A')
    const b = createAnimationGroupTemplate('B')
    expect(a.id).not.toBe(b.id)
  })
})

describe('createTextContent', () => {
  it('produces one block with one run and no marks from plain text', () => {
    const content = createTextContent('hello')
    expect(content.blocks).toHaveLength(1)
    expect(content.blocks[0].runs).toHaveLength(1)
    expect(content.blocks[0].runs[0].text).toBe('hello')
    expect(content.blocks[0].runs[0].marks).toEqual([])
  })

  it('assigns unique ids to block and run', () => {
    const content = createTextContent('x')
    expect(content.blocks[0].id).toBeTruthy()
    expect(content.blocks[0].runs[0].id).toBeTruthy()
  })

  it('produces one block with one empty run for empty string', () => {
    const content = createTextContent('')
    expect(content.blocks).toHaveLength(1)
    expect(content.blocks[0].runs[0].text).toBe('')
  })
})
