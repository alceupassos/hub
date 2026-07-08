import 'server-only'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// Storage de binário REAL (Fase F). Antes o dataroom só guardava o texto extraído
// (`storedPath = inline://…`) — sem proveniência: não dava para rebaixar/reauditar
// o arquivo original. Para um dataroom de M&A isso é bloqueador (exhibits legais,
// re-review). Agora os bytes originais são gravados em disco (volume da VPS) e o
// caminho relativo vai para documents.storedPath.
//
// STORAGE_DIR configura o diretório raiz (default: ./.uploads). Em produção,
// apontar para um volume persistente montado no container.
// ─────────────────────────────────────────────────────────────────────────────

function storageRoot(): string {
  return resolve(process.env.STORAGE_DIR ?? join(process.cwd(), '.uploads'))
}

export interface StoredBlob {
  /** Caminho relativo à raiz de storage — persistido em documents.storedPath. */
  storedPath: string
  sha256: string
  bytes: number
}

/** Grava os bytes originais e devolve o caminho relativo + hash (dedup/auditoria). */
export async function storeBlob(fileName: string, data: Buffer | Uint8Array): Promise<StoredBlob> {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const sha256 = createHash('sha256').update(buf).digest('hex')
  // Particiona por prefixo do hash p/ não estourar um único diretório.
  const rel = join(sha256.slice(0, 2), `${sha256}__${sanitize(fileName)}`)
  const abs = join(storageRoot(), rel)
  await mkdir(join(storageRoot(), sha256.slice(0, 2)), { recursive: true })
  await writeFile(abs, buf)
  return { storedPath: rel, sha256, bytes: buf.length }
}

/** Lê os bytes originais de volta (re-download/auditoria). */
export async function readBlob(storedPath: string): Promise<Buffer> {
  // Impede path traversal: só resolve dentro da raiz.
  const abs = resolve(storageRoot(), storedPath)
  if (!abs.startsWith(storageRoot())) throw new Error('caminho inválido')
  return readFile(abs)
}

function sanitize(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
}
