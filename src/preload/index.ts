import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose a safe subset of Electron APIs to the renderer via contextBridge.
// Add app-specific IPC calls here as the project grows.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (defined in index.d.ts)
  window.electron = electronAPI
}
