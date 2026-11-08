import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { RouteState, UnauthorisedState } from '../../components/RouteState'
import { catalogueAdapter } from '../../lib/adapters'
import { useAuth } from '../auth/AuthProvider'
import { adminApi, type PendingSubmission } from './adminApi'
import { CatalogueManager } from './CatalogueManager'
import { CategoryManager } from './CategoryManager'
import { ReportsManager } from './ReportsManager'
import { RechecksManager } from './RechecksManager'

function ReviewForm({ submission, onReviewed }: { submission: PendingSubmission; onReviewed: (message: string) => Promise<void> }) {
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogueAdapter.listCategories })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(submission.description ?? '')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function review(decision: 'approve' | 'reject') {
    setBusy(true); setError(null)
    try {
      if (decision === 'approve' && (!title.trim() || !description.trim() || categoryIds.length === 0)) {
        throw new Error('Complete the title, description and at least one category before approving.')
      }
      const result = await adminApi.review({
        submission_id: submission.id,
        decision,
        title: decision === 'approve' ? title.trim() : null,
        description: decision === 'approve' ? description.trim() : null,
        category_ids: decision === 'approve' ? categoryIds : [],
      })
      await queryClient.invalidateQueries({ queryKey: ['catalogue'] })
      await onReviewed(result.status === 'approved' ? 'Website approved and added to discovery.' : result.status === 'duplicate' ? 'Existing website linked; no duplicate was created.' : 'Suggestion rejected.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The review could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <section className="admin-review" aria-labelledby="admin-review-heading">
      <h2 id="admin-review-heading">Review suggestion</h2>
      <p className="admin-review__url">{submission.raw_url}</p>
      {submission.description && <p><strong>Visitor note:</strong> {submission.description}</p>}
      {submission.suggested_categories.length > 0 && <p><strong>Suggested categories:</strong> {submission.suggested_categories.join(', ')}</p>}
      {submission.duplicate_website_id && <p role="alert">A catalogue entry already has this normalized URL.</p>}
      <p>Preview this page in Flukewheel to see how it appears in the viewer. Some sites block embedding.</p>
      <button className="secondary-button" onClick={() => setPreview((value) => !value)} type="button">{preview ? 'Hide preview' : 'Preview in Flukewheel'}</button>
      {preview && <iframe className="admin-preview" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-scripts allow-same-origin" src={submission.raw_url} title="Suggested website preview" />}
      <div className="admin-review__fields">
        <label>Title
          <input maxLength={160} onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label>Description
          <textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
        </label>
        <fieldset className="submission-categories">
          <legend>Categories</legend>
          {categories.data?.map((category) => (
            <label key={category.id}>
              <input checked={categoryIds.includes(category.id)} onChange={(event) => setCategoryIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} type="checkbox" />
              {category.name}
            </label>
          ))}
        </fieldset>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <div className="admin-review__actions">
        <button className="primary-button" disabled={busy} onClick={() => void review('approve')} type="button">{busy ? 'Saving…' : 'Approve and publish'}</button>
        <button className="secondary-button" disabled={busy} onClick={() => void review('reject')} type="button">Reject suggestion</button>
      </div>
    </section>
  )
}

export function AdminPage() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [section, setSection] = useState<'suggestions' | 'catalogue' | 'categories' | 'reports' | 'rechecks'>('suggestions')
  const status = useQuery({ queryKey: ['admin-status', user?.id], queryFn: adminApi.isAdmin, enabled: Boolean(user) })
  const queue = useQuery({ queryKey: ['admin-queue', user?.id], queryFn: adminApi.queue, enabled: status.data === true })
  const selected = queue.data?.find((item) => item.id === selectedId) ?? queue.data?.[0]

  if (status.isPending) return <RouteState eyebrow="Administration" title="Checking access…"><p>Please wait.</p></RouteState>
  if (status.isError) return <RouteState alert eyebrow="Administration" title="Administration is unavailable."><p>Refresh to try again.</p></RouteState>
  if (!status.data) return <UnauthorisedState title="Administration is private." />

  async function reviewed(nextMessage: string) {
    setMessage(nextMessage)
    setSelectedId(null)
    await queue.refetch()
  }

  return (
    <main className="admin-page" id="main-content">
      <Link className="text-link" to={paths.home}>← Back to discovery</Link>
      <h1>Administration</h1>
      <p>Review suggested websites before they enter discovery.</p>
      <nav aria-label="Administration sections" className="admin-tabs">
        <button aria-current={section === 'suggestions' ? 'page' : undefined} onClick={() => setSection('suggestions')} type="button">Suggestions</button>
        <button aria-current={section === 'catalogue' ? 'page' : undefined} onClick={() => setSection('catalogue')} type="button">Catalogue</button>
        <button aria-current={section === 'categories' ? 'page' : undefined} onClick={() => setSection('categories')} type="button">Categories</button>
        <button aria-current={section === 'reports' ? 'page' : undefined} onClick={() => setSection('reports')} type="button">Reports</button>
        <button aria-current={section === 'rechecks' ? 'page' : undefined} onClick={() => setSection('rechecks')} type="button">Rechecks</button>
      </nav>
      {section === 'catalogue' && <CatalogueManager />}
      {section === 'categories' && <CategoryManager />}
      {section === 'reports' && <ReportsManager />}
      {section === 'rechecks' && <RechecksManager />}
      {section === 'suggestions' && message && <p className="auth-feedback" role="status">{message}</p>}
      {section === 'suggestions' && queue.isPending && <p>Loading suggestions…</p>}
      {section === 'suggestions' && queue.isError && <p role="alert">The review queue could not be loaded. Refresh to try again.</p>}
      {section === 'suggestions' && queue.data?.length === 0 && <p>No suggestions are waiting for review.</p>}
      {section === 'suggestions' && queue.data && queue.data.length > 0 && (
        <div className="admin-page__layout">
          <nav aria-label="Pending suggestions" className="admin-queue">
            <h2>Pending suggestions</h2>
            {queue.data.map((item) => (
              <button aria-current={selected?.id === item.id ? 'true' : undefined} key={item.id} onClick={() => { setSelectedId(item.id); setMessage(null) }} type="button">
                <strong>{new URL(item.raw_url).hostname}</strong>
                <small>{new Date(item.submitted_at).toLocaleDateString()}</small>
              </button>
            ))}
          </nav>
          {selected && <ReviewForm key={selected.id} onReviewed={reviewed} submission={selected} />}
        </div>
      )}
    </main>
  )
}
