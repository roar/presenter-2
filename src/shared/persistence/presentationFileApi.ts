import type { DocumentId, Presentation } from '../model/types'

export interface PresentationFileMeta {
  id: DocumentId
  title: string
  updatedAt: string
  isPublished: boolean
}

export interface PresentationFileApi {
  loadPresentation(id: DocumentId): Promise<Presentation>
  savePresentation(doc: Presentation): Promise<void>
  listPresentations(): Promise<PresentationFileMeta[]>
  deletePresentation(id: DocumentId): Promise<void>
}

export const PRESENTATION_FILE_CHANNELS = {
  load: 'presentation-file:load',
  save: 'presentation-file:save',
  list: 'presentation-file:list',
  delete: 'presentation-file:delete'
} as const
