import { useQuery } from '@tanstack/react-query'
import { Bookmark, History, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../../app/paths'
import { useAuth } from '../../auth/AuthProvider'
import { adminApi } from '../../admin/adminApi'

interface ProfileMenuProps {
  onOpenAuth: () => void
}

export function ProfileMenu({ onOpenAuth }: ProfileMenuProps) {
  const { user, profile, signOut } = useAuth()
  const admin = useQuery({ queryKey: ['admin-status', user?.id], queryFn: adminApi.isAdmin, enabled: Boolean(user) })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
        <span className="profile-avatar" aria-hidden="true"><LogIn /></span>
        <span>Log in</span>
      </button>
    )
  }

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'Account'
  return (
    <div className="profile-menu" onKeyDown={(event) => { if (event.key === 'Escape' && open) { setOpen(false); triggerRef.current?.focus() } }} ref={rootRef}>
      <button aria-expanded={open} aria-haspopup="menu" aria-label={`Account menu for ${displayName}`} className="profile-button" onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button">
        <span className="profile-avatar" aria-hidden="true"><UserRound /></span>
        <span>{displayName}</span>
      </button>
      {open && (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__heading" role="presentation"><strong>Your account</strong><span>{displayName}</span></div>
          <Link className="interest-option profile-menu__item" onClick={() => setOpen(false)} role="menuitem" to={paths.settings}><span aria-hidden="true" className="interest-option__icon"><UserRound /></span><span>Profile and interests</span></Link>
          <Link className="interest-option profile-menu__item" onClick={() => setOpen(false)} role="menuitem" to={paths.bookmarks}><span aria-hidden="true" className="interest-option__icon"><Bookmark /></span><span>Bookmarks</span></Link>
          <Link className="interest-option profile-menu__item" onClick={() => setOpen(false)} role="menuitem" to={paths.history}><span aria-hidden="true" className="interest-option__icon"><History /></span><span>Browsing history</span></Link>
          {admin.data && <Link className="interest-option profile-menu__item" onClick={() => setOpen(false)} role="menuitem" to={paths.admin}><span aria-hidden="true" className="interest-option__icon"><ShieldCheck /></span><span>Administration</span></Link>}
          {error && <p role="alert">{error}</p>}
          <button className="interest-option profile-menu__item profile-menu__item--sign-out" onClick={() => { void signOut().then(() => setOpen(false)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not sign out.')) }} role="menuitem" type="button"><span aria-hidden="true" className="interest-option__icon"><LogOut /></span><span>Log out</span></button>
        </div>
      )}
    </div>
  )
}
