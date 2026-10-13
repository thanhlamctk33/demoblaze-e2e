import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';

const MAX_SEED = 2_147_483_647;
const PASSWORD_PREFIX = 'Aa1!';

export function seedFaker(): number {
  const seed = Number(process.env.FAKER_SEED) || Math.floor(Math.random() * MAX_SEED);
  faker.seed(seed);
  return seed;
}

const uniqueSuffix = () => randomUUID().replace(/-/g, '').slice(0, 8);

export function randomUsername(): string {
  const base = faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  return `qa_auto_${base}_${uniqueSuffix()}`;
}

export function randomPassword(): string {
  return faker.internet.password({ length: 12, prefix: PASSWORD_PREFIX });
}

const placeholders: Record<string, () => string> = {
  '{{username}}': randomUsername,
  '{{password}}': randomPassword,
};

export function resolvePlaceholders(value: string): string {
  return value.replace(/\{\{\w+\}\}/g, (token) => placeholders[token]?.() ?? token);
}
