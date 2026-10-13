# Test cases

94 test cases for DemoBlaze (70 automated), split into **functional** and **non-functional** testing. Plain CSV (UTF-8): open in Excel or Google Sheets, or view on GitHub as a table.

```
test-cases/
├── functional/                     does the system do the right thing?
├── non-functional/                 does it do it well? (speed, load, security, compatibility)
├── payment-gateway-strategy.csv    test strategy for a high-traffic payment gateway
└── defects.csv                     defects found on DemoBlaze
```

## Functional

What the user can do and what the system must answer: happy paths, negative inputs and edge cases.

| File                                                  | Covers                                                            |  Cases |     P1 |     P2 |     P3 | Automated | Candidate | Manual |
| ----------------------------------------------------- | ----------------------------------------------------------------- | -----: | -----: | -----: | -----: | --------: | --------: | -----: |
| [`01-login.csv`](functional/01-login.csv)             | Login, sign-up, logout                                            |     20 |      5 |      6 |      9 |        12 |         4 |      4 |
| [`02-cart.csv`](functional/02-cart.csv)               | Add, view and delete cart items, totals, guest vs logged-in carts |     20 |      5 |      6 |      9 |        10 |         4 |      6 |
| [`03-place-order.csv`](functional/03-place-order.csv) | Place Order form, validation, receipt                             |     16 |      5 |      6 |      5 |        13 |         2 |      1 |
| [`04-api.csv`](functional/04-api.csv)                 | API behaviour and JSON Schema contracts                           |     16 |      7 |      9 |      0 |        16 |         0 |      0 |
| **Total**                                             |                                                                   | **72** | **22** | **27** | **23** |    **51** |    **10** | **11** |

## Non-functional

How well the system behaves: speed under load, safety with parallel requests, security and support across browsers.

| File                                                                              | Covers                                             |  Cases |    P1 |     P2 |    P3 | Automated | Candidate | Manual |
| --------------------------------------------------------------------------------- | -------------------------------------------------- | -----: | ----: | -----: | ----: | --------: | --------: | -----: |
| [`01-performance.csv`](non-functional/01-performance.csv)                         | Page-load and API budgets, k6 smoke / load / spike |      7 |     1 |      4 |     2 |         7 |         0 |      0 |
| [`02-concurrency.csv`](non-functional/02-concurrency.csv)                         | Parallel requests, idempotency, double-submit      |      8 |     6 |      2 |     0 |         8 |         0 |      0 |
| [`03-security.csv`](non-functional/03-security.csv)                               | Injection, brute force, card number masking        |      4 |     0 |      4 |     0 |         2 |         1 |      1 |
| [`04-compatibility-usability.csv`](non-functional/04-compatibility-usability.csv) | Browsers / mobile, keyboard use                    |      3 |     0 |      2 |     1 |         2 |         0 |      1 |
| **Total**                                                                         |                                                    | **22** | **7** | **12** | **3** |    **19** |     **1** |  **2** |

## Other files

| File                                                           | Content                                                                                                            | Rows |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---: |
| [`payment-gateway-strategy.csv`](payment-gateway-strategy.csv) | Scenarios for a high-traffic payment gateway (idempotency, Redis, queues, DB, AWS, security). Not run on DemoBlaze |   62 |
| [`defects.csv`](defects.csv)                                   | Defects and observations found while testing DemoBlaze                                                             |   12 |

## Columns

| Column                | Meaning                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| TC ID                 | Unique ID, also used in the automated test title, e.g. `[TC-ORDER-001]`                                 |
| Scenario, Title       | What is being tested                                                                                    |
| Type                  | Functional, Negative, Edge, UI, Performance, Security, Usability, Compatibility                         |
| Priority              | P1 (critical) to P3 (low)                                                                               |
| Preconditions         | State required before the steps                                                                         |
| Test Data             | Inputs used                                                                                             |
| Steps                 | Numbered actions                                                                                        |
| Expected Result       | Pass criteria                                                                                           |
| Automation            | Automated · Candidate (next to automate) · Manual (exploratory / not worth automating)                  |
| Automated In          | Script that implements the case                                                                         |
| Tags                  | Playwright tags used to select the case, e.g. `@smoke`; `@known-bug` cases pass while the defect exists |
| Status                | Not Run · Pass · Fail · Blocked · Expected Fail                                                         |
| Actual Result / Notes | Filled in during execution                                                                              |
