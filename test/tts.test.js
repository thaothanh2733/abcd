const assert = require('node:assert/strict');
const { splitText, isMobileDevice } = require('../public/ttsUtils');

const text = 'Bạn vừa nhận được một tin nhắn lạ. '.repeat(12);
const chunks = splitText(text);
assert.ok(chunks.length > 1, 'Split a multi-sentence prompt into sequential audio chunks');
assert.ok(chunks.every((chunk) => chunk.length < 150), 'Keep every Google TTS query shorter than 150 characters');
assert.equal(chunks.join(' ').replace(/\s+/g, ' ').trim(), text.replace(/\s+/g, ' ').trim(), 'Preserve the spoken text when splitting');

const longTokenChunks = splitText('a'.repeat(310));
assert.ok(longTokenChunks.every((chunk) => chunk.length < 150), 'Split long unbroken text below the URL limit');

assert.equal(
  isMobileDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', maxTouchPoints: 1 }),
  true,
  'Recognize Android mobile browsers'
);
assert.equal(
  isMobileDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 5 }),
  true,
  'Recognize iPadOS desktop mode'
);
assert.equal(
  isMobileDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', userAgentData: { mobile: true } }),
  true,
  'Recognize browsers exposing mobile user-agent data'
);
assert.equal(
  isMobileDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }, true),
  true,
  'Recognize devices whose primary pointer is touch'
);
assert.equal(
  isMobileDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', maxTouchPoints: 0 }),
  false,
  'Do not treat ordinary desktop browsers as mobile'
);

console.log('ĐẠT: TTS chia đoạn an toàn và ưu tiên đọc cục bộ trên mobile.');
