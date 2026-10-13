import { randomUUID } from 'node:crypto';

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

export function buildOrder(overrides: Partial<OrderDetails> = {}): OrderDetails {
  return {
    name: `QA Buyer ${shortId()}`,
    country: 'Vietnam',
    city: 'Ho Chi Minh City',
    card: '4111111111111111',
    month: '12',
    year: '2030',
    ...overrides,
  };
}
