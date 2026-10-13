import type { JSONSchemaType } from 'ajv';
import { AUTH_TOKEN_PREFIX, type ProductEntry } from './DemoblazeApi';
import { Categories } from '../data/catalog';

export interface ErrorBody {
  errorMessage: string;
}

export interface CartLineBody {
  cookie: string;
  id: string;
  prod_id: number;
}

export interface ViewCartBody {
  Items: CartLineBody[];
}

export const loginSuccessSchema: JSONSchemaType<string> = {
  type: 'string',
  pattern: `^${AUTH_TOKEN_PREFIX}\\S+$`,
};

export const productSchema: JSONSchemaType<ProductEntry> = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    title: { type: 'string', minLength: 1 },
    price: { type: 'number', exclusiveMinimum: 0 },
    cat: { type: 'string', enum: Object.values(Categories) },
    desc: { type: 'string' },
    img: { type: 'string' },
  },
  required: ['id', 'title', 'price', 'cat', 'desc', 'img'],
};

export const errorSchema: JSONSchemaType<ErrorBody> = {
  type: 'object',
  properties: { errorMessage: { type: 'string', minLength: 1 } },
  required: ['errorMessage'],
  additionalProperties: false,
};

export const cartLineSchema: JSONSchemaType<CartLineBody> = {
  type: 'object',
  properties: {
    cookie: { type: 'string', minLength: 1 },
    id: { type: 'string', minLength: 1 },
    prod_id: { type: 'integer' },
  },
  required: ['cookie', 'id', 'prod_id'],
  additionalProperties: false,
};

export const viewCartSchema: JSONSchemaType<ViewCartBody> = {
  type: 'object',
  properties: { Items: { type: 'array', items: cartLineSchema } },
  required: ['Items'],
};
