'use client'
import { useState, useRef } from 'react'
import { Mic, Loader2, Play, Pause, FileText } from 'lucide-react'
import { useLang } from '@/lib/lang'

// Y4 — apresentação falada do memorando pelo CAIO. Gera o roteiro de pitch (~3 min) e
// toca o áudio com voz natural (Gemini TTS, mascarado como "voz Angra"). Nota explicativa inclusa.

export function PitchPlayer({ source }: { source: string }) {
  const { lang } = useLang()
  const en = lang === 'en'
  const [script, setScript] = useState('')
  const [loadingScript, setLoadingScript] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const L = en ? {
    intro: 'Spoken briefing.',
    introBody: 'CAIO turns this analysis into a ~3-minute pitch script and reads it aloud in a natural voice — ready to present to the committee.',
    gen: 'Generate briefing', regen: 'Regenerate script', speak: 'Play voice', pause: 'Pause',
    loadingScript: 'Writing the script…', loadingAudio: 'Synthesizing voice…',
    scriptLabel: 'Pitch script (~3 min)',
  } : {
    intro: 'Apresentação falada.',
    introBody: 'O CAIO transforma esta análise num roteiro de pitch de ~3 minutos e o apresenta em voz natural — pronto para levar ao comitê.',
    gen: 'Gerar apresentação', regen: 'Regerar roteiro', speak: 'Tocar voz', pause: 'Pausar',
    loadingScript: 'Escrevendo o roteiro…', loadingAudio: 'Sintetizando a voz…',
    scriptLabel: 'Roteiro do pitch (~3 min)',
  }

  async function genScript() {
    setLoadingScript(true); setError(''); setAudioUrl(''); setScript('')
    try {
      const res = await fetch('/api/pitch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, mode: 'script', lang }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro.'); return }
      setScript(data.script ?? '')
    } catch { setError(en ? 'Connection error.' : 'Erro de conexão.') } finally { setLoadingScript(false) }
  }

  async function playVoice() {
    if (audioUrl && audioRef.current) {
      if (playing) { audioRef.current.pause() } else { void audioRef.current.play() }
      return
    }
    setLoadingAudio(true); setError('')
    try {
      const res = await fetch('/api/pitch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'audio', script, lang }) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Erro na voz.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setTimeout(() => { void audioRef.current?.play() }, 50)
    } catch { setError(en ? 'Voice error.' : 'Erro na voz.') } finally { setLoadingAudio(false) }
  }

  return (
    <div>
      <p className="text-[11px] text-ink-5 mb-2 leading-relaxed">
        <span className="text-ink-2 font-medium">{L.intro}</span> {L.introBody}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={genScript} disabled={loadingScript || !source}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-input text-[11.5px] text-ink-3 hover:border-accent hover:text-accent transition-colors disabled:opacity-50">
          {loadingScript ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          {script ? L.regen : L.gen}
        </button>
        {script && (
          <button onClick={playVoice} disabled={loadingAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[11.5px] font-medium hover:opacity-90 disabled:opacity-50">
            {loadingAudio ? <Loader2 size={13} className="animate-spin" /> : playing ? <Pause size={13} /> : <Play size={13} />}
            {loadingAudio ? L.loadingAudio : playing ? L.pause : L.speak}
          </button>
        )}
      </div>
      {loadingScript && <p className="mt-2 text-[11px] text-ink-6">{L.loadingScript}</p>}
      {error && <p className="mt-2 text-[11px] text-[#B4462F]">{error}</p>}
      {script && (
        <div className="mt-3 p-3 rounded-lg border border-border-card bg-subtle-bg">
          <div className="text-[10px] uppercase tracking-wider text-ink-6 mb-1 flex items-center gap-1"><Mic size={11} /> {L.scriptLabel}</div>
          <p className="text-[12.5px] text-ink-2 leading-relaxed whitespace-pre-wrap">{script}</p>
        </div>
      )}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} className="hidden" />
      )}
    </div>
  )
}
