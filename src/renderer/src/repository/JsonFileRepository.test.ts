import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '../../../shared/model/types'
import { nullAuthContext } from '../../../shared/auth/types'
import { JsonFileRepository } from './JsonFileRepository'

function makePresentation(): Presentation {
  return {
    id: 'pres-1',
    title: 'Test presentation',
    slideOrder: [],
    slidesById: {},
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

describe('JsonFileRepository', () => {
  const loadPresentation = vi.fn()
  const savePresentation = vi.fn()
  const listPresentations = vi.fn()
  const deletePresentation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    window.presenterFiles = {
      loadPresentation,
      savePresentation,
      listPresentations,
      deletePresentation
    }
  })

  it('loads a presentation through the preload bridge', async () => {
    const presentation = makePresentation()
    loadPresentation.mockResolvedValue(presentation)

    const repo = new JsonFileRepository()
    const result = await repo.load(presentation.id, nullAuthContext)

    expect(loadPresentation).toHaveBeenCalledWith(presentation.id)
    expect(result).toEqual(presentation)
  })

  it('saves a presentation through the preload bridge', async () => {
    const presentation = makePresentation()
    const repo = new JsonFileRepository()

    await repo.save(presentation, nullAuthContext)

    expect(savePresentation).toHaveBeenCalledWith(presentation)
  })

  it('lists presentation metadata through the preload bridge', async () => {
    const metas = [
      {
        id: 'pres-1',
        title: 'Test presentation',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isPublished: false
      }
    ]
    listPresentations.mockResolvedValue(metas)

    const repo = new JsonFileRepository()
    const result = await repo.list(nullAuthContext)

    expect(listPresentations).toHaveBeenCalled()
    expect(result).toEqual(metas)
  })

  it('deletes a presentation through the preload bridge', async () => {
    const repo = new JsonFileRepository()

    await repo.delete('pres-1', nullAuthContext)

    expect(deletePresentation).toHaveBeenCalledWith('pres-1')
  })
})
