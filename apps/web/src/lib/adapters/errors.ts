export class BackendNotReadyError extends Error {
  constructor(feature: string) {
    super(`${feature} is not connected until its planned backend phase.`)
    this.name = 'BackendNotReadyError'
  }
}
