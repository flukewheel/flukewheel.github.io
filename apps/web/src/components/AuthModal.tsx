import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { authAdapter } from '../lib/adapters/auth'
import { IconButton } from './IconButton'

type Mode = 'login' | 'signup' | 'reset' | 'new-password'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onAuthenticated: () => void
  initialError?: string | null
  initialMode?: Mode
}

const titles: Record<Mode, string> = {
  login: 'Log in to flukewheel',
  signup: 'Create your account',
  reset: 'Reset your password',
  'new-password': 'Choose a new password',
}

export function AuthModal({ open, onClose, onAuthenticated, initialError, initialMode = 'login' }: AuthModalProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)

  useEffect(() => {
    if (!open) return
    lastFocusRef.current = document.activeElement as HTMLElement | null
    queueMicrotask(() => closeButtonRef.current?.focus())
    return () => lastFocusRef.current?.focus()
  }, [open])

  if (!open) return null

  function changeMode(next: Mode) {
    setMode(next)
    setError(null)
    setMessage(null)
    setPassword('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'login') {
        await authAdapter.signIn(email.trim(), password)
        onAuthenticated()
      } else if (mode === 'signup') {
        const signedIn = await authAdapter.signUp(email.trim(), password)
        if (signedIn) onAuthenticated()
        else setMessage('Check your email to confirm your account, then return to sign in.')
      } else if (mode === 'reset') {
        await authAdapter.sendPasswordReset(email.trim())
        setMessage('If this address has an account, a password reset link is on its way.')
      } else {
        await authAdapter.updatePassword(password)
        onAuthenticated()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication could not be completed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setError(null)
    try { await authAdapter.signInWithGoogle() }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in could not start.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => { if (!busy) onClose() }}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-card auth-modal"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose()
          if (event.key !== 'Tab') return
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]
          if (controls.length === 0) return
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Your flukewheel</p>
            <h2 id={titleId}>{titles[mode]}</h2>
          </div>
          <IconButton disabled={busy} icon={<X aria-hidden="true" />} label="Close authentication" onClick={onClose} ref={closeButtonRef} />
        </div>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {mode !== 'new-password' && (
            <label>Email address
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
          )}
          {mode !== 'reset' && (
            <label>{mode === 'new-password' ? 'New password' : 'Password'}
              <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </label>
          )}
          {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
          {message && <p className="auth-feedback" role="status">{message}</p>}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : mode === 'reset' ? 'Send reset link' : 'Save new password'}
          </button>
        </form>
        {(mode === 'login' || mode === 'signup') && (
          <div className="auth-modal__alternatives">
            <button className="secondary-button" disabled={busy} onClick={() => void google()} type="button">Continue with Google</button>
            <button className="text-button" onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')} type="button">
              {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
            </button>
            {mode === 'login' && <button className="text-button" onClick={() => changeMode('reset')} type="button">Forgot password?</button>}
          </div>
        )}
        {mode === 'reset' && <button className="text-button" onClick={() => changeMode('login')} type="button">Back to log in</button>}
      </section>
    </div>
  )
}
