# DemoBlaze E2E Automation

End-to-end test framework for [DemoBlaze](https://www.demoblaze.com), built with **Playwright + TypeScript**.
It covers the **Login** and **Cart / Place Order** features with UI, API, regression and performance tests.

| Deliverable | Where                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Test cases  | [`test-cases/`](test-cases/README.md) — 96 cases as CSV (72 functional, 24 non-functional), plus a defect list |
| Framework   | this repository                                                                                                |
| Demo script | [`tests/ui/checkout.spec.ts`](tests/ui/checkout.spec.ts) → `[TC-ORDER-001]`                                    |
| CI/CD       | AWS CodePipeline + CodeBuild, GitHub Actions                                                                   |

---

## 1. Run the demo

Requirements: **Node.js 20+**

```bash
npm ci                          # install dependencies
npx playwright install          # install browsers (once)
npm run test:demo               # log in → add to cart → place order
npm run report                  # open the HTML report
```

No account is needed: each run creates its own test user through the API.

## 2. Useful commands

| Command                              | What it runs                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `npm test`                           | everything (API, 3 browsers, 2 mobile devices, perf)               |
| `npm run test:smoke`                 | quick check: critical tests on API + Chrome                        |
| `npm run test:regression`            | full regression on API + Chrome, Firefox, Safari                   |
| `npm run test:cross-browser`         | all UI tests on Chrome, Firefox, Safari                            |
| `npm run test:mobile`                | smoke tests on Pixel 7 and iPhone 14                               |
| `npm run test:api`                   | API tests only                                                     |
| `npm run test:contract`              | JSON schema contract tests for `/login`, `/addtocart`, `/viewcart` |
| `npm run test:concurrency`           | parallel requests, replays, double-click and multi-tab tests       |
| `npm run test:perf`                  | page-load and API response-time budgets only                       |
| `npm run test:headed`                | watch the browser while tests run                                  |
| `npm run report`                     | Playwright HTML report                                             |
| `npm run report:allure`              | Allure report                                                      |
| `npm run perf:smoke`                 | k6 checkout flow, 1 user for 30 s (needs k6)                       |
| `npm run perf:load`                  | k6 checkout flow, ramp to 5 users and hold 1 min                   |
| `npm run perf:spike`                 | k6 checkout flow, jump from 1 to 20 users in 10 s (`PEAK_VUS`)     |
| `npm run perf:rps`                   | k6 throughput test: holds 10 requests per second (`TARGET_RPS`)    |
| `npm run perf:stress`                | k6 throughput test: target rate, then `STRESS_RPS` (default 2×)    |
| `npm run lint` / `npm run typecheck` | code quality checks                                                |

Run one test case: `npx playwright test --grep TC-ORDER-001`

---

## 3. Framework structure

```
demoblaze-e2e/
├── tests/                  WHAT is tested
│   ├── ui/                 login, cart, checkout, double-click / multi-tab
│   ├── api/                auth, cart, JSON schema contract, concurrency
│   └── perf/               page-load and API response-time budgets
│
├── src/                    HOW it is tested (reusable code)
│   ├── pages/              Page Objects: HomePage, ProductPage, CartPage
│   │   └── components/     NavBar and modals (Login, Sign up, Place Order, Receipt)
│   ├── api/                DemoblazeApi client + JSON schemas
│   ├── fixtures/           ready-made test helpers (logged-in page, test user, cart setup)
│   ├── data/               reads test data, generates unique users and orders
│   ├── config/             environments, timeouts, budgets (.env)
│   ├── reporters/          clears old Allure results before each run
│   └── utils/              alerts, prices, network tracking
│
├── test-cases/             test case documentation (CSV)
│   ├── functional/         login, cart, place order, API
│   └── non-functional/     performance, concurrency, security, compatibility
├── test-data/              test data (CSV)
│   ├── common/             products (shared with k6)
│   ├── functional/         logins, valid / invalid orders
│   └── non-functional/     security payloads, k6 load and throughput profiles
├── perf/k6/                k6: checkout-flow.js (users: smoke / load / spike), throughput.js (requests per second)
│
├── ci-cd/                  everything for pipelines
│   ├── scripts/            shared Linux scripts: install.sh, run-tests.sh, run-load.sh
│   ├── aws/                CodePipeline + CodeBuild (CloudFormation, buildspecs)
│   ├── github-actions/     notes (the workflow itself is in .github/workflows/)
│   ├── gitlab/             GitLab CI
│   └── jenkins/            Jenkinsfile
├── .github/workflows/      GitHub Actions workflow (GitHub requires this location)
└── playwright.config.ts    browsers, devices, retries, reporters
```

**How a test flows:**

```
test (tests/)  →  fixture (src/fixtures)  →  Page Object / API client (src/pages, src/api)  →  DemoBlaze
                        ↑
               test data (test-data/**/*.csv)
```

## 4. Design choices

1. **Page Object Model** — selectors live in `src/pages`, so a UI change is fixed in one place. Tests only describe what should happen.
2. **Fixtures** — tests ask for what they need instead of building it. Example: `cartWith(Products.nexus6)` adds the product through the API and opens the cart page in one line.
3. **API for setup, UI for the behaviour under test** — creating users or filling the cart goes through the API: faster and more stable.
4. **Data-driven** — inputs come from CSV files in `test-data/` (functional inputs, security payloads, k6 load and throughput profiles). Adding a row adds a test or a load step, no code needed.
5. **Random realistic data** — usernames and passwords are generated with [Faker](https://fakerjs.dev). Each test records its seed in the report; rerun with `FAKER_SEED=<seed>` to get the same data.
6. **Isolated runs** — every parallel worker gets its own user, so tests never share a cart.
7. **Known bugs are tracked** — site defects are tests tagged `@known-bug`. They pass while the bug exists and fail when it is fixed, as a reminder to update them.
8. **Traceability** — every test title starts with its test case ID, e.g. `[TC-ORDER-001]`.
9. **Tags** — filter what to run: `@smoke`, `@regression`, `@api`, `@perf`, `@contract`, `@concurrency`, `@known-bug`.

## 5. Test types

| Type        | Tool                        | Example                                                                                  |
| ----------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| UI          | Playwright                  | log in, add to cart, place order                                                         |
| API         | Playwright request          | sign up, login, add / view / delete cart lines                                           |
| Contract    | JSON Schema (ajv)           | `/login`, `/addtocart`, `/viewcart` responses                                            |
| Concurrency | Playwright (parallel calls) | 10 parallel adds, double-click on Purchase                                               |
| Performance | Playwright + k6             | page load budget; smoke / load / spike profiles                                          |
| Throughput  | k6 (arrival rate)           | hold N requests per second; pass if ≤ 1% of requests are dropped, errors < 1%, p95 < 2 s |

Current suite: 23 API tests, 42 UI tests per browser, 5 mobile smoke tests, 3 performance tests, plus k6 load and throughput profiles.

**Users vs. requests per second.** `checkout-flow.js` simulates N users: if the site slows down, they send fewer requests, so throughput drops silently. `throughput.js` instead keeps a fixed arrival rate (e.g. 10 req/s) whatever the response time; if the system cannot keep up, k6 drops requests and the test fails. Raise `TARGET_RPS` / `STRESS_RPS` only against an environment you own.

## 6. Configuration

Copy `.env.example` to `.env` to change settings (all optional):

| Setting                          | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `TEST_ENV`                       | environment from `src/config/environments.json` |
| `BASE_URL`, `API_URL`            | override the site / API address                 |
| `TEST_USERNAME`, `TEST_PASSWORD` | use your own account instead of a generated one |
| `HEADLESS=false`                 | show the browser                                |
| `FAKER_SEED`                     | replay the random data of a failed test         |
| `*_TIMEOUT`, `PERF_*`            | timeouts and performance budgets                |

## 7. Reports

After a run, `reports/` contains:

- **HTML** (`npm run report`) — steps, screenshots, video and trace for failed tests
- **Allure** (`npm run report:allure`)
- **Summary** (`reports/summary.md`) — results per browser, failures grouped by cause, flaky tests
- **Failed-test evidence** (`reports/test-results/`) — trace, screenshot and video of each failed test; open a trace with `npx playwright show-trace <trace.zip>`
- **k6** (`reports/k6/`) — load and throughput summaries

## 8. CI/CD

All pipeline files are in [`ci-cd/`](ci-cd/README.md). Every platform calls the same scripts in `ci-cd/scripts/`, so the pipelines stay identical:

```
install.sh  →  run-tests.sh (quality, then api / chromium / firefox / webkit / mobile / perf in parallel)  →  reports
                                                              nightly: run-load.sh (k6)
```

| Platform       | File                                                   |
| -------------- | ------------------------------------------------------ |
| AWS            | `ci-cd/aws/pipeline.yml` (CloudFormation) + buildspecs |
| GitHub Actions | `.github/workflows/ci-cd.yml`                          |
| GitLab CI      | `ci-cd/gitlab/gitlab-ci.yml`                           |
| Jenkins        | `ci-cd/jenkins/Jenkinsfile`                            |

Setup steps for each platform are in [`ci-cd/README.md`](ci-cd/README.md). The same scripts work locally:

```bash
TARGET=chromium GREP=@smoke bash ci-cd/scripts/run-tests.sh
```

## 9. Add a new test

1. Add the case to the right CSV in `test-cases/functional/` or `test-cases/non-functional/` and give it an ID.
2. If it is only new input data, add a row to a CSV in `test-data/` — done.
3. Otherwise write the test, starting the title with the ID:

```ts
import { test, expect } from '../../src/fixtures';
import { Products } from '../../src/data/catalog';

test('[TC-CART-0XX] my new scenario', { tag: '@regression' }, async ({ cartWith }) => {
  const cart = await cartWith(Products.nexus6);
  await cart.deleteLine(Products.nexus6.name, 0);
  expect(await cart.getTotal()).toBeNull();
});
```

4. Put new selectors in a Page Object, not in the test.
5. Run `npm run lint && npm run typecheck` before pushing.

## 10. Applying this to a payment system

[`test-cases/payment-gateway-strategy.csv`](test-cases/payment-gateway-strategy.csv) lists 62 scenarios for a high-traffic payment gateway in 9 areas: payment & idempotency, concurrency, Redis, message queues, database, AWS, partner APIs, security and performance. Each scenario names the DemoBlaze test that already proves the same technique, where one exists.

DemoBlaze has no real payments, cache or queue, but the suite already tests the failure modes that matter most for a payment system: **money must never be lost, duplicated or wrong under load**.

| Payment risk                          | Already tested on DemoBlaze                                                 | Next step on a real gateway                                          |
| ------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Double charge on retry / double click | TC-CONC-002 (replayed request → 1 line), TC-CONC-007/008 (BUG-08, BUG-09)   | Idempotency-Key replayed 50x in parallel; different payload → 409    |
| Race conditions, lost writes          | TC-CONC-001 (10 parallel writes, none lost), TC-CONC-006 (two tabs)         | Parallel debits on one wallet, capture vs. refund, optimistic locks  |
| Partner API contract changes          | TC-CTR-001…007 (JSON schemas, error format, status codes — BUG-10, BUG-11)  | Pact contracts with partners, event schemas in a schema registry     |
| Slow or failing under peak traffic    | k6 smoke / load / spike with p95, p99, error-rate and business-error limits | TPS-based, soak and stress tests in the pipeline                     |
| Card data exposure, injection         | TC-ORDER-014 (card not masked, BUG-05), TC-LOGIN-011 / TC-LOGIN-019         | PAN scans of DB and logs, IDOR, amount tampering, webhook signatures |

**Latest k6 spike run** (13 Oct 2026, 1 → 20 users, checkout flow):

| Metric                                         | Result          | Limit         |
| ---------------------------------------------- | --------------- | ------------- |
| Orders placed                                  | 301             | —             |
| Response time p95 / p99                        | 557 ms / 999 ms | < 2 s / < 4 s |
| Failed HTTP requests                           | 0.06 % (1/1525) | < 1 %         |
| Business errors (HTTP 200 with `errorMessage`) | 0 %             | < 1 %         |
| Checks passed                                  | 99.90 %         | > 99 %        |

Business errors are counted separately because the DemoBlaze API, like many older partner APIs, reports failures with HTTP 200, so counting failed HTTP requests alone would miss them.

To test a real payment system, the framework would add:

- **Testcontainers** — real Redis, Postgres and Kafka in Docker for each run: distributed locks, cache invalidation, transactions, duplicate messages, dead-letter queues; chaos tests by stopping a container mid-test
- **WireMock** — fake bank / partner APIs: declines, timeouts, 503 and 429 errors, duplicate or out-of-order webhooks
- **LocalStack** — AWS services (SQS, SNS, S3, Secrets Manager) running locally; the same tests run against staging by changing the endpoint in `src/config`
- **Pact** — contract tests with each partner, growing from the JSON schemas in `src/api/schemas.ts`
- **k6 in CI** — smoke on every pull request, load nightly, spike / soak / stress before each release; the limits above fail the pipeline when breached

## 11. Limitations

- DemoBlaze is a shared public site with variable speed; CI retries failed tests twice and reports them as flaky.
- Each run creates real throw-away users (`qa_auto_*`) and demo orders on the site.
