import type { Presentation, DocumentId } from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'

export interface DocumentMeta {
  id: DocumentId
  title: string
  updatedAt: string
  isPublished: boolean
}

// Repository interface — implemented separately for Electron (JSON files)
// and eventually a backend API. The store only ever calls this interface.
// AuthContext is accepted by all methods so implementations can attach
// tokens when needed — current local implementation ignores it.
export interface DocumentRepository {
  load(id: DocumentId, auth: AuthContext): Promise<Presentation>
  save(doc: Presentation, auth: AuthContext): Promise<void>
  list(auth: AuthContext): Promise<DocumentMeta[]>
  delete(id: DocumentId, auth: AuthContext): Promise<void>
}
