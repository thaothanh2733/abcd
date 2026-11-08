function isUsableOcrText(text, confidence) {
  if (typeof text !== 'string' || !Number.isFinite(confidence) || confidence < 35) {
    return false;
  }

  const normalized = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const words = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  const letterCount = (normalized.match(/\p{L}/gu) || []).length;
  const longWordCount = words.filter((word) => (word.match(/\p{L}/gu) || []).length >= 3).length;
  const hasMessageSignal = /\b(otp|ngan hang|cong an|chuyen tien|chuyen khoan|tai khoan|xac minh|trung thuong|nap tien|mat khau)\b/.test(normalized);

  if (hasMessageSignal && confidence >= 55 && letterCount >= 3) {
    return true;
  }

  if (confidence >= 55 && longWordCount >= 2 && letterCount >= 8) {
    return true;
  }

  return confidence >= 45 && longWordCount >= 4 && letterCount >= 15;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = isUsableOcrText;
}
