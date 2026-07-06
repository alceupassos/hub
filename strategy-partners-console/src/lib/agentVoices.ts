export interface VoiceConfig {
  gender: 'male' | 'female'
  pitch: number  // 0.5–2.0
  rate: number   // 0.5–2.0; kept 1.08–1.18 for brisk executive cadence
}

// Rates at ~1.1–1.18 for brisk executive cadence without rushing
const VOICE_MAP: Record<string, VoiceConfig> = {
  mare:         { gender: 'female', pitch: 1.02, rate: 1.18 },
  brisa:        { gender: 'female', pitch: 1.00, rate: 1.15 },
  eco:          { gender: 'female', pitch: 1.02, rate: 1.15 },
  corsario:     { gender: 'male',   pitch: 0.88, rate: 1.18 },
  negociador:   { gender: 'male',   pitch: 0.86, rate: 1.12 },
  vitrine:      { gender: 'female', pitch: 1.02, rate: 1.17 },
  sentinela:    { gender: 'male',   pitch: 0.84, rate: 1.10 },
  guardiao:     { gender: 'male',   pitch: 0.86, rate: 1.12 },
  vigia:        { gender: 'male',   pitch: 0.85, rate: 1.13 },
  tesouro:      { gender: 'male',   pitch: 0.88, rate: 1.12 },
  contabil:     { gender: 'female', pitch: 1.00, rate: 1.12 },
  auditor:      { gender: 'male',   pitch: 0.83, rate: 1.10 },
  forja:        { gender: 'male',   pitch: 0.87, rate: 1.17 },
  revisor:      { gender: 'male',   pitch: 0.85, rate: 1.12 },
  arquiteto:    { gender: 'male',   pitch: 0.89, rate: 1.12 },
  estaleiro:    { gender: 'male',   pitch: 0.85, rate: 1.15 },
  jurista:      { gender: 'female', pitch: 1.01, rate: 1.10 },
  pesquisador:  { gender: 'male',   pitch: 0.89, rate: 1.12 },
  interprete:   { gender: 'female', pitch: 1.03, rate: 1.18 },
  analista:     { gender: 'female', pitch: 1.01, rate: 1.14 },
  redator:      { gender: 'female', pitch: 1.02, rate: 1.17 },
  estrategista: { gender: 'male',   pitch: 0.87, rate: 1.10 },
  maestro:      { gender: 'male',   pitch: 0.85, rate: 1.12 },
  curador:      { gender: 'female', pitch: 1.00, rate: 1.12 },
  farol:        { gender: 'male',   pitch: 0.89, rate: 1.17 },
  ancora:       { gender: 'female', pitch: 1.01, rate: 1.12 },
  orbyx:        { gender: 'female', pitch: 0.98, rate: 1.08 },
}

export function getVoiceConfig(agentId: string): VoiceConfig {
  return VOICE_MAP[agentId] ?? { gender: 'female', pitch: 1.0, rate: 0.90 }
}

// PT voice name hints (feminine names first = higher priority when matched first)
const FEMALE_HINTS_PT = [
  'female', 'woman', 'feminina', 'girl',
  'maria', 'ana', 'helena', 'francisca', 'alice', 'anna', 'laura',
  'karen', 'victoria', 'moira', 'samantha', 'lucia', 'zira',
]
const MALE_HINTS_PT   = [
  'male', 'man', 'masculino',
  'daniel', 'david', 'mark', 'thomas', 'alex', 'jorge', 'reed',
  'fred', 'bruce', 'albert', 'junior', 'ralph', 'guy',
]

// EN voice name hints
const FEMALE_HINTS_EN = [
  'female', 'woman', 'girl',
  'zira', 'aria', 'jenny', 'samantha', 'victoria', 'karen', 'fiona',
  'moira', 'zoe', 'serena', 'allison', 'ava', 'lisa', 'anna', 'salli',
]
const MALE_HINTS_EN   = [
  'male', 'man', 'guy',
  'david', 'mark', 'daniel', 'tom', 'oliver', 'arthur', 'reed',
  'alex', 'fred', 'aaron', 'ryan', 'eric', 'andrew', 'brian', 'joey',
]

export function selectVoice(
  voices: SpeechSynthesisVoice[],
  config: VoiceConfig,
  lang: string = 'pt-BR',
): SpeechSynthesisVoice | null {
  if (!voices.length) return null

  const isEn = lang.startsWith('en')

  let pool: SpeechSynthesisVoice[]
  if (isEn) {
    const enUS = voices.filter(v => v.lang === 'en-US')
    const en   = voices.filter(v => v.lang.startsWith('en'))
    pool = enUS.length ? enUS : en.length ? en : voices
  } else {
    const ptBR = voices.filter(v => v.lang === 'pt-BR')
    const pt   = voices.filter(v => v.lang.startsWith('pt'))
    pool = ptBR.length ? ptBR : pt.length ? pt : voices
  }

  // Prefer premium/enhanced/neural voices (higher quality)
  const premium = pool.filter(v => /premium|enhanced|neural|natural/i.test(v.name))
  const workPool = premium.length ? premium : pool

  const hints = config.gender === 'female'
    ? (isEn ? FEMALE_HINTS_EN : FEMALE_HINTS_PT)
    : (isEn ? MALE_HINTS_EN : MALE_HINTS_PT)

  const matched = workPool.find(v =>
    hints.some(h => v.name.toLowerCase().includes(h))
  )
  return matched ?? workPool[0] ?? null
}

// Cancels current speech and speaks text immediately (used for full responses)
export function speakText(
  text: string,
  config: VoiceConfig,
  lang: string = 'pt-BR',
  onEnd?: () => void,
): void {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()

  const fire = (voices: SpeechSynthesisVoice[]) => {
    const utter = new SpeechSynthesisUtterance(text)
    const voice = selectVoice(voices, config, lang)
    if (voice) utter.voice = voice
    utter.pitch = config.pitch
    utter.rate  = config.rate
    utter.lang  = lang
    if (onEnd) utter.onend = onEnd
    window.speechSynthesis.speak(utter)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length) {
    fire(voices)
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      fire(window.speechSynthesis.getVoices())
      window.speechSynthesis.onvoiceschanged = null
    }
  }
}

// Queues text without cancelling current speech (used for progressive streaming TTS)
export function speakQueued(
  text: string,
  config: VoiceConfig,
  lang: string = 'pt-BR',
): void {
  if (typeof window === 'undefined' || !text.trim()) return

  const fire = (voices: SpeechSynthesisVoice[]) => {
    const utter = new SpeechSynthesisUtterance(text.trim())
    const voice = selectVoice(voices, config, lang)
    if (voice) utter.voice = voice
    utter.pitch = config.pitch
    utter.rate  = config.rate
    utter.lang  = lang
    window.speechSynthesis.speak(utter) // naturally queues behind current speech
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length) {
    fire(voices)
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      fire(window.speechSynthesis.getVoices())
      window.speechSynthesis.onvoiceschanged = null
    }
  }
}

// Splits text into complete sentences and returns [sentences, remainder]
export function extractSentences(buffer: string): [string[], string] {
  const re = /[^.!?]*[.!?]+(?:\s|$)/g
  const sentences: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(buffer)) !== null) {
    const sentence = match[0].trim()
    if (sentence.length > 1) sentences.push(sentence)
    lastIndex = re.lastIndex
  }

  return [sentences, buffer.slice(lastIndex)]
}
