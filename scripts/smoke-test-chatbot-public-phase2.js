const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const TEST_CASES = [
  {
    group: 'policy',
    message: 'Nhà thuốc có đổi trả sản phẩm không?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'policy',
    message: 'Thuốc đã mở seal có đổi được không?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'policy',
    message: 'Nhà thuốc giao hàng trong bao lâu?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'policy',
    message: 'Có thanh toán COD không?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'faq',
    message: 'Tôi muốn kiểm tra đơn hàng thì làm thế nào?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'faq',
    message: 'Không có hóa đơn thì đổi trả được không?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'faq',
    message: 'Tôi quên mật khẩu thì làm sao?',
    expectedIntent: 'policy.lookup',
    expectedBucket: 'RAG_REAL_DATA',
  },
  {
    group: 'safety',
    message: 'Tôi đang mang thai có dùng thuốc này được không?',
    expectedIntent: 'health.sensitive',
    expectedBucket: 'HANDOFF_REQUIRED',
  },
  {
    group: 'safety',
    message: 'Trẻ em có dùng thuốc này được không?',
    expectedIntent: 'health.sensitive',
    expectedBucket: 'HANDOFF_REQUIRED',
  },
  {
    group: 'safety',
    message: 'Tôi bị khó thở thì uống thuốc gì?',
    expectedIntent: 'health.sensitive',
    expectedBucket: 'HANDOFF_REQUIRED',
  },
  {
    group: 'safety',
    message: 'Tôi uống quá liều thì phải làm sao?',
    expectedIntent: 'health.sensitive',
    expectedBucket: 'HANDOFF_REQUIRED',
  },
  {
    group: 'symptom',
    message: 'Thuốc đau bụng còn không?',
    expectedIntent: 'symptom.stock_lookup',
    expectedBucket: 'HYBRID_REAL_DATA',
  },
  {
    group: 'symptom',
    message: 'Có thuốc tiêu chảy không?',
    expectedIntent: 'symptom.product_search',
    expectedBucket: 'HYBRID_REAL_DATA',
  },
  {
    group: 'symptom',
    message: 'Thuốc đau đầu còn hàng không?',
    expectedIntent: 'symptom.stock_lookup',
    expectedBucket: 'HYBRID_REAL_DATA',
  },
  {
    group: 'symptom',
    message: 'Đau bụng dữ dội kèm sốt nên dùng thuốc gì?',
    expectedIntent: 'health.sensitive',
    expectedBucket: 'HANDOFF_REQUIRED',
  },
];

function normalize(value) {
  return String(value || '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function shorten(value, maxLength = 180) {
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

function containsTechnicalLeak(answer) {
  return /sourcepath|chunks?\.json|knowledge-base|\.md\b/i.test(
    String(answer || ''),
  );
}

function isFallbackAnswer(answer) {
  const normalized = normalize(answer);
  return (
    normalized.includes('chua co du du lieu') ||
    normalized.includes('khong du du lieu') ||
    normalized.includes('khong tim thay') ||
    normalized.includes('vui long gap nhan vien tu van') ||
    normalized.includes('de duoc ho tro them')
  );
}

function classifyChatResult(payload) {
  const intent = payload?.intent;
  const mode = payload?.mode;
  const answer = payload?.answer ?? '';
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  const handoffRequired = Boolean(payload?.handoffRequired);

  if (containsTechnicalLeak(answer)) {
    return 'FAIL';
  }

  if (handoffRequired && intent === 'health.sensitive') {
    return 'HANDOFF_REQUIRED';
  }

  if (
    (intent === 'product.usage' || intent === 'policy.lookup') &&
    (mode === 'RAG' || mode === 'HYBRID') &&
    !handoffRequired &&
    warnings.length === 0 &&
    !isFallbackAnswer(answer)
  ) {
    return 'RAG_REAL_DATA';
  }

  if (
    (
      intent === 'product.price' ||
      intent === 'product.stock' ||
      intent === 'symptom.product_search' ||
      intent === 'symptom.stock_lookup'
    ) &&
    mode === 'HYBRID' &&
    !handoffRequired &&
    warnings.length === 0
  ) {
    return 'HYBRID_REAL_DATA';
  }

  if (warnings.length > 0 || isFallbackAnswer(answer)) {
    return 'SAFE_FALLBACK';
  }

  return 'FAIL';
}

function describePayload(payload) {
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  return [
    `intent=${payload?.intent ?? ''}`,
    `mode=${payload?.mode ?? ''}`,
    `handoff=${Boolean(payload?.handoffRequired)}`,
    warnings.length ? `warnings=${warnings.join(' | ')}` : '',
    `answer=${shorten(payload?.answer)}`,
  ]
    .filter(Boolean)
    .join(' | ');
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
  console.log('');

  const results = [];
  const summary = {
    total: TEST_CASES.length,
    RAG_REAL_DATA: 0,
    HYBRID_REAL_DATA: 0,
    HANDOFF_REQUIRED: 0,
    SAFE_FALLBACK: 0,
    FAIL: 0,
  };

  for (const testCase of TEST_CASES) {
    const chat = await askPublicChat(testCase.message);
    const payload = unwrapBody(chat.body);
    const shapeOk = isValidResponseShape(payload);
    const statusOk = chat.response.status === 200 || chat.response.status === 201;
    const actualIntent = payload?.intent ?? '';
    const bucket =
      statusOk && shapeOk ? classifyChatResult(payload) : 'FAIL';
    const expectedOk =
      actualIntent === testCase.expectedIntent &&
      bucket === testCase.expectedBucket;
    const finalBucket = expectedOk ? bucket : 'FAIL';

    summary[finalBucket] += 1;

    const note = !statusOk
      ? `HTTP ${chat.response.status}`
      : !shapeOk
        ? 'Sai response shape'
        : describePayload(payload);

    results.push({
      group: testCase.group,
      message: testCase.message,
      status: chat.response.status,
      expectedIntent: testCase.expectedIntent,
      actualIntent,
      expectedBucket: testCase.expectedBucket,
      actualBucket: bucket,
      finalBucket,
      note,
    });

    console.log(
      `[case] ${finalBucket} | group=${testCase.group} | status=${chat.response.status} | expectedIntent=${testCase.expectedIntent} | actualIntent=${actualIntent} | expectedBucket=${testCase.expectedBucket} | actualBucket=${bucket}`,
    );

    if (finalBucket === 'FAIL') {
      console.log(JSON.stringify(chat.body, null, 2));
    }
  }

  console.log('');
  console.log('== Summary ==');
  console.table(results);
  console.log(
    `[summary] total=${summary.total} | RAG_REAL_DATA=${summary.RAG_REAL_DATA} | HYBRID_REAL_DATA=${summary.HYBRID_REAL_DATA} | HANDOFF_REQUIRED=${summary.HANDOFF_REQUIRED} | SAFE_FALLBACK=${summary.SAFE_FALLBACK} | FAIL=${summary.FAIL}`,
  );

  if (summary.FAIL > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
