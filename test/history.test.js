const assert = require('node:assert/strict');
const MessageHistory = require('../public/history');

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set(MessageHistory.STORAGE_KEY, initialValue);
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

const storage = createStorage();
const sampleResult = {
  alert_level: 'NGUY HIỂM CAO',
  scenario: 'Giả danh ngân hàng',
  detected_signs: ['Đòi OTP'],
  explanation: 'Tin nhắn yêu cầu mã OTP.',
  recommended_actions: ['Không chia sẻ mã OTP.'],
  safety_reminder: 'Xác minh qua kênh chính thức.',
  model_used: 'model-name',
  analyzed_by: 'gemini_ai'
};

const firstEntry = MessageHistory.createEntry('Tin nhắn cần kiểm tra', sampleResult, new Date('2026-11-09T01:00:00.000Z'));
MessageHistory.save(storage, [firstEntry]);
assert.deepEqual(MessageHistory.load(storage), [firstEntry], 'History should restore persisted analysis entries');
assert.equal(firstEntry.result.model_used, undefined, 'History should store only user-facing result data');

const recentEntries = Array.from({ length: 20 }, (_, index) =>
  MessageHistory.createEntry(`Tin nhắn ${index}`, sampleResult, new Date(1762640000000 + index))
);
MessageHistory.save(storage, recentEntries);
assert.equal(MessageHistory.load(storage).length, 15, 'History should retain at most 15 entries');
assert.equal(MessageHistory.load(storage)[0].text, 'Tin nhắn 0', 'Most recent entries should be retained first');

const malformedStorage = createStorage('{"not":"an array"}');
assert.deepEqual(MessageHistory.load(malformedStorage), [], 'Malformed storage shape should load as empty history');

console.log('ĐẠT: Lịch sử lưu cục bộ, khôi phục được và giới hạn 15 mục.');
