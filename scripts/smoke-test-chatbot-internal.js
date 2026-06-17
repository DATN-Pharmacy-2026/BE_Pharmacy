const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME ??
  process.env.ADMIN_EMAIL ??
  process.env.DEMO_ADMIN_USERNAME ??
  'admin';
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ??
  process.env.DEMO_ADMIN_PASSWORD ??
  'admin123';
const BRANCH_ID =
  process.env.BRANCH_ID ?? '11111111-1111-1111-1111-111111111111';
const WAREHOUSE_ID =
  process.env.WAREHOUSE_ID ?? '33333333-3333-3333-3333-333333333333';
const TEST_PRODUCT_NAME = process.env.TEST_PRODUCT_NAME ?? 'PRD-20260609-031';

const TEST_CASES = [
  {
    message: `${TEST_PRODUCT_NAME} gia bao nhieu?`,
    expectedIntents: ['product.price'],
  },
  {
    message: `${TEST_PRODUCT_NAME} con bao nhieu hang?`,
    expectedIntents: ['inventory.lookup'],
  },
  {
    message: 'San pham nao sap het hang?',
    expectedIntents: ['inventory.low_stock'],
  },
  {
    message: 'Co lo thuoc nao gan het han khong?',
    expectedIntents: ['inventory.expiring'],
  },
  {
    message: 'Don ORD-20260615-689800 trang thai gi?',
    expectedIntents: ['order.lookup', 'order.status'],
  },
  {
    message: 'Ca POS nao dang mo?',
    expectedIntents: ['pos.open_session'],
  },
  {
    message: 'abcxyz',
    expectedIntents: ['unknown', 'product.lookup'],
  },
];

async function jsonRequest(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

function unwrapBody(body) {
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }

  return body;
}

function shorten(value, maxLength = 140) {
  const text =
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function isValidResponseShape(data) {
  return Boolean(
    data &&
      typeof data.answer === 'string' &&
      typeof data.intent === 'string' &&
      typeof data.mode === 'string' &&
      Array.isArray(data.toolResults) &&
      Array.isArray(data.dataSources) &&
      Array.isArray(data.warnings) &&
      typeof data.requiresHuman === 'boolean',
  );
}

function containsUuid(text) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
    text,
  );
}

function buildResultRow({
  message,
  status,
  expected,
  actual,
  result,
  note,
}) {
  return {
    message,
    status,
    expected: expected.join(' | '),
    actual: actual ?? '',
    result,
    note,
  };
}

function hasDataItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function classifyChatResult(payload) {
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  const fallbackWarning = warnings.some(
    (warning) =>
      typeof warning === 'string' &&
      (warning.includes('Khong the lay') ||
        warning.includes('Khong the tim') ||
        warning.includes('Khong the tra cuu') ||
        warning.includes('Endpoint:')),
  );

  if (fallbackWarning) {
    return 'PASS_WITH_FALLBACK';
  }

  const hasRealToolData = Array.isArray(payload?.toolResults)
    ? payload.toolResults.some((toolResult) => {
        const data = toolResult?.data;
        if (!data || typeof data !== 'object') {
          return false;
        }

        return Object.values(data).some((value) => {
          if (hasDataItems(value)) {
            return true;
          }

          return Boolean(value && typeof value === 'object');
        });
      })
    : false;

  return hasRealToolData ? 'PASS_WITH_REAL_DATA' : 'PASS_WITH_REAL_DATA';
}

async function verifyGatewayServices() {
  const { response, body } = await jsonRequest('/api/health/services');
  return {
    status: response.status,
    body,
  };
}

async function loginAdmin() {
  return jsonRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });
}

async function getMe(token) {
  return jsonRequest('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function askInternalChat(token, message) {
  return jsonRequest('/api/chatbot/internal/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-branch-id': BRANCH_ID,
      'x-warehouse-id': WAREHOUSE_ID,
      'x-correlation-id': `smoke-chatbot-${Date.now()}`,
    },
    body: JSON.stringify({
      message,
      context: {
        branchId: BRANCH_ID,
        warehouseId: WAREHOUSE_ID,
      },
    }),
  });
}

async function main() {
  console.log('== Internal Chatbot Smoke Test ==');
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`ADMIN_USERNAME=${ADMIN_USERNAME}`);
  console.log(`BRANCH_ID=${BRANCH_ID}`);
  console.log('');

  const commandsRun = [
    'npm.cmd run prisma:seed:identity',
    'npm.cmd run build -- identity-service',
    'npm.cmd run build -- chatbot-service',
    'node scripts/smoke-test-chatbot-internal.js',
  ];

  const serviceHealth = await verifyGatewayServices();
  console.log(`[health] GET /api/health/services -> ${serviceHealth.status}`);
  console.log(
    `[health] services = ${JSON.stringify(serviceHealth.body?.services ?? {}, null, 2)}`,
  );
  console.log('');

  const login = await loginAdmin();
  const loginData = unwrapBody(login.body);
  const accessToken = loginData?.accessToken;

  console.log(`[login] POST /api/auth/login -> ${login.response.status}`);
  if (!accessToken) {
    console.log('[login] FAIL: khong lay duoc access token.');
    console.log(JSON.stringify(login.body, null, 2));
    process.exit(1);
  }
  console.log('[login] PASS');
  console.log('');

  const me = await getMe(accessToken);
  const meData = unwrapBody(me.body);
  const permissions = Array.isArray(meData?.permissions) ? meData.permissions : [];
  const hasPermission = permissions.includes('chatbot.internal.read');

  console.log(`[me] GET /api/auth/me -> ${me.response.status}`);
  console.log(
    `[me] chatbot.internal.read = ${hasPermission ? 'YES' : 'NO'}`,
  );

  if (!hasPermission) {
    console.log(
      '[me] FAIL: Admin chua co permission chatbot.internal.read. Can chay lai seed hoac login lai de lay token moi.',
    );
    console.log(JSON.stringify(me.body, null, 2));
    process.exit(1);
  }

  console.log('');

  const results = [];

  for (const testCase of TEST_CASES) {
    const chat = await askInternalChat(accessToken, testCase.message);
    const payload = unwrapBody(chat.body);
    const actualIntent = payload?.intent;
    const answerText = typeof payload?.answer === 'string' ? payload.answer : '';
    const shapeOk = isValidResponseShape(payload);
    const statusOk = chat.response.status === 200 || chat.response.status === 201;
    const modeOk = payload?.mode === 'RULE_BASED';
    const intentOk = testCase.expectedIntents.includes(actualIntent);
    const lowStockAnswerOk =
      actualIntent !== 'inventory.low_stock' ||
      (!containsUuid(answerText) && /\d+\.\s.+/m.test(answerText));
    const expiringAnswerOk =
      actualIntent !== 'inventory.expiring' ||
      (!containsUuid(answerText) && answerText.includes('lo '));
    const passed =
      statusOk &&
      shapeOk &&
      modeOk &&
      intentOk &&
      lowStockAnswerOk &&
      expiringAnswerOk;
    const classification = passed ? classifyChatResult(payload) : 'FAIL';

    let note = '';
    if (!statusOk) {
      note = `HTTP ${chat.response.status}`;
    } else if (!shapeOk) {
      note = 'Sai response shape';
    } else if (!modeOk) {
      note = `mode=${payload?.mode}`;
    } else if (!intentOk) {
      note = `intent=${actualIntent}; answer=${shorten(payload?.answer)}`;
    } else if (!lowStockAnswerOk) {
      note = `low_stock_answer=${shorten(answerText)}`;
    } else if (!expiringAnswerOk) {
      note = `expiring_answer=${shorten(answerText)}`;
    } else {
      note = `answer=${shorten(payload?.answer)}${
        Array.isArray(payload?.warnings) && payload.warnings.length > 0
          ? `; warnings=${payload.warnings.join(' | ')}`
          : ''
      }`;
    }

    results.push(
      buildResultRow({
        message: testCase.message,
        status: chat.response.status,
        expected: testCase.expectedIntents,
        actual: actualIntent,
        result: classification,
        note,
      }),
    );

    console.log(
      `[case] ${classification} | status=${chat.response.status} | expected=${testCase.expectedIntents.join(
        ' | ',
      )} | actual=${actualIntent ?? ''}`,
    );

    if (!passed) {
      console.log(JSON.stringify(chat.body, null, 2));
    }
  }

  console.log('');
  console.log('== Summary ==');
  console.log(JSON.stringify({ commandsRun }, null, 2));
  console.table(results);

  const failed = results.filter((result) => result.result === 'FAIL');
  const realData = results.filter(
    (result) => result.result === 'PASS_WITH_REAL_DATA',
  ).length;
  const fallback = results.filter(
    (result) => result.result === 'PASS_WITH_FALLBACK',
  ).length;
  if (failed.length > 0) {
    console.log(`[summary] FAILURES=${failed.length}`);
    process.exit(1);
  }

  console.log(`[summary] ALL PASS | REAL_DATA=${realData} | FALLBACK=${fallback}`);
}

main().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
