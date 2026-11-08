interface GoogleSignInButtonProps {
  disabled?: boolean
  onClick: () => void
}

export function GoogleSignInButton({ disabled, onClick }: GoogleSignInButtonProps) {
  return (
    <button aria-label="Sign in with Google" className="google-sign-in-button" disabled={disabled} onClick={onClick} type="button">
      <img alt="" height="40" src={`${import.meta.env.BASE_URL}google-sign-in-dark-rect.png`} width="180" />
    </button>
  )
}
