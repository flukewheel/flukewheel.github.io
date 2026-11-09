import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { SubmissionModal } from '../submissions/SubmissionModal'
import { adminApi, type ManagedWebsite } from './adminApi'

function WebsiteEditor({ website, onSaved, onDeleted }: { website: ManagedWebsite; onSaved: () => Promise<void>; onDeleted: (result: Awaited<ReturnType<typeof adminApi.deleteWebsite>>) => void }) {
  const { user } = useAuth()
  const categories = useQuery({ queryKey: ['admin-categories', user?.id], queryFn: adminApi.categories })
  const [title, setTitle] = useState(website.title)
  const [originalUrl, setOriginalUrl] = useState(website.original_url)
  const [editingUrl, setEditingUrl] = useState(false)
  const [description, setDescription] = useState(website.description)
  const [thumbnailPath, setThumbnailPath] = useState(website.thumbnail_path ?? '')
  const [categoryIds, setCategoryIds] = useState(website.category_ids)
  const [active, setActive] = useState(website.active)
  const [embeddingStatus, setEmbeddingStatus] = useState(website.embedding_status)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmationTitle, setConfirmationTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previewMessage, setPreviewMessage] = useState<string | null>(null)
  const changed = title.trim() !== website.title || description.trim() !== website.description
    || originalUrl.trim() !== website.original_url || (thumbnailPath.trim() || null) !== website.thumbnail_path
    || active !== website.active || embeddingStatus !== website.embedding_status
    || categoryIds.length !== website.category_ids.length || categoryIds.some((id) => !website.category_ids.includes(id))

  async function save() {
    setBusy(true); setError(null)
    try {
      await adminApi.editWebsite({
        website_id: website.id,
        original_url: originalUrl.trim(),
        title: title.trim(), description: description.trim(),
        thumbnail_path: originalUrl.trim() !== website.original_url && thumbnailPath.startsWith('link-previews/')
          ? null : thumbnailPath.trim() || null, category_ids: categoryIds,
        active, embedding_status: embeddingStatus, note: note.trim(),
      })
      setNote('')
      setEditingUrl(false)
      await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The catalogue change could not be saved.') }
    finally { setBusy(false) }
  }

  async function findPreview() {
    setBusy(true); setError(null); setPreviewMessage(null)
    try {
      const result = await adminApi.refreshPreview(website.id)
      setPreviewMessage(result.found ? 'Link preview image added.' : 'This site has no accessible link preview image.')
      if (result.found) await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The link preview could not be checked.') }
    finally { setBusy(false) }
  }

  async function remove() {
    if (confirmationTitle !== website.title) return
    setBusy(true); setError(null)
    try {
      const result = await adminApi.deleteWebsite(website.id, confirmationTitle)
      onDeleted(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The website could not be deleted.') }
    finally { setBusy(false) }
  }

  return (
    <section aria-label={`Edit ${website.title}`} className="admin-review">
      <h2>Edit website</h2>
      {editingUrl ? (
        <div className="admin-review__url-edit">
          <label>Web address<input autoFocus maxLength={2048} onChange={(event) => setOriginalUrl(event.target.value)} type="url" value={originalUrl} /></label>
          <button className="secondary-button" disabled={busy} onClick={() => { setOriginalUrl(website.original_url); setEditingUrl(false) }} type="button">Cancel address edit</button>
        </div>
      ) : (
        <div className="admin-review__url-edit">
          <p className="admin-review__url">{website.original_url}</p>
          <button className="secondary-button" disabled={busy} onClick={() => setEditingUrl(true)} type="button">Edit web address</button>
        </div>
      )}
      <div className="admin-review__fields">
        <label>Title<input maxLength={160} onChange={(event) => setTitle(event.target.value)} value={title} /></label>
        <label>Description<textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
        <label>Thumbnail storage path (optional)<input maxLength={512} onChange={(event) => setThumbnailPath(event.target.value)} value={thumbnailPath} /></label>
        {!website.thumbnail_path && <button className="secondary-button" disabled={busy} onClick={() => void findPreview()} type="button">Find link preview image</button>}
        {previewMessage && <p role="status">{previewMessage}</p>}
        <fieldset className="submission-categories">
          <legend>Categories</legend>
          {categories.data?.filter((category) => category.active || categoryIds.includes(category.id)).map((category) => (
            <label key={category.id}><input checked={categoryIds.includes(category.id)} onChange={(event) => setCategoryIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} type="checkbox" />{category.name}</label>
          ))}
        </fieldset>
        <label>Embedding status
          <select onChange={(event) => setEmbeddingStatus(event.target.value as ManagedWebsite['embedding_status'])} value={embeddingStatus}>
            <option value="allowed">Allowed</option><option value="blocked">Blocked</option><option value="needs_review">Needs review</option><option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="admin-review__check"><input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />Active in discovery</label>
        <label>Private change note (optional)<textarea maxLength={1000} onChange={(event) => setNote(event.target.value)} rows={2} value={note} /></label>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy || !changed} onClick={() => void save()} type="button">{busy ? 'Saving…' : 'Save website'}</button>
      <div className="admin-delete">
        {confirmingDelete ? (
          <>
            <h3>Permanently delete this website</h3>
            <p>This removes it from discovery and from everyone’s bookmarks, history and reactions. This cannot be undone.</p>
            <label>Type “{website.title}” to confirm
              <input autoComplete="off" onChange={(event) => setConfirmationTitle(event.target.value)} value={confirmationTitle} />
            </label>
            <div className="admin-review__actions">
              <button className="admin-delete__confirm" disabled={busy || confirmationTitle !== website.title} onClick={() => void remove()} type="button">{busy ? 'Deleting…' : 'Permanently delete website'}</button>
              <button className="secondary-button" disabled={busy} onClick={() => { setConfirmingDelete(false); setConfirmationTitle(''); setError(null) }} type="button">Cancel</button>
            </div>
          </>
        ) : (
          <button className="admin-delete__open" disabled={busy} onClick={() => setConfirmingDelete(true)} type="button">Delete website</button>
        )}
      </div>
    </section>
  )
}

export function CatalogueManager() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const catalogue = useQuery({ queryKey: ['admin-catalogue', user?.id, search], queryFn: () => adminApi.catalogue(search) })
  const selected = catalogue.data?.find((website) => website.id === selectedId) ?? catalogue.data?.[0]

  async function saved() {
    setMessage('Website updated.')
    await catalogue.refetch()
    await queryClient.invalidateQueries({ queryKey: ['catalogue'] })
    await queryClient.invalidateQueries({ queryKey: ['recommendations'] })
  }

  function deleted(result: Awaited<ReturnType<typeof adminApi.deleteWebsite>>) {
    setSelectedId(null)
    setMessage(`Website deleted. Removed ${result.bookmarks_deleted} bookmarks, ${result.history_deleted} history entries and ${result.reactions_deleted} reactions.`)
    void queryClient.invalidateQueries()
  }

  return (
    <section>
      <button className="primary-button admin-add-website" onClick={() => setSubmissionOpen(true)} type="button">Add a website</button>
      <SubmissionModal
        onClose={() => setSubmissionOpen(false)}
        onSubmitted={() => {
          setMessage('Suggestion received. Open Suggestions to review and publish it.')
          void queryClient.invalidateQueries({ queryKey: ['admin-queue', user?.id] })
        }}
        open={submissionOpen}
      />
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setSelectedId(null) }}>
        <label>Search catalogue by name or URL<input maxLength={100} onChange={(event) => setSearchInput(event.target.value)} value={searchInput} /></label>
        <button className="secondary-button" type="submit">Search</button>
      </form>
      {catalogue.data && <p>Showing all {catalogue.data.length} matching websites. Search to narrow the list.</p>}
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {catalogue.isPending && <p>Loading catalogue…</p>}
      {catalogue.isError && <p role="alert">The catalogue could not be loaded.</p>}
      {catalogue.data?.length === 0 && <p>No websites match.</p>}
      {catalogue.data && catalogue.data.length > 0 && (
        <div className="admin-page__layout">
          <nav aria-label="Catalogue websites" className="admin-queue admin-queue--catalogue">
            <h2>Websites</h2>
            {catalogue.data.map((website) => (
              <button aria-current={selected?.id === website.id ? 'true' : undefined} key={website.id} onClick={() => { setSelectedId(website.id); setMessage(null) }} type="button">
                <strong>{website.title}</strong><small>{website.active ? 'Active' : 'Inactive'}</small>
              </button>
            ))}
          </nav>
          {selected && <WebsiteEditor key={[selected.id, selected.title, selected.description, selected.original_url, selected.thumbnail_path, selected.active, selected.embedding_status, ...selected.category_ids].join(':')} onDeleted={deleted} onSaved={saved} website={selected} />}
        </div>
      )}
    </section>
  )
}
