import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { adminApi, type ReportSignal } from './adminApi'

function ReportReview({ report, onReviewed }: { report: ReportSignal; onReviewed: () => Promise<void> }) {
  const [preview, setPreview] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function review() {
    setBusy(true); setError(null)
    try {
      await adminApi.reviewReports(report.website_id, note.trim())
      await onReviewed()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Report review could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <section aria-label={`Review reports for ${report.title}`} className="admin-review">
      <h2>{report.title}</h2>
      <p className="admin-review__url">{report.original_url}</p>
      <p>{report.broken} broken · {report.inappropriate} inappropriate · {report.low_quality} low quality</p>
      <p>These are review signals. The website remains in its current catalogue state until you edit or deactivate it.</p>
      <button className="secondary-button" onClick={() => setPreview((value) => !value)} type="button">{preview ? 'Hide preview' : 'Preview in Flukewheel'}</button>
      {preview && <iframe className="admin-preview" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-scripts allow-same-origin" src={report.original_url} title="Reported website preview" />}
      <div className="admin-review__fields">
        <label>Private review note<textarea maxLength={1000} onChange={(event) => setNote(event.target.value)} rows={3} value={note} /></label>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy || !note.trim()} onClick={() => void review()} type="button">{busy ? 'Saving…' : 'Mark reports reviewed'}</button>
    </section>
  )
}

export function ReportsManager() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const reports = useQuery({ queryKey: ['admin-reports', user?.id], queryFn: adminApi.reports })
  const selected = reports.data?.find((item) => item.website_id === selectedId) ?? reports.data?.[0]

  async function reviewed() {
    setSelectedId(null)
    setMessage('Reports marked reviewed.')
    await reports.refetch()
  }

  return (
    <section>
      <p>Recent broken, inappropriate and low quality dislikes are grouped by website. Personal dislikes do not automatically remove a site.</p>
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {reports.isPending && <p>Loading reports…</p>}
      {reports.isError && <p role="alert">Reports could not be loaded.</p>}
      {reports.data?.length === 0 && <p>No reports need review.</p>}
      {reports.data && reports.data.length > 0 && (
        <div className="admin-page__layout">
          <nav aria-label="Website reports" className="admin-queue">
            <h2>Reports</h2>
            {reports.data.map((item) => (
              <button aria-current={selected?.website_id === item.website_id ? 'true' : undefined} key={item.website_id} onClick={() => setSelectedId(item.website_id)} type="button">
                <strong>{item.title}</strong><small>{item.broken + item.inappropriate + item.low_quality} new reports</small>
              </button>
            ))}
          </nav>
          {selected && <ReportReview key={selected.website_id} onReviewed={reviewed} report={selected} />}
        </div>
      )}
    </section>
  )
}
