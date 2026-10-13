import { readFileSync } from 'node:fs';
import path from 'node:path';

export type CsvRow = Record<string, string>;

const DATA_DIR = path.resolve(__dirname, '../../test-data');

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (src[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function readCsv(file: string): CsvRow[] {
  const [header, ...rows] = parseCsv(readFileSync(path.join(DATA_DIR, file), 'utf8'));
  if (!header) throw new Error(`test-data/${file} is empty`);
  return rows.map((cells, i) => {
    if (cells.length !== header.length) {
      throw new Error(`test-data/${file} line ${i + 2}: expected ${header.length} columns, got ${cells.length}`);
    }
    return Object.fromEntries(header.map((name, j) => [name, cells[j]]));
  });
}

export function column(row: CsvRow, name: string, file: string): string {
  const value = row[name];
  if (value === undefined) throw new Error(`test-data/${file} has no "${name}" column`);
  return value;
}
