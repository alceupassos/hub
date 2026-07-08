'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const COOKIE_KEY = 'sp_entry_v3'

function getShownToday(): boolean {
  if (typeof document === 'undefined') return false
  const val = document.cookie.split(';').find(c => c.trim().startsWith(COOKIE_KEY + '='))
  if (!val) return false
  return val.split('=')[1]?.trim() === new Date().toISOString().slice(0, 10)
}

function markShownToday() {
  const today = new Date().toISOString().slice(0, 10)
  // Expires at end of today (midnight UTC + 1 minute buffer)
  const exp = new Date()
  exp.setUTCHours(23, 59, 59, 0)
  document.cookie = `${COOKIE_KEY}=${today}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`
}

export function EntryVideoModal() {
  const [open, setOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!getShownToday()) {
      setOpen(true)
      markShownToday()
    }
  }, [])

  useEffect(() => {
    if (open) {
      videoRef.current?.play().catch(() => {})
    } else {
      videoRef.current?.pause()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative rounded-[16px] overflow-hidden shadow-2xl"
        style={{ border: '3px solid rgba(255,255,255,0.85)', maxWidth: '90vw', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <video
          ref={videoRef}
          src="/videocoin.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setOpen(false)}
          onError={() => setOpen(false)}
          className="block"
          style={{ maxWidth: '90vw', maxHeight: '82vh', display: 'block' }}
        />
      </div>
    </div>
  )
}
