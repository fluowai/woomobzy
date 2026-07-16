// k6 baseline load test — Phase 5.
// Run: k6 run tests/load/k6-baseline.js
// Env: BASE_URL (default http://localhost:3000)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m',  target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed:  ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/healthz`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
