import type { z } from 'zod';
import { AppError } from './errors';

// Parse unknown input against a Zod schema, raising an AppError(400) on failure.
export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw AppError.badRequest(message, 'VALIDATION_ERROR');
  }
  return result.data;
}
