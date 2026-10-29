import { Shuffle } from 'lucide-react'

interface BumpButtonProps {
  busy: boolean
  onBump: () => void
}

export function BumpButton({ busy, onBump }: BumpButtonProps) {
  return (
    <button
      aria-busy={busy}
      className="bump-button"
      disabled={busy}
      onClick={onBump}
      type="button"
    >
      {busy ? <span aria-hidden="true" className="button-spinner" /> : <Shuffle aria-hidden="true" />}
      Bump!
    </button>
  )
}
