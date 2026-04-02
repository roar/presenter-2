import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import type { Presentation } from '../shared/model/types'
import {
  PRESENTATION_FILE_CHANNELS,
  type PresentationFileMeta
} from '../shared/persistence/presentationFileApi'

function getPresentationsDir(): string {
  return join(app.getPath('userData'), 'presentations')
}

function getPresentationPath(id: string): string {
  return join(getPresentationsDir(), `${id}.json`)
}

async function ensurePresentationsDir(): Promise<void> {
  await mkdir(getPresentationsDir(), { recursive: true })
}

async function loadPresentationFile(id: string): Promise<Presentation> {
  const json = await readFile(getPresentationPath(id), 'utf8')
  return JSON.parse(json) as Presentation
}

async function savePresentationFile(doc: Presentation): Promise<void> {
  await ensurePresentationsDir()
  await writeFile(getPresentationPath(doc.id), `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
}

async function listPresentationFiles(): Promise<PresentationFileMeta[]> {
  await ensurePresentationsDir()
  const entries = await readdir(getPresentationsDir(), { withFileTypes: true })
  const metas = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        try {
          const json = await readFile(join(getPresentationsDir(), entry.name), 'utf8')
          const presentation = JSON.parse(json) as Presentation
          return {
            id: presentation.id,
            title: presentation.title,
            updatedAt: presentation.updatedAt,
            isPublished: presentation.isPublished
          } satisfies PresentationFileMeta
        } catch {
          return null
        }
      })
  )

  return metas
    .filter((meta): meta is PresentationFileMeta => meta != null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

async function deletePresentationFile(id: string): Promise<void> {
  await rm(getPresentationPath(id), { force: true })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.presenter-2')

  ipcMain.handle(PRESENTATION_FILE_CHANNELS.load, async (_event, id: string) => {
    return loadPresentationFile(id)
  })

  ipcMain.handle(PRESENTATION_FILE_CHANNELS.save, async (_event, doc: Presentation) => {
    await savePresentationFile(doc)
  })

  ipcMain.handle(PRESENTATION_FILE_CHANNELS.list, async () => {
    return listPresentationFiles()
  })

  ipcMain.handle(PRESENTATION_FILE_CHANNELS.delete, async (_event, id: string) => {
    await deletePresentationFile(id)
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
