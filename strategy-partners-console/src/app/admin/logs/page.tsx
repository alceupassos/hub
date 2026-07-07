'use client'
import { useEffect, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { AdminTabs } from '@/components/AdminTabs'
import { maskModel } from '@/lib/modelMask'

interface LogRow { id: string; agentId: string; route: string; question: string; responsePreview: string | null; modelUsed: string | null; durationMs: number | null; confidence: number | null; createdAt: string }

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [denied, setDenied] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/admin/logs').then(async res => {
      if (res.status === 403) { setDenied(true); return }
      const d = await res.json(); setLogs(d.logs ?? [])
    }).catch(() => {})
  }, [])

  const filtered = logs.filter(l => !q || l.agentId.includes(q.toLowerCase()) || l.question.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 pt-5">
          <h1 className="text-[17px] font-semibold text-ink-0 mb-3">Administração</h1>
        </div>
        <AdminTabs />
        <div className="px-8 py-6">
          {denied ? (
            <p className="text-[13px] text-red-600">Acesso negado — apenas administradores.</p>
          ) : (
            <>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por agente ou pergunta…"
                className="w-full max-w-md border border-border-card rounded-lg px-3 py-2 text-[12.5px] text-ink-0 bg-surface mb-4 outline-none focus:border-accent" />
              <div className="bg-surface border border-border-card rounded-[10px] overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-app-bg text-ink-6 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5">Data</th>
                      <th className="text-left font-medium px-4 py-2.5">Agente</th>
                      <th className="text-left font-medium px-4 py-2.5">Rota</th>
                      <th className="text-left font-medium px-4 py-2.5">Pergunta</th>
                      <th className="text-left font-medium px-4 py-2.5">Modelo</th>
                      <th className="text-right font-medium px-4 py-2.5">ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => (
                      <tr key={l.id} className="border-t border-border-div align-top">
                        <td className="px-4 py-2.5 text-ink-6 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2.5 text-ink-0">{l.agentId}</td>
                        <td className="px-4 py-2.5 text-ink-5 font-mono text-[11px]">{l.route}</td>
                        <td className="px-4 py-2.5 text-ink-5 max-w-md truncate">{l.question}</td>
                        <td className="px-4 py-2.5 text-ink-6 font-mono text-[11px]">{l.modelUsed ? maskModel(l.modelUsed) : '—'}</td>
                        <td className="px-4 py-2.5 text-ink-6 text-right">{l.durationMs ?? '—'}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-6">Nenhum log registrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
