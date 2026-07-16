// k6 webhook stress — Phase 5.
// Verifies signature-required endpoints reject unsigned traffic (should 401)
// under sustained load, exercising rate limiting + validation paths.
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 25,
  duration: '1m',
  thresholds: {
    'http_req_duration': ['p(95)<800'],
    'checks': ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.post(`${BASE_URL}/api/webhooks/whatsapp`, JSON.stringify({ ping: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'rejected without signature': (r) => r.status === 401 || r.status === 403 });
}
