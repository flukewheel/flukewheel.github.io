import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  active?: boolean
  showLabel?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, icon, active = false, showLabel = false, className, ...props },
    ref,
  ) {
    return (
      <button
        aria-label={label}
        aria-pressed={active || undefined}
        className={clsx('icon-button', className)}
        data-tooltip={label}
        ref={ref}
        title={label}
        type="button"
        {...props}
      >
        {icon}
        {showLabel && <span className="icon-button__label">{label}</span>}
      </button>
    )
  },
)
