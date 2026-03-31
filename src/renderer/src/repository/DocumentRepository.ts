import type { Document, DocumentId } from '../../../shared/model/types'

export interface DocumentMeta {
  id: DocumentId
  title: string
  updatedAt: string
}

// Repository interface — implemented separately for Electron (JSON files)
// and web (IndexedDB). The store only ever calls this interface.
export interface DocumentRepository {
  load(id: DocumentId): Promise<Document>
  save(doc: Document): Promise<void>
  list(): Promise<DocumentMeta[]>
  delete(id: DocumentId): Promise<void>
}
