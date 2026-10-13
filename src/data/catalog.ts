import { column, readCsv } from './csv';

export interface Product {
  id: number;
  name: string;
  category: string;
}

const PRODUCTS_FILE = 'common/products.csv';

const productsByKey: Record<string, Product> = Object.fromEntries(
  readCsv(PRODUCTS_FILE).map((row) => [
    column(row, 'key', PRODUCTS_FILE),
    {
      id: Number(column(row, 'id', PRODUCTS_FILE)),
      name: column(row, 'name', PRODUCTS_FILE),
      category: column(row, 'category', PRODUCTS_FILE),
    },
  ]),
);

export const Products: Record<string, Product> = new Proxy(productsByKey, {
  get(target, key) {
    if (typeof key !== 'string') return Reflect.get(target, key);
    if (!(key in target)) {
      throw new Error(`Unknown product "${String(key)}" — add it to test-data/${PRODUCTS_FILE}`);
    }
    return target[key];
  },
});

export const Categories = {
  Phones: 'phone',
  Laptops: 'notebook',
  Monitors: 'monitor',
} as const;

export const Messages = {
  login: {
    wrongPassword: 'Wrong password.',
    userNotFound: 'User does not exist.',
  },
  signup: {
    success: 'Sign up successful.',
    userExists: 'This user already exist.',
  },
  cart: {
    productAdded: /^Product added\.?$/,
  },
  api: {
    tokenMalformed: 'Bad parameter, token malformed.',
  },
  order: {
    missingFields: 'Please fill out Name and Creditcard.',
    success: 'Thank you for your purchase!',
  },
} as const;
