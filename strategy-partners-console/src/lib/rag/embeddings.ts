import 'server-only'
import { EMBEDDING_DIM } from '../db/schema'

// Camada de embeddings da Angra. A chave e o modelo são resolvidos por variáveis NEUTRAS
// (ANGRA_EMBED_KEY / ANGRA_EMBED_MODEL) — sem expor o provedor no código, coerente com o
// mascaramento de modelo do resto do sistema. O modelo aceita outputDimensionality para casar
// com EMBEDDING_DIM / vector(768). Auth via header (chaves novo formato rejeitam ?key=).
const MODEL = process.env.ANGRA_EMBED_MODEL ?? 'gemini-embedding-001'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

function apiKey(): string {
  const key = process.env.ANGRA_EMBED_KEY
  if (!key) throw new Error('ANGRA_EMBED_KEY não configurada — embeddings indisponíveis.')
  return key
}

/** Embed a batch of texts (documents). Order of results matches input order. */
export async function embedTexts(
  texts: string[],
  taskType: TaskType = 'RETRIEVAL_DOCUMENT',
): Promise<number[][]> {
  if (texts.length === 0) return []
  const res = await fetch(`${ENDPOINT}/models/${MODEL}:batchEmbedContents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({
      requests: texts.map(text => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIM,
      })),
    }),
  })
  if (!res.ok) {
    throw new Error(`Serviço de embeddings falhou (${res.status}): ${await res.text()}`)
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
