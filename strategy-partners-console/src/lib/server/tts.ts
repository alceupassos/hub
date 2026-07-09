import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Text-to-Speech (Y4) — apresentação falada do memorando pelo CAIO. Usa o TTS do
// Gemini (vozes naturais PT-BR/EN), reusando a chave já provisionada na VPS
// (ANGRA_EMBED_KEY, com fallback GEMINI_API_KEY). Retorna WAV pronto para tocar.
// Nome do provedor NUNCA é exposto ao cliente — a rota fala em "voz angra".
// ─────────────────────────────────────────────────────────────────────────────

const TTS_MODEL = process.env.ANGRA_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

// Vozes pré-construídas do Gemini escolhidas por naturalidade/tom executivo maduro.
//   Charon = grave/informativo; Kore = firme/claro; Puck = leve. CAIO usa Charon.
export const VOICES = { pt: 'Charon', en: 'Charon' } as const

function apiKey(): string {
  const key = process.env.ANGRA_EMBED_KEY ?? process.env.GEMINI_API_KEY
  if (!key) throw new Error('Chave de TTS não configurada.')
  return key
}

/** Cabeçalho WAV (PCM 16-bit) para embrulhar o áudio bruto do Gemini (24kHz mono). */
function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export interface TtsResult { wav: Buffer; voice: string }

/** Sintetiza o texto em áudio WAV. Trunca textos muito longos (limite de segurança). */
export async function synthesizeSpeech(text: string, lang: 'pt' | 'en' = 'pt'): Promise<TtsResult> {
  const voice = VOICES[lang]
  const clipped = text.slice(0, 5000) // roteiro de ~3 min cabe folgado
  const res = await fetch(`${ENDPOINT}/models/${TTS_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({
      contents: [{ parts: [{ text: clipped }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  })
  if (!res.ok) throw new Error(`TTS falhou (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  }
  const b64 = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)?.inlineData?.data
  if (!b64) throw new Error('TTS não retornou áudio.')
  const pcm = Buffer.from(b64, 'base64')
  return { wav: pcmToWav(pcm), voice }
}
