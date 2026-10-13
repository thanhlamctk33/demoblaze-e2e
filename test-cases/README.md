# Test cases

Plain CSV (UTF-8), one file per module. Open them in Excel or Google Sheets (File > Import), or read them directly on GitHub, which renders CSV as a searchable table.

| File                                                                 | Content                                                            | Cases |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | ----: |
| [`01-login.csv`](01-login.csv)                                       | Login, sign-up, logout                                             |    25 |
| [`02-cart.csv`](02-cart.csv)                                         | Add to cart, view, delete, totals, guest vs logged-in carts        |    21 |
| [`03-place-order.csv`](03-place-order.csv)                           | Place Order form, validation, receipt                              |    17 |
| [`04-api-performance.csv`](04-api-performance.csv)                   | API tests and performance budgets                                  |    13 |
| [`05-concurrency-contract.csv`](05-concurrency-contract.csv)         | Parallel writes, replays, double-clicks, JSON Schema contracts     |    18 |
| [`06-payment-gateway-strategy.csv`](06-payment-gateway-strategy.csv) | Strategy for a high-traffic payment gateway (not run on DemoBlaze) |    62 |
| [`07-defects.csv`](07-defects.csv)                                   | Defects and observations found on DemoBlaze                        |    12 |

## Columns (01–05)

| Column          | Meaning                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| TC ID           | Unique ID, also used in the automated test title, e.g. `[TC-ORDER-001]`              |
| Scenario, Title | What is being tested                                                                 |
| Type            | Functional, Negative, Edge, Security, Performance, UI, Usability, Compatibility      |
| Priority        | P1 (critical) to P3 (low)                                                            |
| Preconditions   | State required before the steps                                                      |
| Test Data       | Inputs used                                                                          |
| Steps           | Numbered actions                                                                     |
| Expected Result | Pass criteria                                                                        |
| Automation      | Automated · Candidate (next to automate) · Manual (exploratory / not cost-effective) |
| Automated In    | Spec file that implements the case                                                   |
| Tags            | Playwright tags; `@known-bug` cases pass while the defect exists                     |
| Status          | Not Run · Pass · Fail · Blocked · Expected Fail                                      |

## Summary

| Module                 | Total |  P1 |  P2 |  P3 | Functional | Negative | Edge | Other | Automated |
| ---------------------- | ----: | --: | --: | --: | ---------: | -------: | ---: | ----: | --------: |
| Login                  |    25 |   5 |  10 |  10 |          5 |        7 |    6 |     7 |        14 |
| Cart                   |    21 |   5 |   7 |   9 |          8 |        2 |    9 |     2 |        11 |
| Place Order            |    17 |   5 |   7 |   5 |          3 |        7 |    5 |     2 |        14 |
| API & Performance      |    13 |   4 |   7 |   2 |          5 |        3 |    1 |     4 |        13 |
| Concurrency & Contract |    18 |  10 |   8 |   0 |          4 |        5 |    6 |     3 |        18 |
| **Total**              |    94 |  29 |  39 |  26 |         25 |       24 |   27 |    18 |        70 |
