import { column, readCsv } from './csv';
import { orderFromRow, type OrderDetails } from './factories';

export interface LoginValidationCase {
  id: string;
  title: string;
  username: string;
  password: string;
  expectedAlert: string;
}

export type SecurityPayloadCase = LoginValidationCase;

export interface OrderCase {
  id: string;
  title: string;
  order: OrderDetails;
}

export interface AcceptedOrderCase extends OrderCase {
  product: string;
}

export interface RejectedOrderCase extends OrderCase {
  knownBug: string;
}

export function loginValidationCases(file = 'functional/login-validation.csv'): LoginValidationCase[] {
  return readCsv(file).map((row) => ({
    id: column(row, 'tc_id', file),
    title: column(row, 'title', file),
    username: column(row, 'username', file),
    password: column(row, 'password', file),
    expectedAlert: column(row, 'expected_alert', file),
  }));
}

export function securityPayloadCases(file = 'non-functional/security-payloads.csv'): SecurityPayloadCase[] {
  return readCsv(file).map((row) => ({
    id: column(row, 'tc_id', file),
    title: column(row, 'name', file),
    username: column(row, 'username', file),
    password: column(row, 'password', file),
    expectedAlert: column(row, 'expected_alert', file),
  }));
}

export function acceptedOrderCases(file = 'functional/order-accepted.csv'): AcceptedOrderCase[] {
  return readCsv(file).map((row) => ({
    id: column(row, 'tc_id', file),
    title: column(row, 'title', file),
    product: column(row, 'product', file),
    order: orderFromRow(row, file),
  }));
}

export function rejectedOrderCases(file = 'functional/order-rejected.csv'): RejectedOrderCase[] {
  return readCsv(file).map((row) => ({
    id: column(row, 'tc_id', file),
    title: column(row, 'title', file),
    knownBug: column(row, 'known_bug', file),
    order: orderFromRow(row, file),
  }));
}
