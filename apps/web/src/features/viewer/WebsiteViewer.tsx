import { useQuery } from '@tanstack/react-query'
import { Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { catalogueAdapter } from '../../lib/adapters'

const yourSceneSucksId = '20000000-0000-4000-8000-000000000004'
const yourSceneSucksPages = [
  'splash.htm',
  'fixedgear/index.htm', 'crustpunk/index.htm', 'steampunk/index.htm',
  'nintendocore/index.htm', 'screamolester/index.htm', 'cybergoth/index.htm',
  'rockabilly/index.htm', 'girl/index.htm', 'screamo/index.htm',
  'crunk/index.htm', 'boy/index.htm', 'applestore/index.htm',
  'neothrash/index.htm', 'postrocker/index.htm', 'christcore/index.htm',
  'indiejesus/index.htm', 'juggalo/index.htm', 'skinhead/index.htm',
  'skramz/index.htm', 'williamsburg/index.htm', 'mortalkombat/index.htm',
  'rudeboy/index.htm', 'punx/index.htm', 'crabcore/index.htm',
  'fauxhiphop/index.htm', 'popcore/index.htm', 'scenequeen/index.htm',
  'brootal/index.htm', 'hottopic/index.htm', 'sxe/index.htm',
  'orgcore/index.htm', 'prehistoric/index.htm', 'wentz/index.htm',
  'halloweencore/index.htm', 'hxc/index.htm', 'blackmetal/index.htm',
  'scenesters.htm', 'portraits.htm', 'about.htm', 'mailbag.htm',
  'merch.htm', 'misc.htm', 'links.htm', 'contact.htm',
]

function pageLabel(path: string) {
  if (path === 'splash.htm') return 'Start'
  const segment = path.split('/')[0].replace(/\.htm$/, '')
  return segment.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase())
}

export default function WebsiteViewer() {
  const { websiteId = '' } = useParams()
  const { dispatch } = useAppState()
  const [selectedPage, setSelectedPage] = useState(yourSceneSucksPages[0])
  const website = useQuery({
    queryKey: ['catalogue', websiteId],
    queryFn: () => catalogueAdapter.getById(websiteId),
  })

  useEffect(() => {
    if (website.data) {
      dispatch({ type: 'website-visited', websiteId: website.data.id })
    }
  }, [dispatch, website.data])

  if (website.isPending) {
    return (
      <main className="route-state" aria-live="polite">
        <p className="eyebrow">Opening a discovery</p>
        <h1>Dusting off a curious corner...</h1>
      </main>
    )
  }

  if (website.isError || !website.data) {
    return (
      <main className="route-state" role="alert">
        <p className="eyebrow">Lost link</p>
        <h1>That discovery isn't available.</h1>
        <p>It may have moved, been paused or never belonged to the catalogue.</p>
        <Link className="primary-link" to={paths.home}>
          <Home aria-hidden="true" /> Return home
        </Link>
      </main>
    )
  }

  const isYourSceneSucks = website.data.id === yourSceneSucksId
  const source = isYourSceneSucks
    ? new URL(selectedPage, website.data.originalUrl).href
    : website.data.originalUrl

  return (
    <main className={`viewer-shell${isYourSceneSucks ? ' viewer-shell--with-pages' : ''}`}>
      {isYourSceneSucks && (
        <label className="viewer-pages">
          <span>Browse pages</span>
          <select value={selectedPage} onChange={(event) => setSelectedPage(event.target.value)}>
            {yourSceneSucksPages.map((page) => (
              <option key={page} value={page}>{pageLabel(page)}</option>
            ))}
          </select>
        </label>
      )}
      <iframe
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-scripts allow-same-origin"
        src={source}
        title={`${website.data.title} website`}
      />
    </main>
  )
}
