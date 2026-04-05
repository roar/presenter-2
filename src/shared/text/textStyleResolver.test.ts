import { describe, expect, it } from 'vitest'
import type {
  TextMark,
  TextPosition,
  TextStyle,
  TextStyleBinding,
  TextStyleDefinition
} from '../model/types'
import { resolveEffectiveTextStyle } from './textStyleResolver'

const POSITION: TextPosition = {
  blockId: 'b1',
  runId: 'r1',
  offset: 2
}

function makeRange(startOffset: number, endOffset: number) {
  return {
    start: { blockId: 'b1', runId: 'r1', offset: startOffset },
    end: { blockId: 'b1', runId: 'r1', offset: endOffset }
  }
}

function makeBinding(
  id: string,
  styleId: string,
  activeState?: string,
  startOffset = 0,
  endOffset = 5
): TextStyleBinding {
  return {
    id,
    styleId,
    activeState,
    range: makeRange(startOffset, endOffset)
  }
}

describe('resolveEffectiveTextStyle', () => {
  const boxStyle: TextStyle = {
    defaultState: {
      fontSize: 32,
      fontFamily: 'IBM Plex Sans',
      fontWeight: 400,
      color: '#111111'
    },
    namedStates: {}
  }

  const styleDefinitionsById: Record<string, TextStyleDefinition> = {
    accent: {
      id: 'accent',
      name: 'Accent',
      defaultState: {
        color: '#0055ff',
        fontWeight: 500
      },
      namedStates: {
        emphasis: {
          color: '#ff5500',
          fontSize: 40
        }
      }
    },
    subtle: {
      id: 'subtle',
      name: 'Subtle',
      defaultState: {
        color: '#666666'
      },
      namedStates: {
        emphasis: {
          color: '#222222',
          fontWeight: 300
        }
      }
    }
  }

  it('falls back to the text box default style when no binding covers the position', () => {
    expect(
      resolveEffectiveTextStyle({
        boxStyle,
        styleDefinitionsById,
        styleBindings: [makeBinding('b1', 'accent', undefined, 3, 5)],
        position: POSITION,
        marks: []
      })
    ).toEqual({
      fontSize: 32,
      fontFamily: 'IBM Plex Sans',
      fontWeight: 400,
      color: '#111111'
    })
  })

  it('applies the referenced style default state on top of the box style', () => {
    expect(
      resolveEffectiveTextStyle({
        boxStyle,
        styleDefinitionsById,
        styleBindings: [makeBinding('b1', 'accent')],
        position: POSITION,
        marks: []
      })
    ).toEqual({
      fontSize: 32,
      fontFamily: 'IBM Plex Sans',
      fontWeight: 500,
      color: '#0055ff'
    })
  })

  it('applies the active named state on top of the referenced style default state', () => {
    expect(
      resolveEffectiveTextStyle({
        boxStyle,
        styleDefinitionsById,
        styleBindings: [makeBinding('b1', 'accent', 'emphasis')],
        position: POSITION,
        marks: []
      })
    ).toEqual({
      fontSize: 40,
      fontFamily: 'IBM Plex Sans',
      fontWeight: 500,
      color: '#ff5500'
    })
  })

  it('lets later overlapping bindings win for the same property', () => {
    expect(
      resolveEffectiveTextStyle({
        boxStyle,
        styleDefinitionsById,
        styleBindings: [
          makeBinding('b1', 'accent', undefined),
          makeBinding('b2', 'subtle', 'emphasis')
        ],
        position: POSITION,
        marks: []
      })
    ).toEqual({
      fontSize: 32,
      fontFamily: 'IBM Plex Sans',
      fontWeight: 300,
      color: '#222222'
    })
  })

  it('lets direct marks win over referenced styles for the same property', () => {
    const marks: TextMark[] = [{ type: 'bold' }, { type: 'color', value: '#22aa22' }]

    expect(
      resolveEffectiveTextStyle({
        boxStyle,
        styleDefinitionsById,
        styleBindings: [makeBinding('b1', 'subtle', 'emphasis')],
        position: POSITION,
        marks
      })
    ).toEqual({
      fontSize: 32,
      fontFamily: 'IBM Plex Sans',
      fontWeight: 700,
      color: '#22aa22'
    })
  })
})
