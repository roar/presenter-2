import { useSyncExternalStore } from 'react'

type Listener = () => void

class ComponentVisualizerStore {
  private active = false

  private readonly listeners = new Set<Listener>()

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): boolean => {
    return this.active
  }

  toggle = (): void => {
    this.setActive(!this.active)
  }

  setActive = (active: boolean): void => {
    if (this.active === active) {
      return
    }

    this.active = active
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export const componentVisualizerStore = new ComponentVisualizerStore()

export function useComponentVisualizer(): boolean {
  return useSyncExternalStore(
    componentVisualizerStore.subscribe,
    componentVisualizerStore.getSnapshot,
    componentVisualizerStore.getSnapshot
  )
}
