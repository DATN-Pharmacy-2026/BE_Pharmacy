const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const TEST_CASES = [
  {
    label: 'emergency',
    message: 'toi bi dau bung uong thuoc dau dau xong ngo doc sui bot mep',
    expectedIntent: 'health.emergency',
    assert(payload) {
      return (
        payload.handoffRequired === true &&
        Array.isArray(payload.metadata?.facts?.products) === false
      );
    },
  },
  {
    label: 'price-hyphen',
    message: 'thuoc povidone-iodine bao nhieu tien',
    expectedIntent: 'product.price',
    assert(payload) {
      return (
        payload.metadata?.resolvedEntities?.productId &&
        Number(payload.metadata?.facts?.price) === 72300
      );
    },
  },
  {
    label: 'price-space',
    message: 'povidone iodine gia bao nhieu',
    expectedIntent: 'product.price',
    assert(payload) {
      return Number(payload.metadata?.facts?.price) === 72300;
    },
  },
  {
    label: 'branch',
    message: 'nha thuoc co dia chi o dau',
    expectedIntent: 'branch.lookup',
    assert(payload) {
      return Array.isArray(payload.metadata?.facts?.branches);
    },
  },
  {
    label: 'policy',
    message: 'Nha thuoc co cho doi tra san pham khong?',
    expectedIntent: 'policy.lookup',
    assert(payload) {
      return Array.isArray(payload.metadata?.facts?.excerpts);
    },
  },
  {
    label: 'pregnancy',
    message: 'Toi dang mang thai co dung thuoc nay khong?',
    expectedIntent: 'health.sensitive',
    assert(payload) {
      return payload.handoffRequired === true;
    },
  },
  {
    label: 'symptom-stock',
    message: 'Thuoc dau bung con khong?',
    expectedIntent: 'symptom.stock_lookup',
    assert(payload) {
      return Array.isArray(payload.metadata?.facts?.products);
    },
  },
];

function containsTechnicalLeak(answer) {
  return /sourcepath|chunks?\.json|knowledge-base|\.md\b/i.test(
    String(answer || ''),
  );
}

async function askPublicChat(message) {
  const response = await fetch(`${BASE_URL}/api/chatbot/chat`, {
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

  const body = await response.json();
  return { response, body: body?.data ?? body };
}

function hasStableMetadata(payload) {
  return Boolean(
    payload &&
      typeof payload.intent === 'string' &&
      typeof payload.answer === 'string' &&
      typeof payload.handoffRequired === 'boolean' &&
      payload.metadata &&
      payload.metadata.answerContext &&
      typeof payload.metadata.answerContext.intent === 'string' &&
      payload.metadata.facts &&
      payload.metadata.resolvedEntities,
  );
}

async function main() {
  console.log('== Public Chatbot Deterministic Smoke Test ==');
  console.log(`BASE_URL=${BASE_URL}`);

  let failed = 0;

  for (const testCase of TEST_CASES) {
    const { response, body } = await askPublicChat(testCase.message);
    const ok =
      (response.status === 200 || response.status === 201) &&
      body.intent === testCase.expectedIntent &&
      hasStableMetadata(body) &&
      !containsTechnicalLeak(body.answer) &&
      testCase.assert(body);

    console.log(
      `[case] ${ok ? 'PASS' : 'FAIL'} | ${testCase.label} | status=${response.status} | intent=${body.intent}`,
    );

    if (!ok) {
      failed += 1;
      console.log(JSON.stringify(body, null, 2));
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
