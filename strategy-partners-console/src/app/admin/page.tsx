'use client'
import { useEffect, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { AdminTabs } from '@/components/AdminTabs'
import { Plus, X } from 'lucide-react'

type Role = 'admin' | 'partner' | 'analyst' | 'client_viewer'
interface UserRow { id: string; email: string; name: string; role: Role; active: number; createdAt: string }

const ROLES: Role[] = ['admin', 'partner', 'analyst', 'client_viewer']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [denied, setDenied] = useState(false)
  const [noDb, setNoDb] = useState(false)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { setDenied(true); return }
    const data = await res.json()
    if (data.dbConfigured === false) setNoDb(true)
    setUsers(data.users ?? [])
  }
  useEffect(() => { load() }, [])

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    load()
  }

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
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] text-ink-5">{users.length} usuário(s){noDb && ' · banco não configurado'}</p>
                <button onClick={() => setShowNew(true)} disabled={noDb}
                  className="flex items-center gap-2 bg-accent text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  <Plus size={14} strokeWidth={2.2} /> Novo usuário
                </button>
              </div>

              <div className="bg-surface border border-border-card rounded-[10px] overflow-hidden">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-app-bg text-ink-6 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5">Nome</th>
                      <th className="text-left font-medium px-4 py-2.5">Email</th>
                      <th className="text-left font-medium px-4 py-2.5">Papel</th>
                      <th className="text-left font-medium px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-border-div">
                        <td className="px-4 py-2.5 text-ink-0">{u.name}</td>
                        <td className="px-4 py-2.5 text-ink-5">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <select value={u.role} onChange={e => patch(u.id, { role: e.target.value })}
                            className="bg-app-bg border border-border-card rounded px-2 py-1 text-[12px] text-ink-0">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => patch(u.id, { active: u.active !== 1 })}
                            className={`text-[10px] font-medium px-2 py-1 rounded-full ${u.active === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {u.active === 1 ? 'ativo' : 'desativado'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-6 text-[12px]">Nenhum usuário cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {showNew && <NewUserModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />}
    </div>
  )
}

function NewUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('analyst')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, role }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Falha.'); setSaving(false); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-[12px] w-[420px] max-w-[92vw] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink-0">Novo usuário</h2>
          <button onClick={onClose} className="text-ink-6 hover:text-ink-0"><X size={16} /></button>
        </div>
        {[['Nome', name, setName, 'text'], ['Email', email, setEmail, 'email'], ['Senha (mín. 8)', password, setPassword, 'password']].map(([label, val, set, type]) => (
          <div key={label as string} className="mb-3">
            <label className="block text-[12px] text-ink-5 mb-1">{label as string}</label>
            <input type={type as string} value={val as string} onChange={e => (set as (s: string) => void)(e.target.value)}
              className="w-full border border-border-card rounded-lg px-3 py-2 text-[13px] text-ink-0 bg-app-bg outline-none focus:border-accent" />
          </div>
        ))}
        <label className="block text-[12px] text-ink-5 mb-1">Papel</label>
        <select value={role} onChange={e => setRole(e.target.value as Role)}
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[13px] text-ink-0 bg-app-bg mb-4">
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-lg text-ink-5 hover:bg-app-bg">Cancelar</button>
          <button onClick={submit} disabled={saving} className="text-[12px] px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50">{saving ? '…' : 'Criar'}</button>
        </div>
      </div>
    </div>
  )
}
