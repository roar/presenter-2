import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '@shared/model/types'
import { PreviewWindowApp } from './PreviewWindowApp'

const buildTimelineMock = vi.fn()

vi.mock('@shared/animation/buildTimeline', () => ({
  buildTimeline: (...args: unknown[]) => buildTimelineMock(...args)
}))

vi.mock('@shared/animation/resolveFrame', () => ({
  resolveFrame: () => ({
    front: {
      slide: {
        id: 'slide-1',
        appearanceIds: [],
        animationOrder: [],
        background: { color: '#123456' }
      },
      appearances: []
    },
    behind: null,
    transition: null,
    msoAppearances: []
  })
}))

vi.mock('../../../../viewer/src/components/SlideRenderer/SlideRenderer', () => ({
  SlideRenderer: () => <div data-testid="slide-renderer" />
}))

function makePresentation(): Presentation {
  return {
    id: 'pres-1',
    title: 'Deck',
    slideOrder: ['slide-1'],
    slidesById: {
      'slide-1': { id: 'slide-1', appearanceIds: [], animationOrder: ['anim-1'], background: {} }
    },
    mastersById: {},
    appearancesById: {},
    animationsById: {
      'anim-1': {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 10, y: 20 } },
        target: { kind: 'appearance', appearanceId: 'appearance-1' }
      }
    },
    animationGroupTemplatesById: {},
    textDecorationsById: {},
    revision: 0,
    ownerId: null,
    isPublished: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
}

function makePresentationWithoutExplicitTransition(): Presentation {
  return {
    id: 'pres-2',
    title: 'Deck',
    slideOrder: ['slide-1', 'slide-2'],
    slidesById: {
      'slide-1': { id: 'slide-1', appearanceIds: [], animationOrder: [], background: {} },
      'slide-2': { id: 'slide-2', appearanceIds: [], animationOrder: [], background: {} }
    },
    mastersById: {},
    appearancesById: {},
    animationsById: {},
    animationGroupTemplatesById: {},
    textDecorationsById: {},
    revision: 0,
    ownerId: null,
    isPublished: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
}

describe('PreviewWindowApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    buildTimelineMock.mockImplementation((presentation, triggerTimes) => ({
      presentation,
      triggerTimes
    }))
    Object.defineProperty(window, 'presenterPreview', {
      configurable: true,
      value: {
        getCurrentPresentation: vi.fn().mockResolvedValue(makePresentation()),
        onLoadPresentation: vi.fn(() => () => {})
      }
    })
  })

  it('advances the click sequence on window click', async () => {
    render(<PreviewWindowApp />)

    await waitFor(() => {
      expect(buildTimelineMock).toHaveBeenCalled()
    })

    window.dispatchEvent(new MouseEvent('click'))

    await waitFor(() => {
      const lastCall = buildTimelineMock.mock.calls.at(-1)
      expect(lastCall?.[1]).toBeInstanceOf(Map)
      expect((lastCall?.[1] as Map<string, number>).size).toBe(1)
    })
  })

  it('adds an implicit slide-advance cue when no explicit transition trigger exists', async () => {
    Object.defineProperty(window, 'presenterPreview', {
      configurable: true,
      value: {
        getCurrentPresentation: vi
          .fn()
          .mockResolvedValue(makePresentationWithoutExplicitTransition()),
        onLoadPresentation: vi.fn(() => () => {})
      }
    })

    render(<PreviewWindowApp />)

    await waitFor(() => {
      expect(buildTimelineMock).toHaveBeenCalled()
    })

    window.dispatchEvent(new MouseEvent('click'))

    await waitFor(() => {
      const lastCall = buildTimelineMock.mock.calls.at(-1)
      expect(lastCall?.[0].slidesById['slide-1'].transitionTriggerId).toBe(
        'implicit-transition:slide-1'
      )
      expect((lastCall?.[1] as Map<string, number>).has('implicit-transition:slide-1')).toBe(true)
    })
  })

  it('uses the frame background for the preview window root', async () => {
    const { container } = render(<PreviewWindowApp />)

    await waitFor(() => {
      expect(buildTimelineMock).toHaveBeenCalled()
    })

    expect((container.firstElementChild as HTMLElement).style.background).toBe('rgb(18, 52, 86)')
    expect(document.body.style.background).toBe('rgb(18, 52, 86)')
  })
})
