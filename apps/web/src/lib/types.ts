export type DeliveryMode = 'inline' | 'external'

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
  displayDomain: string
  categories: string[]
  deliveryMode: DeliveryMode
  image: string
  addedLabel: string
}
