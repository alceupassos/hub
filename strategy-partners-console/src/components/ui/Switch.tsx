'use client'
import * as SwitchPrimitive from '@radix-ui/react-switch'

interface Props {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}

const SIZES = {
  sm: { track: 'w-[30px] h-[17px]', thumb: 'w-[13px] h-[13px]', onLeft: '15px' },
  md: { track: 'w-[38px] h-[21px]', thumb: 'w-[17px] h-[17px]', onLeft: '19px' },
}

export function Switch({ checked, onCheckedChange, size = 'sm', ariaLabel }: Props) {
  const dims = SIZES[size]

  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      onClick={e => e.stopPropagation()}
      className={`relative shrink-0 rounded-full transition-colors duration-150 outline-none cursor-pointer ${dims.track}`}
      style={{ backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-toggle-off)' }}
    >
      <SwitchPrimitive.Thumb
        className={`block absolute top-[2px] rounded-full bg-white shadow-sm transition-all duration-150 ${dims.thumb}`}
        style={{ left: checked ? dims.onLeft : '2px' }}
      />
    </SwitchPrimitive.Root>
  )
}
