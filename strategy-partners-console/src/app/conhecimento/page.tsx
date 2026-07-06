'use client'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { AGENTS_BY_CATEGORY } from '@/lib/agents'
import { Search, BookOpen, FileText, Brain } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { useAgentConfig } from '@/lib/agent-config'
import { getT } from '@/lib/i18n'

const ARTICLES = [
  {
    title: 'Frameworks de Valuation para M&A no Brasil',
    agent: 'MERKO',
    category: 'M&A',
    summary: 'DCF, EV/EBITDA e precedent transactions — como escolher o método certo por setor e momento de mercado.',
    date: '25 jun 2026',
  },
  {
    title: 'LGPD e Contratos de Software: Checklist 2026',
    agent: 'Jurista',
    category: 'Jurídico',
    summary: 'As 12 cláusulas obrigatórias para contratos de software à luz da LGPD atualizada.',
    date: '22 jun 2026',
  },
  {
    title: 'Playbook de Prospecção Outbound B2B',
    agent: 'Corsário',
    category: 'Vendas',
    summary: 'Sequência de cadência, templates de cold email e critérios de qualificação ICP para 2026.',
    date: '19 jun 2026',
  },
  {
    title: 'Arquitetura de Microsserviços: Quando Não Usar',
    agent: 'Arquiteto',
    category: 'Tecnologia',
    summary: 'Os 7 sinais de que um monolito modular é melhor que microsserviços para o seu contexto.',
    date: '15 jun 2026',
  },
  {
    title: 'Due Diligence Financeira: Red Flags Críticos',
    agent: 'Auditor',
    category: 'Financeiro',
    summary: 'Os 10 indicadores que devem pausar qualquer negociação de aquisição imediatamente.',
    date: '10 jun 2026',
  },
]

const KNOWLEDGE_AGENTS = AGENTS_BY_CATEGORY['conhecimento'] ?? []

export default function ConhecimentoPage() {
  const { lang } = useLang()
  const { getDisplayName, isEnabled } = useAgentConfig()
  const t = getT(lang)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-ink-0">{t.pageKnowledge}</h1>
            <p className="text-[12px] text-ink-5 mt-0.5">{t.knowledgeSub}</p>
          </div>
          <div className="flex items-center gap-2 bg-surface border border-border-input rounded-[8px] px-3 py-2 text-ink-5">
            <Search size={13} strokeWidth={1.6} />
            <span className="text-[12.5px]">{t.searchKnowledge}</span>
          </div>
        </div>

        <div className="px-8 py-6 grid grid-cols-3 gap-6">
          {/* Articles */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-6 flex items-center gap-2">
              <FileText size={12} strokeWidth={1.8} />
              {t.recentArticles}
            </h2>
            {ARTICLES.map(article => (
              <div
                key={article.title}
                className="bg-surface border border-border-card rounded-[10px] p-5 hover:border-border-hover hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-6 bg-track px-2 py-0.5 rounded">
                    {article.category}
                  </span>
                  <span className="text-[11px] text-ink-7">por {article.agent}</span>
                  <span className="ml-auto text-[11px] text-ink-7 font-mono">{article.date}</span>
                </div>
                <h3 className="text-[14px] font-medium text-ink-0 mb-1">{article.title}</h3>
                <p className="text-[12px] text-ink-4 leading-relaxed">{article.summary}</p>
              </div>
            ))}
          </div>

          {/* Sidebar — agents */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-6 flex items-center gap-2">
              <Brain size={12} strokeWidth={1.8} />
              {t.expertAgents}
            </h2>
            <div className="space-y-2">
              {KNOWLEDGE_AGENTS.filter(agent => isEnabled(agent.id)).map(agent => (
                <Link
                  key={agent.id}
                  href={`/chat?agent=${agent.id}`}
                  className="flex items-center gap-3 bg-surface border border-border-card rounded-[9px] px-3 py-2.5 hover:border-border-hover transition-all"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: agent.dot }}
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink-0 truncate">{getDisplayName(agent.id)}</p>
                    <p className="text-[11px] text-ink-5 truncate">{agent.role}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="bg-accent-soft border border-accent/20 rounded-[10px] p-4 mt-4">
              <BookOpen size={16} strokeWidth={1.6} className="text-accent mb-2" />
              <p className="text-[12.5px] font-medium text-ink-0 mb-1">{t.consultSpec}</p>
              <p className="text-[11.5px] text-ink-5 leading-relaxed">{t.consultDesc}</p>
              <Link
                href="/modelos"
                className="block mt-3 text-[11.5px] font-medium text-accent hover:underline"
              >
                {t.viewAllAgents}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
