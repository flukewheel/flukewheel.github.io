import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../../components/IconButton'

const reasons = [
  { code: 'not_interested', label: 'Not interested' },
  { code: 'low_quality', label: 'Low-quality website' },
  { code: 'seen_before', label: 'Already seen this' },
  { code: 'broken', label: 'Broken website' },
  { code: 'inappropriate', label: 'Inappropriate content' },
]

interface DislikeDropdownProps {
  busy?: boolean
  disabled: boolean
  onReasonSelected?: (reason: string) => void
  showLabel?: boolean
}

export function DislikeDropdown({
  busy = false,
  disabled,
  onReasonSelected,
  showLabel = false,
}: DislikeDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="dropdown" ref={rootRef}>
      <IconButton
        aria-expanded={open}
        aria-haspopup="menu"
        aria-disabled={busy || undefined}
        className="icon-button--arrow"
        disabled={disabled}
        icon={<ChevronDown aria-hidden="true" />}
        label="Choose a dislike reason"
        showLabel={showLabel}
        onClick={() => { if (!busy) setOpen((value) => !value) }}
      />
      {open && (
        <div className="dropdown-menu" role="menu">
          {reasons.map((reason) => (
            <button
              key={reason.code}
              onClick={() => {
                onReasonSelected?.(reason.code)
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {reason.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
