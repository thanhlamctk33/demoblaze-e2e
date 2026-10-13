const environments = JSON.parse(open(import.meta.resolve('../../../src/config/environments.json')));
const envName = __ENV.TEST_ENV || 'prod';
if (!environments[envName]) {
  throw new Error(`Unknown TEST_ENV "${envName}". Known environments: ${Object.keys(environments).join(', ')}`);
}

export const API_URL = __ENV.API_URL || environments[envName].apiURL;

export const BASE_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<2000'],
  business_errors: ['rate<0.01'],
};
