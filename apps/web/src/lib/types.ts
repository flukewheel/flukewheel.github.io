export interface Category {
  id: string
  name: string
  description: string
  accent: string
}

export interface WebsiteSummary {
  id: string
  title: string
  description: string
  originalUrl: string
  embeddingStatus?: string
  displayDomain: string
  categories: string[]
  image: string
  addedLabel: string
}
