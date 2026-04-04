import { describe, it, expect } from 'vitest'
import { computeMsoExitStateChains, renderAllSlideEntryStates } from './computeSlideEntryStates'
import type {
  Presentation,
  MsoMaster,
  Appearance,
  TargetedAnimation,
  Transform
} from '../model/types'
import { createPresentation, createSlide, createAppearance } from '../model/factories'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function shapeMaster(id: string, transform?: Partial<Transform>): MsoMaster {
  return {
    id,
    type: 'shape',
    transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, ...transform },
    objectStyle: { defaultState: {}, namedStates: {} },
    content: { type: 'none' },
    version: 0
  }
}

function makeAppearance(
  masterId: string,
  slideId: string,
  initialVisibility: Appearance['initialVisibility'] = 'visible'
): Appearance {
  const app = createAppearance(masterId, slideId)
  app.initialVisibility = initialVisibility
  return app
}

function makeAnim(
  id: string,
  appearanceId: string,
  effect: TargetedAnimation['effect']
): TargetedAnimation {
  return {
    id,
    trigger: 'on-click',
    offset: 0,
    duration: 1,
    easing: 'linear',
    loop: { kind: 'none' },
    effect,
    target: { kind: 'appearance', appearanceId }
  }
}

// Build a presentation with one or more slides.
// Each slide entry: { appearances, masters, animations }
// Appearances' slideIds are set automatically.
function buildPresentation(
  slides: Array<{
    appearances: Appearance[]
    masters: MsoMaster[]
    animations?: TargetedAnimation[]
  }>
): Presentation {
  const pres = createPresentation()
  for (const { appearances, masters, animations = [] } of slides) {
    const slide = createSlide()
    slide.appearanceIds = appearances.map((a) => a.id)
    slide.animationOrder = animations.map((a) => a.id)
    for (const a of appearances) {
      a.slideId = slide.id
      pres.appearancesById[a.id] = a
    }
    for (const m of masters) pres.mastersById[m.id] = m
    for (const anim of animations) pres.animationsById[anim.id] = anim
    pres.slideOrder.push(slide.id)
    pres.slidesById[slide.id] = slide
  }
  return pres
}

// ─── computeMsoExitStateChains ────────────────────────────────────────────────

describe('computeMsoExitStateChains', () => {
  it('returns empty array for a presentation with no slides', () => {
    const pres = createPresentation()
    expect(computeMsoExitStateChains(pres)).toEqual([])
  })

  it('returns one entry per slide', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const pres = buildPresentation([
      { appearances: [app1], masters: [m] },
      { appearances: [app2], masters: [] }
    ])
    expect(computeMsoExitStateChains(pres)).toHaveLength(2)
  })

  it('slide with no MSO appearances has an empty map', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])
    const chains = computeMsoExitStateChains(pres)
    // Single appearance → not an MSO (only appears on one slide)
    expect(chains[0].size).toBe(0)
  })

  it('first slide entry is empty (no upstream appearances)', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const pres = buildPresentation([
      { appearances: [app1], masters: [m] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    // Slide 0's entry should not yet have this master's exit state
    expect(chains[0].has(m.id)).toBe(false)
  })

  it('slide 1 entry has exit state from slide 0 (MSO with no animations → stays visible)', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const pres = buildPresentation([
      { appearances: [app1], masters: [m] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const exitState = chains[1].get(m.id)
    expect(exitState).toBeDefined()
    expect(exitState!.visible).toBe(true)
    expect(exitState!.opacity).toBe(1)
  })

  it('exit state after build-in fade → visible=true, opacity=to', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '', 'hidden')
    const app2 = makeAppearance(m.id, '')
    const anim = makeAnim('a1', app1.id, { kind: 'build-in', type: 'fade', to: 1 })
    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [anim] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const exitState = chains[1].get(m.id)
    expect(exitState!.visible).toBe(true)
    expect(exitState!.opacity).toBe(1)
  })

  it('exit state after build-out fade → visible=false', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const anim = makeAnim('a1', app1.id, { kind: 'build-out', type: 'fade', to: 0 })
    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [anim] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const exitState = chains[1].get(m.id)
    expect(exitState!.visible).toBe(false)
    expect(exitState!.opacity).toBe(0)
  })

  it('chains exit states across 3 slides', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '', 'hidden')
    const app2 = makeAppearance(m.id, '')
    const app3 = makeAppearance(m.id, '')
    const buildIn = makeAnim('a1', app1.id, { kind: 'build-in', type: 'fade', to: 1 })
    const buildOut = makeAnim('a2', app2.id, { kind: 'build-out', type: 'fade', to: 0 })
    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [buildIn] },
      { appearances: [app2], masters: [], animations: [buildOut] },
      { appearances: [app3], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    // Slide 2 entry: exit state from slide 1 (build-out → not visible)
    const exitState = chains[2].get(m.id)
    expect(exitState!.visible).toBe(false)
  })

  it('supports legacy move animations stored with fromOffset', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const anim = makeAnim('a1', app1.id, {
      kind: 'action',
      type: 'move',
      fromOffset: { x: 12, y: 34 }
    } as TargetedAnimation['effect'])

    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [anim] },
      { appearances: [app2], masters: [] }
    ])

    const chains = computeMsoExitStateChains(pres)
    const exitState = chains[1].get(m.id)
    expect(exitState?.translateX).toBe(12)
    expect(exitState?.translateY).toBe(34)
  })

  it('uses the path endpoint for move animations when a path is present', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const anim = makeAnim('a1', app1.id, {
      kind: 'action',
      type: 'move',
      delta: { x: 10, y: 20 },
      path: {
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
          { id: 'end', position: { x: 60, y: 90 }, type: 'sharp' }
        ]
      }
    })

    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [anim] },
      { appearances: [app2], masters: [] }
    ])

    const chains = computeMsoExitStateChains(pres)
    const exitState = chains[1].get(m.id)
    expect(exitState?.translateX).toBe(60)
    expect(exitState?.translateY).toBe(90)
  })

  it('is independent of master transform — changing x/y does not affect exit state', () => {
    const m1 = shapeMaster('m1', { x: 100, y: 200 })
    const m2 = { ...shapeMaster('m1', { x: 999, y: 888 }) }
    const app1a = makeAppearance(m1.id, '')
    const app2a = makeAppearance(m1.id, '')
    const app1b = makeAppearance(m2.id, '')
    const app2b = makeAppearance(m2.id, '')
    const anim1 = makeAnim('a1', app1a.id, { kind: 'build-in', type: 'fade', to: 1 })
    const anim2 = makeAnim('a2', app1b.id, { kind: 'build-in', type: 'fade', to: 1 })

    const pres1 = buildPresentation([
      { appearances: [app1a], masters: [m1], animations: [anim1] },
      { appearances: [app2a], masters: [] }
    ])
    const pres2 = buildPresentation([
      { appearances: [app1b], masters: [m2], animations: [anim2] },
      { appearances: [app2b], masters: [] }
    ])

    const chains1 = computeMsoExitStateChains(pres1)
    const chains2 = computeMsoExitStateChains(pres2)

    // Exit states should be equal despite different master transforms
    expect(chains1[1].get(m1.id)?.opacity).toBe(chains2[1].get(m2.id)?.opacity)
    expect(chains1[1].get(m1.id)?.visible).toBe(chains2[1].get(m2.id)?.visible)
  })
})

// ─── renderAllSlideEntryStates ────────────────────────────────────────────────

describe('renderAllSlideEntryStates', () => {
  it('returns empty array for a presentation with no slides', () => {
    const pres = createPresentation()
    expect(renderAllSlideEntryStates(pres, [])).toEqual([])
  })

  it('non-MSO visible appearance → visible=true, opacity=1', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].visible).toBe(true)
    expect(slide.appearances[0].opacity).toBe(1)
  })

  it('non-MSO hidden appearance → visible=false', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '', 'hidden')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].visible).toBe(false)
  })

  it('non-MSO with build-in animation → hidden at entry', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '', 'hidden')
    const anim = makeAnim('a1', app.id, { kind: 'build-in', type: 'fade', to: 1 })
    const pres = buildPresentation([{ appearances: [app], masters: [m], animations: [anim] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].visible).toBe(false)
    expect(slide.appearances[0].opacity).toBe(0)
  })

  it('MSO: first appearance uses initialVisibility', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '', 'visible')
    const app2 = makeAppearance(m.id, '')
    const pres = buildPresentation([
      { appearances: [app1], masters: [m] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const slides = renderAllSlideEntryStates(pres, chains)
    expect(slides[0].appearances[0].visible).toBe(true)
    expect(slides[0].appearances[0].opacity).toBe(1)
  })

  it('MSO: second appearance entry state uses propagated exit state from slide 1', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '', 'hidden')
    const app2 = makeAppearance(m.id, '')
    const buildIn = makeAnim('a1', app1.id, { kind: 'build-in', type: 'fade', to: 1 })
    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [buildIn] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const slides = renderAllSlideEntryStates(pres, chains)
    // Slide 2 entry: propagated exit state = visible, opacity=1
    expect(slides[1].appearances[0].visible).toBe(true)
    expect(slides[1].appearances[0].opacity).toBe(1)
  })

  it('MSO: build-out on slide 1 → slide 2 entry is hidden', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '')
    const app2 = makeAppearance(m.id, '')
    const buildOut = makeAnim('a1', app1.id, { kind: 'build-out', type: 'fade', to: 0 })
    const pres = buildPresentation([
      { appearances: [app1], masters: [m], animations: [buildOut] },
      { appearances: [app2], masters: [] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const slides = renderAllSlideEntryStates(pres, chains)
    expect(slides[1].appearances[0].visible).toBe(false)
  })

  it('MSO: new build-in on slide 2 hides element at entry even if slide 1 exit was visible', () => {
    const m = shapeMaster('m1')
    const app1 = makeAppearance(m.id, '', 'visible')
    const app2 = makeAppearance(m.id, '', 'hidden')
    const buildIn = makeAnim('a1', app2.id, { kind: 'build-in', type: 'fade', to: 1 })
    const pres = buildPresentation([
      { appearances: [app1], masters: [m] },
      { appearances: [app2], masters: [], animations: [buildIn] }
    ])
    const chains = computeMsoExitStateChains(pres)
    const slides = renderAllSlideEntryStates(pres, chains)
    // Slide 1: exit state = visible (no animations)
    // Slide 2: has build-in → entry is hidden (waiting to be triggered)
    expect(slides[1].appearances[0].visible).toBe(false)
  })

  it('uses master transform from the passed presentation (supports drag patch)', () => {
    const m = shapeMaster('m1', { x: 100, y: 200 })
    const app = makeAppearance(m.id, '')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])

    // Simulate patched presentation with different master transform
    const patchedMaster = { ...m, transform: { ...m.transform, x: 500, y: 600 } }
    const patchedPres: Presentation = {
      ...pres,
      mastersById: { ...pres.mastersById, [m.id]: patchedMaster }
    }

    const chains = computeMsoExitStateChains(pres) // computed on original
    const slides = renderAllSlideEntryStates(patchedPres, chains)
    // master.transform should reflect the patched values
    expect(slides[0].appearances[0].master.transform.x).toBe(500)
    expect(slides[0].appearances[0].master.transform.y).toBe(600)
  })

  it('includes master reference in each RenderedAppearance', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].master.id).toBe(m.id)
    expect(slide.appearances[0].appearance.id).toBe(app.id)
  })

  it('transform string starts with translate', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].transform).toContain('translate(0px, 0px)')
  })

  it('strokeDashoffset is null for appearances without line-draw', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '')
    const pres = buildPresentation([{ appearances: [app], masters: [m] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].strokeDashoffset).toBeNull()
  })

  it('strokeDashoffset is 1 for appearances with a line-draw animation (not yet triggered)', () => {
    const m = shapeMaster('m1')
    const app = makeAppearance(m.id, '')
    const anim = makeAnim('a1', app.id, { kind: 'build-in', type: 'line-draw' })
    const pres = buildPresentation([{ appearances: [app], masters: [m], animations: [anim] }])
    const chains = computeMsoExitStateChains(pres)
    const [slide] = renderAllSlideEntryStates(pres, chains)
    expect(slide.appearances[0].strokeDashoffset).toBe(1)
  })
})
