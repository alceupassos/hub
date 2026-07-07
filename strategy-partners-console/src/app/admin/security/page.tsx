'use client'
import { useEffect, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { AdminTabs } from '@/components/AdminTabs'

interface EventRow { id: string; route: string; agentId: string | null; matchedPatterns: string; userMessage: string; createdAt: string }

export default function AdminSecurityPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/security').then(async res => {
      if (res.status === 403) { setDenied(true); return }
      const d = await res.json(); setEvents(d.events ?? [])
    }).catch(() => {})
  }, [])

  const patterns = (raw: string) => { try { return (JSON.parse(raw) as string[]).join(', ') } catch { return raw } }

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
              <p className="text-[12px] text-ink-5 mb-4">Tentativas de injeção de prompt detectadas nas rotas de agente (Fase 0).</p>
              <div className="bg-surface border border-border-card rounded-[10px] overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-app-bg text-ink-6 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5">Data</th>
                      <th className="text-left font-medium px-4 py-2.5">Rota</th>
                      <th className="text-left font-medium px-4 py-2.5">Agente</th>
                      <th className="text-left font-medium px-4 py-2.5">Padrões</th>
                      <th className="text-left font-medium px-4 py-2.5">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(e => (
                      <tr key={e.id} className="border-t border-border-div align-top">
                        <td className="px-4 py-2.5 text-ink-6 whitespace-nowrap">{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2.5 text-ink-5 font-mono text-[11px]">{e.route}</td>
                        <td className="px-4 py-2.5 text-ink-0">{e.agentId ?? '—'}</td>
                        <td className="px-4 py-2.5 text-orange-600 font-mono text-[11px] max-w-xs truncate">{patterns(e.matchedPatterns)}</td>
                        <td className="px-4 py-2.5 text-ink-5 max-w-md truncate">{e.userMessage}</td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-6">Nenhum evento de segurança registrado.</td></tr>
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
