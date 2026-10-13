export function parsePrice(text: string | null | undefined): number {
  const match = (text ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!match) throw new Error(`Cannot parse a price from "${text}"`);
  return Number(match[0]);
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function b64EncodeUnicode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}
