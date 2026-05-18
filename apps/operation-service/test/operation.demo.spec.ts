const BASE_URL = process.env.DEMO_API_BASE_URL ?? 'http://localhost:3000';
const USERNAME = process.env.DEMO_ADMIN_USERNAME ?? 'admin';
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? 'admin123';
const BRANCH_ID =
  process.env.DEMO_BRANCH_ID ?? '11111111-1111-1111-1111-111111111111';
const WAREHOUSE_ID =
  process.env.DEMO_WAREHOUSE_ID ?? '22222222-2222-2222-2222-222222222222';

async function loginToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const json: any = await response.json();
  return json?.data?.accessToken ?? json?.accessToken;
}

describe('Operation Demo API', () => {
  it('inventory list returns paginated response', async () => {
    const token = await loginToken();
    const response = await fetch(`${BASE_URL}/api/inventory?page=1&limit=20`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-branch-id': BRANCH_ID,
        'x-warehouse-id': WAREHOUSE_ID,
      },
    });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    const payload = body?.data ?? body;
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.meta).toBeDefined();
  });

  it('batch list endpoint responds', async () => {
    const token = await loginToken();
    const response = await fetch(`${BASE_URL}/api/batches?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}`, 'x-branch-id': BRANCH_ID },
    });
    expect([200, 403]).toContain(response.status);
  });

  it('receipt list endpoint responds', async () => {
    const token = await loginToken();
    const response = await fetch(`${BASE_URL}/api/receipts?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}`, 'x-branch-id': BRANCH_ID },
    });
    expect([200, 403]).toContain(response.status);
  });
});
