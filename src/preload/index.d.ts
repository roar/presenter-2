import { ElectronAPI } from '@electron-toolkit/preload'
import type { PresentationFileApi } from '../shared/persistence/presentationFileApi'
import type { PreviewWindowApi } from '../shared/preview/previewWindowApi'

declare global {
  interface Window {
    electron: ElectronAPI
    presenterFiles: PresentationFileApi
    presenterPreview: PreviewWindowApi
  }
}
