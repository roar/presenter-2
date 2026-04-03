import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  componentVisualizerStore,
  useComponentVisualizer
} from './componentVisualizerStore'

describe('componentVisualizerStore', () => {
  beforeEach(() => {
    componentVisualizerStore.setActive(false)
  })

  it('toggles the active flag', () => {
    expect(componentVisualizerStore.getSnapshot()).toBe(false)

    componentVisualizerStore.toggle()
    expect(componentVisualizerStore.getSnapshot()).toBe(true)

    componentVisualizerStore.toggle()
    expect(componentVisualizerStore.getSnapshot()).toBe(false)
  })

  it('updates React subscribers through useSyncExternalStore', () => {
    const { result } = renderHook(() => useComponentVisualizer())

    expect(result.current).toBe(false)

    act(() => {
      componentVisualizerStore.toggle()
    })

    expect(result.current).toBe(true)
  })
})
