# Test data

CSV files read by the tests at run time (UTF-8, first row = column names, quote a value with `"` when it contains a comma, a quote or leading/trailing spaces). Adding a row adds a test; no code change is needed.

| File                                           | Used by                              | One row =                                                                          |
| ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| [`products.csv`](products.csv)                 | every spec, through `Products.<key>` | a product: `key` used in code, DemoBlaze `id`, display `name`, `category`          |
| [`order-defaults.csv`](order-defaults.csv)     | `buildOrder()`                       | default Place Order form values; the buyer name is `name_prefix` + a unique suffix |
| [`login-validation.csv`](login-validation.csv) | `tests/ui/login.spec.ts`             | a login attempt that must be rejected with `expected_alert`                        |
| [`order-accepted.csv`](order-accepted.csv)     | `tests/ui/checkout.spec.ts`          | an order that must succeed; `product` is a key from `products.csv`                 |
| [`order-rejected.csv`](order-rejected.csv)     | `tests/ui/checkout.spec.ts`          | an order that must be blocked; fill `known_bug` while the site still accepts it    |

## Rules

- `tc_id` must match a case in [`../test-cases/`](../test-cases/README.md); it becomes the start of the test title, e.g. `[TC-ORDER-004]`.
- `{{username}}` and `{{password}}` are replaced by realistic random values generated with [Faker](https://fakerjs.dev) when the test runs.
- An empty cell means an empty input. Every form field is written out in each row, so a row reads as exactly what is typed.
- `known_bug` (order-rejected.csv): leave empty for a normal `@regression` case. Put the defect ID and summary (e.g. `BUG-04: …`) to run the row as `@known-bug` with `test.fail()`; it passes while the bug exists and fails once the site is fixed, which is the signal to clear the cell.
- Unique values (usernames, passwords) are not stored here: they are generated per run in `src/data/factories.ts` because DemoBlaze is a shared public site.
- A wrong column count fails the run immediately with the file and line number; an unknown product key fails with the key and the file to fix.

## Example: add a rejected order

```csv
TC-ORDER-015,card number is too short,QA Buyer,Vietnam,Ho Chi Minh City,4111,12,2030,BUG-03: card field accepts any text
```

Add the matching `TC-ORDER-015` row to `test-cases/03-place-order.csv`, then run:

```bash
npx playwright test --grep TC-ORDER-015 --project=chromium
```
