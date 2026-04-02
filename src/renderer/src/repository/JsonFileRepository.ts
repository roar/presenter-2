import type { Presentation, DocumentId } from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'
import type { DocumentMeta, DocumentRepository } from './DocumentRepository'
import type { PresentationFileApi } from '../../../shared/persistence/presentationFileApi'

function getPresentationFileApi(): PresentationFileApi {
  if (!window.presenterFiles) {
    throw new Error('Presentation file API is not available in this environment')
  }

  return window.presenterFiles
}

export class JsonFileRepository implements DocumentRepository {
  async load(id: DocumentId, _auth: AuthContext): Promise<Presentation> {
    return getPresentationFileApi().loadPresentation(id)
  }

  async save(doc: Presentation, _auth: AuthContext): Promise<void> {
    await getPresentationFileApi().savePresentation(doc)
  }

  async list(_auth: AuthContext): Promise<DocumentMeta[]> {
    return getPresentationFileApi().listPresentations()
  }

  async delete(id: DocumentId, _auth: AuthContext): Promise<void> {
    await getPresentationFileApi().deletePresentation(id)
  }
}
