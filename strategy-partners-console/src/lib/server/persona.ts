import 'server-only'
import fs from 'fs'
import path from 'path'
import { splitPersonaText } from '../personaSections'

function loadPersonaRaw(agentIndex: number): string | null {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), 'public', 'personas', `PERSONA${agentIndex + 1}.md`),
      'utf-8',
    )
  } catch {
    return null
  }
}

// Replaces the local `loadPersona(idx) ?? agent.systemPrompt` used across the
// chat/agent-query/agent-deep routes. When `override` is set, it replaces only the
// public/editable part of the persona (Identidade, Domínio de Expertise, Pode
// responder sobre, Estilo de Comunicação) — the guard-rail/identity sections after
// "## NÃO responde" always come from the original file, never from client input.
export function buildPersonaContent(agentIndex: number, fallback: string, override?: string): string {
  const raw = loadPersonaRaw(agentIndex)
  if (!raw) return fallback
  if (!override?.trim()) return raw
  const { fixed } = splitPersonaText(raw)
  return fixed ? `${override.trim()}\n\n## ${fixed}` : override.trim()
}
