'use client'
import { NavSidebar } from '@/components/NavSidebar'
import { Sparkles, Check } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { CHANGELOG } from '@/lib/changelog'

// Área "Novidades" — a cada versão, uma entrada polida em linguagem de negócio com os destaques
// da release. Lê o changelog estruturado (src/lib/changelog.ts). Do mais recente ao mais antigo.

export default function NovidadesPage() {
  const { lang } = useLang()
  const en = lang === 'en'
  const L = en
    ? { title: 'What’s new', sub: 'Every release, in plain terms: what the console can now do and why it matters to you.', version: 'Version' }
    : { title: 'Novidades', sub: 'A cada versão, em linguagem clara: o que o console passou a fazer e por que isso importa para você.', version: 'Versão' }

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString(en ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2"><Sparkles size={17} className="text-accent" /> {L.title}</h1>
        </div>

        <div className="px-8 py-8 max-w-3xl">
          <p className="text-[14px] text-ink-5 mb-8 max-w-2xl leading-relaxed">{L.sub}</p>

          <div className="space-y-8">
            {CHANGELOG.map((entry) => (
              <article key={entry.version} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center text-[12px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full font-mono">
                    v{entry.version}
                  </span>
                  <span className="text-[11.5px] text-ink-6 uppercase tracking-wider">{fmtDate(entry.date)}</span>
                </div>

                <h2 className="text-[22px] font-semibold text-ink-0 leading-tight tracking-[-0.01em]">
                  {en ? entry.title.en : entry.title.pt}
                </h2>
                <p className="text-[13.5px] text-ink-5 mt-2 leading-relaxed">
                  {en ? entry.summary.en : entry.summary.pt}
                </p>

                <ul className="mt-4 space-y-2.5">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-success-bg flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} className="text-success" strokeWidth={2.5} />
                      </div>
                      <span className="text-[13px] text-ink-2 leading-relaxed">{en ? h.en : h.pt}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
