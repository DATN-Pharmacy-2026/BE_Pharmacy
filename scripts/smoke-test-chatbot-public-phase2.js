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

const TEST_CASES = [
  {
    message: 'Panadol dung de lam gi?',
    expectedIntent: 'product.usage',
  },
  {
    message: 'Nha thuoc co doi tra san pham khong?',
    expectedIntent: 'policy.lookup',
  },
  {
    message: 'Panadol gia bao nhieu?',
    expectedIntent: 'product.price',
  },
  {
    message: 'Panadol con hang khong?',
    expectedIntent: 'product.stock',
  },
  {
    message: 'Toi dang mang thai co dung thuoc nay duoc khong?',
    expectedIntent: 'health.sensitive',
  },
  {
    message: 'Thuoc ABCXYZ co ban khong?',
    expectedIntent: 'product.stock',
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

function shorten(value, maxLength = 160) {
  const text =
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function isValidResponseShape(data) {
  return Boolean(
    data &&
      typeof data.answer === 'string' &&
      typeof data.intent === 'string' &&
      typeof data.mode === 'string' &&
      typeof data.conversationId === 'string' &&
      typeof data.handoffRequired === 'boolean' &&
      Array.isArray(data.warnings) &&
      Array.isArray(data.suggestedActions),
  );
}

function isFallbackAnswer(answer) {
  const normalized = String(answer || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return (
    normalized.includes('chua co du du lieu') ||
    normalized.includes('khong du du lieu') ||
    normalized.includes('gap nhan vien tu van') ||
    normalized.includes('de duoc ho tro them')
  );
}

function classifyChatResult(payload) {
  const intent = payload?.intent;
  const mode = payload?.mode;
  const answer = payload?.answer ?? '';
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  const handoffRequired = Boolean(payload?.handoffRequired);
  const hasWarnings = warnings.length > 0;

  if (
    (intent === 'product.price' || intent === 'product.stock') &&
    mode === 'HYBRID' &&
    !handoffRequired &&
    !hasWarnings
  ) {
    return 'HYBRID_REAL_DATA';
  }

  if (
    (intent === 'product.usage' || intent === 'policy.lookup') &&
    (mode === 'RAG' || mode === 'HYBRID') &&
    !handoffRequired &&
    !hasWarnings &&
    !isFallbackAnswer(answer)
  ) {
    return 'RAG_REAL_DATA';
  }

  if (
    handoffRequired ||
    hasWarnings ||
    isFallbackAnswer(answer) ||
    intent === 'health.sensitive'
  ) {
    return 'SAFE_FALLBACK';
  }

  return 'FAIL';
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

async function reindex(token, path) {
  return jsonRequest(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

async function askPublicChat(message) {
  return jsonRequest('/api/chatbot/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': `smoke-public-chatbot-${Date.now()}`,
    },
    body: JSON.stringify({
      message,
      context: {},
    }),
  });
}

async function main() {
  console.log('== Public Chatbot Phase 2 Smoke Test ==');
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`ADMIN_USERNAME=${ADMIN_USERNAME}`);
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

  const me = await getMe(accessToken);
  const meData = unwrapBody(me.body);
  const permissions = Array.isArray(meData?.permissions) ? meData.permissions : [];
  const hasPermission =
    permissions.includes('chatbot.internal.read') ||
    permissions.includes('admin.access');
  console.log(`[me] GET /api/auth/me -> ${me.response.status}`);
  console.log(`[me] reindex permission = ${hasPermission ? 'YES' : 'NO'}`);
  console.log('');

  const productReindex = await reindex(accessToken, '/api/chatbot/rag/reindex-products');
  const faqReindex = await reindex(accessToken, '/api/chatbot/rag/reindex-faq');

  console.log(
    `[reindex-products] POST /api/chatbot/rag/reindex-products -> ${productReindex.response.status}`,
  );
  console.log(JSON.stringify(productReindex.body, null, 2));
  console.log(
    `[reindex-faq] POST /api/chatbot/rag/reindex-faq -> ${faqReindex.response.status}`,
  );
  console.log(JSON.stringify(faqReindex.body, null, 2));
  console.log('');

  const results = [];

  for (const testCase of TEST_CASES) {
    const chat = await askPublicChat(testCase.message);
    const payload = unwrapBody(chat.body);
    const actualIntent = payload?.intent;
    const shapeOk = isValidResponseShape(payload);
    const statusOk = chat.response.status === 200 || chat.response.status === 201;
    const intentOk = actualIntent === testCase.expectedIntent;
    const classification =
      statusOk && shapeOk && intentOk ? classifyChatResult(payload) : 'FAIL';

    const note = !statusOk
      ? `HTTP ${chat.response.status}`
      : !shapeOk
        ? 'Sai response shape'
        : !intentOk
          ? `intent=${actualIntent}; answer=${shorten(payload?.answer)}`
          : `mode=${payload?.mode}; handoff=${payload?.handoffRequired}; answer=${shorten(
              payload?.answer,
            )}${
              Array.isArray(payload?.warnings) && payload.warnings.length
                ? `; warnings=${payload.warnings.join(' | ')}`
                : ''
            }`;

    results.push({
      message: testCase.message,
      status: chat.response.status,
      expected: testCase.expectedIntent,
      actual: actualIntent ?? '',
      result: classification,
      note,
    });

    console.log(
      `[case] ${classification} | status=${chat.response.status} | expected=${testCase.expectedIntent} | actual=${actualIntent ?? ''}`,
    );

    if (classification === 'FAIL') {
      console.log(JSON.stringify(chat.body, null, 2));
    }
  }

  console.log('');
  console.log('== Summary ==');
  console.table(results);

  const failed = results.filter((result) => result.result === 'FAIL').length;
  const ragRealData = results.filter(
    (result) => result.result === 'RAG_REAL_DATA',
  ).length;
  const hybridRealData = results.filter(
    (result) => result.result === 'HYBRID_REAL_DATA',
  ).length;
  const safeFallback = results.filter(
    (result) => result.result === 'SAFE_FALLBACK',
  ).length;

  console.log(
    `[summary] RAG_REAL_DATA=${ragRealData} | HYBRID_REAL_DATA=${hybridRealData} | SAFE_FALLBACK=${safeFallback} | FAIL=${failed}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
