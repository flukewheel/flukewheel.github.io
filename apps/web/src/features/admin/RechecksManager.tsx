import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { adminApi, type RecheckJob } from './adminApi'

function RecheckReview({ job, onCompleted }: { job: RecheckJob; onCompleted: () => Promise<void> }) {
  const [preview, setPreview] = useState(false)
  const [outcome, setOutcome] = useState<'allowed' | 'blocked' | 'needs_review' | 'failed'>('allowed')
  const [checkedUrl, setCheckedUrl] = useState(job.original_url)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    setBusy(true); setError(null)
    try {
      await adminApi.completeRecheck({ website_id: job.website_id, outcome, checked_url: checkedUrl.trim() || null, note: note.trim() })
      await onCompleted()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Recheck could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <section aria-label={`Recheck ${job.title}`} className="admin-review">
      <h2>{job.title}</h2>
      <p className="admin-review__url">{job.original_url}</p>
      <p>Last verified: {job.last_validated_at ? new Date(job.last_validated_at).toLocaleDateString() : 'Never'} · attempts: {job.attempts}</p>
      {job.note && <p><strong>Previous note:</strong> {job.note}</p>}
      <button className="secondary-button" onClick={() => setPreview((value) => !value)} type="button">{preview ? 'Hide preview' : 'Preview in Flukewheel'}</button>
      {preview && <iframe className="admin-preview" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-scripts allow-same-origin" src={job.original_url} title="Website recheck preview" />}
      <div className="admin-review__fields">
        <label>Result
          <select onChange={(event) => setOutcome(event.target.value as typeof outcome)} value={outcome}>
            <option value="allowed">Usable in viewer</option>
            <option value="blocked">Browser blocks embedding</option>
            <option value="needs_review">Needs more review</option>
            <option value="failed">Could not check; retry later</option>
          </select>
        </label>
        <label>Checked URL<input maxLength={2048} onChange={(event) => setCheckedUrl(event.target.value)} type="url" value={checkedUrl} /></label>
        <label>Private verification note<textarea maxLength={1000} onChange={(event) => setNote(event.target.value)} rows={3} value={note} /></label>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy || note.trim().length < 10} onClick={() => void complete()} type="button">{busy ? 'Saving…' : 'Save recheck'}</button>
    </section>
  )
}

export function RechecksManager() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const rechecks = useQuery({ queryKey: ['admin-rechecks', user?.id], queryFn: adminApi.rechecks })
  const selected = rechecks.data?.find((item) => item.website_id === selectedId) ?? rechecks.data?.[0]

  async function completed() {
    setSelectedId(null)
    setMessage('Recheck recorded.')
    await rechecks.refetch()
    await queryClient.invalidateQueries({ queryKey: ['catalogue'] })
  }

  return (
    <section>
      <p>Stale catalogue entries are queued in small daily batches. Review them in Flukewheel and record what you observed.</p>
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {rechecks.isPending && <p>Loading rechecks…</p>}
      {rechecks.isError && <p role="alert">Rechecks could not be loaded.</p>}
      {rechecks.data?.length === 0 && <p>No websites are waiting for a recheck.</p>}
      {rechecks.data && rechecks.data.length > 0 && (
        <div className="admin-page__layout">
          <nav aria-label="Website rechecks" className="admin-queue">
            <h2>Rechecks</h2>
            {rechecks.data.map((item) => (
              <button aria-current={selected?.website_id === item.website_id ? 'true' : undefined} key={item.website_id} onClick={() => setSelectedId(item.website_id)} type="button">
                <strong>{item.title}</strong><small>{item.status === 'failed' ? 'Retry needed' : 'Pending'}</small>
              </button>
            ))}
          </nav>
          {selected && <RecheckReview job={selected} key={selected.website_id} onCompleted={completed} />}
        </div>
      )}
    </section>
  )
}
