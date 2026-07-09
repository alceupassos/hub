'use client'
import { useState } from 'react'
import { Send, Swords, Info, Flag, Gauge, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { ChatMarkdown } from './ChatMarkdown'

// Simulador de negociação com a contraparte (MERKO encarna o outro lado da mesa).
// O usuário treina ancoragem, concessões e táticas; cada turno recebe uma nota (0–10)
// do último movimento e, ao encerrar, um debrief estruturado.

type Side = 'comprador' | 'vendedor'
type Posture = 'agressivo' | 'colaborativo' | 'distressed'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  moveScore?: number
  moveNote?: string
}

interface ApiTurn {
  role: 'user' | 'assistant'
  content: string
}

const scoreColor = (n: number): string =>
  n >= 7 ? 'text-emerald-500 border-emerald-500/40' : n >= 4 ? 'text-amber-500 border-amber-500/40' : 'text-red-500 border-red-500/40'

export function NegotiationSimulator() {
  const { lang } = useLang()
  const [side, setSide] = useState<Side>('comprador')
  const [posture, setPosture] = useState<Posture>('colaborativo')
  const [dealContext, setDealContext] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [debrief, setDebrief] = useState<string | null>(null)
  const [debriefBusy, setDebriefBusy] = useState(false)

  const L =
    lang === 'en'
      ? {
          title: 'Counterparty negotiation simulator',
          note: 'What it is:',
          noteBody: 'a live M&A negotiation against an AI counterparty that defends the opposite side.',
          use: 'For: rehearsing anchoring, concessions and tactics before a real deal. How to use: pick your side and the counterparty posture, add optional deal context, then negotiate turn by turn — each of your moves gets a 0–10 score. Hit "End & analyze" for a full debrief.',
          side: 'Your side',
          buyer: 'Buyer',
          seller: 'Seller',
          posture: 'Counterparty posture',
          aggressive: 'Aggressive',
          collaborative: 'Collaborative',
          distressed: 'Distressed',
          context: 'Deal context (optional)',
          contextPh: 'e.g. SaaS, ARR R$40M, EBITDA margin 18%, asking 6x…',
          empty: 'Make your opening move. Anchor well.',
          ph: 'Your move (offer, condition, question)…',
          end: 'End & analyze',
          ending: 'Analyzing…',
          debriefTitle: 'Debrief',
          move: 'Move',
        }
      : {
          title: 'Simulador de negociação com a contraparte',
          note: 'O que é:',
          noteBody: 'uma negociação de M&A ao vivo contra uma contraparte de IA que defende o lado oposto.',
          use: 'Para que serve: ensaiar ancoragem, concessões e táticas antes do deal real. Como usar: escolha seu lado e a postura da contraparte, adicione o contexto do deal (opcional) e negocie turno a turno — cada movimento seu recebe uma nota de 0 a 10. Clique em "Encerrar e analisar" para o debrief completo.',
          side: 'Seu lado',
          buyer: 'Comprador',
          seller: 'Vendedor',
          posture: 'Postura da contraparte',
          aggressive: 'Agressivo',
          collaborative: 'Colaborativo',
          distressed: 'Distressed',
          context: 'Contexto do deal (opcional)',
          contextPh: 'ex.: SaaS, ARR R$40M, margem EBITDA 18%, pedindo 6x…',
          empty: 'Faça seu movimento de abertura. Ancore bem.',
          ph: 'Seu movimento (oferta, condição, pergunta)…',
          end: 'Encerrar e analisar',
          ending: 'Analisando…',
          debriefTitle: 'Debrief',
          move: 'Movimento',
        }

  const apiMessages = (extra?: Turn): ApiTurn[] =>
    [...turns, ...(extra ? [extra] : [])].map(t => ({ role: t.role, content: t.content }))

  async function send() {
    const content = input.trim()
    if (!content || busy) return
    const userTurn: Turn = { role: 'user', content }
    setTurns(t => [...t, userTurn])
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/negotiation-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages(userTurn), side, posture, dealContext: dealContext.trim() || undefined, lang }),
      })
      const d = await res.json()
      if (d.error) {
        setTurns(t => [...t, { role: 'assistant', content: d.error }])
      } else {
        setTurns(t => {
          // Anexa a nota do movimento ao ÚLTIMO turno do usuário.
          const next = [...t]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'user') {
              next[i] = { ...next[i], moveScore: d.moveScore, moveNote: d.moveNote }
              break
            }
          }
          return [...next, { role: 'assistant', content: d.reply ?? '—' }]
        })
      }
    } catch {
      setTurns(t => [...t, { role: 'assistant', content: lang === 'en' ? 'Network error.' : 'Erro de rede.' }])
    } finally {
      setBusy(false)
    }
  }

  async function analyze() {
    if (debriefBusy || turns.length === 0) return
    setDebriefBusy(true)
    setDebrief(null)
    try {
      const res = await fetch('/api/negotiation-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages(), side, posture, dealContext: dealContext.trim() || undefined, lang, debrief: true }),
      })
      const d = await res.json()
      setDebrief(d.text ?? d.error ?? '—')
    } catch {
      setDebrief(lang === 'en' ? 'Network error.' : 'Erro de rede.')
    } finally {
      setDebriefBusy(false)
    }
  }

  const selectCls =
    'text-[12px] text-ink-0 bg-app-bg border border-border-card rounded-lg px-2.5 py-1.5 outline-none focus:border-accent'

  return (
    <div className="bg-surface border border-border-card rounded-[12px] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border-div flex items-center gap-2">
        <Swords size={15} className="text-accent" />
        <span className="text-[13px] font-semibold text-ink-0">{L.title}</span>
      </div>

      {/* PanelNote — o que é / para que serve / como usar */}
      <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-lg border border-border-card bg-subtle-bg px-3.5 py-2.5">
        <Info size={13} className="text-accent mt-0.5 shrink-0" />
        <p className="text-[11.5px] text-ink-4 leading-relaxed">
          <span className="text-ink-2 font-medium">{L.note}</span> {L.noteBody} {L.use}
        </p>
      </div>

      {/* Controles */}
      <div className="px-4 pt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] text-ink-6 uppercase tracking-wide">{L.side}</span>
          <select value={side} onChange={e => setSide(e.target.value as Side)} className={selectCls}>
            <option value="comprador">{L.buyer}</option>
            <option value="vendedor">{L.seller}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] text-ink-6 uppercase tracking-wide">{L.posture}</span>
          <select value={posture} onChange={e => setPosture(e.target.value as Posture)} className={selectCls}>
            <option value="agressivo">{L.aggressive}</option>
            <option value="colaborativo">{L.collaborative}</option>
            <option value="distressed">{L.distressed}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <span className="text-[10.5px] text-ink-6 uppercase tracking-wide">{L.context}</span>
          <input value={dealContext} onChange={e => setDealContext(e.target.value)} placeholder={L.contextPh} className={selectCls} />
        </label>
      </div>

      {/* Conversa */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[220px] max-h-[420px]">
        {turns.length === 0 && <p className="text-[12px] text-ink-6">{L.empty}</p>}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-[85%] text-[12.5px] leading-relaxed px-3 py-2 rounded-[10px] text-left ${
                t.role === 'user' ? 'bg-accent text-white' : 'bg-app-bg text-ink-0'
              }`}
            >
              {t.role === 'assistant' ? <ChatMarkdown content={t.content} /> : t.content}
            </div>
            {t.role === 'user' && typeof t.moveScore === 'number' && (
              <div className="mt-1 flex justify-end">
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-semibold border rounded-full px-2 py-0.5 bg-surface ${scoreColor(
                    t.moveScore,
                  )}`}
                  title={t.moveNote}
                >
                  <Gauge size={10} />
                  {L.move}: {t.moveScore}/10
                  {t.moveNote && <span className="font-normal text-ink-5 ml-0.5">— {t.moveNote}</span>}
                </span>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-[12px] text-ink-6">…</p>}
      </div>

      {/* Debrief */}
      {debrief && (
        <div className="mx-4 mb-3 rounded-lg border border-border-card bg-subtle-bg px-3.5 py-3">
          <p className="text-[11.5px] font-semibold text-ink-0 flex items-center gap-1.5 mb-1.5">
            <Flag size={12} className="text-accent" /> {L.debriefTitle}
          </p>
          <div className="text-[12px] text-ink-2 leading-relaxed">
            <ChatMarkdown content={debrief} />
          </div>
        </div>
      )}

      {/* Input + ações */}
      <div className="px-3 py-2.5 border-t border-border-div flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') send()
          }}
          placeholder={L.ph}
          disabled={busy}
          className="flex-1 text-[12.5px] text-ink-0 bg-app-bg border border-border-card rounded-lg px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="bg-accent text-white rounded-lg p-2 hover:opacity-90 disabled:opacity-50"
          title={L.ph}
        >
          <Send size={15} />
        </button>
        <button
          onClick={analyze}
          disabled={debriefBusy || turns.length === 0}
          className="flex items-center gap-1.5 text-[11.5px] font-medium text-accent border border-accent/35 hover:bg-accent-soft px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {debriefBusy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
          {debriefBusy ? L.ending : L.end}
        </button>
      </div>
    </div>
  )
}
