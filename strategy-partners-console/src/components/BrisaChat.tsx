'use client'

import { useState, useRef, useEffect, useCallback, FormEvent, ChangeEvent } from 'react'
import Image from 'next/image'
import { ArrowRight, User, Brain, MessageSquare, Mic, MicOff, Paperclip, X, FileText } from 'lucide-react'
import { AGENTS } from '@/lib/agents'
import { getVoiceConfig, speakQueued, extractSentences } from '@/lib/agentVoices'
import { useLang } from '@/lib/lang'
import { useAgentConfig } from '@/lib/agent-config'
import { ChatMarkdown } from './ChatMarkdown'
import type { Agent } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  /** Display-only: original typed text (file content not shown in bubble) */
  displayText?: string
  /** Display-only: attached file metadata */
  attachment?: { name: string; size: number }
}

interface AttachedFile {
  name: string
  size: number
  content: string   // extracted text (empty for images)
  isImage: boolean
  dataUrl?: string  // base64 data URL (images only)
  mimeType?: string
}

const IMAGE_TYPES = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const TEXT_TYPES  = [
  '.txt', '.md', '.csv', '.json', '.xml',
  '.js',  '.ts', '.tsx', '.jsx', '.py',
  '.html','.css','.sql', '.yaml','.yml',
  '.toml','.sh', '.bash','.env', '.log',
  '.conf','.ini','.cfg', '.rs',  '.go',
  '.c',   '.cpp','.h',   '.rb',  '.php',
  '.kt',  '.swift','.java','.cs','.r',
]
const ACCEPTED_TYPES = [...TEXT_TYPES, '.pdf', '.docx', '.doc', ...IMAGE_TYPES].join(',')

const MAX_TEXT_BYTES  = 120_000
const MAX_IMAGE_BYTES = 10_000_000  // 10 MB

function formatBytes(b: number): string {
  return b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`
}

function getExt(name: string) {
  return '.' + name.split('.').pop()!.toLowerCase()
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const pages: string[] = []
  for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages.push(tc.items.map((it: any) => it.str ?? '').join(' '))
  }
  return pages.join('\n\n')
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = ev => resolve(ev.target?.result as string)
    r.onerror = reject
    r.readAsText(file, 'UTF-8')
  })
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = ev => resolve(ev.target?.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

type ModelMode = 'chat' | 'reasoner' | 'vision' | null

interface Props {
  agentId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: unknown[]) => any
function getSpeechRecognition(): AnyConstructor | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function BrisaChat({ agentId }: Props) {
  const agent: Agent | undefined = AGENTS.find(a => a.id === agentId)
  const { lang } = useLang()
  const { getDisplayName, getPersonaOverride } = useAgentConfig()
  const displayName = agent ? getDisplayName(agent.id) : agentId
  const ttsLang = lang === 'en' ? 'en-US' : 'pt-BR'

  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [modelMode, setModelMode] = useState<ModelMode>(null)
  const [modeToast, setModeToast] = useState<string | null>(null)

  // Unified voice mode
  const [voiceMode, setVoiceMode] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const [waitForTTS, setWaitForTTS] = useState(false)
  const [attachedFile, setAttachedFile]   = useState<AttachedFile | null>(null)
  const [fileError,    setFileError]     = useState<string | null>(null)
  const [fileLoading,  setFileLoading]   = useState(false)

  const voiceModeRef  = useRef(false)
  const streamingRef  = useRef(false)
  const ttsBufferRef  = useRef('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)

  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { streamingRef.current  = streaming }, [streaming])

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    const ext = getExt(file.name)
    const isImage = IMAGE_TYPES.includes(ext)

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setFileError(lang === 'en'
        ? `Image too large (max 10 MB). "${file.name}" is ${formatBytes(file.size)}.`
        : `Imagem muito grande (máx 10 MB). "${file.name}" tem ${formatBytes(file.size)}.`)
      return
    }

    setFileLoading(true)
    try {
      if (isImage) {
        const dataUrl = await readAsDataUrl(file)
        setAttachedFile({ name: file.name, size: file.size, content: '', isImage: true, dataUrl, mimeType: file.type })
        return
      }

      let text: string
      if (ext === '.pdf') {
        text = await extractPdfText(file)
      } else if (ext === '.docx' || ext === '.doc') {
        text = await extractDocxText(file)
      } else {
        if (file.size > MAX_TEXT_BYTES) {
          setFileError(lang === 'en'
            ? `File too large (max 120 KB). "${file.name}" is ${formatBytes(file.size)}.`
            : `Arquivo muito grande (máx 120 KB). "${file.name}" tem ${formatBytes(file.size)}.`)
          return
        }
        text = await readAsText(file)
      }

      if (text.length > MAX_TEXT_BYTES) {
        text = text.slice(0, MAX_TEXT_BYTES) + '\n\n[... content truncated ...]'
      }
      setAttachedFile({ name: file.name, size: file.size, content: text, isImage: false })
    } catch {
      setFileError(lang === 'en' ? `Could not read "${file.name}".` : `Não foi possível ler "${file.name}".`)
    } finally {
      setFileLoading(false)
    }
  }

  function removeAttachment() {
    setAttachedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const toastRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!modeToast) return
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setModeToast(null), 3500)
    return () => { if (toastRef.current) clearTimeout(toastRef.current) }
  }, [modeToast])

  // Poll until speech queue empties, then restart mic
  useEffect(() => {
    if (!waitForTTS || !voiceMode) {
      if (waitForTTS) setWaitForTTS(false)
      return
    }
    const check = setInterval(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        clearInterval(check)
        setWaitForTTS(false)
        if (voiceModeRef.current) {
          setTimeout(() => startMic(), 350)
        }
      }
    }, 250)
    return () => clearInterval(check)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitForTTS, voiceMode])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      recognitionRef.current?.stop()
    }
  }, [agentId])

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-5 text-[13px]">
        Agente &ldquo;{agentId}&rdquo; não encontrado.
      </div>
    )
  }

  // ── Start mic ───────────────────────────────────────────────────────────────
  function startMic() {
    const SR = getSpeechRecognition()
    if (!SR) return
    const rec = new SR()
    rec.lang = ttsLang
    rec.interimResults = false
    rec.continuous = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join('')
      if (transcript.trim()) {
        doSend(transcript.trim())
      }
    }
    rec.onend  = () => setMicActive(false)
    rec.onerror = () => setMicActive(false)
    recognitionRef.current = rec
    rec.start()
    setMicActive(true)
  }

  // ── Toggle voice mode ───────────────────────────────────────────────────────
  function toggleVoiceMode() {
    const next = !voiceMode
    setVoiceMode(next)
    if (!next) {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
      setMicActive(false)
      setWaitForTTS(false)
    } else {
      startMic()
    }
  }

  // ── Core send logic ─────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doSend = useCallback(async function doSendFn(text: string) {
    if (!text.trim() && !attachedFile) return
    if (streamingRef.current) return

    recognitionRef.current?.stop()
    setMicActive(false)
    window.speechSynthesis?.cancel()
    setError(null)
    setFileError(null)
    setInput('')
    setModelMode(null)
    ttsBufferRef.current = ''

    // Build the content sent to the API
    const isImageAttach = attachedFile?.isImage ?? false
    const fileSnippet = (!isImageAttach && attachedFile)
      ? `[Arquivo anexado: ${attachedFile.name}]\n\n${attachedFile.content}\n\n---\n\n`
      : ''
    const fullContent = fileSnippet + text

    const userMsg: Message = {
      role: 'user',
      content: fullContent,
      displayText: text || undefined,
      attachment: attachedFile ? { name: attachedFile.name, size: attachedFile.size } : undefined,
    }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    const capturedFile = attachedFile
    setAttachedFile(null)
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    // Strip display-only fields before sending to API
    const apiMessages = nextMessages.map(({ role, content }) => ({ role, content }))

    const cfg = getVoiceConfig(agent!.id)

    // Image attachment sent separately for Grok Vision routing
    const imageAttachment = (isImageAttach && capturedFile?.dataUrl)
      ? { dataUrl: capturedFile.dataUrl, mimeType: capturedFile.mimeType ?? 'image/jpeg', filename: capturedFile.name }
      : undefined

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent!.id,
          messages: apiMessages,
          lang,
          imageAttachment,
          personaOverride: getPersonaOverride(agent!.id),
        }),
      })

      if (!res.ok) {
        const { error: err } = await res.json()
        throw new Error(err ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentMode: ModelMode = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') {
            if (currentMode === 'reasoner') {
              setModeToast('Voltando ao modo Chat')
              setModelMode('chat')
            }
            // Speak remaining TTS buffer and wait for speech to end
            if (voiceModeRef.current) {
              const remaining = ttsBufferRef.current.trim()
              if (remaining) speakQueued(remaining, cfg, ttsLang)
              ttsBufferRef.current = ''
              setWaitForTTS(true)
            }
            break
          }

          try {
            const parsed = JSON.parse(data) as {
              content?: string
              error?: string
              modelSwitch?: 'chat' | 'reasoner' | 'vision'
              model?: string
            }
            if (parsed.error) throw new Error(parsed.error)

            if (parsed.modelSwitch) {
              currentMode = parsed.modelSwitch as ModelMode
              setModelMode(parsed.modelSwitch as ModelMode)
              if (parsed.modelSwitch === 'reasoner') {
                setModeToast('Modo raciocínio profundo (angra.core.max)')
              } else if (parsed.modelSwitch === 'vision') {
                setModeToast('Modo visão (angra.vision)')
              }
            }

            if (parsed.content) {
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  content: msgs[msgs.length - 1].content + parsed.content,
                }
                return msgs
              })

              // Progressive TTS: queue complete sentences as they arrive
              if (voiceModeRef.current) {
                ttsBufferRef.current += parsed.content
                const [sentences, remainder] = extractSentences(ttsBufferRef.current)
                sentences.forEach(s => speakQueued(s, cfg, ttsLang))
                ttsBufferRef.current = remainder
              }
            }
          } catch (parseErr) {
            if (
              parseErr instanceof Error &&
              parseErr.message !== 'Unexpected end of JSON input'
            ) throw parseErr
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(msg)
      setMessages(prev => prev.slice(0, -1))
      ttsBufferRef.current = ''
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, agentId, lang, ttsLang, attachedFile])

  async function send(e: FormEvent) {
    e.preventDefault()
    await doSend(input.trim())
  }

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !streaming && !fileLoading

  const isReasoning = modelMode === 'reasoner' && streaming
  const emptyGreeting = lang === 'en'
    ? `Hello! I'm ${displayName}. How can I help you?`
    : `Olá! Sou ${displayName}. Como posso ajudar?`

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-border-base bg-surface px-6 py-4 flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-border-base">
          <Image src={agent.avatar} alt={displayName} fill className="object-cover" sizes="36px" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-ink-0">{displayName}</p>
          <p className="text-[11.5px] text-ink-5">{agent.role}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isReasoning ? (
            <span className="flex items-center gap-1 font-mono text-[10px] text-purple-400 bg-purple-900/20 border border-purple-700/30 px-[8px] py-[3px] rounded-[5px]">
              <Brain size={9} className="animate-pulse" />
              reasoning
            </span>
          ) : (
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-6 bg-track px-[8px] py-[3px] rounded-[5px]">
              <MessageSquare size={9} />
              {agent.modelAlias}
            </span>
          )}

          <button
            onClick={toggleVoiceMode}
            title={voiceMode ? 'Encerrar conversa por voz' : 'Iniciar conversa por voz'}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              voiceMode && micActive
                ? 'bg-red-500/90 text-white animate-pulse'
                : voiceMode
                ? 'bg-accent/15 text-accent'
                : 'text-ink-5 hover:text-ink-2 hover:bg-track'
            }`}
          >
            {voiceMode ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>
      </div>

      {/* ── Mode toast ── */}
      {modeToast && (
        <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-surface border border-border-card shadow-md rounded-[8px] px-4 py-2 text-[12px] text-ink-3 pointer-events-none select-none">
          <Brain size={12} className="text-purple-400 shrink-0" />
          {modeToast}
        </div>
      )}

      {/* Voice indicator */}
      {voiceMode && (
        <div className="absolute top-[68px] right-6 z-10 flex items-center gap-1.5 bg-red-500/10 border border-red-400/30 rounded-[7px] px-3 py-1.5 pointer-events-none select-none">
          <span className={`w-2 h-2 rounded-full bg-red-500 ${micActive ? 'animate-pulse' : 'opacity-40'}`} />
          <span className="text-[11px] text-red-400 font-medium">
            {micActive ? (lang === 'en' ? 'Listening…' : 'Ouvindo…')
              : waitForTTS ? (lang === 'en' ? 'Speaking…' : 'Respondendo…')
              : (lang === 'en' ? 'Voice mode' : 'Modo voz ativo')}
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-border-base">
              <Image src={agent.avatar} alt={displayName} fill className="object-cover" sizes="56px" />
            </div>
            <p className="text-[13px] text-ink-5 max-w-[300px] leading-relaxed">
              {emptyGreeting}
            </p>
            {getSpeechRecognition() && (
              <p className="text-[11px] text-ink-6">
                {lang === 'en' ? 'Press' : 'Pressione'} <Mic size={10} className="inline" /> {lang === 'en' ? 'to start a voice conversation' : 'para iniciar conversa por voz'}
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const isStreamingThis = streaming && isLast && msg.role === 'assistant'
          return (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' ? (
                <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-border-base mt-0.5">
                  <Image src={agent.avatar} alt={displayName} fill className="object-cover" sizes="28px" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} className="text-white" strokeWidth={2} />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-[10px] px-[14px] py-[10px] ${
                  msg.role === 'user'
                    ? 'bg-accent text-white text-[13px] leading-[1.65]'
                    : 'bg-surface border border-border-card text-ink-1'
                }`}
              >
                {msg.role === 'assistant' ? (
                  msg.content
                    ? <ChatMarkdown content={msg.content} streaming={isStreamingThis} />
                    : (
                      <span className="flex gap-1 items-center text-ink-6 py-1">
                        <span className="animate-bounce delay-0">·</span>
                        <span className="animate-bounce delay-75">·</span>
                        <span className="animate-bounce delay-150">·</span>
                      </span>
                    )
                ) : (
                  <div>
                    {msg.attachment && (
                      <div className="flex items-center gap-1.5 mb-2 bg-white/15 rounded-[6px] px-2.5 py-1.5">
                        <Paperclip size={10} className="shrink-0 opacity-80" />
                        <span className="text-[11.5px] font-medium truncate max-w-[180px]">{msg.attachment.name}</span>
                        <span className="text-[10.5px] opacity-70 shrink-0">{formatBytes(msg.attachment.size)}</span>
                      </div>
                    )}
                    {(msg.displayText || (!msg.attachment && msg.content)) && (
                      <span className="text-[13px] leading-[1.65]">{msg.displayText ?? msg.content}</span>
                    )}
                    {msg.attachment && !msg.displayText && !msg.content.replace(/^\[Arquivo.*\n[\s\S]*---\n\n/, '') && null}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[8px] px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div className="shrink-0 border-t border-border-base bg-app-bg px-6 py-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* File error */}
        {fileError && (
          <div className="mb-2 flex items-center gap-2 text-[11.5px] text-red-500 bg-red-50 border border-red-100 rounded-[7px] px-3 py-2">
            <X size={11} className="shrink-0" />
            {fileError}
          </div>
        )}

        {/* File loading indicator */}
        {fileLoading && (
          <div className="mb-2 flex items-center gap-2 bg-track border border-border-soft rounded-[8px] px-3 py-[7px]">
            <span className="flex gap-0.5 items-center">
              <span className="w-1 h-1 rounded-full bg-ink-5 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-ink-5 animate-bounce" style={{ animationDelay: '80ms' }} />
              <span className="w-1 h-1 rounded-full bg-ink-5 animate-bounce" style={{ animationDelay: '160ms' }} />
            </span>
            <span className="text-[12px] text-ink-5">{lang === 'en' ? 'Reading file…' : 'Lendo arquivo…'}</span>
          </div>
        )}

        {/* Attachment chip */}
        {attachedFile && !fileLoading && (
          <div className="mb-2 flex items-center gap-2 bg-accent/8 border border-accent/20 rounded-[8px] px-3 py-[7px]">
            {attachedFile.isImage
              ? <img src={attachedFile.dataUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0 border border-accent/20" />
              : <FileText size={13} className="text-accent shrink-0" />
            }
            <span className="text-[12.5px] text-ink-1 font-medium flex-1 truncate">{attachedFile.name}</span>
            <span className="text-[11px] text-ink-5 shrink-0">{formatBytes(attachedFile.size)}</span>
            {attachedFile.isImage && (
              <span className="text-[10px] text-accent/70 shrink-0 font-mono">vision</span>
            )}
            <button
              onClick={removeAttachment}
              className="w-5 h-5 rounded flex items-center justify-center text-ink-5 hover:text-ink-1 hover:bg-track transition-colors shrink-0"
              aria-label="Remove attachment"
            >
              <X size={11} />
            </button>
          </div>
        )}

        <form onSubmit={send}>
          <div className="bg-surface border border-border-input rounded-[10px] px-[15px] py-[7px] flex items-center gap-[11px]">
            {/* Paperclip button */}
            <button
              type="button"
              onClick={() => !fileLoading && fileInputRef.current?.click()}
              disabled={streaming || fileLoading}
              title={lang === 'en' ? 'Attach file' : 'Anexar arquivo'}
              className={`transition-colors disabled:opacity-40 shrink-0 ${fileLoading ? 'text-accent animate-pulse' : 'text-ink-5 hover:text-accent'}`}
            >
              <Paperclip size={15} strokeWidth={1.8} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                voiceMode
                  ? (lang === 'en' ? 'Or type a message…' : 'Ou digite uma mensagem…')
                  : attachedFile?.isImage
                  ? (lang === 'en' ? 'Ask about the image…' : 'Pergunte sobre a imagem…')
                  : attachedFile
                  ? (lang === 'en' ? 'Ask about the file…' : 'Pergunte sobre o arquivo…')
                  : (lang === 'en' ? `Message ${displayName}…` : `Mensagem para ${displayName}…`)
              }
              disabled={streaming}
              className="flex-1 text-[13.5px] text-ink-0 placeholder:text-ink-6 bg-transparent outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="w-[35px] h-[35px] rounded-lg bg-accent flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Enviar"
            >
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
