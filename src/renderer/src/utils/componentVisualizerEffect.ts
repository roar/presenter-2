const defaultOutlineWidth = '2px'
const hoverOutlineWidth = '4px'
const outlineStyle = 'solid'
const componentNameAttribute = 'data-component-visualizer-name'
const componentColorAttribute = 'data-component-visualizer-color'
const overlayId = 'component-visualizer-overlay'
const overlayLineAttribute = 'data-component-visualizer-overlay-line'
const elevatedElementZIndex = '2147483646'
const palette = [
  '#e76f51',
  '#f4a261',
  '#e9c46a',
  '#2a9d8f',
  '#264653',
  '#ff6b6b',
  '#4d96ff',
  '#6bcb77',
  '#ffd93d',
  '#845ec2',
  '#00c2a8',
  '#c34a36',
  '#0081cf',
  '#ff8066',
  '#4b4453',
  '#2c73d2',
  '#ffc75f',
  '#f9f871',
  '#008f7a',
  '#b0a8b9'
] as const

type FiberNode = {
  type?: unknown
  return?: FiberNode | null
}

type VisualizerContext = {
  colorByComponentName: Map<string, string>
  markedElements: Set<HTMLElement>
}

type EffectCleanup = () => void
type ComponentHierarchyEntry = {
  name: string
  color: string
}
type ElementStyleSnapshot = {
  position: string
  zIndex: string
}

function normalizeComponentName(name: string): string {
  const trimmedName = name.trim()
  const normalizedName = trimmedName.replace(/\d+$/, '')
  return normalizedName || trimmedName || 'Anonymous'
}

function getComponentNameFromType(type: unknown): string | null {
  if (typeof type === 'function') {
    return type.displayName ?? type.name ?? null
  }

  if (!type || typeof type !== 'object') {
    return null
  }

  const candidate = type as {
    displayName?: string
    render?: { displayName?: string; name?: string }
    type?: { displayName?: string; name?: string }
  }

  if (candidate.displayName) {
    return candidate.displayName
  }

  if (candidate.render) {
    return candidate.render.displayName ?? candidate.render.name ?? null
  }

  if (candidate.type) {
    return candidate.type.displayName ?? candidate.type.name ?? null
  }

  return null
}

function getFiber(element: Element): FiberNode | null {
  const fiberKey = Object.getOwnPropertyNames(element).find((key) =>
    key.startsWith('__reactFiber')
  )
  if (!fiberKey) {
    return null
  }

  return (element as Element & Record<string, FiberNode | undefined>)[fiberKey] ?? null
}

export function findOwningComponentName(element: Element): string | null {
  const componentNames = findOwningComponentNames(element)
  return componentNames[0] ?? null
}

export function findOwningComponentNames(element: Element): string[] {
  return findOwningComponentHierarchy(element).map((entry) => entry.name)
}

function findOwningComponentHierarchy(element: Element): ComponentHierarchyEntry[] {
  let fiber = getFiber(element)
  const componentHierarchy: ComponentHierarchyEntry[] = []

  while (fiber) {
    const componentName = getComponentNameFromType(fiber.type)
    if (componentName) {
      componentHierarchy.push({
        name: normalizeComponentName(componentName),
        color: ''
      })
    }

    fiber = fiber.return ?? null
  }

  return componentHierarchy
}

function getComponentColorByName(componentName: string): string {
  const normalizedName = normalizeComponentName(componentName)
  let hash = 0

  for (const character of normalizedName) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return palette[hash % palette.length]
}

function getComponentColor(
  componentName: string,
  colorByComponentName: Map<string, string>
): string {
  const existingColor = colorByComponentName.get(componentName)
  if (existingColor) {
    return existingColor
  }

  const color = getComponentColorByName(componentName)
  colorByComponentName.set(componentName, color)
  return color
}

function setOutline(element: HTMLElement, color: string, width: string): void {
  element.style.outline = `${width} ${outlineStyle} ${color}`
}

function clearOutline(element: HTMLElement): void {
  element.style.outline = ''
  element.removeAttribute(componentNameAttribute)
  element.removeAttribute(componentColorAttribute)
}

function resetElementOutline(element: HTMLElement): void {
  const color = element.getAttribute(componentColorAttribute)
  if (color) {
    setOutline(element, color, defaultOutlineWidth)
  }
}

function elevateElement(
  element: HTMLElement,
  elevatedElements: Map<HTMLElement, ElementStyleSnapshot>
): void {
  if (!elevatedElements.has(element)) {
    elevatedElements.set(element, {
      position: element.style.position,
      zIndex: element.style.zIndex
    })
  }

  if (!element.style.position || element.style.position === 'static') {
    element.style.position = 'relative'
  }
  element.style.zIndex = elevatedElementZIndex
}

function resetElevatedElement(
  element: HTMLElement,
  elevatedElements: Map<HTMLElement, ElementStyleSnapshot>
): void {
  const snapshot = elevatedElements.get(element)
  if (!snapshot) {
    return
  }

  element.style.position = snapshot.position
  element.style.zIndex = snapshot.zIndex
  elevatedElements.delete(element)
}

function markElement(element: HTMLElement, context: VisualizerContext): void {
  if (context.markedElements.has(element)) {
    return
  }

  const componentName = findOwningComponentName(element)
  if (!componentName) {
    return
  }

  const color = getComponentColor(componentName, context.colorByComponentName)
  element.setAttribute(componentNameAttribute, componentName)
  element.setAttribute(componentColorAttribute, color)
  setOutline(element, color, defaultOutlineWidth)
  context.markedElements.add(element)
}

function markSubtree(root: ParentNode, context: VisualizerContext): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let currentNode: Node | null = walker.currentNode

  while (currentNode) {
    if (currentNode instanceof HTMLElement) {
      markElement(currentNode, context)
    }
    currentNode = walker.nextNode()
  }
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.id = overlayId
  overlay.style.position = 'fixed'
  overlay.style.left = '0'
  overlay.style.top = '0'
  overlay.style.transform = 'translate(12px, 12px)'
  overlay.style.display = 'none'
  overlay.style.pointerEvents = 'none'
  overlay.style.padding = '4px 8px'
  overlay.style.borderRadius = '6px'
  overlay.style.background = '#111111'
  overlay.style.color = '#ffffff'
  overlay.style.fontFamily = 'monospace'
  overlay.style.fontSize = '12px'
  overlay.style.fontWeight = '700'
  overlay.style.lineHeight = '1'
  overlay.style.zIndex = '2147483647'
  document.body.append(overlay)
  return overlay
}

function clearOverlayContent(overlay: HTMLElement): void {
  overlay.replaceChildren()
}

function appendOverlayLine(overlay: HTMLElement, entry: ComponentHierarchyEntry): void {
  const line = document.createElement('div')
  line.textContent = entry.name
  line.setAttribute(overlayLineAttribute, entry.name)
  line.style.color = getOverlayTextColor(entry.color)
  line.style.background = entry.color
  line.style.padding = '2px 6px'
  line.style.borderRadius = '4px'
  line.style.marginTop = overlay.childElementCount === 0 ? '0' : '4px'
  overlay.append(line)
}

function getOverlayTextColor(backgroundColor: string): string {
  const color = backgroundColor.trim()
  const hex = color.startsWith('#') ? color.slice(1) : color
  const normalizedHex =
    hex.length === 3
      ? hex
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : hex

  if (!/^[\da-fA-F]{6}$/.test(normalizedHex)) {
    return '#111111'
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16)
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16)
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

  return luminance < 140 ? '#ffffff' : '#111111'
}

function getHoveredMarkedElement(clientX: number, clientY: number): HTMLElement | null {
  const elements = document.elementsFromPoint(clientX, clientY)
  for (const element of elements) {
    if (element instanceof HTMLElement && element.hasAttribute(componentNameAttribute)) {
      return element
    }
  }

  return null
}

function getOverlayLineTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null
  }

  return target.closest(`[${overlayLineAttribute}]`)
}

function attachHoverOverlay(markedElements: Set<HTMLElement>): EffectCleanup {
  const overlay = createOverlay()
  const elevatedElements = new Map<HTMLElement, ElementStyleSnapshot>()
  let locked = false
  let activeComponentName: string | null = null
  let activeElement: HTMLElement | null = null
  let lastPointer = { x: 0, y: 0 }

  const getComponentElements = (componentName: string): Set<HTMLElement> => {
    const elements = new Set<HTMLElement>()
    for (const element of markedElements) {
      if (element.getAttribute(componentNameAttribute) === componentName) {
        elements.add(element)
      }
    }

    return elements
  }

  const setActiveComponent = (componentName: string | null): void => {
    if (activeComponentName === componentName) {
      return
    }

    if (activeComponentName) {
      for (const element of getComponentElements(activeComponentName)) {
        resetElementOutline(element)
        resetElevatedElement(element, elevatedElements)
      }
    }

    activeComponentName = componentName

    if (activeComponentName) {
      for (const element of getComponentElements(activeComponentName)) {
        const color = element.getAttribute(componentColorAttribute)
        if (color) {
          setOutline(element, color, hoverOutlineWidth)
          elevateElement(element, elevatedElements)
        }
      }
    }
  }

  const renderOverlay = (element: HTMLElement | null): void => {
    activeElement = element
    if (!activeElement) {
      setActiveComponent(null)
      overlay.style.display = 'none'
      clearOverlayContent(overlay)
      return
    }

    const componentName = activeElement.getAttribute(componentNameAttribute)
    const color = activeElement.getAttribute(componentColorAttribute)
    if (!componentName || !color) {
      setActiveComponent(null)
      overlay.style.display = 'none'
      clearOverlayContent(overlay)
      return
    }

    const hierarchy = findOwningComponentHierarchy(activeElement).map((entry) => ({
      ...entry,
      color: getComponentColorByName(entry.name)
    }))

    setActiveComponent(componentName)
    clearOverlayContent(overlay)
    for (const entry of hierarchy) {
      appendOverlayLine(overlay, entry)
    }
    overlay.style.left = `${lastPointer.x}px`
    overlay.style.top = `${lastPointer.y}px`
    overlay.style.background = '#111111'
    overlay.style.display = 'block'
  }

  const syncToPointer = (): void => {
    if (locked) {
      return
    }

    renderOverlay(getHoveredMarkedElement(lastPointer.x, lastPointer.y))
  }

  const handleMouseMove = (event: MouseEvent): void => {
    lastPointer = { x: event.clientX, y: event.clientY }
    syncToPointer()
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Shift' || locked) {
      return
    }

    locked = true
    overlay.style.pointerEvents = 'auto'
  }

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Shift') {
      return
    }

    locked = false
    overlay.style.pointerEvents = 'none'
    syncToPointer()
  }

  const handleOverlayMouseMove = (event: MouseEvent): void => {
    if (!locked) {
      return
    }

    const line = getOverlayLineTarget(event.target)
    if (!line) {
      if (activeElement) {
        const componentName = activeElement.getAttribute(componentNameAttribute)
        setActiveComponent(componentName)
      }
      return
    }

    setActiveComponent(line.getAttribute(overlayLineAttribute))
  }

  const handleOverlayMouseLeave = (): void => {
    if (!locked || !activeElement) {
      return
    }

    setActiveComponent(activeElement.getAttribute(componentNameAttribute))
  }

  document.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  overlay.addEventListener('mousemove', handleOverlayMouseMove)
  overlay.addEventListener('mouseleave', handleOverlayMouseLeave)

  return () => {
    document.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    overlay.removeEventListener('mousemove', handleOverlayMouseMove)
    overlay.removeEventListener('mouseleave', handleOverlayMouseLeave)
    setActiveComponent(null)
    overlay.remove()
  }
}

function observeMutations(context: VisualizerContext): MutationObserver {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const addedNode of record.addedNodes) {
        if (!(addedNode instanceof HTMLElement)) {
          continue
        }

        markElement(addedNode, context)
        markSubtree(addedNode, context)
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
  return observer
}

export function activateComponentVisualizer(): EffectCleanup {
  const context: VisualizerContext = {
    colorByComponentName: new Map<string, string>(),
    markedElements: new Set<HTMLElement>()
  }

  markSubtree(document.body, context)
  const cleanupHoverOverlay = attachHoverOverlay(context.markedElements)
  const observer = observeMutations(context)

  return () => {
    observer.disconnect()
    cleanupHoverOverlay()
    for (const element of context.markedElements) {
      clearOutline(element)
    }
    context.markedElements.clear()
  }
}

let cleanupVisualizerEffect: EffectCleanup | null = null

export function syncComponentVisualizerEffect(active: boolean): void {
  if (active) {
    if (!cleanupVisualizerEffect) {
      cleanupVisualizerEffect = activateComponentVisualizer()
    }
    return
  }

  if (cleanupVisualizerEffect) {
    cleanupVisualizerEffect()
    cleanupVisualizerEffect = null
  }
}

export function resetComponentVisualizerEffectForTests(): void {
  if (cleanupVisualizerEffect) {
    cleanupVisualizerEffect()
    cleanupVisualizerEffect = null
  }
}
