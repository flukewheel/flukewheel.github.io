export const routePatterns = {
  home: '/',
  category: 'category/:categoryId',
  recent: 'recent',
  viewer: 'viewer/:websiteId',
  bookmarks: 'bookmarks',
  history: 'history',
  settings: 'settings',
  admin: 'admin',
} as const

export const paths = {
  home: '/',
  category: (categoryId: string) => `/category/${encodeURIComponent(categoryId)}`,
  recent: '/recent',
  viewer: (websiteId: string) => `/viewer/${encodeURIComponent(websiteId)}`,
  bookmarks: '/bookmarks',
  history: '/history',
  settings: '/settings',
  admin: '/admin',
} as const

export function hashHref(path: string) {
  return `#${path}`
}
