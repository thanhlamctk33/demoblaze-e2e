const environments = JSON.parse(open(import.meta.resolve('../../../src/config/environments.json')));
const envName = __ENV.TEST_ENV || 'prod';
if (!environments[envName]) {
  throw new Error(`Unknown TEST_ENV "${envName}". Known environments: ${Object.keys(environments).join(', ')}`);
}

export const API_URL = __ENV.API_URL || environments[envName].apiURL;

function readCsv(file) {
  const [header, ...rows] = open(import.meta.resolve(`../../../test-data/${file}`))
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split(','));
  return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i]])));
}

export const PRODUCT_IDS = readCsv('common/products.csv').map((row) => Number(row.id));

export function loadProfile(name, peakVus) {
  const stages = readCsv('non-functional/load-profiles.csv')
    .filter((row) => row.profile === name)
    .sort((a, b) => Number(a.step) - Number(b.step))
    .map((row) => ({
      duration: row.duration,
      target: row.target_vus === '{{peak}}' ? peakVus : Number(row.target_vus),
    }));
  return stages.length > 0 ? stages : null;
}

export const BASE_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<2000'],
  business_errors: ['rate<0.01'],
};
