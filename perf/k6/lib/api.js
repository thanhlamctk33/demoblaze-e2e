import http from 'k6/http';
import encoding from 'k6/encoding';
import { Rate } from 'k6/metrics';
import { API_URL } from './config.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const AUTH_TOKEN_PREFIX = 'Auth_token: ';

export const businessErrors = new Rate('business_errors');

function send(name, method, path, body) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const res = http.request(method, `${API_URL}${path}`, payload, { headers: JSON_HEADERS, tags: { name } });
  const isBusinessError = res.status === 200 && typeof res.body === 'string' && res.body.includes('errorMessage');
  businessErrors.add(isBusinessError, { name });
  return res;
}

const credentials = (username, password) => ({ username, password: encoding.b64encode(password) });

export function entries() {
  return send('entries', 'GET', '/entries');
}

export function view(productId) {
  return send('view', 'POST', '/view', { id: String(productId) });
}

export function signup(username, password) {
  return send('signup', 'POST', '/signup', credentials(username, password));
}

export function login(username, password) {
  const res = send('login', 'POST', '/login', credentials(username, password));
  const body = res.status === 200 ? res.json() : null;
  const token =
    typeof body === 'string' && body.startsWith(AUTH_TOKEN_PREFIX) ? body.slice(AUTH_TOKEN_PREFIX.length).trim() : null;
  return { res, token };
}

export function addToCart(token, productId, lineId) {
  return send('addtocart', 'POST', '/addtocart', { id: lineId, cookie: token, prod_id: productId, flag: true });
}

export function viewCart(token) {
  const res = send('viewcart', 'POST', '/viewcart', { cookie: token, flag: true });
  return { res, items: res.status === 200 ? res.json('Items') || [] : [] };
}

export function placeOrder(username) {
  return send('placeorder', 'POST', '/deletecart', { cookie: username });
}
