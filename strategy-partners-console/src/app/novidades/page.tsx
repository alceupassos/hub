'use client'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { Sparkles, Upload, Trophy, ClipboardCheck, KanbanSquare, Scale, ArrowRight } from 'lucide-react'
import { useLang } from '@/lib/lang'

// Área "Novidades" — vitrine comercial das novas capacidades de dealflow.
// Tom: confiante, direto, com alfinetada no jeito antigo (decks na mão, planilha, e-mail, Big Four).
// A sátira mira o MÉTODO ANTIGO, nunca o cliente nem as targets. Bilíngue PT/EN.

interface Feature { icon: typeof Sparkles; href: string; pt: { t: string; d: string }; en: { t: string; d: string } }

const FEATURES: Feature[] = [
  {
    icon: Upload, href: '/dealflow',
    pt: { t: 'Dealflow que se preenche sozinho', d: 'Você joga o deck; a IA extrai ARR, MRR, crescimento, burn e tamanho de time e cria o deal. Copiar célula por célula pro Excel? Fofo — mas 2015 já acabou.' },
    en: { t: 'Dealflow that fills itself in', d: 'Drop the deck; the AI pulls ARR, MRR, growth, burn and team size and creates the deal. Copy-pasting into a spreadsheet, cell by cell? Cute — but 2015 called.' },
  },
  {
    icon: Trophy, href: '/dealflow',
    pt: { t: 'Score 0-100 contra a SUA tese', d: 'O leaderboard já sabe qual deal merece seu café da manhã — e qual merece um "vamos acompanhar" educado. Ranking por score de diligência, sem política de corredor.' },
    en: { t: '0-100 score against YOUR thesis', d: 'The leaderboard already knows which deal earns your morning coffee — and which earns a polite "we’ll keep watching." Ranked by diligence score, no hallway politics.' },
  },
  {
    icon: ClipboardCheck, href: '/projetos',
    pt: { t: 'Diligence que trabalha no seu sono', d: 'Agentes especialistas leem contratos, cruzam documentos e marcam os red flags. Não pedem hora extra, não somem no happy hour e não cobram fee de sucesso.' },
    en: { t: 'Diligence that works while you sleep', d: 'Specialist agents read contracts, cross-check documents and flag the red flags. No overtime, no vanishing at happy hour, no success fee.' },
  },
  {
    icon: KanbanSquare, href: '/pipeline',
    pt: { t: 'Pipeline visual de verdade', d: 'Arrasta, solta, fecha. Sem o clássico "onde a gente parou nesse deal mesmo?" três semanas depois numa thread de e-mail com 47 respostas.' },
    en: { t: 'A pipeline board that actually helps', d: 'Drag, drop, close. None of that "wait, where did we leave this deal?" three weeks later in a 47-reply email thread.' },
  },
  {
    icon: Scale, href: '/dealflow',
    pt: { t: 'Go / no-go com argumento', d: 'Prós, contras, riscos e próximo passo — opinião com fundamento, não achismo de reunião de segunda-feira. A IA lida com o impossível; o sócio decide.' },
    en: { t: 'Go / no-go, with an argument', d: 'Pros, cons, risks and next step — a reasoned call, not a Monday-meeting gut feeling. The AI handles the impossible; the partner decides.' },
  },
]

export default function NovidadesPage() {
  const { lang } = useLang()
  const L = lang === 'en'
    ? { title: 'What’s new', headline: 'Because reading 200 decks by hand was never a career plan.', sub: 'The console just grew a dealflow layer that does the boring part. You keep the part that pays well: deciding.', tag: 'New', bottom: 'The Big Four sell you a report. Here the AI executes and the partner decides.', open: 'Open' }
    : { title: 'Novidades', headline: 'Porque ler 200 decks na mão nunca foi um plano de carreira.', sub: 'O console ganhou uma camada de dealflow que faz a parte chata. Você fica com a parte que paga bem: decidir.', tag: 'Novo', bottom: 'A Big Four te vende um relatório. Aqui a IA executa e o sócio decide.', open: 'Abrir' }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2"><Sparkles size={17} className="text-accent" /> {L.title}</h1>
        </div>

        <div className="px-8 py-8 max-w-4xl">
          {/* Hero */}
          <div className="mb-8">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.14em] text-accent bg-accent-soft px-2.5 py-1 rounded-full mb-3">{L.tag}</span>
            <h2 className="text-[26px] font-semibold text-ink-0 leading-[1.15] tracking-[-0.01em] max-w-2xl">{L.headline}</h2>
            <p className="text-[14px] text-ink-5 mt-3 max-w-2xl leading-relaxed">{L.sub}</p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const c = lang === 'en' ? f.en : f.pt
              return (
                <Link key={i} href={f.href}
                  className="group bg-surface border border-border-card rounded-[12px] p-5 hover:shadow-sm hover:border-accent/40 transition-all">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-[8px] bg-accent-soft flex items-center justify-center shrink-0">
                      <f.icon size={17} className="text-accent" strokeWidth={1.7} />
                    </div>
                    <span className="text-[14px] font-semibold text-ink-0">{c.t}</span>
                  </div>
                  <p className="text-[12.5px] text-ink-5 leading-relaxed">{c.d}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    {L.open} <ArrowRight size={12} />
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Bottom line */}
          <div className="mt-8 border-t border-border-div pt-5">
            <p className="text-[13px] text-ink-4 italic">&ldquo;{L.bottom}&rdquo;</p>
          </div>
        </div>
      </main>
    </div>
  )
}
