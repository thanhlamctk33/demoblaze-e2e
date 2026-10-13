export function readCsv(file) {
  const [header, ...rows] = open(import.meta.resolve(`../../../test-data/${file}`))
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split(','));
  return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i]])));
}
