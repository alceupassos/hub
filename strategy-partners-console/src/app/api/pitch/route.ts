import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { AGENTS } from '@/lib/agents'
import { detectPromptInjection } from '@/lib/server/security'
import { logSecurityEvent } from '@/lib/server/security-events'
import { runModel } from '@/lib/server/run-model'
import { synthesizeSpeech } from '@/lib/server/tts'
import { maskModel } from '@/lib/modelMask'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Y4 — gera o ROTEIRO de pitch de ~3 min (mode:'script') e, opcionalmente, o ÁUDIO
// falado pelo CAIO (mode:'audio') via voz Gemini. O roteiro parte da síntese/memo.
const SCRIPT_ROLE = {
  pt: `Você é CAIO, apresentando ao comitê. Transforme o material abaixo num ROTEIRO DE PITCH FALADO
de no máximo ~450 palavras (cerca de 3 minutos), em primeira pessoa, tom executivo e confiante, SEM
markdown, SEM títulos, SEM bullets — apenas texto corrido em parágrafos curtos, como quem fala. Comece
com a recomendação (go/no-go), sustente com 3 pontos-chave (valuation, riscos, estrutura) e termine com
o próximo passo. Linguagem natural para ser lida em voz alta.`,
  en: `You are CAIO, presenting to the committee. Turn the material below into a SPOKEN PITCH SCRIPT of at
most ~450 words (about 3 minutes), first person, confident executive tone, NO markdown, NO headings, NO
bullets — just flowing short paragraphs, as if speaking. Open with the recommendation (go/no-go), support
it with 3 key points (valuation, risks, structure) and close with the next step. Natural read-aloud language.`,
}

export async function POST(req: NextRequest) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst', 'client_viewer'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })

  const { source, mode = 'script', lang = 'pt', script: providedScript } = (await req.json()) as {
    source?: string; mode?: 'script' | 'audio'; lang?: 'pt' | 'en'; script?: string
  }

  // Modo áudio: sintetiza o roteiro fornecido (evita re-gerar texto).
  if (mode === 'audio') {
    const text = (providedScript ?? source ?? '').trim()
    if (!text) return Response.json({ error: lang === 'en' ? 'Script is required.' : 'O roteiro é obrigatório.' }, { status: 400 })
    try {
      const { wav, voice } = await synthesizeSpeech(text, lang)
      return new Response(new Uint8Array(wav), {
        status: 200,
        headers: { 'Content-Type': 'audio/wav', 'X-Angra-Voice': voice, 'Cache-Control': 'no-store' },
      })
    } catch (err) {
      console.error('[api/pitch audio] erro:', err)
      return Response.json({ error: lang === 'en' ? 'Voice synthesis unavailable.' : 'Síntese de voz indisponível.' }, { status: 502 })
    }
  }

  // Modo roteiro (default): gera o texto do pitch a partir do material.
  if (typeof source !== 'string' || !source.trim()) {
    return Response.json({ error: lang === 'en' ? 'Source is required.' : 'O material-fonte é obrigatório.' }, { status: 400 })
  }
  const injection = detectPromptInjection(source)
  if (injection.detected) {
    void logSecurityEvent({ route: 'api/pitch', agentId: 'caio', matchedPatterns: injection.matchedPatterns, userMessage: source })
    return Response.json({ error: lang === 'en' ? 'Request rejected.' : 'Solicitação rejeitada.' }, { status: 400 })
  }
  try {
    const caio = AGENTS.find(a => a.id === 'caio')
    const { text, model } = await runModel({
      system: SCRIPT_ROLE[lang],
      user: `${lang === 'en' ? 'Material' : 'Material'}:\n${source.slice(0, 8000)}`,
      agent: caio, maxTokens: 900,
    })
    return Response.json({ script: text.trim(), model: maskModel(model) })
  } catch (err) {
    console.error('[api/pitch script] erro:', err)
    return Response.json({ error: lang === 'en' ? 'Pitch generation unavailable.' : 'Geração de pitch indisponível.' }, { status: 502 })
  }
}
