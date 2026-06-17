export {};
const BASE_URL = process.env.DEMO_API_BASE_URL ?? 'http://localhost:3000';
const USERNAME = process.env.DEMO_ADMIN_USERNAME ?? 'admin';
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? 'admin123';
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? '123456';

async function jsonRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Identity Demo API', () => {
  async function login(username: string, password: string) {
    let lastStatus = 0;
    let lastBody: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { response, body } = await jsonRequest('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      lastStatus = response.status;
      lastBody = body;
      if (response.status === 201) {
        const token = body?.data?.accessToken ?? body?.accessToken;
        expect(typeof token).toBe('string');
        return token as string;
      }
      if (response.status !== 429) break;
      await sleep(300);
    }
    expect(lastStatus).toBe(201);
    const token = lastBody?.data?.accessToken ?? lastBody?.accessToken;
    return token as string;
  }

  it('login success returns token', async () => {
    const token = await login(USERNAME, PASSWORD);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('login fail returns 401', async () => {
    const { response } = await jsonRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: 'wrong-password' }),
    });
    expect([401, 429]).toContain(response.status);
  });

  it('protected route without token rejects', async () => {
    const { response } = await jsonRequest('/api/users?page=1&limit=20');
    expect([401, 403]).toContain(response.status);
  });

  it('me for admin contains scope and access flags', async () => {
    const token = await login(USERNAME, PASSWORD);
    const { response, body } = await jsonRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = body?.data ?? body;
    expect(
      data?.roles?.some(
        (role: { code: string }) => role.code === 'SUPER_ADMIN',
      ),
    ).toBe(true);
    expect(Array.isArray(data?.permissions)).toBe(true);
    expect(data?.permissions).toContain('chatbot.internal.read');
    expect(data?.scope?.branchScopeMode).toBe('ALL');
    expect(data?.scope?.warehouseScopeMode).toBe('ALL');
    expect(data?.access?.canAccessAdmin).toBe(true);
  });

  it('me for cashier has POS access and assigned scope only', async () => {
    const token = await login('cashier.branch1', DEMO_PASSWORD);
    const { response, body } = await jsonRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = body?.data ?? body;
    expect(data?.permissions).toContain('pos.access');
    expect(data?.permissions).toContain('pos.sell');
    expect(data?.permissions).toContain('inventory.lookup');
    expect(data?.permissions).not.toContain('admin.access');
    expect(data?.permissions).not.toContain('inventory.view');
    expect(data?.scope?.branchScopeMode).toBe('ASSIGNED');
    expect(data?.access?.canAccessPos).toBe(true);
    expect(data?.access?.canAccessAdmin).toBe(false);
  });

  it('me for customer has no admin/pos scope', async () => {
    const token = await login('customer1', DEMO_PASSWORD);
    const { response, body } = await jsonRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = body?.data ?? body;
    expect(data?.permissions).toContain('customer.order.create');
    expect(data?.permissions).not.toContain('admin.access');
    expect(data?.permissions).not.toContain('pos.access');
    expect(data?.scope?.branchScopeMode).toBe('NONE');
    expect(data?.scope?.warehouseScopeMode).toBe('NONE');
    expect(data?.access?.canAccessAdmin).toBe(false);
    expect(data?.access?.canAccessPos).toBe(false);
  });
});
