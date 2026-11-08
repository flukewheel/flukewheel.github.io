import { useEffect, useRef } from 'react'

interface WheelButtonProps {
  busy: boolean
  onWheel: () => void
  label?: string
}

const idleRpm = 5
const burstRpm = 135
const burstDuration = 1500

export function WheelButton({ busy, onWheel, label = 'Wheel' }: WheelButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const burstStart = useRef<number | null>(null)

  useEffect(() => {
    if (!window.requestAnimationFrame) return
    const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let frame = 0
    let lastTime: number | null = null
    let angle = 0

    function turn(now: number) {
      const elapsed = lastTime === null ? 0 : Math.min(now - lastTime, 50)
      lastTime = now
      const progress = burstStart.current === null ? 1 : (now - burstStart.current) / burstDuration
      const boost = progress >= 0 && progress < 1 ? Math.sin(Math.PI * progress) ** 2 : 0
      const hovered = buttonRef.current?.matches(':hover') ?? false
      const rpm = motionPreference?.matches ? 0 : (hovered ? 0 : idleRpm) + burstRpm * boost
      angle = (angle + rpm * 6 * elapsed / 1000) % 360
      if (imageRef.current) imageRef.current.style.transform = `rotate(${angle}deg)`
      frame = window.requestAnimationFrame(turn)
    }

    frame = window.requestAnimationFrame(turn)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  function handleWheel() {
    burstStart.current = performance.now()
    onWheel()
  }

  return (
    <button
      aria-busy={busy}
      aria-label={label}
      className="wheel-button"
      disabled={busy}
      onClick={handleWheel}
      ref={buttonRef}
      title={label}
      type="button"
    >
      <img alt="" className="wheel-button__icon" ref={imageRef} src={`${import.meta.env.BASE_URL}icon.png`} />
    </button>
  )
}
