'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { DealChat } from '@/components/DealChat'
import { ArrowLeft, AlertTriangle, ClipboardCheck, Sparkles, Upload, X } from 'lucide-react'
import { useLang } from '@/lib/lang'

interface DdItem { id: string; category: string; item: string; status: string; notes: string | null }
interface RedFlag { id: string; category: string; description: string; severity: string; detectedByAgentId: string | null }
interface Valuation { id: string; method: string; low: string | null; base: string | null; high: string | null }

const STATUS_STYLES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-500',
  em_analise: 'bg-yellow-100 text-yellow-700',
  concluido: 'bg-green-100 text-green-700',
  red_flag: 'bg-red-100 text-red-700',
}
const SEV_STYLES: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}
const METHOD_LABEL: Record<string, string> = { dcf: 'DCF', ev_ebitda: 'EV/EBITDA', precedente: 'Transações precedentes' }

export default function DueDiligencePage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useLang()
  const [items, setItems] = useState<DdItem[]>([])
  const [redFlags, setRedFlags] = useState<RedFlag[]>([])
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function load() {
    return fetch(`/api/projects/${id}/due-diligence`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setRedFlags(d.redFlags ?? []); setValuations(d.valuations ?? []) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }
  useEffect(() => { load() }, [id])

  async function runDiligence() {
    setRunning(true); setNotice(null)
    try {
      const res = await fetch(`/api/deals/${id}/diligence`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setNotice(d.error ?? 'Falha.')
      else if (d.emptyDataroom) setNotice(lang === 'en' ? 'Dataroom is empty — upload documents first.' : 'Dataroom vazio — suba documentos primeiro.')
      else { setNotice(`+${d.redFlagsAdded} red flags · +${d.checklistAdded} checklist`); await load() }
    } catch { setNotice('Erro de rede.') } finally { setRunning(false) }
  }

  const byCategory = useMemo(() => {
    const map = new Map<string, DdItem[]>()
    for (const it of items) { if (!map.has(it.category)) map.set(it.category, []); map.get(it.category)!.push(it) }
    return [...map.entries()]
  }, [items])

  // triangulation bounds for the shared value axis
  const bounds = useMemo(() => {
    const nums = valuations.flatMap(v => [v.low, v.base, v.high]).map(Number).filter(n => Number.isFinite(n))
    return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null
  }, [valuations])

  const L = lang === 'en'
    ? { back: 'Project', title: 'Due diligence', checklist: 'Checklist by category', flags: 'Red flags', valuation: 'Valuation triangulation', empty: 'No data yet. Upload documents and run autonomous diligence to populate this.', noFlags: 'No red flags recorded.', by: 'detected by', upload: 'Add document', run: 'Run diligence', running: 'Reading dataroom…' }
    : { back: 'Projeto', title: 'Due diligence', checklist: 'Checklist por categoria', flags: 'Red flags', valuation: 'Triangulação de valuation', empty: 'Sem dados ainda. Suba documentos e rode a diligence autônoma para preencher.', noFlags: 'Nenhum red flag registrado.', by: 'detectado por', upload: 'Adicionar documento', run: 'Rodar diligence', running: 'Lendo o dataroom…' }

  const money = (v: string | null) => (v == null ? '—' : Number(v).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 0 }))
  const pct = (v: string | null) => (!bounds || v == null ? 0 : ((Number(v) - bounds.min) / (bounds.max - bounds.min || 1)) * 100)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-end justify-between">
          <div>
            <Link href={`/projetos/${id}`} className="flex items-center gap-1.5 text-[12px] text-ink-5 hover:text-ink-0 mb-2 w-fit">
              <ArrowLeft size={13} /> {L.back}
            </Link>
            <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-accent" /> {L.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 text-[12px] text-ink-5 border border-border-input rounded-lg px-3 py-2 hover:bg-hover-bg">
              <Upload size={13} /> {L.upload}
            </button>
            <button onClick={runDiligence} disabled={running} className="flex items-center gap-1.5 text-[12px] bg-accent text-white rounded-lg px-3 py-2 hover:opacity-90 disabled:opacity-50">
              <Sparkles size={13} /> {running ? L.running : L.run}
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8 max-w-4xl">
          {notice && <p className="text-[12px] text-accent bg-accent-soft rounded-lg px-3 py-2 w-fit">{notice}</p>}

          {/* Per-deal AI chat over the dataroom */}
          <DealChat dealId={id} />

          {loaded && items.length === 0 && redFlags.length === 0 && valuations.length === 0 && (
            <p className="text-[12px] text-ink-6">{L.empty}</p>
          )}

          {/* Valuation triangulation */}
          {valuations.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-ink-0 mb-3">{L.valuation}</h2>
              <div className="space-y-3">
                {valuations.map(v => (
                  <div key={v.id} className="bg-surface border border-border-card rounded-[10px] px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12.5px] font-medium text-ink-0">{METHOD_LABEL[v.method] ?? v.method}</span>
                      <span className="text-[11.5px] text-ink-5">{money(v.low)} · <b className="text-ink-0">{money(v.base)}</b> · {money(v.high)}</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-app-bg">
                      <div className="absolute h-2 rounded-full bg-accent/30"
                        style={{ left: `${pct(v.low)}%`, width: `${Math.max(pct(v.high) - pct(v.low), 2)}%` }} />
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-accent top-1/2 -translate-y-1/2 -translate-x-1/2"
                        style={{ left: `${pct(v.base)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Red flags */}
          <section>
            <h2 className="text-[13px] font-semibold text-ink-0 mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-orange-500" /> {L.flags}
            </h2>
            {redFlags.length === 0 ? (
              <p className="text-[12px] text-ink-6">{L.noFlags}</p>
            ) : (
              <div className="space-y-2">
                {redFlags.map(f => (
                  <div key={f.id} className="bg-surface border border-border-card rounded-[10px] px-4 py-3 flex items-start gap-3">
                    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full shrink-0 ${SEV_STYLES[f.severity] ?? ''}`}>{f.severity}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-ink-0">{f.description}</p>
                      <p className="text-[11px] text-ink-6 mt-0.5">{f.category}{f.detectedByAgentId ? ` · ${L.by} ${f.detectedByAgentId}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Checklist */}
          {byCategory.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-ink-0 mb-3">{L.checklist}</h2>
              <div className="space-y-5">
                {byCategory.map(([cat, its]) => (
                  <div key={cat}>
                    <p className="text-[11.5px] font-medium text-ink-5 uppercase tracking-wide mb-2">{cat}</p>
                    <div className="space-y-1.5">
                      {its.map(it => (
                        <div key={it.id} className="bg-surface border border-border-card rounded-[8px] px-4 py-2.5 flex items-center gap-3">
                          <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full shrink-0 ${STATUS_STYLES[it.status] ?? ''}`}>{it.status}</span>
                          <span className="text-[12.5px] text-ink-0">{it.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {showUpload && <UploadDocModal dealId={id} lang={lang} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); setNotice(lang === 'en' ? 'Document added to the dataroom.' : 'Documento adicionado ao dataroom.') }} />}
    </div>
  )
}

function UploadDocModal({ dealId, lang, onClose, onDone }: { dealId: string; lang: 'pt' | 'en'; onClose: () => void; onDone: () => void }) {
  const [fileName, setFileName] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const L = lang === 'en'
    ? { title: 'Add document to dataroom', hint: 'Paste the extracted text (contract, financials, memo). It is chunked and embedded for retrieval and diligence.', name: 'Document name', body: 'Document text', go: 'Ingest', cancel: 'Cancel' }
    : { title: 'Adicionar documento ao dataroom', hint: 'Cole o texto extraído (contrato, financeiro, memo). Ele é fatiado e indexado para busca e diligence.', name: 'Nome do documento', body: 'Texto do documento', go: 'Ingerir', cancel: 'Cancelar' }

  async function submit() {
    if (!fileName.trim() || !text.trim()) { setError(L.body); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/deals/${dealId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: fileName.trim(), text }) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Falha.'); setBusy(false); return }
      onDone()
    } catch { setError('Falha de rede.'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-[12px] w-[560px] max-w-[94vw] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-semibold text-ink-0">{L.title}</h2>
          <button onClick={onClose} className="text-ink-6 hover:text-ink-0"><X size={16} /></button>
        </div>
        <p className="text-[12px] text-ink-5 mb-4">{L.hint}</p>
        <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder={L.name}
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[13px] text-ink-0 bg-app-bg mb-3 outline-none focus:border-accent" />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={9} placeholder={L.body}
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[12.5px] text-ink-0 bg-app-bg mb-3 outline-none focus:border-accent resize-none" />
        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-lg text-ink-5 hover:bg-app-bg">{L.cancel}</button>
          <button onClick={submit} disabled={busy} className="text-[12px] px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50">{busy ? '…' : L.go}</button>
        </div>
      </div>
    </div>
  )
}
