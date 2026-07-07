'use client'
import { useState } from 'react'
import { Send, MessageSquare, FileText } from 'lucide-react'
import { useLang } from '@/lib/lang'

// Chat por deal — pergunta em linguagem natural respondida sobre o dataroom (RAG + MERKO).
interface Turn { role: 'user' | 'assistant'; content: string; sources?: number }

export function DealChat({ dealId }: { dealId: string }) {
  const { lang } = useLang()
  const [turns, setTurns] = useState<Turn[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const L = lang === 'en'
    ? { title: 'Ask this deal', ph: 'e.g. What are the biggest financial risks?', empty: 'The analyst has read the dataroom. Ask anything.', src: 'sources' }
    : { title: 'Pergunte a este deal', ph: 'ex.: Quais os maiores riscos financeiros?', empty: 'O analista leu o dataroom. Pergunte à vontade.', src: 'fontes' }

  async function ask() {
    const question = q.trim()
    if (!question || busy) return
    setTurns(t => [...t, { role: 'user', content: question }])
    setQ(''); setBusy(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, lang }) })
      const d = await res.json()
      setTurns(t => [...t, { role: 'assistant', content: d.answer ?? d.error ?? '—', sources: Array.isArray(d.sources) ? d.sources.length : 0 }])
    } catch {
      setTurns(t => [...t, { role: 'assistant', content: lang === 'en' ? 'Network error.' : 'Erro de rede.' }])
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-surface border border-border-card rounded-[12px] flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border-div flex items-center gap-2">
        <MessageSquare size={15} className="text-accent" />
        <span className="text-[13px] font-semibold text-ink-0">{L.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {turns.length === 0 && <p className="text-[12px] text-ink-6">{L.empty}</p>}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] text-[12.5px] leading-relaxed px-3 py-2 rounded-[10px] ${t.role === 'user' ? 'bg-accent text-white' : 'bg-app-bg text-ink-0'}`}>
              {t.content}
            </div>
            {t.role === 'assistant' && typeof t.sources === 'number' && t.sources > 0 && (
              <p className="text-[10.5px] text-ink-6 mt-1 flex items-center gap-1"><FileText size={10} /> {t.sources} {L.src}</p>
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
    </div>
  )
}
