'use client'
import { useMemo } from 'react'
import { AGENTS } from '@/lib/agents'
import { getPrincipais, getSubagentsFor } from '@/lib/agentTiers'
import type { Agent } from '@/lib/types'

// Grafo de dependência da frota (W6) — constelação viva: CAIO (orquestrador) no centro,
// os 4 partners ao redor, e os subagentes orbitando cada um. Nós e arestas acendem quando
// o agente está ativo (executando) ou concluído; ficam esmaecidos quando ociosos.
// SVG puro, temável por CSS vars. Cor do nó = dot do agente; arestas usam barColor (mais escuro,
// legível). Texto em tokens de tinta (--color-ink-*), nunca na cor da série.

interface Props {
  activeIds?: string[]   // agentes executando agora → acendem e pulsam
  doneIds?: string[]     // agentes concluídos → acesos, sem pulso
  en?: boolean
  className?: string
}

// Ordem/posição dos 4 partners ao redor do CAIO (graus; 0 = direita, +horário no eixo SVG).
const RING_ORDER: { id: string; angle: number }[] = [
  { id: 'merko', angle: -135 }, // sup. esquerda
  { id: 'asten', angle: -45 },  // sup. direita
  { id: 'novae', angle: 45 },   // inf. direita
  { id: 'tycen', angle: 135 },  // inf. esquerda
]

// Geometria (viewBox) — escala responsiva via viewBox + w-full.
const W = 880, H = 560
const CX = W / 2, CY = H / 2
const RP = 208   // raio dos partners
const RI = 116   // raio do anel interno (subagentes do CAIO)
const SUB_R = 58 // distância dos subagentes ao seu partner
const FAN = 78   // abertura (graus) do leque de subagentes

const rad = (deg: number) => (deg * Math.PI) / 180

type NodeKind = 'caio' | 'principal' | 'sub'
interface GNode {
  id: string; x: number; y: number; kind: NodeKind
  dot: string; bar: string; label: string; parent?: string
}
interface GEdge { from: string; to: string; via: string /* id que governa a cor da aresta */ }

export function DependencyGraph({ activeIds = [], doneIds = [], en = false, className }: Props) {
  const { nodes, edges } = useMemo(() => {
    const byId = new Map(AGENTS.map(a => [a.id, a]))
    const nodes: GNode[] = []
    const edges: GEdge[] = []
    const caio = byId.get('caio')

    // Centro: CAIO.
    if (caio) nodes.push({ id: 'caio', x: CX, y: CY, kind: 'caio', dot: caio.dot, bar: caio.barColor, label: caio.name })

    // Subagentes do CAIO num anel interno completo ao redor do centro.
    const caioSubs = getSubagentsFor('caio')
    caioSubs.forEach((s, i) => {
      const a = rad((360 / Math.max(1, caioSubs.length)) * i - 90)
      const x = CX + RI * Math.cos(a), y = CY + RI * Math.sin(a)
      nodes.push({ id: s.id, x, y, kind: 'sub', dot: s.dot, bar: s.barColor, label: s.name, parent: 'caio' })
      edges.push({ from: 'caio', to: s.id, via: s.id })
    })

    // Os 4 partners no anel externo + seus subagentes em leque apontando para fora.
    for (const { id, angle } of RING_ORDER) {
      const p = byId.get(id)
      if (!p) continue
      const px = CX + RP * Math.cos(rad(angle)), py = CY + RP * Math.sin(rad(angle))
      nodes.push({ id, x: px, y: py, kind: 'principal', dot: p.dot, bar: p.barColor, label: p.name })
      edges.push({ from: 'caio', to: id, via: id })

      const subs = getSubagentsFor(id)
      const n = subs.length
      subs.forEach((s, j) => {
        const off = n > 1 ? -FAN / 2 + (FAN * j) / (n - 1) : 0
        const a = rad(angle + off)
        const sx = px + SUB_R * Math.cos(a), sy = py + SUB_R * Math.sin(a)
        nodes.push({ id: s.id, x: sx, y: sy, kind: 'sub', dot: s.dot, bar: s.barColor, label: s.name, parent: id })
        edges.push({ from: id, to: s.id, via: s.id })
      })
    }
    return { nodes, edges }
  }, [])

  const active = useMemo(() => new Set(activeIds), [activeIds])
  const done = useMemo(() => new Set(doneIds), [doneIds])
  const stateOf = (id: string): 'active' | 'done' | 'idle' =>
    active.has(id) ? 'active' : done.has(id) ? 'done' : 'idle'

  const pos = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const totalPrincipais = getPrincipais().length
  const totalSubs = AGENTS.filter((a: Agent) => a.tier === 'subagente').length

  const L = en
    ? { aria: 'Fleet dependency graph', active: 'active', done: 'done', idle: 'idle', orch: 'orchestrator',
        caption: `${totalPrincipais} lead agents · ${totalSubs} subagents` }
    : { aria: 'Grafo de dependência da frota', active: 'ativo', done: 'concluído', idle: 'ocioso', orch: 'orquestrador',
        caption: `${totalPrincipais} principais · ${totalSubs} subagentes` }

  return (
    <div className={className}>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 340 }} role="img" aria-label={L.aria}>
          {/* Arestas */}
          {edges.map(e => {
            const from = pos.get(e.from), to = pos.get(e.to)
            if (!from || !to) return null
            const st = stateOf(e.via)
            const lit = st !== 'idle'
            return (
              <line
                key={`${e.from}-${e.to}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={lit ? to.bar : 'var(--color-border-base)'}
                strokeWidth={st === 'active' ? 2 : lit ? 1.4 : 1}
                opacity={st === 'active' ? 0.85 : st === 'done' ? 0.55 : 0.4}
                style={{ transition: 'opacity .35s, stroke-width .35s' }}
              />
            )
          })}

          {/* Nós */}
          {nodes.map(n => {
            const st = stateOf(n.id)
            const lit = st !== 'idle'
            const r = n.kind === 'caio' ? 32 : n.kind === 'principal' ? 22 : 8.5
            const fill = lit ? n.dot : 'var(--color-track)'
            const stroke = lit ? n.bar : 'var(--color-border-base)'
            const opacity = st === 'idle' ? (n.kind === 'sub' ? 0.45 : 0.55) : 1
            return (
              <g key={n.id} style={{ transition: 'opacity .35s' }} opacity={opacity}>
                {/* halo pulsante quando ativo */}
                {st === 'active' && (
                  <circle cx={n.x} cy={n.y} r={r + 6} fill={n.dot} opacity={0.28}>
                    <animate attributeName="r" values={`${r + 3};${r + 11};${r + 3}`} dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0.08;0.35" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* anel de "concluído" */}
                {st === 'done' && (
                  <circle cx={n.x} cy={n.y} r={r + 3.5} fill="none" stroke={n.bar} strokeWidth={1.5} opacity={0.5} />
                )}
                <circle
                  cx={n.x} cy={n.y} r={r} fill={fill} stroke={stroke}
                  strokeWidth={n.kind === 'sub' ? 1.25 : 2.5}
                >
                  <title>{n.label}{st !== 'idle' ? ` — ${st === 'active' ? L.active : L.done}` : ''}</title>
                </circle>

                {n.kind === 'caio' && (
                  <>
                    <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={14} fontWeight={800} fill="var(--color-ink-0)">CAIO</text>
                    <text x={n.x} y={n.y + 11} textAnchor="middle" fontSize={7.5} fill="var(--color-ink-5)">{L.orch}</text>
                  </>
                )}
                {n.kind === 'principal' && (
                  <text x={n.x} y={n.y + r + 13} textAnchor="middle" fontSize={11} fontWeight={700}
                    fill={lit ? 'var(--color-ink-1)' : 'var(--color-ink-5)'}>{n.label}</text>
                )}
                {/* rótulo do subagente só quando aceso, para não poluir a constelação */}
                {n.kind === 'sub' && lit && (
                  <text x={n.x} y={n.y - r - 4} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)"
                    fill="var(--color-ink-4)">{n.label}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] text-ink-5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" /> {L.active}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-accent" /> {L.done}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-6">
          <span className="w-2.5 h-2.5 rounded-full bg-track border border-border-base" /> {L.idle}
        </span>
        <span className="ml-auto text-[10px] text-ink-6">{L.caption}</span>
      </div>
    </div>
  )
}
