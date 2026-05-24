#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('node:child_process');

const BASE_URL = process.env.RBAC_BASE_URL || 'http://localhost:3000/api';
const ADMIN_USER = process.env.RBAC_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.RBAC_ADMIN_PASS || 'admin123';
const PHARM_USER = process.env.RBAC_PHARM_USER || 'pharmacist.branch1';
const PHARM_PASS = process.env.RBAC_PHARM_PASS || '123456';
const CUSTOMER_A_USER = process.env.RBAC_CUSTOMER_A_USER || 'customer1';
const CUSTOMER_A_PASS = process.env.RBAC_CUSTOMER_A_PASS || '123456';
const CUSTOMER_B_USER = process.env.RBAC_CUSTOMER_B_USER || 'customer2';
const CUSTOMER_B_PASS = process.env.RBAC_CUSTOMER_B_PASS || '123456';
const AUTO_SEED_COMMERCE = process.env.RBAC_AUTO_SEED_COMMERCE !== 'false';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, path, token, body, options = {}) {
  const maxAttempts = options.maxAttempts ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 1500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      if (attempt < maxAttempts) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
      return { status: -1, ok: false, json: null, text: String(err) };
    }

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (res.status === 429 && attempt < maxAttempts) {
      await sleep(retryDelayMs * attempt + 3000);
      continue;
    }

    return {
      status: res.status,
      ok: res.ok,
      json,
      text,
    };
  }

  return { status: -1, ok: false, json: null, text: 'Request retry exhausted' };
}

async function login(username, password) {
  const res = await request('POST', '/auth/login', null, { username, password }, { maxAttempts: 8, retryDelayMs: 2000 });
  if (![200, 201].includes(res.status) || !res.json?.accessToken) {
    throw new Error(`Login failed for ${username}. status=${res.status} body=${res.text?.slice(0, 240)}`);
  }
  return res.json.accessToken;
}

function addResult(results, name, endpoint, expected, actual, pass, note = '') {
  results.push({ name, endpoint, expected, actual, pass, note });
}

function printReport(results) {
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  console.log('\n=== RBAC Phase 8 Report ===');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Passed: ${passCount}/${results.length}`);
  console.log(`Failed: ${failCount}/${results.length}`);

  const failed = results.filter((r) => !r.pass);
  if (failed.length === 0) {
    console.log('All checks passed.');
    return;
  }

  console.log('\nFailed checks:');
  for (const item of failed) {
    console.log(`- ${item.name}`);
    console.log(`  endpoint: ${item.endpoint}`);
    console.log(`  expected: ${item.expected}`);
    console.log(`  actual: ${item.actual}`);
    if (item.note) {
      console.log(`  note: ${item.note}`);
    }
  }
}

function findOrderOwnedBy(orders, userId) {
  return orders.find((item) => item.userId === userId);
}

function findOrderNotOwnedBy(orders, userId) {
  return orders.find((item) => item.userId && item.userId !== userId);
}

async function ensureCustomerBOrder(adminToken, customerBId) {
  let list = await request('GET', '/orders?page=1&limit=100', adminToken);
  if (list.status !== 200) return { ok: false, reason: `Admin order list failed: ${list.status}` };

  const items = Array.isArray(list.json?.items) ? list.json.items : [];
  if (findOrderOwnedBy(items, customerBId)) {
    return { ok: true, items };
  }

  if (!AUTO_SEED_COMMERCE) {
    return { ok: false, reason: 'No order for customer B and auto seed disabled' };
  }

  try {
    console.log('No order for customer B. Seeding commerce data once...');
    execSync('npm run prisma:seed:commerce', { stdio: 'inherit' });
  } catch (err) {
    return { ok: false, reason: `Seed commerce failed: ${String(err)}` };
  }

  list = await request('GET', '/orders?page=1&limit=100', adminToken);
  if (list.status !== 200) return { ok: false, reason: `Admin order list after seed failed: ${list.status}` };
  const itemsAfter = Array.isArray(list.json?.items) ? list.json.items : [];

  if (!findOrderOwnedBy(itemsAfter, customerBId)) {
    return { ok: false, reason: 'Still no order for customer B after seed' };
  }

  return { ok: true, items: itemsAfter };
}

async function main() {
  const results = [];
  let exitCode = 0;

  try {
    const adminToken = await login(ADMIN_USER, ADMIN_PASS);
    await sleep(300);
    const pharmToken = await login(PHARM_USER, PHARM_PASS);
    await sleep(300);
    const customerAToken = await login(CUSTOMER_A_USER, CUSTOMER_A_PASS);
    await sleep(300);
    const customerBToken = await login(CUSTOMER_B_USER, CUSTOMER_B_PASS);
    void customerBToken;

    const adminMe = await request('GET', '/auth/me', adminToken);
    const customerAMe = await request('GET', '/auth/me', customerAToken);
    const customerBMe = await request('GET', '/auth/me', await login(CUSTOMER_B_USER, CUSTOMER_B_PASS));

    if (adminMe.status !== 200 || customerAMe.status !== 200 || customerBMe.status !== 200) {
      throw new Error('Cannot fetch /auth/me for test users');
    }

    // 1) ADMIN
    {
      const r1 = await request('GET', '/roles', adminToken);
      addResult(results, 'ADMIN roles', 'GET /roles', '200', String(r1.status), r1.status === 200);
      const r2 = await request('GET', '/permissions', adminToken);
      addResult(results, 'ADMIN permissions', 'GET /permissions', '200', String(r2.status), r2.status === 200);
      const r3 = await request('GET', '/users', adminToken);
      addResult(results, 'ADMIN users', 'GET /users', '200', String(r3.status), r3.status === 200);
    }

    // 2) PHARMACIST
    {
      const r1 = await request('GET', '/pos-orders', pharmToken);
      addResult(results, 'PHARM pos-orders', 'GET /pos-orders', '200', String(r1.status), r1.status === 200);

      const r2 = await request('POST', '/pos-orders', pharmToken, {});
      addResult(results, 'PHARM pos-orders create invalid body', 'POST /pos-orders', '400/404/422 (not 403)', String(r2.status), [400, 404, 422].includes(r2.status));

      const r3 = await request('GET', '/pos-payments', pharmToken);
      addResult(results, 'PHARM pos-payments', 'GET /pos-payments', '200', String(r3.status), r3.status === 200);

      const r4 = await request('GET', '/pos-sessions', pharmToken);
      addResult(results, 'PHARM pos-sessions', 'GET /pos-sessions', '200', String(r4.status), r4.status === 200);

      const r5 = await request('GET', '/inventory', pharmToken);
      addResult(results, 'PHARM inventory', 'GET /inventory', '200', String(r5.status), r5.status === 200);

      const r6 = await request('GET', '/roles', pharmToken);
      addResult(results, 'PHARM deny roles', 'GET /roles', '403', String(r6.status), r6.status === 403);

      const r7 = await request('GET', '/permissions', pharmToken);
      addResult(results, 'PHARM deny permissions', 'GET /permissions', '403', String(r7.status), r7.status === 403);

      const r8 = await request('GET', '/users', pharmToken);
      addResult(results, 'PHARM deny users', 'GET /users', '403', String(r8.status), r8.status === 403);

      const r9 = await request('GET', '/reports', pharmToken);
      addResult(results, 'PHARM deny reports', 'GET /reports', '403', String(r9.status), r9.status === 403);
    }

    // 3) CUSTOMER
    {
      const r1 = await request('POST', '/checkout', customerAToken, {});
      addResult(results, 'CUSTOMER checkout invalid body', 'POST /checkout', '400/422 (not 403)', String(r1.status), [400, 422].includes(r1.status));

      const r2 = await request('GET', '/orders/my', customerAToken);
      addResult(results, 'CUSTOMER my orders', 'GET /orders/my', '200', String(r2.status), r2.status === 200);

      const r3 = await request('GET', '/users', customerAToken);
      addResult(results, 'CUSTOMER deny users', 'GET /users', '403', String(r3.status), r3.status === 403);

      const r4 = await request('GET', '/pos-orders', customerAToken);
      addResult(results, 'CUSTOMER deny pos-orders', 'GET /pos-orders', '403', String(r4.status), r4.status === 403);

      const r5 = await request('GET', '/reports', customerAToken);
      addResult(results, 'CUSTOMER deny reports', 'GET /reports', '403', String(r5.status), r5.status === 403);
    }

    // 4) Ownership
    {
      const customerAId = customerAMe.json.id;
      const customerBId = customerBMe.json.id;
      const ensure = await ensureCustomerBOrder(adminToken, customerBId);

      if (!ensure.ok) {
        addResult(results, 'OWNERSHIP setup', 'N/A', `order of customer B must exist`, 'MISSING', false, ensure.reason);
      } else {
        const otherOrder = findOrderOwnedBy(ensure.items, customerBId) || findOrderNotOwnedBy(ensure.items, customerAId);
        if (!otherOrder) {
          addResult(results, 'OWNERSHIP setup', 'N/A', 'find other customer order', 'NONE', false, 'No suitable order for ownership check');
        } else {
          const ownOrder = findOrderOwnedBy(ensure.items, customerAId);
          if (ownOrder) {
            const ownDetail = await request('GET', `/orders/${ownOrder.id}`, customerAToken);
            const ownOk = ownDetail.status === 200;
            addResult(results, 'OWNERSHIP own order access', `GET /orders/${ownOrder.id}`, '200', String(ownDetail.status), ownOk);
          } else {
            addResult(results, 'OWNERSHIP own order access', 'GET /orders/{own}', '200', 'SKIP', true, 'No order owned by customer A in dataset');
          }

          const crossDetail = await request('GET', `/orders/${otherOrder.id}`, customerAToken);
          const noLeak = crossDetail.status !== 200;
          const crossOk = [403, 404].includes(crossDetail.status) && noLeak;
          addResult(
            results,
            'OWNERSHIP cross-customer access',
            `GET /orders/${otherOrder.id}`,
            '403/404 and no data leak',
            String(crossDetail.status),
            crossOk,
            crossDetail.status === 200 ? 'Data leaked: customer A can read customer B order' : '',
          );
        }
      }
    }
  } catch (err) {
    exitCode = 1;
    addResult(results, 'FATAL', 'N/A', 'script should run', 'ERROR', false, String(err));
  }

  printReport(results);
  if (results.some((r) => !r.pass)) {
    process.exitCode = 1;
  } else if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

main();
