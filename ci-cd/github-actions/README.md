# GitHub Actions

The workflow is [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml). GitHub only runs workflow files from `.github/workflows/`, so it cannot live in this folder.

Its steps call the shared scripts in [`../scripts/`](../scripts), like every other platform.

| Trigger                    | Runs                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| push to main, pull request | quality, API, 5 browser / device targets in parallel, perf, merged HTML report      |
| nightly 01:00 UTC          | the same + k6 checkout load (`smoke`) + throughput (`sustain`, 10 req/s)            |
| manual (Run workflow)      | inputs: `grep` (tag or TC ID), `test_env`, `k6_scenario` (`smoke`, `load`, `spike`) |

Optional repository secrets: `TEST_USERNAME`, `TEST_PASSWORD`, `ANTHROPIC_API_KEY`. To publish the HTML report to GitHub Pages, enable Pages (source: GitHub Actions) and set the repository variable `PUBLISH_REPORT=true`.
