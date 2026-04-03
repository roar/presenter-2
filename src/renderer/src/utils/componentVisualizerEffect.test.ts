import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activateComponentVisualizer,
  findOwningComponentName,
  findOwningComponentNames,
  resetComponentVisualizerEffectForTests,
  syncComponentVisualizerEffect
} from './componentVisualizerEffect'

function attachFiber(element: HTMLElement, fiber: unknown): void {
  Object.defineProperty(element, '__reactFiber$test', {
    configurable: true,
    value: fiber
  })
}

describe('componentVisualizerEffect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetComponentVisualizerEffectForTests()
  })

  afterEach(() => {
    resetComponentVisualizerEffectForTests()
    document.body.innerHTML = ''
  })

  it('finds the first named function component above a host node', () => {
    const element = document.createElement('div')

    function ExampleComponent42(): null {
      return null
    }

    attachFiber(element, {
      type: 'div',
      return: {
        type: ExampleComponent42,
        return: null
      }
    })

    expect(findOwningComponentName(element)).toBe('ExampleComponent')
  })

  it('returns the full component hierarchy from innermost to outermost', () => {
    const element = document.createElement('div')

    function InnerPanel2(): null {
      return null
    }

    function MiddleLayout3(): null {
      return null
    }

    function OuterShell4(): null {
      return null
    }

    attachFiber(element, {
      type: 'div',
      return: {
        type: InnerPanel2,
        return: {
          type: MiddleLayout3,
          return: {
            type: OuterShell4,
            return: null
          }
        }
      }
    })

    expect(findOwningComponentNames(element)).toEqual(['InnerPanel', 'MiddleLayout', 'OuterShell'])
  })

  it('reads memo and forwardRef wrapper names', () => {
    const memoElement = document.createElement('div')
    attachFiber(memoElement, {
      type: {
        type: { name: 'MemoLabel7' }
      }
    })

    const forwardRefElement = document.createElement('div')
    attachFiber(forwardRefElement, {
      type: {
        render: { name: 'ForwardRefLabel8' }
      }
    })

    expect(findOwningComponentName(memoElement)).toBe('MemoLabel')
    expect(findOwningComponentName(forwardRefElement)).toBe('ForwardRefLabel')
  })

  it('freezes the label on shift, highlights the hovered label component, and resumes on release', () => {
    const element = document.createElement('button')
    const panelElement = document.createElement('section')

    function DemoButton(): null {
      return null
    }

    function DemoPanel(): null {
      return null
    }

    attachFiber(element, {
      type: 'button',
      return: {
        type: DemoButton,
        return: {
          type: DemoPanel,
          return: null
        }
      }
    })
    attachFiber(panelElement, {
      type: 'section',
      return: {
        type: DemoPanel,
        return: null
      }
    })
    document.body.append(element)
    document.body.append(panelElement)

    const originalElementsFromPoint = document.elementsFromPoint
    const elementsFromPointMock = vi.fn((x: number, y: number) => {
      if (x === 70 && y === 80) {
        return [panelElement]
      }

      return [element]
    })
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: elementsFromPointMock
    })

    const cleanup = activateComponentVisualizer()

    expect(element.style.outline).toContain('2px solid')
    expect(element.getAttribute('data-component-visualizer-name')).toBe('DemoButton')
    expect(panelElement.style.outline).toContain('2px solid')
    expect(document.getElementById('component-visualizer-overlay')).toBeTruthy()

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 30, bubbles: true }))

    const overlay = document.getElementById('component-visualizer-overlay')
    expect(elementsFromPointMock).toHaveBeenCalledWith(20, 30)
    expect(element.style.outline).toContain('4px solid')
    expect(element.style.position).toBe('relative')
    expect(element.style.zIndex).toBe('2147483646')
    expect(Array.from(overlay?.children ?? []).map((child) => child.textContent)).toEqual([
      'DemoButton',
      'DemoPanel'
    ])
    expect(Array.from(overlay?.children ?? []).every((child) => {
      return child instanceof HTMLElement && child.style.background !== ''
    })).toBe(true)
    expect(panelElement.style.outline).toContain('2px solid')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }))
    expect(overlay).toHaveStyle({ pointerEvents: 'auto' })

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 80, bubbles: true }))
    expect(overlay).toHaveStyle({ left: '20px', top: '30px' })
    expect(element.style.outline).toContain('4px solid')

    const overlayLine = overlay?.children[1]
    overlayLine?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    expect(element.style.outline).toContain('2px solid')
    expect(element.style.zIndex).toBe('')
    expect(panelElement.style.outline).toContain('4px solid')
    expect(panelElement.style.position).toBe('relative')
    expect(panelElement.style.zIndex).toBe('2147483646')

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }))
    expect(overlay).toHaveStyle({ pointerEvents: 'none' })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 80, bubbles: true }))
    expect(overlay).toHaveStyle({ left: '70px', top: '80px' })
    expect(panelElement.style.outline).toContain('4px solid')

    cleanup()

    expect(element.style.outline).toBe('')
    expect(element.style.position).toBe('')
    expect(element.style.zIndex).toBe('')
    expect(panelElement.style.outline).toBe('')
    expect(panelElement.style.position).toBe('')
    expect(panelElement.style.zIndex).toBe('')
    expect(element.hasAttribute('data-component-visualizer-name')).toBe(false)
    expect(document.getElementById('component-visualizer-overlay')).toBeNull()

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint
    })
  })

  it('marks nodes added after activation', async () => {
    syncComponentVisualizerEffect(true)

    const element = document.createElement('div')

    function LateMount(): null {
      return null
    }

    attachFiber(element, { type: LateMount })
    document.body.append(element)

    await Promise.resolve()

    expect(element.getAttribute('data-component-visualizer-name')).toBe('LateMount')

    syncComponentVisualizerEffect(false)

    expect(element.style.outline).toBe('')
  })
})
