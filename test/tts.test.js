const assert = require('node:assert/strict');
const { splitText } = require('../public/ttsUtils');

const text = 'Bạn vừa nhận được một tin nhắn lạ. '.repeat(12);
const chunks = splitText(text);
assert.ok(chunks.length > 1, 'Split a multi-sentence prompt into sequential audio chunks');
assert.ok(chunks.every((chunk) => chunk.length < 150), 'Keep every Google TTS query shorter than 150 characters');
assert.equal(chunks.join(' ').replace(/\s+/g, ' ').trim(), text.replace(/\s+/g, ' ').trim(), 'Preserve the spoken text when splitting');

const longTokenChunks = splitText('a'.repeat(310));
assert.ok(longTokenChunks.every((chunk) => chunk.length < 150), 'Split long unbroken text below the URL limit');

console.log('ĐẠT: Google TTS chia câu thành các đoạn ngắn dưới 150 ký tự.');
