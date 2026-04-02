import type { Presentation } from '../model/types'

export const PREVIEW_WINDOW_CHANNELS = {
  open: 'preview-window:open',
  getCurrent: 'preview-window:get-current',
  load: 'preview-window:load'
} as const

export interface PreviewWindowApi {
  openPreview(presentation: Presentation): Promise<void>
  getCurrentPresentation(): Promise<Presentation | null>
  onLoadPresentation(listener: (presentation: Presentation) => void): () => void
}
