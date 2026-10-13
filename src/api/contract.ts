import Ajv, { type JSONSchemaType, type ValidateFunction } from 'ajv';
import { expect, type APIResponse } from '@playwright/test';

const ajv = new Ajv({ allErrors: true, strict: true });
const validators = new WeakMap<object, ValidateFunction>();

function validatorFor<T>(schema: JSONSchemaType<T>): ValidateFunction {
  let validate = validators.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    validators.set(schema, validate);
  }
  return validate;
}

export function expectSchema<T>(body: unknown, schema: JSONSchemaType<T>): asserts body is T {
  const validate = validatorFor(schema);
  const valid = validate(body);
  expect(valid, `schema violations: ${ajv.errorsText(validate.errors)}\nbody: ${JSON.stringify(body)}`).toBe(true);
}

export async function expectJsonResponse(res: APIResponse): Promise<unknown> {
  expect(res.headers()['content-type']).toContain('application/json');
  return res.json();
}
