'use client'
import { useState } from 'react'
import { Send, MessageSquare, FileText, X } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { ChatMarkdown } from './ChatMarkdown'

// Chat por deal — pergunta em linguagem natural respondida sobre o dataroom (RAG + MERKO).
interface Source { documentId: string; chunkIndex: number; excerpt: string }
interface Turn { role: 'user' | 'assistant'; content: string; sources?: Source[] }

interface FullChunk { content: string; chunkIndex: number; documentId: string; fileName: string }

export function DealChat({ dealId }: { dealId: string }) {
  const { lang } = useLang()
  const [turns, setTurns] = useState<Turn[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  // Fonte aberta no drawer + conteúdo completo (carregado sob demanda da rota /chunk).
  const [active, setActive] = useState<{ n: number; source: Source } | null>(null)
  const [full, setFull] = useState<FullChunk | null>(null)
  const [fullBusy, setFullBusy] = useState(false)

  const L = lang === 'en'
    ? { title: 'Ask this deal', ph: 'e.g. What are the biggest financial risks?', empty: 'The analyst has read the dataroom. Ask anything.', sources: 'Sources', source: 'Source', loading: 'Loading full excerpt…', doc: 'Document', chunk: 'Chunk' }
    : { title: 'Pergunte a este deal', ph: 'ex.: Quais os maiores riscos financeiros?', empty: 'O analista leu o dataroom. Pergunte à vontade.', sources: 'Fontes', source: 'Fonte', loading: 'Carregando trecho completo…', doc: 'Documento', chunk: 'Trecho' }

  async function ask() {
    const question = q.trim()
    if (!question || busy) return
    setTurns(t => [...t, { role: 'user', content: question }])
    setQ(''); setBusy(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, lang }) })
      const d = await res.json()
      setTurns(t => [...t, { role: 'assistant', content: d.answer ?? d.error ?? '—', sources: Array.isArray(d.sources) ? d.sources : [] }])
    } catch {
      setTurns(t => [...t, { role: 'assistant', content: lang === 'en' ? 'Network error.' : 'Erro de rede.' }])
    } finally { setBusy(false) }
  }

  async function openSource(n: number, sources: Source[] | undefined) {
    const source = sources?.[n - 1]
    if (!source) return
    setActive({ n, source })
    setFull(null); setFullBusy(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/chunk/${source.documentId}/${source.chunkIndex}`)
      if (res.ok) setFull(await res.json())
    } catch { /* mantém o excerpt como fallback */ } finally { setFullBusy(false) }
  }

  return (
    <div className="bg-surface border border-border-card rounded-[12px] flex flex-col h-[420px] relative overflow-hidden">
      <div className="px-4 py-3 border-b border-border-div flex items-center gap-2">
        <MessageSquare size={15} className="text-accent" />
        <span className="text-[13px] font-semibold text-ink-0">{L.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {turns.length === 0 && <p className="text-[12px] text-ink-6">{L.empty}</p>}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] text-[12.5px] leading-relaxed px-3 py-2 rounded-[10px] ${t.role === 'user' ? 'bg-accent text-white' : 'bg-app-bg text-ink-0'}`}>
              {t.role === 'assistant'
                ? <ChatMarkdown content={t.content} onCiteClick={n => openSource(n, t.sources)} />
                : t.content}
            </div>
            {t.role === 'assistant' && t.sources && t.sources.length > 0 && (
              <div className="mt-1.5">
                <p className="text-[10.5px] text-ink-6 mb-1 flex items-center gap-1"><FileText size={10} /> {L.sources}</p>
                <div className="flex flex-col gap-1">
                  {t.sources.map((s, si) => (
                    <button
                      key={si}
                      type="button"
                      onClick={() => openSource(si + 1, t.sources)}
                      className="text-left text-[11px] text-ink-3 bg-app-bg border border-border-card rounded-lg px-2 py-1.5 hover:border-accent transition-colors"
                    >
                      <span className="text-accent font-semibold mr-1">[{si + 1}]</span>
                      <span className="text-ink-6">{s.excerpt}{s.excerpt.length >= 200 ? '…' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-[12px] text-ink-6">…</p>}
      </div>
      <div className="px-3 py-2.5 border-t border-border-div flex items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }} placeholder={L.ph}
          className="flex-1 text-[12.5px] text-ink-0 bg-app-bg border border-border-card rounded-lg px-3 py-2 outline-none focus:border-accent" />
        <button onClick={ask} disabled={busy || !q.trim()} className="bg-accent text-white rounded-lg p-2 hover:opacity-90 disabled:opacity-50">
          <Send size={15} />
        </button>
      </div>

      {/* Drawer da fonte citada — trecho completo + proveniência (documento/chunk). */}
      {active && (
        <div className="absolute inset-0 z-10 flex justify-end bg-black/30" onClick={() => setActive(null)}>
          <div
            className="w-[86%] max-w-[340px] h-full bg-surface border-l border-border-card flex flex-col shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border-div flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-ink-0 flex items-center gap-1.5">
                <FileText size={13} className="text-accent" />
                {L.source} <span className="text-accent">[{active.n}]</span>
              </span>
              <button type="button" onClick={() => setActive(null)} className="text-ink-6 hover:text-ink-0">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {full?.fileName && (
                <p className="text-[11.5px] font-semibold text-ink-0">{full.fileName}</p>
              )}
              <p className="text-[10px] text-ink-6 break-all">
                {L.doc}: {active.source.documentId} · {L.chunk}: {active.source.chunkIndex}
              </p>
              <p className="text-[12px] leading-relaxed text-ink-3 whitespace-pre-wrap">
                {fullBusy && !full ? L.loading : (full?.content ?? active.source.excerpt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
