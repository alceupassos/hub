'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowRight, Loader2, CheckCircle2, Paperclip, X } from 'lucide-react'
import type { Model } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'

const MAX_ATTACH_BYTES = 120_000

// Extração de texto client-side (mesmo padrão do BrisaChat) para anexos no Refine.
async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist')
    ;(pdfjs.GlobalWorkerOptions as { workerSrc: string }).workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    const buf = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buf }).promise
    let out = ''
    const pages = Math.min(doc.numPages, 40)
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      out += content.items.map((it: unknown) => (it as { str?: string }).str ?? '').join(' ') + '\n'
    }
    return out
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const buf = await file.arrayBuffer()
    const res = await mammoth.extractRawText({ arrayBuffer: buf })
    return res.value
  }
  return file.text()
}

interface Props {
  activeModels: Model[]
  activeCount: number
  onSubmit?: (q: string) => void
  isRunning?: boolean
  discoveryPhase?: 'idle' | 'loading' | 'answering' | 'done'
  discoveryQuestions?: string[]
  onDiscoveryComplete?: (answers: string[]) => void
  selectionLoading?: boolean
}

export function ComposerBar({
  activeModels,
  activeCount,
  onSubmit,
  isRunning,
  discoveryPhase = 'idle',
  discoveryQuestions = [],
  onDiscoveryComplete,
  selectionLoading = false,
}: Props) {
  const { lang } = useLang()
  const t = getT(lang)
  const [value, setValue] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [attach, setAttach] = useState<{ name: string; text: string } | null>(null)
  const [attaching, setAttaching] = useState(false)

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAttaching(true)
    try {
      const text = (await extractFileText(file)).slice(0, MAX_ATTACH_BYTES)
      setAttach({ name: file.name, text })
    } catch {
      setAttach({ name: file.name + ' (falha na leitura)', text: '' })
    } finally {
      setAttaching(false)
    }
  }

  // Reset discovery state when phase resets to idle
  useEffect(() => {
    if (discoveryPhase === 'idle') {
      setAnswers([])
      setCurrentIdx(0)
      setValue('')
    }
  }, [discoveryPhase])

  // Focus input when phase changes to answering or a new question appears
  useEffect(() => {
    if (discoveryPhase === 'answering') {
      setValue('')
      inputRef.current?.focus()
    }
  }, [discoveryPhase, currentIdx])

  function submit() {
    const q = value.trim()
    if ((!q && !attach) || isRunning) return
    const full = attach?.text
      ? `${q}\n\n[Anexo: ${attach.name}]\n${attach.text}`
      : q
    onSubmit?.(full)
    setValue('')
    setAttach(null)
  }

  function submitAnswer() {
    const a = value.trim()
    if (!a) return
    const next = [...answers, a]
    setAnswers(next)
    setValue('')

    if (currentIdx < discoveryQuestions.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      // All questions answered
      onDiscoveryComplete?.(next)
    }
  }

  const isDiscovering = discoveryPhase === 'loading' || discoveryPhase === 'answering'
  const totalQ = discoveryQuestions.length
  const currentQ = discoveryQuestions[currentIdx] ?? ''

  return (
    <div className="border-t border-border-base bg-app-bg px-[18px] py-[15px] shrink-0">
      <div className="max-w-[900px] mx-auto space-y-[10px]">

        {/* Selection loading panel */}
        {selectionLoading && (
          <div className="bg-surface border border-accent/20 rounded-[10px] px-[14px] py-[10px] flex items-center gap-[10px]">
            <Loader2 size={14} className="animate-spin text-accent shrink-0" />
            <span className="text-[12.5px] text-ink-5">
              {lang === 'en' ? 'Selecting relevant agents…' : 'Selecionando agentes relevantes…'}
            </span>
          </div>
        )}

        {/* Discovery Questions panel */}
        {!selectionLoading && discoveryPhase === 'loading' && (
          <div className="bg-surface border border-border-soft rounded-[10px] px-[14px] py-[10px] flex items-center gap-[10px]">
            <Loader2 size={14} className="animate-spin text-accent shrink-0" />
            <span className="text-[12.5px] text-ink-5">
              {lang === 'en' ? 'Generating context questions…' : 'Gerando perguntas de contexto…'}
            </span>
          </div>
        )}

        {!selectionLoading && discoveryPhase === 'answering' && totalQ > 0 && (
          <div className="bg-surface border border-accent/25 rounded-[10px] px-[14px] py-[10px] space-y-[6px]">
            {/* Progress dots */}
            <div className="flex items-center gap-[5px]">
              {Array.from({ length: totalQ }, (_, i) => (
                <span
                  key={i}
                  className={`w-[6px] h-[6px] rounded-full transition-colors ${
                    i < currentIdx
                      ? 'bg-accent'
                      : i === currentIdx
                        ? 'bg-accent ring-2 ring-accent/30'
                        : 'bg-track'
                  }`}
                />
              ))}
              <span className="font-mono text-[10px] text-ink-7 ml-[4px]">
                {lang === 'en'
                  ? `Question ${currentIdx + 1} of ${totalQ}`
                  : `Pergunta ${currentIdx + 1} de ${totalQ}`}
              </span>
            </div>

            {/* Answered questions (collapsed) */}
            {answers.map((ans, i) => (
              <div key={i} className="flex items-start gap-[6px] opacity-50">
                <CheckCircle2 size={12} className="text-accent shrink-0 mt-[2px]" />
                <p className="text-[11.5px] text-ink-5 leading-snug line-clamp-1">
                  {discoveryQuestions[i]}: <em>{ans}</em>
                </p>
              </div>
            ))}

            {/* Current question */}
            <p className="text-[12.5px] text-ink-1 font-medium leading-snug">{currentQ}</p>
          </div>
        )}

        {/* Attached file chip */}
        {attach && (
          <div className="flex items-center gap-2 bg-surface border border-accent/25 rounded-[8px] px-[10px] py-[5px] w-fit">
            <Paperclip size={12} className="text-accent" />
            <span className="text-[11.5px] text-ink-5 max-w-[280px] truncate">{attach.name}</span>
            <button onClick={() => setAttach(null)} className="text-ink-6 hover:text-ink-0" aria-label="remover anexo"><X size={12} /></button>
          </div>
        )}

        {/* Input row */}
        <div className="bg-surface border border-border-input rounded-[10px] px-[15px] py-[7px] flex items-center gap-[11px]">
          {/* Anexar arquivo (Refine) — extrai texto de txt/pdf/docx no cliente */}
          {!isDiscovering && (
            <>
              <input ref={fileRef} type="file" accept=".txt,.md,.csv,.pdf,.docx" onChange={onPickFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isRunning || selectionLoading || attaching}
                className="shrink-0 text-ink-6 hover:text-accent transition-colors disabled:opacity-40"
                aria-label={lang === 'en' ? 'Attach file' : 'Anexar arquivo'}
                title={lang === 'en' ? 'Attach file' : 'Anexar arquivo'}
              >
                {attaching ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
            </>
          )}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (discoveryPhase === 'answering') submitAnswer()
                else submit()
              }
            }}
            disabled={isRunning || discoveryPhase === 'loading' || selectionLoading}
            placeholder={
              isRunning
                ? t.maestroRunning
                : selectionLoading
                  ? (lang === 'en' ? 'Selecting agents…' : 'Selecionando agentes…')
                  : discoveryPhase === 'loading'
                    ? (lang === 'en' ? 'Generating questions…' : 'Gerando perguntas…')
                    : discoveryPhase === 'answering'
                      ? (lang === 'en' ? 'Type your answer…' : 'Digite sua resposta…')
                      : t.refineQ
            }
            className="flex-1 text-[13.5px] text-ink-0 placeholder:text-ink-6 bg-transparent outline-none disabled:opacity-50"
          />

          {/* Agent chip — hidden during discovery */}
          {!isDiscovering && (
            <div className="flex items-center gap-[6px] border border-border-base rounded-[7px] px-[8px] py-[4px] shrink-0">
              <div className="flex -space-x-[3px]">
                {activeModels.slice(0, 4).map(m => (
                  <span
                    key={m.id}
                    className="w-[8px] h-[8px] rounded-full ring-1 ring-white"
                    style={{ backgroundColor: m.dot }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10.5px] text-ink-5">{t.agentCount(activeCount)}</span>
            </div>
          )}

          {/* Send / Answer button */}
          {discoveryPhase === 'answering' ? (
            <button
              onClick={submitAnswer}
              disabled={!value.trim()}
              className="shrink-0 px-[12px] h-[35px] rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {currentIdx < totalQ - 1
                ? (lang === 'en' ? 'Next →' : 'Próxima →')
                : (lang === 'en' ? 'Run Analysis' : 'Iniciar análise')}
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={isRunning || !value.trim() || discoveryPhase === 'loading' || selectionLoading}
              className="w-[35px] h-[35px] rounded-lg bg-accent flex items-center justify-center text-white hover:opacity-90 transition-opacity shrink-0 disabled:opacity-40"
              aria-label={t.export}
            >
              {isRunning
                ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                : <ArrowRight size={16} strokeWidth={2} />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
