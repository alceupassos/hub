import type { Model } from '@/lib/types'
import type { Translations } from '@/lib/i18n'

interface Props {
  activeModels: Model[]
  t: Translations
}

export function SinteseView({ activeModels, t }: Props) {
  const activeCount = activeModels.length
  const agreementCount = Math.min(activeCount, Math.ceil(activeCount * 0.67))

  return (
    <div className="bg-surface border border-border-card rounded-[10px] p-[26px_30px] space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-[25px] h-[25px] rounded-[7px] bg-accent-soft flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M6.5 1L8.2 4.7L12 5.3L9.25 8L9.9 12L6.5 10.1L3.1 12L3.75 8L1 5.3L4.8 4.7L6.5 1Z"
              stroke="#0B3A78"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-[12.5px] font-semibold text-ink-0 flex-1">{t.strategicSynth}</p>
        <span className="font-mono text-[10px] text-ink-6">
          {t.consensusOf(activeCount)} · 1.24s
        </span>
      </div>

      {/* Title */}
      <h2 className="text-[17px] font-semibold text-ink-0 leading-[1.4] tracking-[-0.01em]">
        {t.synthTitle}
      </h2>

      {/* Body */}
      <p className="text-[14px] text-ink-3 leading-[1.7]">
        {t.synthBody}
      </p>

      {/* Actions */}
      <div className="bg-subtle-bg border border-border-soft rounded-[10px] p-[17px_19px] space-y-3">
        {([t.synthAction1, t.synthAction2, t.synthAction3]).map((text, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="font-mono text-[12.5px] text-accent shrink-0 w-5 text-right mt-[1px]">
              {i + 1}.
            </span>
            <p
              className="text-[13.5px] text-ink-2 leading-[1.6]"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border-foot pt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11.5px] text-ink-5">{t.synthesizedFrom}</span>
          {activeModels.map(model => (
            <span key={model.id} className="flex items-center gap-[5px]">
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: model.dot }}
              />
              <span className="text-[11.5px] text-ink-5">{model.name}</span>
            </span>
          ))}
        </div>
        <span className="font-mono text-[10.5px] text-success">
          {t.agreementFrac(agreementCount, activeCount)}
        </span>
      </div>
    </div>
  )
}
