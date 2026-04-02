import { ElectronAPI } from '@electron-toolkit/preload'
import type { PresentationFileApi } from '../shared/persistence/presentationFileApi'

declare global {
  interface Window {
    electron: ElectronAPI
    presenterFiles: PresentationFileApi
  }
}
