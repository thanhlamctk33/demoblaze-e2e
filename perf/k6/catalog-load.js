import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'https://api.demoblaze.com';

export const options = {
  stages: [
    { duration: '15s', target: Number(__ENV.VUS || 5) },
    { duration: '30s', target: Number(__ENV.VUS || 5) },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const entries = http.get(`${API_URL}/entries`);
  check(entries, {
    'entries: status 200': (r) => r.status === 200,
    'entries: has items': (r) => (r.json('Items') || []).length > 0,
  });

  const view = http.post(`${API_URL}/view`, JSON.stringify({ id: '1' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(view, { 'view: status 200': (r) => r.status === 200 });

  sleep(1);
}
