import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  PRESENTATION_FILE_CHANNELS,
  type PresentationFileApi
} from '../shared/persistence/presentationFileApi'

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

// Expose a safe subset of Electron APIs to the renderer via contextBridge.
// Add app-specific IPC calls here as the project grows.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('presenterFiles', presentationFileApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (defined in index.d.ts)
  window.electron = electronAPI
  // @ts-expect-error (defined in index.d.ts)
  window.presenterFiles = presentationFileApi
}
