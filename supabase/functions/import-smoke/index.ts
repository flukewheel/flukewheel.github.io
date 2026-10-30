import { z } from 'zod'

const requestSchema = z.strictObject({ request_id: z.string().uuid() })

Deno.serve(async (request) => {
  const result = requestSchema.safeParse(await request.json())

  return Response.json(
    result.success ? { request_id: result.data.request_id } : { error: 'bad_request' },
    { status: result.success ? 200 : 400 },
  )
})
