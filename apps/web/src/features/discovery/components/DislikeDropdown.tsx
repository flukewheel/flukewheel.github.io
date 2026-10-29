import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../../components/IconButton'

const reasons = [
  'Not interested',
  'Low-quality website',
  'Already seen this',
  'Broken website',
  'Inappropriate content',
]

interface DislikeDropdownProps {
  disabled: boolean
  onReasonSelected?: (reason: string) => void
}

export function DislikeDropdown({
  disabled,
  onReasonSelected,
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
        className="icon-button--arrow"
        disabled={disabled}
        icon={<ChevronDown aria-hidden="true" />}
        label="Choose a dislike reason"
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div className="dropdown-menu" role="menu">
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => {
                onReasonSelected?.(reason)
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
