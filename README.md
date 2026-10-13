# DemoBlaze E2E Automation Framework

Playwright + TypeScript framework for [DemoBlaze](https://www.demoblaze.com) covering **UI, API, regression and performance** testing of the **Login** and **Cart / Place Order** features, with cross-browser + mobile execution, CI/CD and rich reporting.

| Deliverable                                                      | Location                                                                                                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test case suite (CSV)                                            | [`test-cases/`](test-cases/README.md) — 94 cases in one CSV per module, defect log, plus a 62-case **Payment Gateway strategy**                                                                |
| Framework + demo scripts                                         | this repository                                                                                                                                                                                |
| Demo: _login with valid credentials → add to cart → place order_ | [`tests/ui/checkout.spec.ts`](tests/ui/checkout.spec.ts) → `[TC-ORDER-001]`                                                                                                                    |
| CI/CD                                                            | AWS CodePipeline + CodeBuild ([`buildspec.yml`](buildspec.yml), [`infra/aws/pipeline.yml`](infra/aws/pipeline.yml)), GitHub Actions ([`.github/workflows/e2e.yml`](.github/workflows/e2e.yml)) |

---

## Quick start

Requirements: **Node.js ≥ 20**.

```bash
git clone <this-repo> && cd demoblaze-e2e
npm ci
npx playwright install --with-deps      # browsers (one-time)
cp .env.example .env                    # optional — every value has a default

npm run test:demo                       # the requested demo (TC-LOGIN-001 + TC-ORDER-001) on Chromium
npm run report                          # open the HTML report
```

No account setup is needed: the framework **signs up a fresh, unique user per worker through the API**, so runs are isolated and safe in parallel on a shared public site. To use your own account instead, set `TEST_USERNAME` / `TEST_PASSWORD` in `.env`.

### Common commands

| Command                                                 | What it runs                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm test`                                              | everything: API, 3 desktop browsers, 2 mobile devices (smoke), then perf |
| `npm run test:demo`                                     | the demo scenarios only (Chromium)                                       |
| `npm run test:smoke`                                    | `@smoke` on API + Chromium — fast PR gate                                |
| `npm run test:regression`                               | `@regression` on API + Chromium/Firefox/WebKit                           |
| `npm run test:cross-browser`                            | full UI suite on Chromium, Firefox, WebKit                               |
| `npm run test:mobile`                                   | smoke on Pixel 7 + iPhone 14 emulation                                   |
| `npm run test:api` / `npm run test:perf`                | API tests / performance budgets                                          |
| `npm run test:concurrency`                              | concurrency, idempotency and double-submit tests (API + Chromium)        |
| `npm run test:contract`                                 | JSON Schema contract tests for `/login`, `/addtocart`, `/viewcart`       |
| `npm run test:headed` / `npm run test:ui-mode`          | watch the browser / Playwright UI mode for debugging                     |
| `npm run report` / `npm run report:allure`              | Playwright HTML report / Allure report                                   |
| `npm run summary`                                       | Markdown run summary (+ flaky list, optional AI triage)                  |
| `npm run perf:load`                                     | k6 load test of the catalogue API (needs [k6](https://k6.io))            |
| `npm run perf:smoke` · `perf:checkout` · `perf:spike`   | k6 checkout flow (login → cart → order) — smoke / load / spike profiles  |
| `npm run lint` · `npm run typecheck` · `npm run format` | code quality                                                             |

Any Playwright CLI filter works too, e.g. `npx playwright test --grep "TC-CART-00[1-5]" --project=firefox`, or exclude known defects with `--grep-invert @known-bug`.

---

## Framework structure

```
.
├── src/
│   ├── config/            # environments + typed runtime config (env vars > catalogue > defaults)
│   ├── api/               # DemoblazeApi client, JSON schemas (schemas.ts) + ajv validator (contract.ts)
│   ├── pages/             # Page Object Model
│   │   ├── BasePage.ts        # shared navbar + auth modals, open()/waitUntilReady() contract
│   │   ├── HomePage.ts  ProductPage.ts  CartPage.ts
│   │   └── components/        # NavBar, LoginModal, SignUpModal, PlaceOrderModal, OrderConfirmation
│   ├── fixtures/          # custom Playwright fixtures (pages, api, testUser, shopper, authenticatedPage, cartWith)
│   ├── data/              # CSV loader (csv.ts), case loaders (cases.ts), factories, catalogue, expected messages
│   └── utils/             # alert handling, price parsing, encoding, request tracking
├── tests/
│   ├── ui/                # login, cart, checkout, concurrency (double submit, multi-tab)
│   ├── api/               # auth, catalog/cart, contract, concurrency & idempotency
│   └── perf/              # page-load & API latency budgets
├── perf/k6/               # k6: catalogue load + checkout flow (smoke / load / spike); lib/ = shared config + API client
├── scripts/               # summarize-results.mjs (run summary, flaky report, AI triage), ci/codebuild-run.sh
├── test-cases/            # CSV test case suite, one file per module
├── test-data/             # CSV test data: products, order defaults, data-driven login/order cases
├── infra/aws/             # CloudFormation: CodePipeline, CodeBuild, S3 reports, nightly schedule
├── buildspec.yml          # CodeBuild: Playwright batch matrix
├── buildspec-load.yml     # CodeBuild: k6 checkout load
├── .github/workflows/     # GitHub Actions pipeline
└── playwright.config.ts   # projects, reporters, retries, timeouts
```

### Design decisions and rationale

**1. Page Object Model with components.** Pages own _what_ the UI is (locators) and _how_ to do things (`addToCart()`, `purchase()`); specs only describe _what should happen_. Shared widgets (navbar, login/sign-up modals, order modal, receipt) are components composed into `BasePage`, so a selector change is a one-line fix. Locators prefer roles/text and fall back to stable IDs.

**2. Fixtures for dependency injection and isolation.** Specs ask for what they need — `homePage`, `cartPage`, `api`, `testUser`, `shopper`, `authenticatedPage`, `cartWith` — instead of building it:

- `testUser` (worker-scoped) signs up a unique account per parallel worker → no shared cart state, no collisions with other people using the public site.
- `shopper` is that user with a fresh token and an empty cart, emptied again after the test. API and UI cart tests use it instead of repeating `beforeEach`/`afterEach` hooks.
- `authenticatedPage` injects the shopper's session cookie, so the browser is logged in **via the API**. Login is tested once through the UI (`login.spec.ts`); everything else skips it — faster and less flaky.
- `cartWith(...products)` seeds the cart through the API, opens the cart page and checks the line count, returning a ready `CartPage`.

**3. Hybrid API + UI testing.** `DemoblazeApi` serves both as the API test client and as a setup/teardown tool (seed carts, clear carts, create users). UI tests stay focused on the behaviour under test.

**4. Handling the site's quirks deterministically.**

- DemoBlaze reports results through native `alert()` dialogs. `captureAlert()` registers a one-shot listener _before_ the click, accepts immediately (avoiding the click/alert deadlock) and returns the text for assertion.
- The cart renders asynchronously (one `/viewcart` call, then one `/view` per line, total growing as responses arrive). `CartPage` records the backend's line count from the `/viewcart` response, so "empty cart" assertions can't pass before data arrives, and totals are polled until they match the sum of lines.
- No `waitForTimeout` anywhere (enforced by lint): all waits are web-first assertions, `expect.poll` or `toPass`.

**5. Tags + projects instead of separate suites.** One codebase, filtered at run time:
`@smoke`, `@regression`, `@e2e`, `@api`, `@perf`, `@security`, `@hybrid`, `@known-bug`, `@concurrency`, `@idempotency`, `@contract`, plus feature tags `@login`, `@cart`, `@checkout`. Projects add the platform dimension (Chromium, Firefox, WebKit, Pixel 7, iPhone 14). The navbar component expands the mobile hamburger menu automatically, so the same page objects run on desktop and mobile.

**6. Known defects are executable.** Defects found while designing the suite (see [`test-cases/07-defects.csv`](test-cases/07-defects.csv)) are automated as `test.fail()` tests tagged `@known-bug`: they pass while the bug exists and turn red when it is fixed — prompting the team to promote them to normal regression tests instead of forgetting them.

**7. Traceability.** Every automated test title starts with its test case ID, e.g. `[TC-ORDER-001]`, so a failure in a report maps straight to a documented test case and vice-versa (column _Automated In_ in the CSV).

**8. Data-driven tests from CSV.** Test data lives in [`test-data/`](test-data/README.md), not in specs: the product catalogue, default order details, and one row per data-driven case (login validation, accepted and rejected orders). Each row becomes its own test titled with its TC ID, and a `known_bug` value turns the row into a `test.fail()` `@known-bug` case. A QA can add a scenario by adding a row, without touching TypeScript. Data that must be unique per run (usernames, passwords, buyer names) is still generated by `src/data/factories.ts`, so runs never collide on the shared site.

**9. Configuration over code.** `src/config` merges `TEST_ENV` (environment catalogue), explicit overrides (`BASE_URL`, `API_URL`), credentials, timeouts and performance budgets from env vars / `.env`. Environments live in `src/config/environments.json`, shared by Playwright and k6 (`perf/k6/lib/config.js`, which also reads product IDs from `test-data/products.csv`); adding an environment is one JSON entry.

### Test types supported

| Type             | How                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| UI / E2E         | `tests/ui`, page objects, all browser + device projects                                                                  |
| API              | `tests/api`, Playwright `request` + `DemoblazeApi`, contract checks                                                      |
| Regression       | `@regression` tag across browsers; nightly CI schedule                                                                   |
| Performance      | `tests/perf`: Navigation Timing + API latency budgets (configurable, metrics attached to the report); `perf/k6` for load |
| Concurrency      | `@concurrency` / `@idempotency`: parallel writes, request replay, double submit, multi-tab (`tests/*/concurrency*`)      |
| Contract         | `@contract`: ajv JSON Schema validation of response bodies, content types and error shapes (`tests/api/contract`)        |
| Security (basic) | injection-style input, password masking, card masking (`@security`, `@known-bug`)                                        |

---

## Reporting

Every run produces, under `reports/`:

- **HTML** (`reports/html`) — steps, screenshots, video and trace on failure (`npm run report`)
- **JSON** (`reports/json/results.json`) — machine-readable, consumed by the summary script
- **Allure results** (`reports/allure-results`) — `npm run report:allure`
- **Run summary** (`reports/summary.md`) — counts per project, failures grouped by root-cause signature, **flaky tests** (passed only on retry)

Traces (`trace: retain-on-failure`) can be opened with `npx playwright show-trace <zip>` for time-travel debugging.

### AI-assisted triage (optional)

`scripts/summarize-results.mjs` groups failures by normalised error signature. If `ANTHROPIC_API_KEY` is set (locally or as a CI secret), it sends the grouped failures to an LLM, which classifies each group as **product bug / test bug / environment** and suggests a next step; the result is appended to the summary and the GitHub job summary. Without a key it runs fully offline.

---

## CI/CD

**GitHub Actions** (`.github/workflows/e2e.yml`) runs on push to `main`, pull requests, nightly at 01:00 UTC, and manually (with `grep` and `test_env` inputs):

```
quality (lint, typecheck, prettier)
   ├── api tests
   ├── ui matrix: chromium · firefox · webkit · mobile-chrome · mobile-safari  (parallel, fail-fast off)
   ├── perf budgets
   └── k6 checkout load  (nightly + manual only; profile: smoke | load | spike)
        └── report: merges all blob reports → single HTML + JSON, job summary, artifact
              └── (optional) publish HTML report to GitHub Pages
```

- Browsers are cached per engine; `retries: 2` and `workers: 2` in CI.
- Optional secrets: `TEST_USERNAME`, `TEST_PASSWORD`, `ANTHROPIC_API_KEY`.
- The `load` job runs `perf/k6/checkout-flow.js` nightly (smoke) or on demand with the `k6_scenario` input, and uploads the k6 summary as an artifact.
- To publish the report to GitHub Pages: enable Pages (source: _GitHub Actions_) and set the repository variable `PUBLISH_REPORT=true`.

### AWS (CodePipeline + CodeBuild)

[`infra/aws/pipeline.yml`](infra/aws/pipeline.yml) is a CloudFormation stack that creates everything needed to run the suite on AWS:

```
GitHub ──(CodeConnections)──► <project>-commit pipeline   (push / pull request to main)
                                 └── CodeBuild batch (buildspec.yml), one build per target, in parallel:
                                     quality · api · chromium · firefox · webkit · mobile_chrome · mobile_safari · perf

EventBridge cron(0 1 * * ? *) ──► <project>-nightly pipeline
                                 ├── same CodeBuild batch
                                 └── k6 checkout load (buildspec-load.yml, SCENARIO = smoke | load | spike)

S3 bucket (encrypted, private, 30-day expiry) ◄── HTML / JSON / Allure reports, traces, k6 summaries
CloudWatch Logs ◄── build logs
```

- E2E builds run in the official Playwright image (`mcr.microsoft.com/playwright:v1.64.0-noble`), so browsers and OS dependencies are preinstalled. Keep the tag in sync with `@playwright/test`.
- [`scripts/ci/codebuild-run.sh`](scripts/ci/codebuild-run.sh) maps the batch `TARGET` to a Playwright project (`quality` runs lint, typecheck and Prettier).
- Pipeline variables: `GREP` (tag or TC ID, `all` = everything), `TEST_ENV`, and on the nightly pipeline `K6_SCENARIO`. Set them when starting a run manually.

Deploy (once per AWS account):

```bash
aws cloudformation deploy \
  --stack-name demoblaze-e2e-ci \
  --template-file infra/aws/pipeline.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides GitHubRepository=<owner>/demoblaze-e2e
```

Then, once: AWS console > Developer Tools > Settings > Connections > `demoblaze-e2e-github` > **Update pending connection** and authorise GitHub. Pushes to `main` now start the commit pipeline. Run on demand:

```bash
aws codepipeline start-pipeline-execution --name demoblaze-e2e-commit --variables name=GREP,value=@smoke
```

Reports: open the build in CodeBuild for logs, and download the `E2EReports` artifact from the S3 bucket in the stack output `ReportBucket` (`reports/html/index.html`).

---

## Applying the framework to a high-traffic payment system

DemoBlaze has no real payments, cache or queue, but the suite already tests the failure modes that matter most for a payment gateway: **money must never be lost, duplicated or wrong under load**. [`test-cases/06-payment-gateway-strategy.csv`](test-cases/06-payment-gateway-strategy.csv) lists 62 scenarios for idempotency, concurrency, Redis, message queues, the database, AWS, partner APIs, security and performance, each linked to the DemoBlaze test that proves the technique where one exists.

| Risk on a payment gateway             | Proven here on DemoBlaze                                                      | Extension for the real system                                           |
| ------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Double charge on retry / double click | TC-CONC-002 (replay → 1 line), TC-CONC-007/008 (double submit, BUG-08/09)     | Idempotency-Key replay at 50x parallel, conflicting payload → 409       |
| Race conditions / lost writes         | TC-CONC-001 (10 parallel writes, none lost), TC-CONC-006 (two tabs)           | Concurrent debits on one wallet, capture vs refund, optimistic locking  |
| Contract drift with partners          | TC-CTR-001…007 (ajv schemas, error shape, HTTP status — BUG-10/11)            | Pact consumer-driven contracts, event schemas in a schema registry      |
| Latency / errors at peak              | `perf/k6/checkout-flow.js` smoke / load / spike with p95, p99 and error gates | TPS-based scenarios, soak and stress, distributed k6 in the pipeline    |
| Data exposure                         | TC-ORDER-014 (card number not masked), TC-LOGIN-011 (injection)               | PAN scans of DB / logs, IDOR, amount tampering, webhook signatures, ZAP |

### Latest k6 spike run (13 Oct 2026, 1 → 20 VUs)

| Metric                                        | Result                   | Threshold     |
| --------------------------------------------- | ------------------------ | ------------- |
| Orders placed                                 | 301                      | —             |
| `http_req_duration` p95 / p99                 | 557 ms / 999 ms          | < 2 s / < 4 s |
| Per step p95 (login, add, view, order)        | 570 / 690 / 524 / 475 ms | < 1.5 s       |
| `http_req_failed`                             | 0.06 % (1 / 1525)        | < 1 %         |
| `business_errors` (HTTP 200 + `errorMessage`) | 0 %                      | < 1 %         |
| Checks                                        | 99.90 %                  | > 99 %        |

`business_errors` exists because the DemoBlaze API (like many legacy partner APIs) reports failures as HTTP 200, so `http_req_failed` alone would hide them.

### How the framework would be extended

**1. Hermetic integration tests with Testcontainers (Redis, Postgres, Kafka).** A worker-scoped fixture starts real dependencies in Docker, so tests for locks, cache invalidation, transactions, outbox and at-least-once delivery run identically on a laptop and in CI:

```ts
import { RedisContainer } from '@testcontainers/redis';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { KafkaContainer } from '@testcontainers/kafka';

export const test = base.extend<{}, { infra: Infra }>({
  infra: [
    async ({}, use) => {
      const [redis, db, kafka] = await Promise.all([
        new RedisContainer('redis:7').start(),
        new PostgreSqlContainer('postgres:16').start(),
        new KafkaContainer('confluentinc/cp-kafka:7.6.0').start(),
      ]);
      await use({ redisUrl: redis.getConnectionUrl(), dbUrl: db.getConnectionUri(), kafka });
      await Promise.all([redis.stop(), db.stop(), kafka.stop()]);
    },
    { scope: 'worker' },
  ],
});
```

Chaos cases (Redis down, consumer killed mid-message, broker unavailable during publish) become `container.stop()` / Toxiproxy latency inside a test.

**2. Partner simulation with WireMock.** Acquirer, bank and 3-D Secure endpoints are stubbed per test: success, decline, 503, 429 + `Retry-After`, 35 s delay, duplicate or out-of-order webhooks. This makes retry, backoff, circuit-breaker and "acquirer timed out after debiting" scenarios deterministic, which a partner sandbox never is.

**3. AWS with LocalStack.** SQS (visibility timeout, DLQ redrive), SNS, S3 settlement files, Secrets Manager and KMS run locally; the same tests point at a real staging account by switching `AWS_ENDPOINT_URL` in `src/config`. Infrastructure-level checks (Auto Scaling, Multi-AZ failover) run in staging with k6 plus AWS Fault Injection Service.

**4. Contracts.** The ajv schemas in `src/api/schemas.ts` grow into Pact consumer-driven contracts with each partner and schema-registry compatibility checks for events, so a breaking change fails CI before deployment.

**5. k6 in the pipeline.** Thresholds are already quality gates (k6 exits non-zero on breach). The rollout is: smoke profile on every PR, load profile nightly, spike / soak / stress before each release, with metrics streamed to Prometheus/Grafana for trend comparison and distributed runs via the k6 operator for real TPS targets.

**6. Security in CI.** OWASP ZAP baseline scan, secret scanning, and automated checks that no PAN or CVV appears in DB rows, logs or API responses — the same idea as TC-ORDER-014, applied to every surface.

Proposed additions to the layout:

```
src/infra/           # Testcontainers + LocalStack fixtures, Toxiproxy helpers
src/mocks/           # WireMock stub mappings per partner
tests/integration/   # redis/, mq/, db/, aws/ — hermetic tests on real dependencies
tests/contract/      # Pact consumer tests + event schema checks
perf/k6/scenarios/   # TPS-based payment, refund, webhook and soak profiles
```

---

## Writing a new test

```ts
import { test, expect } from '../../src/fixtures';
import { Products } from '../../src/data/catalog';

test('[TC-CART-0XX] my scenario', { tag: '@regression' }, async ({ cartWith }) => {
  const cart = await cartWith(Products.nexus6);
  await cart.deleteLine(Products.nexus6.name, 0);
  expect(await cart.getTotal()).toBeNull();
});
```

1. Add the case to the matching CSV in `test-cases/` and reuse its ID in the title. If it is a new data variation of an existing case (another invalid input, another product), add a row to the CSV in `test-data/` instead of writing a test.
2. Put new selectors/actions in a page object, not in the spec.
3. Tag it (`@smoke` only for critical-path tests — they also run on mobile).
4. `npm run lint && npm run typecheck` before pushing.

---

## Known limitations

- DemoBlaze is a shared public demo with variable latency; CI retries absorb transient slowness, and the summary lists any test that needed a retry so it can be fixed rather than hidden.
- The site creates real data: each run registers throw-away users (`qa_auto_*`) and places demo orders.
- Performance budgets are deliberately generous for a public site; tighten them per environment through `PERF_*` variables.
