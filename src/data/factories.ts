import { randomUUID } from 'node:crypto';
import { column, readCsv, type CsvRow } from './csv';

export interface UserCredentials {
  username: string;
  password: string;
}

export interface OrderDetails {
  name: string;
  country: string;
  city: string;
  card: string;
  month: string;
  year: string;
}

const shortId = () => randomUUID().replace(/-/g, '').slice(0, 10);

export function buildUser(overrides: Partial<UserCredentials> = {}): UserCredentials {
  return {
    username: `qa_auto_${shortId()}`,
    password: `Pw!${shortId()}`,
    ...overrides,
  };
}

const ORDER_FIELDS = ['name', 'country', 'city', 'card', 'month', 'year'] as const;
const ORDER_DEFAULTS_FILE = 'order-defaults.csv';
const [orderDefaults] = readCsv(ORDER_DEFAULTS_FILE);
if (!orderDefaults) throw new Error(`test-data/${ORDER_DEFAULTS_FILE} needs one data row`);

export function buildOrder(overrides: Partial<OrderDetails> = {}): OrderDetails {
  const d = (name: string) => column(orderDefaults, name, ORDER_DEFAULTS_FILE);
  return {
    name: `${d('name_prefix')} ${shortId()}`,
    country: d('country'),
    city: d('city'),
    card: d('card'),
    month: d('month'),
    year: d('year'),
    ...overrides,
  };
}

export function orderFromRow(row: CsvRow, file: string): OrderDetails {
  return Object.fromEntries(ORDER_FIELDS.map((f) => [f, column(row, f, file)])) as unknown as OrderDetails;
}
