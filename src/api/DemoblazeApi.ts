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

  private static errorOf(body: unknown): string | undefined {
    if (body && typeof body === 'object' && 'errorMessage' in body) {
      return String((body as { errorMessage: unknown }).errorMessage);
    }
    return undefined;
  }

  async signup(username: string, password: string): Promise<{ ok: boolean; error?: string; status: number }> {
    const res = await this.request.post(this.url('/signup'), {
      data: { username, password: b64EncodeUnicode(password) },
    });
    const body = await res.json().catch(() => undefined);
    const error = DemoblazeApi.errorOf(body);
    return { ok: res.ok() && !error, error, status: res.status() };
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const { result: res, durationMs } = await this.timed(() =>
      this.request.post(this.url('/login'), {
        data: { username, password: b64EncodeUnicode(password) },
      }),
    );
    const body: unknown = await res.json().catch(() => undefined);
    const error = DemoblazeApi.errorOf(body);
    if (typeof body === 'string' && body.startsWith('Auth_token: ')) {
      return { ok: true, token: body.replace('Auth_token: ', '').trim(), status: res.status(), durationMs };
    }
    return {
      ok: false,
      error: error ?? `Unexpected login response: ${JSON.stringify(body)}`,
      status: res.status(),
      durationMs,
    };
  }

  async loginOrFail(username: string, password: string): Promise<string> {
    const result = await this.login(username, password);
    if (!result.ok) throw new Error(`API login failed for "${username}": ${result.error}`);
    return result.token;
  }

  async entries(): Promise<{ response: APIResponse; items: ProductEntry[]; durationMs: number }> {
    const { result: response, durationMs } = await this.timed(() => this.request.get(this.url('/entries')));
    const body = (await response.json()) as { Items: ProductEntry[] };
    return { response, items: body.Items ?? [], durationMs };
  }

  async view(productId: number): Promise<ProductEntry> {
    const res = await this.request.post(this.url('/view'), { data: { id: String(productId) } });
    return (await res.json()) as ProductEntry;
  }

  async byCategory(cat: string): Promise<ProductEntry[]> {
    const res = await this.request.post(this.url('/bycat'), { data: { cat } });
    const body = (await res.json()) as { Items: ProductEntry[] };
    return body.Items ?? [];
  }

  async addToCart(token: string, productId: number, lineId: string = randomUUID()): Promise<APIResponse> {
    return this.request.post(this.url('/addtocart'), {
      data: { id: lineId, cookie: token, prod_id: productId, flag: true },
    });
  }

  async placeOrder(username: string): Promise<APIResponse> {
    return this.request.post(this.url('/deletecart'), { data: { cookie: username } });
  }

  async viewCart(token: string): Promise<CartEntry[]> {
    const res = await this.request.post(this.url('/viewcart'), { data: { cookie: token, flag: true } });
    const body = (await res.json()) as { Items: CartEntry[] };
    return body.Items ?? [];
  }

  async deleteItem(cartLineId: string): Promise<APIResponse> {
    return this.request.post(this.url('/deleteitem'), { data: { id: cartLineId } });
  }

  async clearCart(token: string): Promise<void> {
    const items = await this.viewCart(token);
    for (const item of items) {
      await this.deleteItem(item.id);
    }
  }
}
