import { readCsv } from './csv.js';

export const PRODUCT_IDS = readCsv('common/products.csv').map((row) => Number(row.id));
