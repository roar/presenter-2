import { describe, expect, it } from 'vitest'
import { createMsoMaster } from '@shared/model/factories'
import type { ShapeLibrary } from '@shared/shapes/types'
import libraryData from '../../../shared/shapes/keynote-shapes.library.json'
import { getMasterDisplayName } from './getMasterDisplayName'

const shapeLibrary = libraryData as ShapeLibrary

describe('getMasterDisplayName', () => {
  it('returns the stored master name when present', () => {
    const master = createMsoMaster('shape')
    master.name = 'Airplane'

    expect(getMasterDisplayName(master)).toBe('Airplane')
  })

  it('falls back to the first text run for text masters', () => {
    const master = createMsoMaster('text')
    master.content = {
      type: 'text',
      value: {
        blocks: [{ id: 'b1', runs: [{ id: 'r1', text: 'Headline', marks: [] }] }]
      }
    }

    expect(getMasterDisplayName(master)).toBe('Headline')
  })

  it('resolves unnamed library shapes by matching geometry', () => {
    const dog = shapeLibrary.shapes.find((entry) => entry.name === 'Dog')
    if (!dog) throw new Error('Expected Dog shape in library')

    const master = createMsoMaster('shape')
    master.geometry = {
      type: 'path',
      pathData: dog.template.path.d,
      baseWidth: dog.template.path.baseWidth,
      baseHeight: dog.template.path.baseHeight
    }

    expect(getMasterDisplayName(master)).toBe('Dog')
  })

  it('falls back to the master type when no better label exists', () => {
    const master = createMsoMaster('shape')

    expect(getMasterDisplayName(master)).toBe('Shape')
  })
})
