'use client'
import { useState } from 'react'
import { FileText, Presentation, Sheet, Loader2 } from 'lucide-react'

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

const FORMATS = [
  { key: 'docx', label: 'IC memo (Word)', icon: FileText },
  { key: 'pptx', label: 'Deck (PPT)', icon: Presentation },
  { key: 'xlsx', label: 'Modelo (Excel)', icon: Sheet },
] as const

export function DeliverableButtons({ data, compact = false }: { data: DeliverablePayload; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

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
        setError(d.error ?? 'Falha ao gerar o entregável.')
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
      setError('Erro de conexão ao gerar o entregável.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {!compact && (
        <p className="text-[11px] text-ink-5 mb-2 leading-relaxed">
          <span className="text-ink-2 font-medium">Entregáveis institucionais.</span>{' '}
          Gera, em 1 clique, o memorando de comitê (Word), o deck executivo (PowerPoint) e o modelo (Excel)
          a partir desta análise — números do motor, branded Strategy Partners. Use para levar direto ao comitê.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {FORMATS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => generate(key)} disabled={busy != null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-input text-[11.5px] text-ink-3 hover:border-accent hover:text-accent transition-colors disabled:opacity-50">
            {busy === key ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] text-[#B4462F]">{error}</p>}
    </div>
  )
}
