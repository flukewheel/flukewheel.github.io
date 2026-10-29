import { Sparkles } from 'lucide-react'

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
      <Sparkles aria-hidden="true" />
      {busy ? 'Finding…' : 'Bump!'}
    </button>
  )
}
