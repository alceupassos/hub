import type { Model } from '@/lib/types'
import type { Translations } from '@/lib/i18n'

interface Props {
  activeModels: Model[]
  t: Translations
}

const MAX_DUR = 1.5
const AXIS = ['0s', '0.5s', '1.0s', '1.5s']

export function TimelineView({ activeModels, t }: Props) {
  return (
    <div className="bg-surface border border-border-card rounded-[10px] p-[20px_22px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[12.5px] font-semibold text-ink-0">{t.parallelExec}</span>
        <span className="font-mono text-[10.5px] text-ink-6">{t.windowLabel}</span>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {activeModels.map(model => (
          <div key={model.id} className="flex items-center gap-3">
            <div className="flex items-center gap-[6px] w-[124px] shrink-0">
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: model.dot }}
              />
              <span className="text-[12px] text-ink-0 truncate">{model.name}</span>
            </div>
            <div className="flex-1 h-[21px] bg-active-bg rounded-[5px] overflow-hidden">
              <div
                className="h-full rounded-[5px] flex items-center justify-end pr-[8px] transition-all duration-300"
                style={{
                  width: `${(model.dur / MAX_DUR) * 100}%`,
                  backgroundColor: model.barColor,
                  minWidth: '40px',
                }}
              >
                <span className="font-mono text-[10px] text-white">{model.dur}s</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Time axis */}
      <div className="flex justify-between mt-3" style={{ paddingLeft: '137px' }}>
        {AXIS.map(label => (
          <span key={label} className="font-mono text-[10px] text-ink-7">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
