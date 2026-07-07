'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, X } from 'lucide-react'
import { useLang } from '@/lib/lang'

const DISMISS_KEY = 'sp-whatsnew-dismissed-v1'

// Faixa de destaque das novidades (dealflow). Tom comercial-confiante com alfinetada no jeito
// antigo. Dismissível (persistência local). Aponta para a área completa em /novidades.
export function WhatsNewBanner() {
  const { lang } = useLang()
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) !== '1')
  }, [])
  if (!show) return null

  const L = lang === 'en'
    ? { tag: 'New', text: 'Dealflow that fills itself in, scores against your thesis and diligences while you sleep.', cta: 'See what changed' }
    : { tag: 'Novo', text: 'Dealflow que se preenche sozinho, pontua contra a sua tese e diligencia enquanto você dorme.', cta: 'Ver o que mudou' }

  return (
    <div className="flex items-center gap-3 px-8 py-2.5 bg-accent text-white text-[12.5px]">
      <span className="flex items-center gap-1.5 font-semibold shrink-0">
        <Sparkles size={13} /> {L.tag}
      </span>
      <span className="flex-1 min-w-0 truncate text-white/90">{L.text}</span>
      <Link href="/novidades" className="flex items-center gap-1 font-medium hover:underline shrink-0">
        {L.cta} <ArrowRight size={13} />
      </Link>
      <button onClick={() => { localStorage.setItem(DISMISS_KEY, '1'); setShow(false) }} className="text-white/70 hover:text-white shrink-0" aria-label="dismiss">
        <X size={14} />
      </button>
    </div>
  )
}
