import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../../app/AppState'
import { paths } from '../../../app/paths'
import { catalogueAdapter } from '../../../lib/adapters'

export function InterestSelector() {
  const { state, dispatch } = useAppState()
  const location = useLocation()
  const navigate = useNavigate()
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogueAdapter.listCategories,
  })

  return (
    <label className="interest-selector">
      <span className="sr-only">Discovery interest</span>
      <select
        aria-label="Discovery interest"
        onChange={(event) => {
          const interestId = event.target.value
          dispatch({ type: 'interest-selected', interestId })
          if (location.pathname === '/' || location.pathname === paths.recent || location.pathname.startsWith('/category/')) {
            navigate(interestId === 'all' ? location.pathname === '/' ? paths.home : paths.recent : paths.category(interestId))
          }
        }}
        value={state.selectedInterest}
      >
        <option value="all">All interests</option>
        {categories.data?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="interest-selector__chevron" />
    </label>
  )
}
