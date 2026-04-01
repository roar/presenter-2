import type { Presentation, DocumentId } from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'
import type { DocumentMeta, DocumentRepository } from './DocumentRepository'

// Electron implementation — reads/writes JSON files via the preload IPC bridge.
// The actual file I/O happens in the main process; this class just calls through.
// AuthContext is accepted but unused — local files don't require auth.
// TODO: wire up window.electron IPC calls once the main process handlers are added.

export class JsonFileRepository implements DocumentRepository {
  async load(id: DocumentId, _auth: AuthContext): Promise<Presentation> {
    throw new Error(`JsonFileRepository.load not yet implemented (id: ${id})`)
  }

  async save(doc: Presentation, _auth: AuthContext): Promise<void> {
    throw new Error(`JsonFileRepository.save not yet implemented (id: ${doc.id})`)
  }

  async list(_auth: AuthContext): Promise<DocumentMeta[]> {
    throw new Error('JsonFileRepository.list not yet implemented')
  }

  async delete(id: DocumentId, _auth: AuthContext): Promise<void> {
    throw new Error(`JsonFileRepository.delete not yet implemented (id: ${id})`)
  }
}
