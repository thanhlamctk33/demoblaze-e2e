import { check, sleep } from 'k6';
import { BASE_THRESHOLDS, PRODUCT_IDS } from './lib/config.js';
import { entries, view } from './lib/api.js';

const VUS = Number(__ENV.VUS || 5);

export const options = {
  stages: [
    { duration: '15s', target: VUS },
    { duration: '30s', target: VUS },
    { duration: '10s', target: 0 },
  ],
  thresholds: BASE_THRESHOLDS,
};

export default function () {
  check(entries(), {
    'entries: status 200': (r) => r.status === 200,
    'entries: has items': (r) => (r.json('Items') || []).length > 0,
  });

  check(view(PRODUCT_IDS[0]), { 'view: status 200': (r) => r.status === 200 });

  sleep(1);
}
