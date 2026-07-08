'use client'
import { useRef, useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Picker real de arquivos (drag-drop + multi-arquivo) que envia via multipart para uma rota que
// extrai e indexa no servidor (Fase F). Substitui as caixas de "colar texto".
// Aceita PDF/DOCX/CSV/TXT/MD por padrão.

export interface UploadResultItem {
  fileName?: string
  chunkCount?: number
  pages?: number
  error?: string
}

export function FileDropzone({
  endpoint,
  accept = '.pdf,.docx,.csv,.txt,.md',
  label,
  onDone,
}: {
  endpoint: string
  accept?: string
  label?: string
  onDone?: (results: UploadResultItem[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<UploadResultItem[] | null>(null)
  const [error, setError] = useState('')

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    setBusy(true); setError(''); setResults(null)
    try {
      const fd = new FormData()
      list.forEach(f => fd.append('files', f))
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Falha no upload.'); return }
      const items: UploadResultItem[] = data.results ?? [{ fileName: list[0]?.name, chunkCount: data.chunkCount }]
      setResults(items)
      onDone?.(items)
    } catch {
      setError('Erro de conexão no upload.')
    } finally {
      setBusy(false)
    }
  }, [endpoint, onDone])

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? 'border-accent bg-accent-soft' : 'border-border-input bg-subtle-bg hover:border-accent/50'
        }`}
      >
        <input
          ref={inputRef} type="file" multiple accept={accept} className="hidden"
          onChange={e => { if (e.target.files) upload(e.target.files); e.target.value = '' }}
        />
        {busy ? (
          <div className="flex flex-col items-center gap-2 text-ink-5">
            <Loader2 size={22} className="animate-spin text-accent" />
            <span className="text-[12.5px]">Extraindo e indexando no servidor…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={22} className="text-accent" />
            <span className="text-[13px] font-medium text-ink-1">{label ?? 'Arraste arquivos ou clique para enviar'}</span>
            <span className="text-[11px] text-ink-6">PDF, DOCX, CSV, TXT, MD · extração no servidor, sem limite de páginas</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-[#B4462F]">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              {r.error ? <AlertCircle size={14} className="text-[#B4462F]" /> : <CheckCircle2 size={14} className="text-success" />}
              <FileText size={13} className="text-ink-6" />
              <span className="text-ink-2">{r.fileName}</span>
              {r.error
                ? <span className="text-[#B4462F]">— {r.error}</span>
                : <span className="text-ink-5">— {r.chunkCount ?? 0} trechos indexados{r.pages ? ` · ${r.pages} páginas` : ''}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
