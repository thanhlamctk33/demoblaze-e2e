import Ajv, { type JSONSchemaType } from 'ajv';
import { expect, type APIResponse } from '@playwright/test';

const ajv = new Ajv({ allErrors: true, strict: true });

export function expectSchema<T>(body: unknown, schema: JSONSchemaType<T>): asserts body is T {
  const validate = ajv.compile(schema);
  const valid = validate(body);
  expect(valid, `schema violations: ${ajv.errorsText(validate.errors)}\nbody: ${JSON.stringify(body)}`).toBe(true);
}

export async function expectJsonResponse(res: APIResponse): Promise<unknown> {
  expect(res.headers()['content-type']).toContain('application/json');
  return res.json();
}
