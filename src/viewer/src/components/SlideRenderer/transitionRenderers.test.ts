import { describe, expect, it } from 'vitest'
import { getTransitionLayerStyles } from './transitionRenderers'

describe('getTransitionLayerStyles', () => {
  it('returns default styles when there is no active transition', () => {
    expect(getTransitionLayerStyles(null)).toEqual({
      behindOpacity: 1,
      frontOpacity: 1,
      frontTranslateX: '0'
    })
  })

  it('returns fade-through-color styles from the registry', () => {
    expect(getTransitionLayerStyles({ kind: 'fade-through-color', progress: 0.4 })).toEqual({
      behindOpacity: 1,
      frontOpacity: 0.4,
      frontTranslateX: '0'
    })
  })

  it('returns dissolve styles from the registry', () => {
    expect(getTransitionLayerStyles({ kind: 'dissolve', progress: 0.25 })).toEqual({
      behindOpacity: 0.75,
      frontOpacity: 0.25,
      frontTranslateX: '0'
    })
  })

  it('returns push styles from the registry', () => {
    expect(getTransitionLayerStyles({ kind: 'push', progress: 0.2 })).toEqual({
      behindOpacity: 1,
      frontOpacity: 1,
      frontTranslateX: '80%'
    })
  })
})
