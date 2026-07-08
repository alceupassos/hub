import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Extração de texto SERVER-SIDE (Fase F). Antes a extração acontecia no cliente,
// dependia de um worker pdf.js vindo de CDN público (falha em ambientes com CSP/ar-
// gapped, comuns em M&A) e cortava PDFs em 40 páginas. Agora roda no servidor, sem
// CDN e sem cap de páginas.
//
// Suportado: PDF (pdfjs-dist), DOCX (mammoth), TXT/MD/CSV/JSON (nativo). Imports
// dinâmicos p/ não pesar o bundle nem quebrar o build quando a lib não é usada.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractResult {
  text: string
  pages?: number
  kind: 'pdf' | 'docx' | 'text' | 'csv' | 'unknown'
}

const TEXT_EXT = ['txt', 'md', 'markdown', 'json', 'log']

export function extOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ''
}

export async function extractText(fileName: string, data: Buffer): Promise<ExtractResult> {
  const ext = extOf(fileName)

  if (ext === 'pdf') return extractPdf(data)
  if (ext === 'docx') return extractDocx(data)
  if (ext === 'csv') return { text: data.toString('utf8'), kind: 'csv' }
  if (TEXT_EXT.includes(ext)) return { text: data.toString('utf8'), kind: 'text' }

  // Fallback: tenta como texto UTF-8 (melhor do que falhar); marca unknown.
  return { text: data.toString('utf8'), kind: 'unknown' }
}

async function extractPdf(data: Buffer): Promise<ExtractResult> {
  // Build legacy do pdfjs para Node (sem worker de browser).
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(data),
    // usa fontes do sistema; evita dependência de worker/CDN de browser
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  const parts: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strings = content.items.map((it: any) => (typeof it.str === 'string' ? it.str : '')).join(' ')
    parts.push(strings)
  }
  return { text: parts.join('\n\n'), pages: doc.numPages, kind: 'pdf' }
}

async function extractDocx(data: Buffer): Promise<ExtractResult> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer: data })
  return { text: value, kind: 'docx' }
}
