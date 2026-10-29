import { BackendNotReadyError } from './errors'

export const interactionAdapter = {
  react: async (websiteId: string, reaction: 'love' | 'dislike') => {
    void websiteId
    void reaction
    throw new BackendNotReadyError('Website reactions')
  },
  bookmark: async (websiteId: string) => {
    void websiteId
    throw new BackendNotReadyError('Bookmarks')
  },
}
