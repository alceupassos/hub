'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Loader2, X, Brain, Zap, ChevronDown, BarChart2, CheckCircle2, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { Model, VerifyState } from '@/lib/types'
import type { Translations } from '@/lib/i18n'
import { AGENTS } from '@/lib/agents'
import { useAgentConfig } from '@/lib/agent-config'

interface Props {
  activeModels: Model[]
  activeCount: number
  t: Translations
  liveQuestion?: string
  agentTexts?: Record<string, string>
  agentLoading?: Record<string, boolean>
  agentConf?: Record<string, number>
  agentModels?: Record<string, string>
  agentVerify?: Record<string, VerifyState>
  synthesis?: string
  synthLoading?: boolean
  participatingIds?: string[]
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMd(raw: string): string {
  // Normalise line endings
  let s = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  // Escape HTML entities
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Inline formatting
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  s = s.replace(/`([^`]+)`/g, '<code class="font-mono text-[11px] bg-track px-[4px] py-[1px] rounded">$1</code>')

  // Tables — convert | rows to <tr><td>, skip separator rows (|---|)
  s = s.replace(/^\|(.+)\|$/gm, (_, row: string) => {
    const cells = row.split('|').map((c: string) => c.trim())
    if (cells.every((c: string) => /^[-: ]+$/.test(c))) return '__TABLE_SEP__'
    return `<tr>${cells.map((c: string) => `<td class="px-3 py-[5px] text-[11.5px] border border-border-div align-top">${c}</td>`).join('')}</tr>`
  })
  s = s.replace(/<tr>.*?__TABLE_SEP__.*?\n/g, '')
  s = s.replace(/(__TABLE_SEP__\n?)/g, '')
  // Wrap first <tr> after a header row differently
  s = s.replace(/(<tr>[\s\S]*?<\/tr>(\n|$))+/g, m =>
    `<div class="overflow-x-auto my-3"><table class="w-full border-collapse text-left">${m}</table></div>`)

  // Headers (## and ###)
  s = s.replace(/^### (.+)$/gm,
    '<p class="font-semibold text-ink-1 mt-3 mb-[2px] text-[12.5px]">$1</p>')
  s = s.replace(/^#{1,2} (.+)$/gm,
    '<p class="font-semibold text-ink-0 mt-5 mb-1 text-[13.5px] border-b border-border-div pb-[4px]">$1</p>')

  // Numbered lists — must come before bullet lists
  s = s.replace(/^(\d+)\. (.+)$/gm,
    '<li class="mb-[6px]" data-ol="1">$2</li>')
  s = s.replace(/(<li[^>]*data-ol="1"[^>]*>[\s\S]*?<\/li>\n?)+/g, m =>
    `<ol class="list-decimal ml-5 my-2 space-y-[2px]">${m.replace(/ data-ol="1"/g, '')}</ol>`)

  // Bullet lists
  s = s.replace(/^[-•*] (.+)$/gm, '<li class="mb-[3px]">$1</li>')
  s = s.replace(/(<li class="mb-[^"]*">[\s\S]*?<\/li>\n?)+/g, m =>
    `<ul class="list-disc ml-5 my-2">${m}</ul>`)

  // Paragraphs — split on blank lines, wrap non-HTML lines
  const paragraphs = s.split(/\n{2,}/)
  s = paragraphs.map(block => {
    block = block.trim()
    if (!block) return ''
    if (/^<(p|ul|ol|div|table|h[1-6]|li)[\s>]/.test(block)) return block
    // inline: replace single newlines with space within a paragraph
    return `<p class="mb-[6px] leading-[1.85]">${block.replace(/\n/g, ' ')}</p>`
  }).join('\n')

  return s
}

// ── Verification Badge ─────────────────────────────────────────────────────────
function VerifyBadge({ verify }: { verify: VerifyState | undefined }) {
  const [open, setOpen] = useState(false)
  if (!verify) return null

  if (verify.loading) {
    return (
      <span className="flex items-center gap-[3px] font-mono text-[9px] px-[6px] py-[2px] rounded-full border bg-track border-border-div text-ink-7">
        <Loader2 size={8} className="animate-spin" />
        verificando
      </span>
    )
  }

  const { verdict, score, issues } = verify
  const cfg = {
    verified: {
      icon: <ShieldCheck size={9} />,
      label: 'Verificado',
      cls: 'bg-green-50 border-green-200 text-green-700',
    },
    review:  {
      icon: <AlertTriangle size={9} />,
      label: 'Revisar',
      cls: 'bg-amber-50 border-amber-200 text-amber-700',
    },
    flagged: {
      icon: <ShieldAlert size={9} />,
      label: 'Sinalizado',
      cls: 'bg-red-50 border-red-200 text-red-600',
    },
  }[verdict]

  return (
    <span className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className={`flex items-center gap-[3px] font-mono text-[9px] px-[6px] py-[2px] rounded-full border cursor-pointer transition-opacity hover:opacity-80 ${cfg.cls}`}
      >
        {cfg.icon}
        {cfg.label} · {score}%
      </button>
      {open && issues.length > 0 && (
        <div
          className="absolute top-full left-0 mt-[4px] z-50 bg-surface border border-border-card rounded-[8px] shadow-lg p-[10px] w-[220px]"
          onClick={e => e.stopPropagation()}
        >
          <p className="font-mono text-[9px] text-ink-7 mb-[6px] uppercase tracking-wider">Problemas detectados</p>
          <ul className="space-y-[4px]">
            {issues.map((issue, i) => (
              <li key={i} className="text-[11px] text-ink-3 leading-[1.5] flex gap-[5px]">
                <span className="text-amber-500 shrink-0 mt-[1px]">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}

// ── Score heuristics ──────────────────────────────────────────────────────────
function topicScore(question: string, category: string): number {
  const q = question.toLowerCase()
  const map: Record<string, string[]> = {
    financeiro:  ['financ', 'capital', 'valuat', 'arr', 'receita', 'passiv', 'lucro', 'invest'],
    vendas:      ['vend', 'client', 'deal', 'mercado', 'expansão', 'crescimento', 'aquisição'],
    segurança:   ['segur', 'risco', 'multa', 'regulat', 'compliance', 'banco central', 'lgpd'],
    programação: ['tecnolog', 'sistema', 'stack', 'api', 'código', 'integr', 'plataform'],
    conhecimento:['estratégi', 'analise', 'pesquis', 'planejamento', 'contrat', 'kpi'],
    chat:        ['resposta', 'atendimento', 'consulta'],
  }
  const hits = (map[category] ?? []).filter(k => q.includes(k)).length
  return Math.min(98, 54 + hits * 9)
}

function impactScore(category: string): number {
  const base: Record<string, number> = {
    financeiro: 92, segurança: 88, vendas: 84, programação: 80, conhecimento: 78, chat: 65,
  }
  return base[category] ?? 72
}

function urgencyScore(question: string): number {
  return /urgente|imediato|agora|q3|q4|90 dias|prazo|vencimento|deadline|asap/i.test(question) ? 88 : 62
}

// ── Agent Detail Modal ─────────────────────────────────────────────────────────
function AgentDetailModal({
  model, question, response, confidence, useReasoner, onClose,
}: {
  model: Model
  question: string
  response: string
  confidence: number
  useReasoner: boolean
  onClose: () => void
}) {
  const agent = AGENTS.find(a => a.id === model.id)
  const { getPersonaOverride } = useAgentConfig()
  const [deepResponse, setDeepResponse] = useState<string | null>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)
  const [showDeep, setShowDeep] = useState(false)

  useEffect(() => {
    if (!question || !response) return
    setDeepLoading(true)
    fetch('/api/agent-deep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: model.id,
        question,
        previousResponse: response,
        lang: 'pt',
        personaOverride: getPersonaOverride(model.id),
      }),
    })
      .then(r => r.json())
      .then((d: { response?: string; error?: string }) => {
        if (d.error) setDeepError(d.error)
        else setDeepResponse(d.response ?? null)
      })
      .catch(() => setDeepError('Erro ao carregar análise aprofundada.'))
      .finally(() => setDeepLoading(false))
  }, [model.id, question, response])

  const wordCount = response.trim().split(/\s+/).length
  const depthScore = Math.min(98, Math.round((wordCount / 80) * 100))
  const relevance  = topicScore(question, agent?.category ?? 'conhecimento')
  const impact     = impactScore(agent?.category ?? 'conhecimento')
  const urgency    = urgencyScore(question)

  const metrics = [
    { label: 'Confiança', value: confidence },
    { label: 'Profundidade', value: depthScore },
    { label: 'Relevância', value: relevance },
    { label: 'Impacto de negócio', value: impact },
    { label: 'Urgência', value: urgency },
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[16px] shadow-2xl w-full max-w-[620px] max-h-[90vh] flex flex-col overflow-hidden"
        style={{ border: `1.5px solid ${model.dot}55` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-div shrink-0">
          {agent && (
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2"
              style={{ '--tw-ring-color': model.dot } as React.CSSProperties}>
              <Image src={agent.avatar} alt={agent.name} fill className="object-cover" sizes="36px" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-ink-0 leading-tight">{model.name}</p>
            <p className="text-[11px] text-ink-6 leading-tight truncate">{agent?.role}</p>
          </div>
          <div className="flex items-center gap-[6px] shrink-0">
            {useReasoner ? (
              <span className="flex items-center gap-[4px] font-mono text-[9px] px-[7px] py-[3px] rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                <Brain size={9} /> Reasoner
              </span>
            ) : (
              <span className="flex items-center gap-[4px] font-mono text-[9px] px-[7px] py-[3px] rounded-full bg-accent-soft text-accent border border-accent/20">
                <Zap size={9} /> Flash
              </span>
            )}
            <span className="font-mono text-[9px] text-ink-7">{agent?.modelAlias}</span>
          </div>
          <button onClick={onClose} className="ml-1 w-7 h-7 rounded-full hover:bg-hover-bg flex items-center justify-center text-ink-6 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Initial response */}
          <div>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-ink-7 mb-2">
              Análise inicial
            </p>
            <div
              className="bg-app-bg rounded-[10px] px-4 py-3 text-[12.5px] text-ink-2 leading-[1.7]"
              dangerouslySetInnerHTML={{ __html: renderMd(response) }}
            />
          </div>

          {/* 5-dimension bar chart */}
          <div>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-ink-7 mb-3">
              Análise de qualidade — 5 dimensões
            </p>
            <div className="space-y-[10px]">
              {metrics.map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between mb-[4px]">
                    <span className="text-[11.5px] text-ink-4">{label}</span>
                    <span className="font-mono text-[11px] text-ink-5 font-semibold">{value}%</span>
                  </div>
                  <div className="w-full h-[7px] bg-track rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 delay-100"
                      style={{
                        width: `${value}%`,
                        background: `linear-gradient(90deg, ${model.barColor}, ${model.dot})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Radial gauge */}
          <div className="flex items-center gap-4 bg-app-bg rounded-[10px] px-4 py-3">
            <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-track)" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={model.barColor}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - confidence / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
              <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" className="text-ink-0">
                {confidence}%
              </text>
            </svg>
            <div>
              <p className="text-[12.5px] font-semibold text-ink-0 leading-tight">Score de confiança</p>
              <p className="text-[11px] text-ink-6 leading-snug mt-[2px]">
                {confidence >= 85 ? 'Alta confiança — análise sólida e fundamentada' :
                 confidence >= 72 ? 'Confiança moderada — revisar pontos-chave' :
                 'Confiança baixa — considerar agentes adicionais'}
              </p>
            </div>
          </div>

          {/* Deep analysis */}
          <div className="border-t border-border-div pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-accent">
                Análise aprofundada (Reasoner)
              </p>
              {deepResponse && (
                <button
                  onClick={() => setShowDeep(v => !v)}
                  className="flex items-center gap-1 text-[10px] text-ink-6 hover:text-ink-3 transition-colors"
                >
                  {showDeep ? 'Recolher' : 'Ver completo'}
                  <ChevronDown size={10} className={`transition-transform ${showDeep ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {deepLoading && (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={14} className="animate-spin text-accent shrink-0" />
                <p className="text-[12.5px] text-ink-5">Aprofundando análise com modelo Reasoner…</p>
              </div>
            )}

            {deepError && <p className="text-[11.5px] text-red-500">{deepError}</p>}

            {deepResponse && !deepLoading && (
              <>
                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{
                    maxHeight: showDeep ? '2000px' : '280px',
                    maskImage: !showDeep ? 'linear-gradient(to bottom, black 55%, transparent 100%)' : undefined,
                    WebkitMaskImage: !showDeep ? 'linear-gradient(to bottom, black 55%, transparent 100%)' : undefined,
                  }}
                >
                  <div
                    className="text-[12.5px] text-ink-2 leading-[1.75] animate-fadeIn"
                    dangerouslySetInnerHTML={{ __html: renderMd(deepResponse) }}
                  />
                </div>
                {!showDeep && (
                  <button onClick={() => setShowDeep(true)} className="mt-2 text-[11px] text-accent hover:underline">
                    Ver análise completa →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Model Card ─────────────────────────────────────────────────────────────────
function ModelCard({
  model, confidenceLabel, loading, revealed, delay, verify, onClick,
}: {
  model: Model
  confidenceLabel: string
  loading: boolean
  revealed: boolean
  delay: number
  verify?: VerifyState
  onClick?: () => void
}) {
  const agent = AGENTS.find(a => a.id === model.id)
  const rel  = topicScore(model.text ?? '', agent?.category ?? 'conhecimento')
  const imp  = impactScore(agent?.category ?? 'conhecimento')

  if (loading) {
    return (
      <div
        className="bg-surface rounded-[10px] p-[14px] flex flex-col gap-[10px] card-processing"
        style={{ '--glow-color': model.dot } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: model.dot }} />
          <span className="text-[12.5px] font-semibold text-ink-0">{model.name}</span>
          <div className="flex items-center gap-[3px] ml-[4px]">
            <span className="dot-1 w-[4px] h-[4px] rounded-full inline-block" style={{ backgroundColor: model.dot }} />
            <span className="dot-2 w-[4px] h-[4px] rounded-full inline-block" style={{ backgroundColor: model.dot }} />
            <span className="dot-3 w-[4px] h-[4px] rounded-full inline-block" style={{ backgroundColor: model.dot }} />
          </div>
        </div>
        <p className="font-mono text-[10px] text-ink-7 animate-pulse">Processando…</p>
        <div className="space-y-[5px]">
          {[1, 0.85, 0.7, 0.85, 0.6].map((w, i) => (
            <div key={i} className="h-[9px] bg-track rounded animate-pulse" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
        <div className="w-full h-[5px] bg-track rounded-full overflow-hidden">
          <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: model.dot + '66' }} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-surface border border-border-card rounded-[10px] p-[14px] flex flex-col gap-3 ${
        revealed ? 'cursor-pointer hover:border-[var(--card-accent)] hover:shadow-sm transition-all duration-200' : ''
      }`}
      style={{
        '--card-accent': model.dot,
        opacity: revealed ? 1 : undefined,
        transition: revealed
          ? `opacity 0.5s ease ${delay}ms, transform 0.4s ease ${delay}ms, box-shadow 0.2s`
          : undefined,
      } as React.CSSProperties}
      onClick={revealed ? onClick : undefined}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: model.dot }} />
        <span className="text-[12.5px] font-semibold text-ink-0">{model.name}</span>
        {revealed && verify && <VerifyBadge verify={verify} />}
        {revealed && (
          <span className="ml-auto font-mono text-[9px] text-ink-7 hover:text-accent transition-colors">
            aprofundar →
          </span>
        )}
      </div>

      <div
        className="text-[12px] text-ink-5 leading-[1.65] flex-1 line-clamp-6"
        dangerouslySetInnerHTML={{ __html: model.text ? renderMd(model.text) : '' }}
      />

      <div>
        <div className="w-full h-[5px] bg-track rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${model.conf}%`, backgroundColor: model.barColor }}
          />
        </div>
        <div className="flex justify-between mt-[5px]">
          <span className="font-mono text-[10px] text-ink-6">{confidenceLabel}</span>
          <span className="font-mono text-[10px] text-ink-6">{model.conf}%</span>
        </div>
      </div>

      {/* Mini sparklines when revealed */}
      {revealed && model.conf > 0 && (
        <div className="flex items-end gap-[3px] h-[14px]">
          {[model.conf, rel, imp].map((v, i) => (
            <div
              key={i}
              className="w-[5px] rounded-sm transition-all duration-700"
              style={{
                height: `${Math.max(3, Math.round((v / 100) * 14))}px`,
                backgroundColor: model.dot + (i === 0 ? 'ff' : i === 1 ? 'bb' : '77'),
              }}
            />
          ))}
          <span className="text-[9px] text-ink-7 ml-1 leading-none self-end">conf / rel / imp</span>
        </div>
      )}
    </div>
  )
}

// ── Fleet Charts Panel ─────────────────────────────────────────────────────────
function FleetChartsPanel({
  participatingIds,
  agentConf,
  synthesis,
}: {
  participatingIds: string[]
  agentConf: Record<string, number>
  synthesis: string
}) {
  type AgentEntry = { agent: (typeof AGENTS)[number]; conf: number }
  const agents: AgentEntry[] = participatingIds
    .map(id => ({ agent: AGENTS.find(a => a.id === id), conf: agentConf[id] ?? 70 }))
    .filter((x): x is AgentEntry => x.agent != null)

  const avgConf = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + a.conf, 0) / agents.length)
    : 0

  const gaugeR = 22, gaugeC = 28
  const gaugeCirc = 2 * Math.PI * gaugeR
  const gaugeDash = gaugeCirc * (1 - avgConf / 100)
  const gaugeColor = avgConf >= 75 ? 'var(--color-success)' : 'var(--color-accent)'

  const displayAgents = agents.slice(0, 8)

  // Risk index — count severity words in synthesis
  const synLower = synthesis.toLowerCase()
  const highCount = (synLower.match(/\b(alto|high|crítico|critical)\b/g) ?? []).length
  const medCount  = (synLower.match(/\b(médio|medio|medium|moderado|moderate)\b/g) ?? []).length
  const lowCount  = (synLower.match(/\b(baixo|low|menor|minor)\b/g) ?? []).length
  const hasRiskData = highCount + medCount + lowCount > 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-accent/15 animate-fadeIn">
      {/* A — Consensus Gauge */}
      <div className="bg-surface rounded-[10px] border border-border-card p-4 flex flex-col items-center gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.09em] text-ink-6 font-semibold">Consenso do Time</p>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx={gaugeC} cy={gaugeC} r={gaugeR} fill="none" stroke="var(--color-track)" strokeWidth="5" />
          <circle
            cx={gaugeC} cy={gaugeC} r={gaugeR} fill="none"
            stroke={gaugeColor} strokeWidth="5"
            strokeDasharray={gaugeCirc}
            strokeDashoffset={gaugeDash}
            strokeLinecap="round"
            transform={`rotate(-90 ${gaugeC} ${gaugeC})`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <text x={gaugeC} y={gaugeC + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
            {avgConf}%
          </text>
        </svg>
        <p className="text-[10.5px] text-ink-5 text-center leading-snug">
          {avgConf >= 85 ? 'Alta convergência estratégica' :
           avgConf >= 72 ? 'Convergência moderada' :
           'Divergência significativa'}
        </p>
        <p className="font-mono text-[9px] text-ink-7">{agents.length} agentes • média {avgConf}%</p>
      </div>

      {/* B — Agent Confidence Bars */}
      <div className="bg-surface rounded-[10px] border border-border-card p-4 flex flex-col gap-[7px]">
        <p className="font-mono text-[9px] uppercase tracking-[0.09em] text-ink-6 font-semibold mb-1">Confiança por Agente</p>
        {displayAgents.map(({ agent, conf }) => (
          <div key={agent.id} className="flex items-center gap-2">
            <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: agent.dot }} />
            <span className="text-[10.5px] text-ink-4 truncate w-[68px] shrink-0">{agent.name}</span>
            <div className="flex-1 h-[5px] bg-track rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${conf}%`, backgroundColor: agent.dot, transition: 'width 0.9s ease' }}
              />
            </div>
            <span className="font-mono text-[9.5px] text-ink-6 w-[26px] text-right shrink-0">{conf}%</span>
          </div>
        ))}
        {agents.length > 8 && (
          <p className="text-[9.5px] text-ink-7 mt-1">+{agents.length - 8} agentes adicionais</p>
        )}
      </div>

      {/* C — Risk Index */}
      <div className="bg-surface rounded-[10px] border border-border-card p-4 flex flex-col gap-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.09em] text-ink-6 font-semibold">Índice de Risco</p>
        {hasRiskData ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-[6px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-red-500 shrink-0" />
                  <span className="text-[11px] text-ink-4">Alto / Crítico</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-red-600">{highCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-[6px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[11px] text-ink-4">Médio / Moderado</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-amber-600">{medCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-[6px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] text-ink-4">Baixo / Menor</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-emerald-600">{lowCount}</span>
              </div>
            </div>
            <div className="flex gap-[3px] h-[28px] items-end mt-1">
              {[
                { count: highCount, color: '#EF4444' },
                { count: medCount,  color: '#F59E0B' },
                { count: lowCount,  color: '#10B981' },
              ].map(({ count, color }, i) => {
                const max = Math.max(highCount, medCount, lowCount, 1)
                return (
                  <div key={i} className="flex-1 rounded-sm" style={{
                    height: `${Math.max(4, (count / max) * 28)}px`,
                    backgroundColor: color,
                    opacity: 0.8,
                    transition: 'height 0.8s ease',
                  }} />
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-[10.5px] text-ink-6 leading-snug">Risco moderado identificado — ver Seção 2 da análise</p>
        )}
      </div>
    </div>
  )
}

// ── Synthesis Panel ────────────────────────────────────────────────────────────
function SynthesisPanel({ synthesis, synthLoading, isAgentsLoading, participatingIds, agentConf, t }: {
  synthesis?: string
  synthLoading?: boolean
  isAgentsLoading?: boolean
  participatingIds?: string[]
  agentConf?: Record<string, number>
  t: Translations
}) {
  const isWaiting = (isAgentsLoading || synthLoading) && !synthesis

  // Extract "Próximos Passos" section from synthesis for highlight card
  const nextStepsMatch = synthesis
    ? synthesis.match(/##\s*5[.\s].*?(?:Próximos Passos|Next Steps)[^\n]*([\s\S]*?)(?=##\s*6|$)/i)
    : null
  const nextStepsText = nextStepsMatch?.[1]?.trim() ?? null

  return (
    <div className="rounded-[14px] border border-accent/20 overflow-hidden mt-2">
      <div className="bg-accent px-5 py-3 flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-accent-over">
          {t.tabSynthesis} — Conclusão Geral do Time
        </p>
        {participatingIds && participatingIds.length > 0 && (
          <div className="flex items-center gap-[6px]">
            <span className="text-[9px] text-white/50 font-mono mr-1">{t.participatedIn}</span>
            <div className="flex -space-x-[4px]">
              {participatingIds.slice(0, 10).map(id => {
                const ag = AGENTS.find(a => a.id === id)
                if (!ag) return null
                return (
                  <div key={id} className="w-[18px] h-[18px] rounded-full overflow-hidden ring-1 ring-white/30 shrink-0" title={ag.name}>
                    <Image src={ag.avatar} alt={ag.name} width={18} height={18} className="object-cover" />
                  </div>
                )
              })}
              {participatingIds.length > 10 && (
                <div className="w-[18px] h-[18px] rounded-full bg-white/20 flex items-center justify-center ring-1 ring-white/30 shrink-0">
                  <span className="text-[8px] text-white font-mono">+{participatingIds.length - 10}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#0B3A78]/5 px-5 py-5">
        {isWaiting ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-[5px] shrink-0">
                <span className="dot-1 w-[7px] h-[7px] rounded-full bg-accent inline-block" />
                <span className="dot-2 w-[7px] h-[7px] rounded-full bg-accent inline-block" />
                <span className="dot-3 w-[7px] h-[7px] rounded-full bg-accent inline-block" />
              </div>
              <p className="text-[13px] font-semibold text-accent">
                {synthLoading ? t.synthLoading : 'Aguardando processamento final do time…'}
              </p>
            </div>
            <div className="space-y-[8px] mt-1">
              {[1, 0.92, 0.8, 0.92, 0.75, 0.88, 1, 0.7, 0.85, 0.95].map((w, i) => (
                <div key={i} className="h-[10px] bg-accent/10 rounded animate-pulse" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          </div>
        ) : synthesis ? (
          <>
            {/* Main synthesis text */}
            <div
              className="text-[13px] text-ink-1 leading-[1.85] animate-fadeIn prose-chat"
              dangerouslySetInnerHTML={{ __html: renderMd(synthesis) }}
            />

            {/* Fleet Charts */}
            {participatingIds && participatingIds.length > 0 && agentConf && (
              <FleetChartsPanel
                participatingIds={participatingIds}
                agentConf={agentConf}
                synthesis={synthesis}
              />
            )}

            {/* Próximos Passos highlight card */}
            {nextStepsText && (
              <div className="mt-4 rounded-[10px] border border-success/30 bg-success/5 px-4 py-4 animate-fadeIn">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={13} className="text-success shrink-0" />
                  <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-success">
                    Próximos Passos — Ações Priorizadas
                  </p>
                </div>
                <div
                  className="text-[12.5px] text-ink-2 leading-[1.8]"
                  dangerouslySetInnerHTML={{ __html: renderMd(nextStepsText) }}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-ink-5 leading-[1.7] italic">
            A síntese estratégica do time aparecerá aqui após todos os agentes concluírem.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Fleet Vitals Bar ───────────────────────────────────────────────────────────
export function FleetVitalsBar({
  sessionHistory,
}: {
  sessionHistory: { avgConf: number; agentCount: number; ts: number }[]
}) {
  if (sessionHistory.length === 0) return null

  const recent = sessionHistory.slice(-8)
  const last = recent[recent.length - 1]
  const W = 72, H = 18

  const points = recent.map((s, i) => {
    const x = recent.length === 1 ? W / 2 : (i / (recent.length - 1)) * W
    const y = H - 2 - (s.avgConf / 100) * (H - 4)
    return { x, y }
  })
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-[38px] bg-surface border-b border-border-div shrink-0">
      <div className="flex items-center gap-[6px] shrink-0">
        <BarChart2 size={12} className="text-accent" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-5">Fleet Vitals</span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
          {recent.length >= 2 && (
            <polyline
              points={polyline}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.65"
            />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3 : 1.5}
              fill="var(--color-accent)" opacity={i === points.length - 1 ? 1 : 0.5} />
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-ink-6 font-mono">
          {sessionHistory.length} {sessionHistory.length === 1 ? 'sessão' : 'sessões'}
        </span>
        <span className="font-mono text-[10px] font-semibold px-[7px] py-[2px] rounded-[4px] bg-accent text-white">
          {Math.round(last.avgConf)}%
        </span>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function ComparareView({
  activeModels, activeCount, t,
  liveQuestion, agentTexts, agentLoading, agentConf, agentModels, agentVerify,
  synthesis, synthLoading, participatingIds,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isLive = Boolean(liveQuestion)
  const displayQuestion = liveQuestion || 'Devemos acelerar a expansão para o México no Q3, considerando o cenário cambial atual?'
  const loadingCount = agentLoading ? Object.values(agentLoading).filter(Boolean).length : 0
  const totalAgents = activeModels.length

  // Progresso: agentes = 85%, síntese = 15%. A execução SEMPRE fecha 100% quando todos os
  // agentes terminam e a síntese não está mais carregando (sucesso, vazia ou timeout) —
  // nunca trava em 85%.
  const agentsDone = totalAgents > 0 ? totalAgents - loadingCount : 0
  const agentsAllDone = totalAgents > 0 && loadingCount === 0
  const isComplete = Boolean(isLive && agentsAllDone && !synthLoading)
  const agentsShare = totalAgents > 0 ? (agentsDone / totalAgents) * 85 : 0
  const synthShare  = synthesis ? 15 : synthLoading ? 8 : 0
  const progressPct = isLive ? (isComplete ? 100 : Math.round(agentsShare + synthShare)) : 0

  // Auto-scroll: acompanha a execução rolando sozinho conforme respostas/síntese chegam.
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isLive) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [isLive, loadingCount, synthLoading, synthesis, progressPct])

  const expandedModel = expandedId ? activeModels.find(m => m.id === expandedId) : null

  return (
    <>
      <div className="space-y-4">
        {/* Status banner */}
        {loadingCount > 0 && (
          <div className="flex items-center gap-3 rounded-[10px] border border-accent/25 bg-accent-soft px-4 py-[10px] animate-fadeIn">
            <Loader2 size={14} className="animate-spin text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-accent leading-tight">
                Time mobilizado — {loadingCount} {loadingCount === 1 ? 'agente' : 'agentes'} em análise paralela
              </p>
              <p className="text-[11px] text-ink-6 truncate leading-tight mt-[1px]">{displayQuestion}</p>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-surface border border-border-card rounded-[10px] p-[13px_15px] flex items-start gap-[11px]">
          <span className="font-mono text-[10px] text-accent bg-accent-soft px-[7px] py-[3px] rounded-[5px] shrink-0 mt-[1px]">
            {t.questionLabel}
          </span>
          {liveQuestion ? (
            <p className="text-[13.5px] text-ink-1 leading-[1.55]">{liveQuestion}</p>
          ) : (
            <div className="flex flex-col gap-[5px] py-[2px]">
              <p className="text-[13.5px] font-semibold text-ink-4 italic tracking-[0.01em] leading-snug">
                Awaiting your strategic challenge description…
              </p>
              <p className="text-[10px] font-mono text-ink-7 leading-tight">
                Aguardando descritivo do seu desafio
              </p>
              <div className="mt-[6px] pt-[8px] border-t border-border-div">
                <span className="font-mono text-[9px] text-ink-8 uppercase tracking-wider mr-[6px]">example:</span>
                <span className="text-[11.5px] text-ink-6 leading-[1.6] italic">
                  We are evaluating the acquisition of an open banking fintech with $8M ARR growing 42% YoY, proprietary technology, 14 employees — but it has two administrative fines from the Central Bank in the last 18 months, an undisclosed labor liability of $1.2M, and the exclusivity contract with the largest client expires in 90 days. Analyze the financial, legal, compliance, and security risks, estimate a fair valuation, propose the deal structure, and outline a post-acquisition integration strategy.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11.5px] font-semibold text-ink-4">{t.agentResponses}</span>
            <span className="font-mono text-[10.5px] text-ink-6">{activeCount} / 12 {t.agentsNav}</span>
          </div>

          {activeModels.length === 0 ? (
            <p className="text-[12.5px] text-ink-6 py-4 text-center">{t.noActiveAgents}</p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {activeModels.map((model, i) => {
                const loading  = agentLoading?.[model.id] ?? false
                const liveText = agentTexts?.[model.id]
                const liveConf = agentConf?.[model.id] ?? model.conf
                return (
                  <ModelCard
                    key={model.id}
                    model={{ ...model, conf: liveConf, text: liveText ?? model.text }}
                    confidenceLabel={t.confidence}
                    loading={loading}
                    revealed={isLive && !loading && Boolean(liveText)}
                    delay={i * 80}
                    verify={agentVerify?.[model.id]}
                    onClick={() => setExpandedId(model.id)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Synthesis — abaixo de todos os cards */}
        <SynthesisPanel
          synthesis={synthesis}
          synthLoading={synthLoading}
          isAgentsLoading={loadingCount > 0}
          participatingIds={participatingIds}
          agentConf={agentConf}
          t={t}
        />

        {/* Progress bar — visible whenever Maestro Mode is running or just finished */}
        {isLive && (
          <div className="space-y-[6px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink-7">
                {isComplete
                  ? 'Processamento concluído'
                  : loadingCount > 0
                    ? `${agentsDone} de ${totalAgents} agentes concluídos`
                    : synthLoading
                      ? 'Maestro sintetizando…'
                      : 'Processamento concluído'}
              </span>
              <span className="font-mono text-[10px] font-semibold text-accent">{Math.min(100, progressPct)}%</span>
            </div>
            <div className="w-full h-[6px] bg-track rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, progressPct)}%`,
                  background: isComplete
                    ? 'linear-gradient(90deg, #1F9D6B, #38BDF8)'
                    : 'linear-gradient(90deg, #0B3A78, #3B82F6)',
                }}
              />
            </div>
            {isComplete && (
              <p className="font-mono text-[9.5px] text-success text-center animate-fadeIn">
                ✓ Análise do time finalizada — {totalAgents} agentes participaram
              </p>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {expandedModel && (
        <AgentDetailModal
          model={expandedModel}
          question={displayQuestion}
          response={agentTexts?.[expandedModel.id] ?? ''}
          confidence={agentConf?.[expandedModel.id] ?? 75}
          useReasoner={agentModels?.[expandedModel.id] === 'reasoner'}
          onClose={() => setExpandedId(null)}
        />
      )}
    </>
  )
}
