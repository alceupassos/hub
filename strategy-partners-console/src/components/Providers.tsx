'use client'
import { LangProvider } from '@/lib/lang'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <LangProvider>{children}</LangProvider>
}
