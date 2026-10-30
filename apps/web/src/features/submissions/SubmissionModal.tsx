import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../../components/IconButton'

interface SubmissionModalProps {
  open: boolean
  onClose: () => void
}

export function SubmissionModal({ open, onClose }: SubmissionModalProps) {
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
            <p className="eyebrow">Share a find</p>
            <h2 id={titleId}>Suggest a website</h2>
          </div>
          <IconButton
            icon={<X aria-hidden="true" />}
            label="Close website submission"
            onClick={onClose}
            ref={closeButtonRef}
          />
        </div>
        <p>
          Secure submission intake arrives in Phase 4. This Phase 1 surface
          establishes the interaction without accepting unvalidated URLs.
        </p>
        <button className="primary-button" onClick={onClose} type="button">
          Got it
        </button>
      </section>
    </div>
  )
}
