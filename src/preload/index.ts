import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Presentation } from '../shared/model/types'
import {
  PRESENTATION_FILE_CHANNELS,
  type PresentationFileApi
} from '../shared/persistence/presentationFileApi'
import { PREVIEW_WINDOW_CHANNELS, type PreviewWindowApi } from '../shared/preview/previewWindowApi'

const presentationFileApi: PresentationFileApi = {
  loadPresentation(id) {
    return ipcRenderer.invoke(PRESENTATION_FILE_CHANNELS.load, id)
  },
  savePresentation(doc) {
    return ipcRenderer.invoke(PRESENTATION_FILE_CHANNELS.save, doc)
  },
  listPresentations() {
    return ipcRenderer.invoke(PRESENTATION_FILE_CHANNELS.list)
  },
  deletePresentation(id) {
    return ipcRenderer.invoke(PRESENTATION_FILE_CHANNELS.delete, id)
  }
}

const previewWindowApi: PreviewWindowApi = {
  openPreview(presentation) {
    return ipcRenderer.invoke(PREVIEW_WINDOW_CHANNELS.open, presentation)
  },
  getCurrentPresentation() {
    return ipcRenderer.invoke(PREVIEW_WINDOW_CHANNELS.getCurrent)
  },
  onLoadPresentation(listener) {
    const wrapped = (_event: Electron.IpcRendererEvent, presentation: Presentation) => {
      listener(presentation)
    }
    ipcRenderer.on(PREVIEW_WINDOW_CHANNELS.load, wrapped)
    return () => ipcRenderer.removeListener(PREVIEW_WINDOW_CHANNELS.load, wrapped)
  }
}

// Expose a safe subset of Electron APIs to the renderer via contextBridge.
// Add app-specific IPC calls here as the project grows.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('presenterFiles', presentationFileApi)
    contextBridge.exposeInMainWorld('presenterPreview', previewWindowApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (defined in index.d.ts)
  window.electron = electronAPI
  // @ts-expect-error (defined in index.d.ts)
  window.presenterFiles = presentationFileApi
  // @ts-expect-error (defined in index.d.ts)
  window.presenterPreview = previewWindowApi
}
