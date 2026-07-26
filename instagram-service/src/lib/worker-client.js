const WORKER_BASE_URL = process.env.INSTAGRAM_WORKER_URL || 'http://instagram-worker:8000';

export async function workerPost(path, body) {
  const res = await fetch(`${WORKER_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-token': process.env.INSTAGRAM_INTERNAL_TOKEN || '' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Worker ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function workerGet(path) {
  const res = await fetch(`${WORKER_BASE_URL}${path}`, {
    headers: { 'x-internal-token': process.env.INSTAGRAM_INTERNAL_TOKEN || '' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Worker ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function workerDelete(path) {
  const res = await fetch(`${WORKER_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'x-internal-token': process.env.INSTAGRAM_INTERNAL_TOKEN || '' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Worker ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}
