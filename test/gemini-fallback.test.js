const assert = require('assert');
const { analyzeWithGemini } = require('../geminiService');

const expectedResult = {
  alert_level: 'CÓ DẤU HIỆU ĐÁNG NGỜ',
  scenario: 'Giả danh ngân hàng',
  detected_signs: ['Tin nhắn tạo áp lực thời gian.'],
  explanation: 'Tin nhắn yêu cầu xử lý gấp. Bạn nên kiểm tra lại qua kênh chính thức.',
  recommended_actions: [
    'Không bấm vào đường dẫn trong tin nhắn.',
    'Gọi số hotline chính thức của ngân hàng để hỏi lại.'
  ],
  safety_reminder: 'Lời nhắc an toàn.'
};

function apiResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body
  };
}

async function testQuotaFallsBackToNextModel() {
  const originalFetch = global.fetch;
  const requestedModels = [];
  global.fetch = async (url) => {
    const modelName = url.match(/models\/([^:]+):/)[1];
    requestedModels.push(modelName);

    if (modelName === 'gemini-3.5-flash-lite') {
      return apiResponse(429, { error: { message: 'Quota exceeded' } });
    }

    return apiResponse(200, {
      candidates: [{ content: { parts: [{ text: JSON.stringify(expectedResult) }] } }]
    });
  };

  try {
    const result = await analyzeWithGemini('Tin nhắn cần kiểm tra.', 'test-api-key');
    assert.deepStrictEqual(requestedModels, [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ]);
    assert.strictEqual(result.model_used, 'gemini-3.1-flash-lite');
    assert.strictEqual(result.analyzed_by, 'gemini_ai');
  } finally {
    global.fetch = originalFetch;
  }
}

async function testAuthenticationErrorDoesNotFallBack() {
  const originalFetch = global.fetch;
  let requestCount = 0;
  global.fetch = async () => {
    requestCount += 1;
    return apiResponse(403, { error: { message: 'API key is invalid' } });
  };

  try {
    await assert.rejects(
      analyzeWithGemini('Tin nhắn cần kiểm tra.', 'test-api-key'),
      /Gemini API error \(403\)/
    );
    assert.strictEqual(requestCount, 1, 'Lỗi API key không được thử model khác.');
  } finally {
    global.fetch = originalFetch;
  }
}

async function testQuotaAcrossModelsReturnsError() {
  const originalFetch = global.fetch;
  const requestedModels = [];
  global.fetch = async (url) => {
    requestedModels.push(url.match(/models\/([^:]+):/)[1]);
    return apiResponse(429, { error: { message: 'Quota exceeded' } });
  };

  try {
    await assert.rejects(
      analyzeWithGemini('Tin nhắn cần kiểm tra.', 'test-api-key'),
      /Gemini API error \(429\)/
    );
    assert.deepStrictEqual(requestedModels, [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite'
    ]);
  } finally {
    global.fetch = originalFetch;
  }
}

async function main() {
  await testQuotaFallsBackToNextModel();
  await testAuthenticationErrorDoesNotFallBack();
  await testQuotaAcrossModelsReturnsError();
  console.log('ĐẠT: Gemini dự phòng theo thứ tự, không che giấu lỗi API key và dừng sau model cuối.');
}

main().catch((error) => {
  console.error('CHƯA ĐẠT:', error);
  process.exitCode = 1;
});
