import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'https://api.demoblaze.com';
const PROFILE = __ENV.SCENARIO || 'smoke';
const PEAK_VUS = Number(__ENV.PEAK_VUS || 20);
const PRODUCTS = [1, 2, 3, 8, 10];
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const profiles = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '30s' },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 5 },
      { duration: '15s', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '10s', target: 1 },
      { duration: '10s', target: PEAK_VUS },
      { duration: '30s', target: PEAK_VUS },
      { duration: '10s', target: 1 },
      { duration: '20s', target: 1 },
    ],
    gracefulRampDown: '10s',
  },
};

if (!profiles[PROFILE]) fail(`Unknown SCENARIO "${PROFILE}". Use one of: ${Object.keys(profiles).join(', ')}`);

const checkoutDuration = new Trend('checkout_duration', true);
const businessErrors = new Rate('business_errors');
const ordersPlaced = new Counter('orders_placed');

export const options = {
  scenarios: { [PROFILE]: profiles[PROFILE] },
  setupTimeout: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{name:login}': ['p(95)<1500'],
    'http_req_duration{name:addtocart}': ['p(95)<1500'],
    'http_req_duration{name:viewcart}': ['p(95)<1500'],
    'http_req_duration{name:placeorder}': ['p(95)<1500'],
    checks: ['rate>0.99'],
    business_errors: ['rate<0.01'],
    checkout_duration: ['p(95)<6000'],
  },
};

function post(name, path, body) {
  const res = http.post(`${API_URL}${path}`, JSON.stringify(body), { headers: JSON_HEADERS, tags: { name } });
  const isBusinessError = res.status === 200 && typeof res.body === 'string' && res.body.includes('errorMessage');
  businessErrors.add(isBusinessError, { name });
  return res;
}

function uuid() {
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

function cartItems(token) {
  const res = post('viewcart', '/viewcart', { cookie: token, flag: true });
  check(res, { 'viewcart: status 200': (r) => r.status === 200 });
  return res.status === 200 ? res.json('Items') || [] : [];
}

export function setup() {
  const users = [];
  const count = PROFILE === 'smoke' ? 1 : PEAK_VUS;
  const runId = Date.now();
  for (let i = 0; i < count; i++) {
    const user = { username: `qa_k6_${runId}_${i}`, password: `Pw!${runId}${i}` };
    const res = http.post(
      `${API_URL}/signup`,
      JSON.stringify({ username: user.username, password: encoding.b64encode(user.password) }),
      { headers: JSON_HEADERS, tags: { name: 'setup_signup' } },
    );
    if (res.status !== 200 || res.body.includes('errorMessage'))
      fail(`signup failed for ${user.username}: ${res.body}`);
    users.push(user);
  }
  return { users };
}

export default function ({ users }) {
  const user = users[(exec.vu.idInTest - 1) % users.length];
  const productId = PRODUCTS[exec.scenario.iterationInTest % PRODUCTS.length];
  const lineId = uuid();
  const start = Date.now();
  let token;

  group('01 login', () => {
    const res = post('login', '/login', { username: user.username, password: encoding.b64encode(user.password) });
    const body = res.status === 200 ? res.json() : null;
    check(body, { 'login: returns Auth_token': (b) => typeof b === 'string' && b.startsWith('Auth_token: ') });
    if (typeof body === 'string') token = body.replace('Auth_token: ', '').trim();
  });
  if (!token) return;

  group('02 add to cart', () => {
    const res = post('addtocart', '/addtocart', { id: lineId, cookie: token, prod_id: productId, flag: true });
    check(res, { 'addtocart: status 200 with empty body': (r) => r.status === 200 && r.body === '' });
  });

  group('03 verify cart', () => {
    check(cartItems(token), {
      'viewcart: contains the added line': (items) => items.some((i) => i.id === lineId && i.prod_id === productId),
    });
  });

  group('04 place order', () => {
    const res = post('placeorder', '/deletecart', { cookie: user.username });
    const ok = check(res, { 'placeorder: status 200': (r) => r.status === 200 });
    if (ok) ordersPlaced.add(1);
  });

  group('05 verify cart emptied', () => {
    let items = cartItems(token);
    for (let attempt = 0; attempt < 3 && items.length > 0; attempt++) {
      sleep(0.5);
      items = cartItems(token);
    }
    check(items, { 'order: cart is empty afterwards': (i) => i.length === 0 });
  });

  checkoutDuration.add(Date.now() - start);
  sleep(1);
}
