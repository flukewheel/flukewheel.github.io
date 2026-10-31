import { UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../../app/paths'
import { useAuth } from '../../auth/AuthProvider'

interface ProfileMenuProps {
  onOpenAuth: () => void
}

export function ProfileMenu({ onOpenAuth }: ProfileMenuProps) {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) {
    return (
      <button aria-label="Log in" className="profile-button" data-tooltip="Log in" onClick={onOpenAuth} title="Log in" type="button">
        <span className="profile-avatar" aria-hidden="true"><UserRound /></span>
        <span>Log in</span>
      </button>
    )
  }

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'Account'
  return (
    <div className="profile-menu" ref={rootRef}>
      <button aria-expanded={open} aria-haspopup="menu" aria-label={`Account menu for ${displayName}`} className="profile-button" onClick={() => setOpen((value) => !value)} type="button">
        <span className="profile-avatar" aria-hidden="true"><UserRound /></span>
        <span>{displayName}</span>
      </button>
      {open && (
        <div className="profile-menu__panel" role="menu" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
          <Link onClick={() => setOpen(false)} role="menuitem" to={paths.settings}>Profile and interests</Link>
          <Link onClick={() => setOpen(false)} role="menuitem" to={paths.bookmarks}>Bookmarks</Link>
          <Link onClick={() => setOpen(false)} role="menuitem" to={paths.history}>Browsing history</Link>
          {error && <p role="alert">{error}</p>}
          <button onClick={() => { void signOut().then(() => setOpen(false)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not sign out.')) }} role="menuitem" type="button">Log out</button>
        </div>
      )}
    </div>
  )
}
