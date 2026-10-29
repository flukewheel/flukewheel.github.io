import { useQuery } from '@tanstack/react-query'
import { useAppState } from '../../../app/AppState'
import { catalogueAdapter } from '../../../lib/adapters'

export function InterestSelector() {
  const { state, dispatch } = useAppState()
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: catalogueAdapter.listCategories,
  })

  return (
    <label className="interest-selector">
      <span className="sr-only">Discovery interest</span>
      <select
        aria-label="Discovery interest"
        onChange={(event) =>
          dispatch({
            type: 'interest-selected',
            interestId: event.target.value,
          })
        }
        value={state.selectedInterest}
      >
        <option value="all">All interests</option>
        {categories.data?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  )
}
