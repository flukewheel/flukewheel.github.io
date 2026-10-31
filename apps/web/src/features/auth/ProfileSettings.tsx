import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { catalogueAdapter } from '../../lib/adapters'
import { authAdapter } from '../../lib/adapters/auth'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

export function ProfileSettings() {
  const { user, profile, avatarUrl, refreshProfile } = useAuth()
  const [username, setUsername] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [localInterests, setLocalInterests] = useState<string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const client = getSupabaseClient()
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogueAdapter.listCategories })
  const interests = useQuery({
    queryKey: ['user-interests', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!client || !user) return []
      const { data, error: readError } = await client.from('user_interests').select('category_id').eq('user_id', user.id)
      if (readError) throw readError
      return data.map((row) => row.category_id)
    },
  })

  if (!user || !client) return null

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !client) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const value = (username ?? profile?.username ?? '').trim()
      if (value && !/^[A-Za-z0-9_]{3,32}$/.test(value)) throw new Error('Use 3–32 letters, numbers or underscores.')
      const { error: updateError } = await client.from('profiles').update({ username: value || null }).eq('id', user.id)
      if (updateError) throw updateError.code === '23505' ? new Error('That username is already taken.') : updateError
      await refreshProfile()
      setUsername(null)
      setMessage('Profile saved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profile could not be saved.') }
    finally { setBusy(false) }
  }

  async function toggleInterest(categoryId: string, selected: boolean) {
    if (!user || !client) return
    setError(null)
    const current = localInterests ?? interests.data ?? []
    setLocalInterests(selected ? current.filter((id) => id !== categoryId) : [...current, categoryId])
    const response = selected
      ? await client.from('user_interests').delete().eq('user_id', user.id).eq('category_id', categoryId)
      : await client.from('user_interests').insert({ user_id: user.id, category_id: categoryId })
    if (response.error) { setError(response.error.message); setLocalInterests(null) }
    else { await interests.refetch(); setLocalInterests(null) }
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file || !client) return
    setBusy(true); setError(null); setMessage(null)
    try {
      if (file.size > 1_048_576) throw new Error('Choose an image smaller than 1 MB.')
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.')
      const body = new FormData()
      body.append('file', file)
      const { error: uploadError } = await client.functions.invoke('process-avatar', { body })
      if (uploadError) throw uploadError
      await refreshProfile()
      setMessage('Profile picture updated.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Picture could not be uploaded.') }
    finally { setBusy(false) }
  }

  async function sendPasswordReset() {
    if (!user?.email) return
    setBusy(true); setError(null); setMessage(null)
    try {
      await authAdapter.sendPasswordReset(user.email)
      setMessage('If this address has an account, a password reset link is on its way.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The reset email could not be sent.') }
    finally { setBusy(false) }
  }

  return (
    <main id="main-content" className="settings-page">
      <div className="settings-heading">
        <Link className="text-link" to={paths.home}>← Back to discovery</Link>
        <h1>Profile and interests</h1>
        <p>Choose how you appear and which corners of the web you enjoy.</p>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      {message && <p className="auth-feedback" role="status">{message}</p>}
      <section className="settings-card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Your profile</h2>
        <p>{user.email}</p>
        <div className="settings-avatar">
          {avatarUrl ? <img alt="Your profile" src={avatarUrl} /> : <span aria-hidden="true">{(profile?.username ?? user.email ?? '?').slice(0, 1).toUpperCase()}</span>}
          <label>Change profile picture
            <input accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void uploadAvatar(event.target.files?.[0])} type="file" />
          </label>
        </div>
        <form className="auth-form" onSubmit={(event) => void saveUsername(event)}>
          <label>Username
            <input autoComplete="username" maxLength={32} minLength={3} onChange={(event) => setUsername(event.target.value)} pattern="[A-Za-z0-9_]*" type="text" value={username ?? profile?.username ?? ''} />
          </label>
          <button className="primary-button" disabled={busy} type="submit">Save profile</button>
        </form>
      </section>
      <section className="settings-card" aria-labelledby="interests-heading">
        <h2 id="interests-heading">Your interests</h2>
        {categories.isError || interests.isError ? <p>Interests could not be loaded. Refresh to try again.</p> : null}
        {categories.isPending || interests.isPending ? <p>Loading interests…</p> : null}
        {categories.data?.map((category) => (
          <label className="interest-choice" key={category.id}>
            <input checked={(localInterests ?? interests.data ?? []).includes(category.id)} onChange={() => void toggleInterest(category.id, (localInterests ?? interests.data ?? []).includes(category.id))} type="checkbox" />
            <span>{category.name}</span>
          </label>
        ))}
      </section>
      {user.email && (
        <section className="settings-card" aria-labelledby="security-heading">
          <h2 id="security-heading">Account security</h2>
          <p>Reset your password using a link sent to {user.email}.</p>
          <button className="secondary-button" disabled={busy} onClick={() => void sendPasswordReset()} type="button">Send password reset email</button>
        </section>
      )}
    </main>
  )
}
