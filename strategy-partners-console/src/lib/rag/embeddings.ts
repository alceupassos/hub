import 'server-only'
import { EMBEDDING_DIM } from '../db/schema'

// Gemini embeddings (decision 4 in docs/planning/decisoes.md): embeddings come exclusively
// from Gemini — a provider already in use — never a third-party embedding service.
// text-embedding-004 returns 768-dim vectors, matching EMBEDDING_DIM / vector(768).
const MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY não configurada — embeddings indisponíveis.')
  return key
}

/** Embed a batch of texts (documents). Order of results matches input order. */
export async function embedTexts(
  texts: string[],
  taskType: TaskType = 'RETRIEVAL_DOCUMENT',
): Promise<number[][]> {
  if (texts.length === 0) return []
  const res = await fetch(`${ENDPOINT}/models/${MODEL}:batchEmbedContents?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: texts.map(text => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType,
      })),
    }),
  })
  if (!res.ok) {
    throw new Error(`Gemini embeddings falhou (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as { embeddings?: { values: number[] }[] }
  const embeddings = (data.embeddings ?? []).map(e => e.values)
  const bad = embeddings.find(v => v.length !== EMBEDDING_DIM)
  if (bad) {
    throw new Error(`Dimensão de embedding inesperada: ${bad.length} (esperado ${EMBEDDING_DIM}). Ajuste EMBEDDING_DIM/modelo.`)
  }
  return embeddings
}

/** Embed a single search query (uses the RETRIEVAL_QUERY task type). */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text], 'RETRIEVAL_QUERY')
  return embedding
}
