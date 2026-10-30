import { Shuffle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface BumpButtonProps {
  busy: boolean
  onBump: () => void
}

export function BumpButton({ busy, onBump }: BumpButtonProps) {
  const [shuffling, setShuffling] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleBump() {
    setShuffling(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShuffling(false), 850)
    onBump()
  }

  return (
    <button
      aria-busy={busy}
      className={`bump-button${busy || shuffling ? ' bump-button--shuffling' : ''}`}
      disabled={busy}
      onClick={handleBump}
      type="button"
    >
      <Shuffle aria-hidden="true" />
      Bump!
    </button>
  )
}
