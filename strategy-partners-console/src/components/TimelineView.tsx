import type { Model } from '@/lib/types'
import type { Translations } from '@/lib/i18n'

interface Props {
  activeModels: Model[]
  agentTimings: Record<string, number>
  question: string
  t: Translations
}

const AXIS_STEPS = 4

export function TimelineView({ activeModels, agentTimings, question, t }: Props) {
  const timings = activeModels.map(m => agentTimings[m.id] ?? 0)
  const maxDur = Math.max(...timings, 1)
  const step = maxDur / (AXIS_STEPS - 1)
  const axis = Array.from({ length: AXIS_STEPS }, (_, i) => `${(step * i).toFixed(1)}s`)
  const hasData = timings.some(v => v > 0)

  return (
    <div className="bg-surface border border-border-card rounded-[10px] p-[20px_22px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12.5px] font-semibold text-ink-0">{t.parallelExec}</span>
        <span className="font-mono text-[10.5px] text-ink-6">
          {hasData
            ? `${t.windowLabel.split('–')[0].trim()} 0 – ${maxDur.toFixed(1)}s`
            : t.windowLabel}
        </span>
      </div>

      {/* Question pill */}
      {question && (
        <div className="mb-4 bg-subtle-bg border border-border-soft rounded-[7px] px-[12px] py-[8px]">
          <p className="text-[12px] text-ink-4 truncate">{question}</p>
        </div>
      )}

      {/* Bars */}
      <div className="space-y-3">
        {activeModels.map(model => {
          const dur = agentTimings[model.id]
          const pct = dur != null ? Math.max((dur / maxDur) * 100, 4) : 0
          const isLoading = dur == null && hasData === false

          return (
            <div key={model.id} className="flex items-center gap-3">
              <div className="flex items-center gap-[6px] w-[124px] shrink-0">
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ backgroundColor: model.dot }}
                />
                <span className="text-[12px] text-ink-0 truncate">{model.name}</span>
              </div>
              <div className="flex-1 h-[21px] bg-active-bg rounded-[5px] overflow-hidden">
                {dur != null ? (
                  <div
                    className="h-full rounded-[5px] flex items-center justify-end pr-[8px] transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: model.barColor,
                    }}
                  >
                    <span className="font-mono text-[10px] text-white">{dur.toFixed(2)}s</span>
                  </div>
                ) : (
                  <div
                    className={`h-full rounded-[5px] ${isLoading ? 'animate-pulse bg-active-bg' : 'w-0'}`}
                    style={{ minWidth: dur == null ? 0 : 40 }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time axis */}
      <div className="flex justify-between mt-3" style={{ paddingLeft: '137px' }}>
        {axis.map(label => (
          <span key={label} className="font-mono text-[10px] text-ink-7">
            {label}
          </span>
        ))}
      </div>

      {/* Summary */}
      {hasData && (
        <div className="mt-4 pt-3 border-t border-border-foot flex gap-4 flex-wrap">
          <span className="font-mono text-[10.5px] text-ink-5">
            fastest: <span className="text-success">
              {Math.min(...timings.filter(Boolean)).toFixed(2)}s
            </span>
          </span>
          <span className="font-mono text-[10.5px] text-ink-5">
            slowest: <span className="text-orange-400">
              {maxDur.toFixed(2)}s
            </span>
          </span>
          <span className="font-mono text-[10.5px] text-ink-5">
            avg: <span className="text-ink-3">
              {(timings.filter(Boolean).reduce((s, v) => s + v, 0) / timings.filter(Boolean).length).toFixed(2)}s
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
