'use client'
import { useState } from 'react'
import { FileText, Presentation, Sheet, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/lang'

// Botões de entregável de 1 clique (IC memo / deck / modelo). Monta o DeliverableData a partir
// do que está na tela e baixa o arquivo Office gerado no servidor. Inclui nota explicativa curta.

export interface DeliverablePayload {
  dealName: string
  date?: string
  synthesis?: string
  recommendation?: string
  footballField?: { method: string; low: number; base: number; high: number }[]
  lbo?: { entryEV: number; sponsorEquity: number; exitEV: number; moic: number; irr: number | null }
  dcf?: { enterpriseValue: number; equityValue: number | null; wacc: number }
  redFlags?: { category: string; description: string; severity: string }[]
  assumptions?: { label: string; value: string; source?: string }[]
  nextSteps?: { action: string; owner?: string; timeline?: string }[]
}

const FORMAT_META = [
  { key: 'docx', icon: FileText },
  { key: 'pptx', icon: Presentation },
  { key: 'xlsx', icon: Sheet },
] as const

export function DeliverableButtons({ data, compact = false }: { data: DeliverablePayload; compact?: boolean }) {
  const { lang } = useLang()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const L = lang === 'en'
    ? {
        docx: 'IC memo (Word)',
        pptx: 'Deck (PPT)',
        xlsx: 'Model (Excel)',
        intro: 'Institutional deliverables.',
        introBody: 'Generates, in one click, the IC memo (Word), the executive deck (PowerPoint) and the model (Excel) from this analysis — engine numbers, branded Strategy Partners. Use it to take straight to the committee.',
        genErr: 'Failed to generate the deliverable.',
        netErr: 'Connection error while generating the deliverable.',
      }
    : {
        docx: 'IC memo (Word)',
        pptx: 'Deck (PPT)',
        xlsx: 'Modelo (Excel)',
        intro: 'Entregáveis institucionais.',
        introBody: 'Gera, em 1 clique, o memorando de comitê (Word), o deck executivo (PowerPoint) e o modelo (Excel) a partir desta análise — números do motor, branded Strategy Partners. Use para levar direto ao comitê.',
        genErr: 'Falha ao gerar o entregável.',
        netErr: 'Erro de conexão ao gerar o entregável.',
      }

  async function generate(format: string) {
    setBusy(format); setError('')
    try {
      const payload = { date: new Date().toISOString(), ...data }
      const res = await fetch(`/api/deliverable?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? L.genErr)
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename="([^"]+)"/)
      const name = m?.[1] ?? `StrategyPartners.${format}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = name; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(L.netErr)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {!compact && (
        <p className="text-[11px] text-ink-5 mb-2 leading-relaxed">
          <span className="text-ink-2 font-medium">{L.intro}</span>{' '}
          {L.introBody}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {FORMAT_META.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => generate(key)} disabled={busy != null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-input text-[11.5px] text-ink-3 hover:border-accent hover:text-accent transition-colors disabled:opacity-50">
            {busy === key ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
            {L[key]}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] text-[#B4462F]">{error}</p>}
    </div>
  )
}
