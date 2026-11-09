import { describe, expect, it } from 'vitest'
import {
  bumpRequestSchema,
  moderateSubmissionResponseSchema,
  reactionRequestSchema,
  submissionRequestSchema,
} from './index'

const id = 'd9428888-122b-11e1-b85c-61cd3cbb3210'
const categoryId = '10000000-0000-4000-8000-000000000001'
const requestId = '123e4567-e89b-12d3-a456-426614174000'

describe('request contracts', () => {
  it('accepts a bounded discovery request', () => {
    expect(
      bumpRequestSchema.parse({
        category_id: categoryId,
        recent_ids: [id],
        request_id: requestId,
      }),
    ).toEqual({ category_id: categoryId, recent_ids: [id], request_id: requestId })
  })

  it('rejects oversized discovery history and unknown properties', () => {
    expect(() =>
      bumpRequestSchema.parse({
        category_id: null,
        recent_ids: Array.from({ length: 5001 }, () => id),
        request_id: requestId,
      }),
    ).toThrow()
    expect(() => bumpRequestSchema.parse({ category_id: null, recent_ids: [], request_id: requestId, unexpected: true })).toThrow()
    expect(bumpRequestSchema.parse({ category_id: null, recent_ids: Array.from({ length: 109 }, () => id), request_id: requestId }).recent_ids).toHaveLength(109)
  })

  it('rejects a dislike reason on a positive reaction', () => {
    expect(() =>
      reactionRequestSchema.parse({
        website_id: id,
        reaction: 'love',
        reason: 'not_interested',
        request_id: requestId,
      }),
    ).toThrow('A reason can only be supplied for a dislike')
  })

  it('rejects submission URLs outside HTTP and HTTPS', () => {
    expect(() =>
      submissionRequestSchema.parse({
        original_url: 'file:///etc/passwd',
        suggested_categories: [],
        description: null,
        request_id: requestId,
      }),
    ).toThrow('Only HTTP and HTTPS URLs are supported')
  })

  it('rejects credentials embedded in submitted URLs', () => {
    expect(() =>
      submissionRequestSchema.parse({
        original_url: 'https://user:secret@example.com/',
        suggested_categories: ['art'],
        description: null,
        request_id: requestId,
      }),
    ).toThrow('URLs with embedded credentials are not supported')
  })

  it('keeps moderation receipts bounded and rejects internal fields', () => {
    expect(moderateSubmissionResponseSchema.parse({
      request_id: requestId,
      submission_id: id,
      status: 'approved',
      resolved_website_id: id,
    }).status).toBe('approved')
    expect(() => moderateSubmissionResponseSchema.parse({
      request_id: requestId,
      submission_id: id,
      status: 'approved',
      resolved_website_id: id,
      moderation_notes: 'private',
    })).toThrow()
  })
})
