import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

interface CompleteProfileProps {
  onComplete: () => void
  onDismiss: () => void
}

function suggestedUsername(email: string | undefined) {
  const candidate = (email?.split('@')[0] ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 32)
  return candidate.length >= 3 ? candidate : ''
}

export function CompleteProfile({ onComplete, onDismiss }: CompleteProfileProps) {
  const { user, refreshProfile } = useAuth()
  const [username, setUsername] = useState(() => suggestedUsername(user?.email))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headingId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => previousFocus.current?.focus()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    const client = getSupabaseClient()
    if (!client) { setError('Profile editing is unavailable. Please try again later.'); return }
    const value = username.trim()
    if (!/^[A-Za-z0-9_]{3,32}$/.test(value)) {
      setError('Use 3–32 letters, numbers or underscores.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: updateError } = await client.from('profiles').update({ username: value }).eq('id', user.id).select('id').single()
      if (updateError) throw updateError.code === '23505' ? new Error('That username is already taken. Choose another.') : updateError
      await refreshProfile()
      onComplete()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your username could not be saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="modal-card auth-modal"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onDismiss()
          if (event.key !== 'Tab') return
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)')]
          if (controls.length === 0) return
          if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus() }
          else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus() }
        }}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">One last step</p>
            <h2 id={headingId}>Choose a username</h2>
          </div>
        </div>
        <p>Pick a name for your Flukewheel profile. You can change it later in settings.</p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>Username
            <input autoComplete="username" maxLength={32} minLength={3} onChange={(event) => setUsername(event.target.value)} ref={inputRef} required type="text" value={username} />
          </label>
          {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save username'}</button>
        </form>
        <div className="auth-modal__alternatives">
          <button className="text-button" disabled={busy} onClick={onDismiss} type="button">Not now</button>
        </div>
      </section>
    </div>
  )
}
