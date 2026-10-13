import { randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../config';
import { b64EncodeUnicode } from '../utils/format';

export interface ProductEntry {
  id: number;
  title: string;
  price: number;
  cat: string;
  desc: string;
  img: string;
}

export interface CartEntry {
  id: string;
  prod_id: number;
  cookie: string;
}

export const AUTH_TOKEN_PREFIX = 'Auth_token: ';

export type AuthResult =
  | { ok: true; token: string; status: number; durationMs: number }
  | { ok: false; error: string; status: number; durationMs: number };

export class DemoblazeApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string = config.apiURL,
  ) {}

  private url(path: string): string {
    return `${this.baseURL}${path}`;
  }

  private async timed<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    return { result, durationMs: Math.round(performance.now() - start) };
  }

  private static async items<T>(res: APIResponse): Promise<T[]> {
    const body = (await res.json()) as { Items?: T[] };
    return body.Items ?? [];
  }

  private static credentials(username: string, password: string) {
    return { username, password: b64EncodeUnicode(password) };
  }

  private static errorOf(body: unknown): string | undefined {
    if (body && typeof body === 'object' && 'errorMessage' in body) {
      return String((body as { errorMessage: unknown }).errorMessage);
    }
    return undefined;
  }

  async signup(username: string, password: string): Promise<{ ok: boolean; error?: string; status: number }> {
    const res = await this.request.post(this.url('/signup'), { data: DemoblazeApi.credentials(username, password) });
    const body = await res.json().catch(() => undefined);
    const error = DemoblazeApi.errorOf(body);
    return { ok: res.ok() && !error, error, status: res.status() };
  }

  loginRaw(username: string, password: string): Promise<APIResponse> {
    return this.request.post(this.url('/login'), { data: DemoblazeApi.credentials(username, password) });
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const { result: res, durationMs } = await this.timed(() => this.loginRaw(username, password));
    const body: unknown = await res.json().catch(() => undefined);
    const status = res.status();
    if (typeof body === 'string' && body.startsWith(AUTH_TOKEN_PREFIX)) {
      return { ok: true, token: body.slice(AUTH_TOKEN_PREFIX.length).trim(), status, durationMs };
    }
    const error = DemoblazeApi.errorOf(body) ?? `Unexpected login response: ${JSON.stringify(body)}`;
    return { ok: false, error, status, durationMs };
  }

  async loginOrFail(username: string, password: string): Promise<string> {
    const result = await this.login(username, password);
    if (!result.ok) throw new Error(`API login failed for "${username}": ${result.error}`);
    return result.token;
  }

  async entries(): Promise<{ response: APIResponse; items: ProductEntry[]; durationMs: number }> {
    const { result: response, durationMs } = await this.timed(() => this.request.get(this.url('/entries')));
    return { response, items: await DemoblazeApi.items<ProductEntry>(response), durationMs };
  }

  async view(productId: number): Promise<ProductEntry> {
    const res = await this.request.post(this.url('/view'), { data: { id: String(productId) } });
    return (await res.json()) as ProductEntry;
  }

  async byCategory(cat: string): Promise<ProductEntry[]> {
    return DemoblazeApi.items<ProductEntry>(await this.request.post(this.url('/bycat'), { data: { cat } }));
  }

  addToCart(token: string, productId: number, lineId: string = randomUUID()): Promise<APIResponse> {
    return this.request.post(this.url('/addtocart'), {
      data: { id: lineId, cookie: token, prod_id: productId, flag: true },
    });
  }

  placeOrder(username: string): Promise<APIResponse> {
    return this.request.post(this.url('/deletecart'), { data: { cookie: username } });
  }

  viewCartRaw(token: string): Promise<APIResponse> {
    return this.request.post(this.url('/viewcart'), { data: { cookie: token, flag: true } });
  }

  async viewCart(token: string): Promise<CartEntry[]> {
    return DemoblazeApi.items<CartEntry>(await this.viewCartRaw(token));
  }

  deleteItem(cartLineId: string): Promise<APIResponse> {
    return this.request.post(this.url('/deleteitem'), { data: { id: cartLineId } });
  }

  async clearCart(token: string): Promise<void> {
    const items = await this.viewCart(token);
    for (const item of items) {
      await this.deleteItem(item.id);
    }
  }
}
