import { BackendNotReadyError } from './errors'

export const submissionAdapter = {
  submit: async (url: string) => {
    void url
    throw new BackendNotReadyError('Website submissions')
  },
}
