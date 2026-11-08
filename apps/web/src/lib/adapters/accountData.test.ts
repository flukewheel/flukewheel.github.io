import { describe, expect, it } from 'vitest'
import { readBoundedRows } from './accountData'

describe('account export bound', () => {
  const pageFor = (total: number) => async (from: number, to: number) => ({
    data: Array.from({ length: Math.max(0, Math.min(total - from, to - from + 1)) }, (_, index) => from + index),
    error: null,
  })

  it('exports exactly 10,000 rows', async () => {
    await expect(readBoundedRows(pageFor(10_000))).resolves.toHaveLength(10_000)
  })

  it('rejects the first row beyond the limit instead of exporting an oversized collection', async () => {
    await expect(readBoundedRows(pageFor(10_001))).rejects.toThrow('too many records')
  })
})
