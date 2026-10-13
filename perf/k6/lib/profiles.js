import { readCsv } from './csv.js';

const SECONDS_PER_UNIT = { ms: 0.001, s: 1, m: 60, h: 3600 };

export function profileNames(file) {
  return [...new Set(readCsv(file).map((row) => row.profile))];
}

export function profileStages(file, profile, targetColumn, placeholders = {}) {
  const stages = readCsv(file)
    .filter((row) => row.profile === profile)
    .sort((a, b) => Number(a.step) - Number(b.step))
    .map((row) => ({
      duration: row.duration,
      target: row[targetColumn] in placeholders ? placeholders[row[targetColumn]] : Number(row[targetColumn]),
    }));
  return stages.length > 0 ? stages : null;
}

export function durationSeconds(duration) {
  return [...duration.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)].reduce(
    (total, [, value, unit]) => total + Number(value) * SECONDS_PER_UNIT[unit],
    0,
  );
}

export function plannedArrivals(stages, startRate = 0) {
  let rate = startRate;
  let total = 0;
  for (const stage of stages) {
    total += ((rate + stage.target) / 2) * durationSeconds(stage.duration);
    rate = stage.target;
  }
  return Math.round(total);
}
