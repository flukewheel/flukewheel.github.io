import { UserRound } from 'lucide-react'

interface ProfileMenuProps {
  onOpenAuth: () => void
}

export function ProfileMenu({ onOpenAuth }: ProfileMenuProps) {
  return (
    <button aria-label="Log in" className="profile-button" onClick={onOpenAuth} type="button">
      <span className="profile-avatar" aria-hidden="true">
        <UserRound />
      </span>
      <span>Log in</span>
    </button>
  )
}
