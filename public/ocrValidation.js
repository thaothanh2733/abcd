function isUsableOcrText(text, confidence) {
  if (typeof text !== 'string' || text.trim().length < 15 || !Number.isFinite(confidence) || confidence < 35) {
    return false;
  }

  const normalized = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/đ/g, 'd');
  const words = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  const interfaceWords = new Set([
    'google', 'tim', 'kiem', 'gmail', 'hinh', 'anh', 'trang', 'chu', 'cai', 'dat',
    'home', 'search', 'images', 'settings', 'menu', 'maps', 'news', 'drive',
    'dang', 'nhap', 'tiep', 'theo', 'them', 'xem', 'tat', 'ca'
  ]);
  const hasMessageOrFinancialContext = /\b(otp|ngan hang|cong an|chuyen tien|chuyen khoan|tai khoan|xac minh|trung thuong|nap tien|mat khau|tin nhan|sms|zalo|messenger|facebook|thanh toan|ma bao mat|ma xac nhan|khoa tai khoan|chuyen khoan|nhan tien|gui tien|thong bao)\b/.test(normalized);
  const hasConversationalContext = /\b(xin chao|chao ban|ban vui long|ban hay|ban can|ban da|toi vua|toi can|toi da|minh can|minh da|em da|em can|anh da|chi da|bac nho|bac vui long|chu nho|nho goi|nho den|vui long|hay bam|yeu cau|cho biet|giup toi|giup minh)\b/.test(normalized);

  if (!hasMessageOrFinancialContext && !hasConversationalContext) {
    return false;
  }

  if (words.length > 0 && !hasMessageOrFinancialContext && words.every((word) => interfaceWords.has(word))) {
    return false;
  }

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
