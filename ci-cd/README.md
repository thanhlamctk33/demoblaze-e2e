# CI/CD

Everything needed to run the suite in a pipeline. Every platform runs the same three scripts, so a change to how tests are installed or run is made once in [`scripts/`](scripts).

```
ci-cd/
├── scripts/           shared Linux scripts, called by every platform
│   ├── install.sh     npm ci, Playwright browsers, k6
│   ├── run-tests.sh   Playwright tests for one target
│   └── run-load.sh    k6 load and throughput tests
├── aws/               AWS CodePipeline + CodeBuild
├── github-actions/    GitHub Actions (workflow file lives in .github/workflows/)
├── gitlab/            GitLab CI
└── jenkins/           Jenkins
```

## Platforms

| Platform       | File                                                               | How to connect it                                                                                                                         |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| AWS            | [`aws/pipeline.yml`](aws/pipeline.yml) (creates everything)        | Deploy the CloudFormation stack, then approve the GitHub connection once (see below)                                                      |
| GitHub Actions | [`../.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) | Nothing: GitHub runs it on push. It must stay in `.github/workflows/` ([why](github-actions/README.md))                                   |
| GitLab CI      | [`gitlab/gitlab-ci.yml`](gitlab/gitlab-ci.yml)                     | Settings → CI/CD → General pipelines → CI/CD configuration file: `ci-cd/gitlab/gitlab-ci.yml`                                             |
| Jenkins        | [`jenkins/Jenkinsfile`](jenkins/Jenkinsfile)                       | New Pipeline job → Pipeline script from SCM → Script Path: `ci-cd/jenkins/Jenkinsfile` (needs Docker Pipeline and HTML Publisher plugins) |

All four run the same flow: **install → quality (lint, typecheck, format) → tests per target → reports**, plus a nightly k6 checkout load test and throughput (requests per second) test.

## Shared scripts

Run from the repository root on Linux (or macOS).

| Script         | Settings (environment variables)                                                                                                                                                                                           | Example                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `install.sh`   | options `--browsers "chromium firefox"`, `--no-browsers`, `--k6`, `--k6-only`; `K6_VERSION`, `K6_INSTALL_DIR`                                                                                                              | `bash ci-cd/scripts/install.sh`                                                   |
| `run-tests.sh` | `TARGET`: `quality`, `all`, or a project (`api`, `chromium`, `firefox`, `webkit`, `mobile-chrome`, `mobile-safari`, `perf`); `GREP`: tag or TC ID, `all` = everything                                                      | `TARGET=chromium GREP=@smoke bash ci-cd/scripts/run-tests.sh`                     |
| `run-load.sh`  | `K6_SCRIPT` (default `perf/k6/checkout-flow.js`, or `perf/k6/throughput.js`); `SCENARIO`: a profile from `test-data/non-functional/load-profiles.csv` or `throughput-profiles.csv`; `PEAK_VUS`, `TARGET_RPS`, `STRESS_RPS` | `SCENARIO=sustain K6_SCRIPT=perf/k6/throughput.js bash ci-cd/scripts/run-load.sh` |

Inside the `mcr.microsoft.com/playwright` image (used by AWS, GitLab and Jenkins) browsers are already installed, so pipelines call `install.sh --no-browsers`. Keep the image tag in sync with `@playwright/test` in `package.json`.

## AWS

[`aws/pipeline.yml`](aws/pipeline.yml) is a CloudFormation stack that creates two pipelines, the CodeBuild projects, an encrypted S3 bucket for reports (kept 30 days) and the nightly schedule.

| Pipeline                | Trigger                     | Runs                                                                                        |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `demoblaze-e2e-commit`  | push / pull request to main | [`aws/buildspec.yml`](aws/buildspec.yml): quality + 7 targets as parallel CodeBuild builds  |
| `demoblaze-e2e-nightly` | every day at 01:00 UTC      | the same builds + [`aws/buildspec-load.yml`](aws/buildspec-load.yml) (k6 load + throughput) |

```bash
aws cloudformation deploy \
  --stack-name demoblaze-e2e-ci \
  --template-file ci-cd/aws/pipeline.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides GitHubRepository=<owner>/demoblaze-e2e
```

Then, once: AWS console → Developer Tools → Settings → Connections → `demoblaze-e2e-github` → Update pending connection. Run on demand:

```bash
aws codepipeline start-pipeline-execution --name demoblaze-e2e-commit --variables name=GREP,value=@smoke
```

## Reports

Every platform keeps `reports/` as the build artifact: HTML, JSON and Allure reports, `summary.md`, k6 summaries, and `reports/test-results/` with the traces, screenshots and videos of failed tests.
