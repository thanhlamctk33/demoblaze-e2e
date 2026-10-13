# Test data

CSV files read by the tests at run time. Adding a row adds a test or a load step, no code change needed.

```
test-data/
├── common/            shared by functional tests and k6
├── functional/        inputs for login and checkout behaviour
└── non-functional/    security payloads and k6 load profiles
```

## common

| File                                  | Used by                              | One row =                                                         |
| ------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| [`products.csv`](common/products.csv) | every spec (`Products.<key>`) and k6 | a product: `key` used in code, DemoBlaze `id`, `name`, `category` |

## functional

| File                                                      | Used by                     | One row =                                                                       |
| --------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| [`login-validation.csv`](functional/login-validation.csv) | `tests/ui/login.spec.ts`    | a login attempt that must be rejected with `expected_alert`                     |
| [`order-defaults.csv`](functional/order-defaults.csv)     | `buildOrder()`              | default Place Order form values; buyer name = `name_prefix` + a unique suffix   |
| [`order-accepted.csv`](functional/order-accepted.csv)     | `tests/ui/checkout.spec.ts` | an order that must succeed; `product` is a key from `common/products.csv`       |
| [`order-rejected.csv`](functional/order-rejected.csv)     | `tests/ui/checkout.spec.ts` | an order that must be blocked; fill `known_bug` while the site still accepts it |

## non-functional

| File                                                            | Used by                    | One row =                                                                                     |
| --------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| [`security-payloads.csv`](non-functional/security-payloads.csv) | `tests/ui/login.spec.ts`   | an injection payload that must be treated as plain text (TC-LOGIN-011)                        |
| [`load-profiles.csv`](non-functional/load-profiles.csv)         | `perf/k6/checkout-flow.js` | one step of a k6 profile: ramp to `target_vus` users over `duration`; `{{peak}}` = `PEAK_VUS` |

Run a k6 profile with `SCENARIO=<profile>`, e.g. `k6 run -e SCENARIO=spike perf/k6/checkout-flow.js`. A new profile name in the CSV is a new load scenario.

## Rules

- `tc_id` must match a case in [`../test-cases/`](../test-cases/README.md); it becomes the start of the test title, e.g. `[TC-ORDER-004]`.
- `{{username}}` and `{{password}}` are replaced by realistic random values generated with [Faker](https://fakerjs.dev) when the test runs; they also work inside a longer value, e.g. `admin'-- {{username}}`.
- An empty cell means an empty input. Every form field is written out in each row, so a row reads as exactly what is typed.
- Quote a value with `"` when it contains a comma, a quote or leading/trailing spaces (write a quote inside a value as `""`).
- `known_bug` (order-rejected.csv): leave empty for a normal `@regression` case. Put the defect ID and summary (e.g. `BUG-04: …`) to run the row as `@known-bug` with `test.fail()`; it passes while the bug exists and fails once the site is fixed, which is the signal to clear the cell.
- A wrong column count fails the run immediately with the file and line number; an unknown product key fails with the key and the file to fix.

## Example: add a rejected order

Add to `functional/order-rejected.csv`:

```csv
TC-ORDER-018,card number is too short,QA Buyer,Vietnam,Ho Chi Minh City,4111,12,2030,BUG-03: card field accepts any text
```

Add the matching `TC-ORDER-018` row to `test-cases/functional/03-place-order.csv`, then run:

```bash
npx playwright test --grep TC-ORDER-018 --project=chromium
```
