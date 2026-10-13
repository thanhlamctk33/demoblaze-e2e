import { check, group, sleep, fail } from 'k6';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';
import { BASE_THRESHOLDS, PRODUCT_IDS } from './lib/config.js';
import { addToCart, login, placeOrder, signup, viewCart } from './lib/api.js';

const PROFILE = __ENV.SCENARIO || 'smoke';
const PEAK_VUS = Number(__ENV.PEAK_VUS || 20);
const ENDPOINT_P95_MS = 1500;
const EMPTY_CART_RETRIES = 3;

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
const ordersPlaced = new Counter('orders_placed');

const endpointThresholds = Object.fromEntries(
  ['login', 'addtocart', 'viewcart', 'placeorder'].map((name) => [
    `http_req_duration{name:${name}}`,
    [`p(95)<${ENDPOINT_P95_MS}`],
  ]),
);

export const options = {
  scenarios: { [PROFILE]: profiles[PROFILE] },
  setupTimeout: '2m',
  thresholds: {
    ...BASE_THRESHOLDS,
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    ...endpointThresholds,
    checks: ['rate>0.99'],
    checkout_duration: ['p(95)<6000'],
  },
};

function uuid() {
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

function checkedCartItems(token) {
  const { res, items } = viewCart(token);
  check(res, { 'viewcart: status 200': (r) => r.status === 200 });
  return items;
}

export function setup() {
  const count = PROFILE === 'smoke' ? 1 : PEAK_VUS;
  const runId = Date.now();
  const users = Array.from({ length: count }, (_, i) => ({
    username: `qa_k6_${runId}_${i}`,
    password: `Pw!${runId}${i}`,
  }));
  for (const user of users) {
    const res = signup(user.username, user.password);
    if (res.status !== 200 || res.body.includes('errorMessage'))
      fail(`signup failed for ${user.username}: ${res.body}`);
  }
  return { users };
}

export default function ({ users }) {
  const user = users[(exec.vu.idInTest - 1) % users.length];
  const productId = PRODUCT_IDS[exec.scenario.iterationInTest % PRODUCT_IDS.length];
  const lineId = uuid();
  const start = Date.now();
  let token;

  group('01 login', () => {
    token = login(user.username, user.password).token;
    check(token, { 'login: returns Auth_token': (t) => !!t });
  });
  if (!token) return;

  group('02 add to cart', () => {
    check(addToCart(token, productId, lineId), {
      'addtocart: status 200 with empty body': (r) => r.status === 200 && r.body === '',
    });
  });

  group('03 verify cart', () => {
    check(checkedCartItems(token), {
      'viewcart: contains the added line': (items) => items.some((i) => i.id === lineId && i.prod_id === productId),
    });
  });

  group('04 place order', () => {
    if (check(placeOrder(user.username), { 'placeorder: status 200': (r) => r.status === 200 })) ordersPlaced.add(1);
  });

  group('05 verify cart emptied', () => {
    let items = checkedCartItems(token);
    for (let attempt = 0; attempt < EMPTY_CART_RETRIES && items.length > 0; attempt++) {
      sleep(0.5);
      items = checkedCartItems(token);
    }
    check(items, { 'order: cart is empty afterwards': (i) => i.length === 0 });
  });

  checkoutDuration.add(Date.now() - start);
  sleep(1);
}
