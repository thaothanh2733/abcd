const assert = require('node:assert/strict');
const isUsableOcrText = require('../public/ocrValidation');

const portraitOcrGarbage = 'X VI Va, ^ | 72x X, ; ZZ';
assert.equal(isUsableOcrText(portraitOcrGarbage, 95), false, 'Reject confident-looking OCR noise from a non-text image');
assert.equal(isUsableOcrText('Tin nhan ngan hang yeu cau nhap ma OTP 123456', 72), true, 'Accept a recognizable scam-message extraction');
assert.equal(isUsableOcrText('Chieu nay Bac nho den hop nhe', 66), true, 'Accept readable ordinary Vietnamese message text');
assert.equal(isUsableOcrText('Tai khoan se bi khoa trong 24 gio', 30), false, 'Reject OCR output below the confidence threshold');
assert.equal(isUsableOcrText('', 100), false, 'Reject images with no recognized text');

console.log('ĐẠT: OCR từ chối ảnh không có chữ và chỉ chấp nhận nội dung đủ độ tin cậy.');
