const environments = JSON.parse(open(import.meta.resolve('../../../src/config/environments.json')));
const envName = __ENV.TEST_ENV || 'prod';
if (!environments[envName]) {
  throw new Error(`Unknown TEST_ENV "${envName}". Known environments: ${Object.keys(environments).join(', ')}`);
}

export const API_URL = __ENV.API_URL || environments[envName].apiURL;

function readCsvColumn(file, column) {
  const [header, ...rows] = open(import.meta.resolve(file))
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  const index = header.split(',').indexOf(column);
  if (index === -1) throw new Error(`${file} has no "${column}" column`);
  return rows.map((row) => row.split(',')[index]);
}

export const PRODUCT_IDS = readCsvColumn('../../../test-data/products.csv', 'id').map(Number);

export const BASE_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<2000'],
  business_errors: ['rate<0.01'],
};
