import 'server-only'
import { db, isDbConfigured } from '@/lib/db'
import { securityEvents } from '@/lib/db/schema'

// Central sink for security-relevant events (currently: detected prompt-injection attempts).
// Persists to strategy_partners.security_events when a database is configured; otherwise
// (and on any DB error) falls back to a structured console.warn so logging never breaks a request.
export interface SecurityEventInput {
  /** API route where the event fired, e.g. 'api/chat'. */
  route: string
  agentId?: string
  /** Pattern `source` strings that matched — never the raw regex objects. */
  matchedPatterns: string[]
  /** The offending user message (truncated before persistence). */
  userMessage: string
  userId?: string
  projectId?: string
}

const MAX_MESSAGE_PREVIEW = 2000

function warn(event: SecurityEventInput, preview: string) {
  console.warn('[security] prompt injection detected', {
    route: event.route,
    agentId: event.agentId,
    matchedPatterns: event.matchedPatterns,
    userId: event.userId,
    projectId: event.projectId,
    userMessagePreview: preview.slice(0, 500),
  })
}

export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  const preview = event.userMessage.slice(0, MAX_MESSAGE_PREVIEW)

  if (!isDbConfigured()) {
    warn(event, preview)
    return
  }

  try {
    await db.insert(securityEvents).values({
      route: event.route,
      agentId: event.agentId ?? null,
      matchedPatterns: JSON.stringify(event.matchedPatterns),
      userMessage: preview,
      userId: event.userId ?? null,
      projectId: event.projectId ?? null,
    })
  } catch (err) {
    // Never let logging failure surface to the user — fall back to console.
    console.error('[security] failed to persist security_event, falling back to console:', err)
    warn(event, preview)
  }
}
