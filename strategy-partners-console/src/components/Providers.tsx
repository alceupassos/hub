'use client'
import { LangProvider } from '@/lib/lang'
import { AgentConfigProvider } from '@/lib/agent-config'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AgentConfigProvider>
      <LangProvider>{children}</LangProvider>
    </AgentConfigProvider>
  )
}
