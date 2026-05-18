const BASE_URL = process.env.DEMO_API_BASE_URL ?? 'http://localhost:3000';
const USERNAME = process.env.DEMO_ADMIN_USERNAME ?? 'admin';
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? 'admin123';

async function loginToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const json: any = await response.json();
  return json?.data?.accessToken ?? json?.accessToken;
}

describe('Reporting / Notification Demo API', () => {
  it('report list is paginated', async () => {
    const token = await loginToken();
    const response = await fetch(`${BASE_URL}/api/reports?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    const payload = body?.data ?? body;
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.meta).toBeDefined();
  });

  it('notification list is paginated', async () => {
    const token = await loginToken();
    const response = await fetch(
      `${BASE_URL}/api/notification-events?page=1&limit=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(response.status).toBe(200);
    const body: any = await response.json();
    const payload = body?.data ?? body;
    expect(Array.isArray(payload.items)).toBe(true);
  });

  it('audit log list responds', async () => {
    const token = await loginToken();
    const response = await fetch(`${BASE_URL}/api/audit-logs?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
  });
});
