import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '../../shared/model/types'
import { useDocumentStore } from './store/documentStore'
import App from './App'

const listMock = vi.fn()
const loadDocumentMock = vi.fn()
const saveDocumentMock = vi.fn()
const newPresentationMock = vi.fn()

vi.mock('./store/documentStore', async () => {
  const actual = await vi.importActual('./store/documentStore')
  return { ...actual, useDocumentStore: vi.fn() }
})

vi.mock('./repository/JsonFileRepository', () => ({
  JsonFileRepository: class {
    list = listMock
  }
}))

vi.mock('./components/EditorLayout/EditorLayout', () => ({
  EditorLayout: () => <div data-testid="editor-layout" />
}))

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

function mockStore(document: Presentation | null, isDirty = false): void {
  vi.mocked(useDocumentStore).mockImplementation((selector: (state: unknown) => unknown) => {
    return selector({
      document,
      isDirty,
      newPresentation: newPresentationMock,
      loadDocument: loadDocumentMock,
      saveDocument: saveDocumentMock
    })
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockStore(null, false)
  })

  it('loads the most recent local presentation on startup when one exists', async () => {
    listMock.mockResolvedValue([
      { id: 'pres-1', title: 'Test', updatedAt: '2024', isPublished: false }
    ])

    render(<App />)

    await waitFor(() => {
      expect(loadDocumentMock).toHaveBeenCalled()
    })
    expect(newPresentationMock).not.toHaveBeenCalled()
  })

  it('creates a new presentation on startup when no local presentations exist', async () => {
    listMock.mockResolvedValue([])

    render(<App />)

    await waitFor(() => {
      expect(newPresentationMock).toHaveBeenCalledOnce()
    })
    expect(loadDocumentMock).not.toHaveBeenCalled()
  })

  it('autosaves dirty documents after a debounce', async () => {
    vi.useFakeTimers()
    listMock.mockResolvedValue([])
    mockStore(makePresentation(), true)

    render(<App />)

    await vi.advanceTimersByTimeAsync(500)

    expect(saveDocumentMock).toHaveBeenCalled()
  })
})
