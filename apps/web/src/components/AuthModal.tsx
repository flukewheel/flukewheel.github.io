import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) closeButtonRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-card"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Your flukewheel</p>
            <h2 id={titleId}>Accounts arrive in Phase 3</h2>
          </div>
          <IconButton
            icon={<X aria-hidden="true" />}
            label="Close authentication"
            onClick={onClose}
            ref={closeButtonRef}
          />
        </div>
        <p>
          The entry point is ready. Secure email and Google authentication will
          connect here once the Supabase data model and policies are in place.
        </p>
        <button className="primary-button" onClick={onClose} type="button">
          Continue exploring
        </button>
      </section>
    </div>
  )
}
