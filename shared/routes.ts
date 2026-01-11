import { z } from 'zod';
import { insertRunnerSchema, insertOrderSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  notFound: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  internal: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
};

// Response Envelope
export const envelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  ok: z.boolean(),
  data: dataSchema.nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }).nullable(),
  meta: z.object({
    request_id: z.string(),
    server_time: z.string(),
  }),
});

export const api = {
  runners: {
    list: {
      method: 'GET' as const,
      path: '/api/runners',
      responses: {
        200: envelopeSchema(z.array(z.any())), // Typed as any for now to avoid circular refs, will be Runner[]
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/runners/:id',
      responses: {
        200: envelopeSchema(z.any()),
        404: envelopeSchema(z.null()),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/runners/:id',
      responses: {
        200: envelopeSchema(z.any()), // Returns the deleted ID or empty
        404: envelopeSchema(z.null()),
      },
    },
    listOrders: {
      method: 'GET' as const,
      path: '/api/runners/:id/orders',
      input: z.object({
        limit: z.coerce.number().optional(),
        cursor: z.string().optional(),
      }).optional(),
      responses: {
        200: envelopeSchema(z.array(z.any())),
      },
    },
    createOrder: {
      method: 'POST' as const,
      path: '/api/runners/:id/orders',
      input: z.object({
        type: z.enum(["runner.selftest", "runner.reconcile"]),
        client_request_id: z.string().optional(),
      }),
      responses: {
        200: envelopeSchema(z.any()), // Idempotent return
        201: envelopeSchema(z.any()), // New creation
      },
    },
  },
  evidences: {
    list: {
      method: 'GET' as const,
      path: '/api/evidences',
      input: z.object({
        runner_id: z.string().optional(),
        order_id: z.string().optional(),
      }).refine(data => data.runner_id || data.order_id, {
        message: "Either runner_id or order_id is required",
      }),
      responses: {
        200: envelopeSchema(z.array(z.any())),
      },
    },
  },
};
