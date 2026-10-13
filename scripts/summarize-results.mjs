#!/usr/bin/env node
/**
 * Turns Playwright's JSON report into a short Markdown run summary:
 *   - pass / fail / flaky / skipped counts per project
 *   - failures grouped by error signature (one root cause -> one group)
 *   - flaky tests (passed only after a retry) — the input for flaky-test reduction
 *   - optional AI triage: if ANTHROPIC_API_KEY is set, failures are sent to an
 *     LLM that classifies each group as product bug / test bug / environment
 *     and suggests a next step. Without a key the script is fully offline.
 *
 * Output goes to stdout, reports/summary.md and (in GitHub Actions) the job summary.
 *
 * Usage: node scripts/summarize-results.mjs [path/to/results.json]
 */
import fs from 'node:fs';
import path from 'node:path';

const reportPath = process.argv[2] ?? 'reports/json/results.json';
if (!fs.existsSync(reportPath)) {
  console.error(`No JSON report at ${reportPath} — run the tests first.`);
  process.exit(0); // never fail the pipeline because of the summary step
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

/** Flatten nested suites into { title, file, project, status, results } rows. */
function collect(suite, parents = [], out = []) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      out.push({
        title: [...parents, spec.title].filter(Boolean).join(' › '),
        file: spec.file,
        line: spec.line,
        project: t.projectName,
        status: t.status, // expected | unexpected | flaky | skipped
        results: t.results ?? [],
      });
    }
  }
  for (const child of suite.suites ?? []) collect(child, [...parents, child.title], out);
  return out;
}
const tests = (report.suites ?? []).flatMap((s) => collect(s, []));

const stripAnsi = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '');
/** Normalise an error into a stable signature: first line, without volatile numbers/ids. */
const signature = (msg) =>
  stripAnsi(msg)
    .split('\n')
    .find((l) => l.trim())
    ?.replace(/\d+ms/g, 'Nms')
    .replace(/qa_auto_\w+/g, '<user>')
    .trim()
    .slice(0, 160) ?? 'Unknown error';

const byProject = {};
for (const t of tests) {
  byProject[t.project] ??= { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  const key = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' }[t.status] ?? 'failed';
  byProject[t.project][key]++;
}

const failures = tests.filter((t) => t.status === 'unexpected');
const flaky = tests.filter((t) => t.status === 'flaky');

const groups = new Map();
for (const f of failures) {
  const last = f.results.at(-1);
  const sig = signature(last?.error?.message ?? last?.errors?.[0]?.message);
  if (!groups.has(sig)) groups.set(sig, []);
  groups.get(sig).push(f);
}

let md = `## 🧪 Test run summary\n\n`;
md += `| Project | ✅ Passed | ❌ Failed | ⚠️ Flaky | ⏭️ Skipped |\n|---|---:|---:|---:|---:|\n`;
for (const [project, c] of Object.entries(byProject).sort()) {
  md += `| ${project} | ${c.passed} | ${c.failed} | ${c.flaky} | ${c.skipped} |\n`;
}

if (groups.size) {
  md += `\n### ❌ Failures grouped by root-cause signature\n`;
  for (const [sig, items] of groups) {
    md += `\n**${items.length}×** \`${sig.replace(/`/g, "'")}\`\n`;
    for (const t of items.slice(0, 10)) md += `- [${t.project}] ${t.title} (${t.file}:${t.line})\n`;
  }
}

if (flaky.length) {
  md += `\n### ⚠️ Flaky tests (passed only after retry)\n`;
  for (const t of flaky) md += `- [${t.project}] ${t.title} — ${t.results.length} attempts\n`;
  md += `\n> Flaky tests are tracked rather than hidden by retries: fix or quarantine them (tag \`@quarantine\`).\n`;
}

if (!groups.size && !flaky.length) md += `\nAll tests behaved as expected. 🎉\n`;

// ------------------------------------------------------------ AI triage ---
async function aiTriage() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !groups.size) return '';
  const payload = [...groups].map(([sig, items]) => ({
    signature: sig,
    count: items.length,
    tests: items.slice(0, 5).map((t) => `[${t.project}] ${t.title}`),
    detail: stripAnsi(items[0].results.at(-1)?.error?.message ?? '').slice(0, 1500),
  }));
  const prompt =
    'You are a senior QA engineer triaging Playwright failures for the DemoBlaze demo shop. ' +
    'For each failure group, classify it as PRODUCT_BUG, TEST_BUG, or ENVIRONMENT (network/latency/site down), ' +
    'give a one-sentence likely root cause and one concrete next step. Reply in concise Markdown bullets.\n\n' +
    JSON.stringify(payload, null, 2);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_TRIAGE_MODEL ?? 'claude-sonnet-5-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return `\n### 🤖 AI triage\n_Skipped: API returned ${res.status}._\n`;
    const data = await res.json();
    const text = (data.content ?? []).map((c) => c.text ?? '').join('\n');
    return `\n### 🤖 AI triage (suggestions — verify before acting)\n${text}\n`;
  } catch (e) {
    return `\n### 🤖 AI triage\n_Skipped: ${e.message}_\n`;
  }
}

md += await aiTriage();

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(path.join('reports', 'summary.md'), md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
console.log(md);
