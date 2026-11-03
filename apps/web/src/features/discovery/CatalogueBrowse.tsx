import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { EmptyState } from '../../components/RouteState'
import { catalogueAdapter } from '../../lib/adapters'
import { WebsiteCard } from './components/WebsiteCard'

const pageSize = 24

export function CatalogueBrowse() {
  const { categoryId } = useParams()
  const location = useLocation()
  const { dispatch } = useAppState()
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogueAdapter.listCategories })
  const category = categories.data?.find((item) => item.id === categoryId)
  const browse = useInfiniteQuery({
    queryKey: ['catalogue', 'browse', categoryId ?? 'all'],
    enabled: !categoryId || Boolean(category),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => catalogueAdapter.listPage(categoryId ?? null, pageParam * pageSize, pageSize),
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length : undefined,
  })
  const websites = browse.data?.pages.flatMap((page) => page.websites) ?? []
  const scrollKey = `flukewheel:browse-scroll:${location.pathname}`
  const initialScroll = useMemo(() => Number(sessionStorage.getItem(scrollKey) ?? 0), [scrollKey])
  const restoredRef = useRef(false)

  useLayoutEffect(() => {
    restoredRef.current = false
    if (import.meta.env.MODE !== 'test') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [scrollKey])

  useEffect(() => {
    if (category) dispatch({ type: 'interest-selected', interestId: category.id })
    else if (!categoryId) dispatch({ type: 'interest-selected', interestId: 'all' })
  }, [category, categoryId, dispatch])

  useEffect(() => {
    const save = () => { if (restoredRef.current) sessionStorage.setItem(scrollKey, String(window.scrollY)) }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [scrollKey])

  useEffect(() => {
    if (import.meta.env.MODE === 'test' || !browse.isSuccess) return
    const frame = requestAnimationFrame(() => {
      if (Number.isFinite(initialScroll)) window.scrollTo({ top: initialScroll, behavior: 'auto' })
      restoredRef.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [browse.isSuccess, initialScroll])

  return (
    <main className="browse-page" id="main-content">
      <div className="browse-page__heading">
        <Link className="text-link" to={paths.home}>← Back to homepage</Link>
        <h1>{categoryId ? category?.name ?? 'Explore a category' : 'Recently added websites'}</h1>
        <p>{category ? `Browse ${category.name.toLowerCase()} discoveries. Bump! will favour this interest until you change it.` : 'Explore the latest websites added to Flukewheel.'}</p>
        {categoryId && <Link className="text-link" onClick={() => dispatch({ type: 'interest-selected', interestId: 'all' })} to={paths.recent}>Clear category</Link>}
      </div>

      {categories.isError && categoryId && <div className="inline-state" role="alert"><p>We couldn’t load the categories.</p><button onClick={() => void categories.refetch()} type="button">Try again</button></div>}
      {categories.isSuccess && categoryId && !category && <EmptyState><p>This category is not in the catalogue.</p><Link className="text-link" to={paths.recent}>Show all websites</Link></EmptyState>}
      {browse.isPending && (!categoryId || category) && <div aria-label="Loading websites" className="card-grid">{[0, 1, 2].map((item) => <div className="website-card website-card--loading" key={item} />)}</div>}
      {browse.isError && <div className="inline-state" role="alert"><p>We couldn’t load these websites.</p><button onClick={() => void browse.refetch()} type="button">Try again</button></div>}
      {browse.isSuccess && websites.length === 0 && <EmptyState><p>{category ? 'No websites match this interest yet.' : 'No websites have been added yet.'}</p><Link className="text-link" to={paths.home}>Return home</Link></EmptyState>}
      {websites.length > 0 && <div className="card-grid">{websites.map((website) => <WebsiteCard key={website.id} website={website} />)}</div>}
      {browse.hasNextPage && <button className="secondary-button browse-page__more" disabled={browse.isFetchingNextPage} onClick={() => void browse.fetchNextPage()} type="button">{browse.isFetchingNextPage ? 'Loading…' : 'Show more websites'}</button>}
    </main>
  )
}
