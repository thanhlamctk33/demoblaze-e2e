import { check, fail } from 'k6';
import exec from 'k6/execution';
import { BASE_THRESHOLDS } from './lib/config.js';
import { PRODUCT_IDS } from './lib/data.js';
import { plannedArrivals, profileNames, profileStages } from './lib/profiles.js';
import { entries, view } from './lib/api.js';

const PROFILES_FILE = 'non-functional/throughput-profiles.csv';
const PROFILE = __ENV.SCENARIO || 'rps-smoke';
const TARGET_RPS = Number(__ENV.TARGET_RPS || 10);
const STRESS_RPS = Number(__ENV.STRESS_RPS || TARGET_RPS * 2);
const MAX_DROPPED_SHARE = 0.01;
const P95_BUDGET_SECONDS = 2;
const MAX_VUS_PER_RPS = 5;

const stages = profileStages(PROFILES_FILE, PROFILE, 'target_rps', {
  '{{target}}': TARGET_RPS,
  '{{stress}}': STRESS_RPS,
});
if (!stages) {
  fail(
    `Unknown SCENARIO "${PROFILE}". Use one of: ${profileNames(PROFILES_FILE).join(', ')} (test-data/${PROFILES_FILE})`,
  );
}

const peakRps = Math.max(...stages.map((stage) => stage.target));
const maxDroppedRequests = Math.ceil(plannedArrivals(stages) * MAX_DROPPED_SHARE);

const requests = [
  { name: 'entries', send: () => entries() },
  { name: 'view', send: (n) => view(PRODUCT_IDS[n % PRODUCT_IDS.length]) },
];

export const options = {
  scenarios: {
    [PROFILE]: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: Math.ceil(peakRps * P95_BUDGET_SECONDS),
      maxVUs: peakRps * MAX_VUS_PER_RPS,
      stages,
    },
  },
  thresholds: {
    ...BASE_THRESHOLDS,
    http_req_duration: [`p(95)<${P95_BUDGET_SECONDS * 1000}`],
    dropped_iterations: [`count<=${maxDroppedRequests}`],
  },
};

export default function () {
  const n = exec.scenario.iterationInTest;
  const request = requests[n % requests.length];
  check(request.send(n), { [`${request.name}: status 200`]: (r) => r.status === 200 });
}
