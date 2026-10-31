import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { adminApi, type ManagedWebsite } from './adminApi'

function WebsiteEditor({ website, onSaved }: { website: ManagedWebsite; onSaved: () => Promise<void> }) {
  const { user } = useAuth()
  const categories = useQuery({ queryKey: ['admin-categories', user?.id], queryFn: adminApi.categories })
  const [title, setTitle] = useState(website.title)
  const [description, setDescription] = useState(website.description)
  const [thumbnailPath, setThumbnailPath] = useState(website.thumbnail_path ?? '')
  const [categoryIds, setCategoryIds] = useState(website.category_ids)
  const [active, setActive] = useState(website.active)
  const [embeddingStatus, setEmbeddingStatus] = useState(website.embedding_status)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true); setError(null)
    try {
      await adminApi.editWebsite({
        website_id: website.id,
        title: title.trim(), description: description.trim(),
        thumbnail_path: thumbnailPath.trim() || null, category_ids: categoryIds,
        active, embedding_status: embeddingStatus, note: note.trim(),
      })
      setNote('')
      await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The catalogue change could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <section aria-label={`Edit ${website.title}`} className="admin-review">
      <h2>Edit website</h2>
      <p className="admin-review__url">{website.original_url}</p>
      <div className="admin-review__fields">
        <label>Title<input maxLength={160} onChange={(event) => setTitle(event.target.value)} value={title} /></label>
        <label>Description<textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
        <label>Thumbnail storage path (optional)<input maxLength={512} onChange={(event) => setThumbnailPath(event.target.value)} value={thumbnailPath} /></label>
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
        <label>Private change note<textarea maxLength={1000} onChange={(event) => setNote(event.target.value)} rows={2} value={note} /></label>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy || !note.trim()} onClick={() => void save()} type="button">{busy ? 'Saving…' : 'Save website'}</button>
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
  const catalogue = useQuery({ queryKey: ['admin-catalogue', user?.id, search], queryFn: () => adminApi.catalogue(search) })
  const selected = catalogue.data?.find((website) => website.id === selectedId) ?? catalogue.data?.[0]

  async function saved() {
    setMessage('Website updated.')
    await catalogue.refetch()
    await queryClient.invalidateQueries({ queryKey: ['catalogue'] })
    await queryClient.invalidateQueries({ queryKey: ['recommendations'] })
  }

  return (
    <section>
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setSelectedId(null) }}>
        <label>Search catalogue by name or URL<input maxLength={100} onChange={(event) => setSearchInput(event.target.value)} value={searchInput} /></label>
        <button className="secondary-button" type="submit">Search</button>
      </form>
      <p>Showing up to 50 matches. Search to find another website.</p>
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {catalogue.isPending && <p>Loading catalogue…</p>}
      {catalogue.isError && <p role="alert">The catalogue could not be loaded.</p>}
      {catalogue.data?.length === 0 && <p>No websites match.</p>}
      {catalogue.data && catalogue.data.length > 0 && (
        <div className="admin-page__layout">
          <nav aria-label="Catalogue websites" className="admin-queue">
            <h2>Websites</h2>
            {catalogue.data.map((website) => (
              <button aria-current={selected?.id === website.id ? 'true' : undefined} key={website.id} onClick={() => { setSelectedId(website.id); setMessage(null) }} type="button">
                <strong>{website.title}</strong><small>{website.active ? 'Active' : 'Inactive'}</small>
              </button>
            ))}
          </nav>
          {selected && <WebsiteEditor key={selected.id} onSaved={saved} website={selected} />}
        </div>
      )}
    </section>
  )
}
