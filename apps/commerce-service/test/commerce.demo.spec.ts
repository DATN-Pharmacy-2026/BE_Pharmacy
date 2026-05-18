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

describe('Commerce Demo API', () => {
  it('product list returns paginated response', async () => {
    const token = await loginToken();
    const response = await fetch(`${BASE_URL}/api/products?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    const payload = body?.data ?? body;
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.meta).toBeDefined();
    expect(payload.meta.page).toBe(1);
  });

  it('product detail works for seeded product', async () => {
    const token = await loginToken();
    const listResp = await fetch(`${BASE_URL}/api/products?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody: any = await listResp.json();
    const listPayload = listBody?.data ?? listBody;
    const productId = listPayload.items?.[0]?.id;
    expect(productId).toBeDefined();

    const detailResp = await fetch(`${BASE_URL}/api/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailResp.status).toBe(200);
  });

  it('invalid DTO field on products query is rejected', async () => {
    const token = await loginToken();
    const response = await fetch(
      `${BASE_URL}/api/products?page=1&limit=20&unexpectedField=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(response.status).toBe(400);
  });
});
