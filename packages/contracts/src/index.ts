import { z } from 'zod'

export const catalogueIdSchema = z.string().uuid()
export const deliveryModeSchema = z.enum(['inline', 'external'])
export const categoryIdSchema = z.string().uuid()
export const categorySlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64)
export const requestIdSchema = z.string().uuid()

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'Only HTTP and HTTPS URLs are supported',
  })
  .refine((value) => !new URL(value).username && !new URL(value).password, {
    message: 'URLs with embedded credentials are not supported',
  })

export const publicWebsiteSchema = z.strictObject({
  id: catalogueIdSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1_000),
  original_url: httpUrlSchema,
  thumbnail_url: httpUrlSchema.nullable(),
  category_ids: z.array(categoryIdSchema).max(8),
  delivery_mode: deliveryModeSchema,
})

export const bumpRequestSchema = z.strictObject({
  category_id: categoryIdSchema.nullable(),
  recent_ids: z.array(catalogueIdSchema).max(20),
  request_id: requestIdSchema,
})

export const bumpResponseSchema = z.strictObject({
  request_id: requestIdSchema,
  selection_id: z.string().uuid(),
  website: publicWebsiteSchema,
  exclusions_relaxed: z.boolean(),
})

export const recommendationsRequestSchema = z.strictObject({
  category_id: categoryIdSchema.nullable(),
  limit: z.number().int().min(1).max(20),
  cursor: z.string().max(256).nullable(),
  request_id: requestIdSchema,
})

export const recommendationsResponseSchema = z.strictObject({
  request_id: requestIdSchema,
  websites: z.array(publicWebsiteSchema).max(20),
  next_cursor: z.string().max(256).nullable(),
})

export const reactionRequestSchema = z
  .strictObject({
    website_id: catalogueIdSchema,
    reaction: z.enum(['love', 'dislike']),
    reason: z.enum([
      'not_interested',
      'low_quality',
      'seen_before',
      'broken',
      'inappropriate',
    ]).nullable(),
    request_id: requestIdSchema,
  })
  .refine((value) => value.reaction === 'dislike' || value.reason === null, {
    message: 'A reason can only be supplied for a dislike',
    path: ['reason'],
  })

export const submissionRequestSchema = z.strictObject({
  original_url: httpUrlSchema,
  suggested_categories: z.array(categorySlugSchema).max(8),
  description: z.string().trim().max(1_000).nullable(),
  request_id: requestIdSchema,
})

export const submissionReceiptSchema = z.strictObject({
  request_id: requestIdSchema,
  submission_id: z.string().uuid(),
  status: z.literal('pending'),
})

export const validateWebsiteRequestSchema = z.strictObject({
  submission_id: z.string().uuid(),
  request_id: requestIdSchema,
})

export const moderateSubmissionRequestSchema = z.discriminatedUnion('decision', [
  z.strictObject({
    decision: z.literal('approve'),
    submission_id: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1_000),
    category_ids: z.array(categoryIdSchema).min(1).max(8),
    embedding_status: z.enum(['allowed', 'blocked', 'needs_review']),
    request_id: requestIdSchema,
  }),
  z.strictObject({
    decision: z.literal('reject'),
    submission_id: z.string().uuid(),
    note: z.string().trim().max(1_000).nullable(),
    request_id: requestIdSchema,
  }),
  z.strictObject({
    decision: z.literal('duplicate'),
    submission_id: z.string().uuid(),
    website_id: catalogueIdSchema,
    request_id: requestIdSchema,
  }),
])

export const deleteAccountRequestSchema = z.strictObject({
  confirmation: z.literal('DELETE'),
  request_id: requestIdSchema,
})

export const apiErrorCodeSchema = z.enum([
  'INVALID_INPUT',
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'EMPTY_CATALOGUE',
  'INTERNAL_ERROR',
])
export const apiErrorSchema = z.strictObject({
  code: apiErrorCodeSchema,
  message: z.string().min(1).max(300),
  request_id: requestIdSchema,
})

export type DeliveryMode = z.infer<typeof deliveryModeSchema>
export type PublicWebsite = z.infer<typeof publicWebsiteSchema>
export type DiscoveryRequest = z.infer<typeof bumpRequestSchema>
export type BumpResponse = z.infer<typeof bumpResponseSchema>
export type RecommendationsRequest = z.infer<typeof recommendationsRequestSchema>
export type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>
export type ReactionRequest = z.infer<typeof reactionRequestSchema>
export type SubmissionRequest = z.infer<typeof submissionRequestSchema>
export type SubmissionReceipt = z.infer<typeof submissionReceiptSchema>
export type ValidateWebsiteRequest = z.infer<typeof validateWebsiteRequestSchema>
export type ModerateSubmissionRequest = z.infer<typeof moderateSubmissionRequestSchema>
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
