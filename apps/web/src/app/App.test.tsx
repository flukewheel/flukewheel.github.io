import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { RouteError } from './routes'

function BrokenRoute(): never {
  throw new Error('Deliberate route failure')
}

describe('Phase 1 application shell', () => {
  beforeEach(() => {
    window.location.hash = '#/'
    sessionStorage.clear()
  })

  it('renders the complete native homepage without a viewer iframe', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /recently added/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /for you/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /explore categories/i }),
    ).toBeInTheDocument()
    expect(document.querySelector('iframe')).not.toBeInTheDocument()
  })

  it('disables website-specific actions on the homepage', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: /recently added/i })

    expect(screen.getByRole('button', { name: /love this website/i })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /copy link/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /bookmark this website/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /dislike this website/i }),
    ).toBeDisabled()
  })

  it('keeps the interest selection while navigating into a category', async () => {
    const user = userEvent.setup()
    render(<App />)
    const category = await screen.findByRole('link', { name: /education, learning/i })

    await user.click(category)

    await waitFor(() => {
      expect(window.location.hash).toContain('/category/education-learning')
    })
    expect(screen.getByRole('button', { name: /discovery interest/i })).toHaveTextContent('Education, Learning')
  })

  it('recovers safely when a route fails to render', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createMemoryRouter([
      {
        path: '/',
        element: <BrokenRoute />,
        errorElement: <RouteError />,
      },
    ])

    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', { name: /get you back to discovery/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '#/')
    consoleError.mockRestore()
  })
})
