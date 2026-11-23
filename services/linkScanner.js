/**
 * services/linkScanner.js - Bộ đối soát liên kết độc hại & Threat Intelligence
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

const SHORTENER_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'buff.ly',
  'goo.gl', 'cutt.ly', 'gg.gg', 'ow.ly', 's.id', 'shorturl.at'
];

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.vip', '.club', '.online', '.site',
  '.tk', '.ga', '.ml', '.cf', '.gq', '.app', '.cc', '.live', '.me', '.cyou', '.icu'
];

const SPOOFED_BRANDS = [
  { brand: 'Vietcombank', regex: /(?:vcb|vietcombank)[^\s/.]*\.(?!com\.vn|vn)[a-z0-9.-]+/i },
  { brand: 'Techcombank', regex: /(?:techcombank)[^\s/.]*\.(?!com\.vn|vn)[a-z0-9.-]+/i },
  { brand: 'BIDV', regex: /(?:bidv)[^\s/.]*\.(?!com\.vn|vn)[a-z0-9.-]+/i },
  { brand: 'MBBank', regex: /(?:mbbank)[^\s/.]*\.(?!com\.vn|vn)[a-z0-9.-]+/i },
  { brand: 'Agribank', regex: /(?:agribank)[^\s/.]*\.(?!com\.vn|vn)[a-z0-9.-]+/i },
  { brand: 'ACB', regex: /(?:acb)[^\s/.]*\.(?!com\.vn|vn)[a-z0-9.-]+/i },
  { brand: 'Cổng Dịch vụ công / VNeID', regex: /(?:dichvucong|vneid|bocongan)[^\s/.]*\.(?!gov\.vn)[a-z0-9.-]+/i }
];

/**
 * Trích xuất và phân tích toàn bộ đường link có trong văn bản (kể cả không có https://)
 */
function scanLinks(text) {
  if (!text || typeof text !== 'string') return { hasThreat: false, detectedLinks: [] };

  const urlRegex = /(?:(?:https?:\/\/|www\.)[^\s<>"'()]+|(?:(?:\b[a-zA-Z0-9-]+\.)+(?:com\.vn|edu\.vn|gov\.vn|vn|com|org|net|xyz|top|vip|club|online|site|app|cc|live|me|ly|gd|gg|id|at|top))(?:\/[^\s<>"'()]*)?)/gi;
  const matches = text.match(urlRegex) || [];
  const detectedLinks = [];
  const seenUrls = new Set();

  for (const rawUrl of matches) {
    const cleanUrl = rawUrl.replace(/[.,;!?]+$/, ''); // bỏ dấu câu dính ở cuối link
    if (seenUrls.has(cleanUrl.toLowerCase())) continue;
    seenUrls.add(cleanUrl.toLowerCase());

    const urlLower = cleanUrl.toLowerCase();
    let threatReason = null;
    let threatType = null;

    // 1. Kiểm tra IP trực tiếp
    if (/https?:\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i.test(urlLower)) {
      threatType = 'IP_DIRECT';
      threatReason = 'Đường dẫn sử dụng địa chỉ IP trực tiếp thay vì tên miền chính thức, thường dùng để ẩn danh lừa đảo.';
    }

    // 2. Kiểm tra link giả mạo thương hiệu ngân hàng / dịch vụ công
    if (!threatType) {
      for (const item of SPOOFED_BRANDS) {
        if (item.regex.test(urlLower)) {
          threatType = 'BRAND_IMPERSONATION';
          threatReason = `Đường dẫn mạo danh ${item.brand} (không dùng đuôi tên miền chính thức).`;
          break;
        }
      }
    }

    // 3. Kiểm tra link rút gọn
    if (!threatType) {
      for (const shortener of SHORTENER_DOMAINS) {
        if (urlLower.includes(shortener)) {
          threatType = 'SHORTENED_URL';
          threatReason = `Liên kết rút gọn (${shortener}) nhằm che giấu trang đích thực tế.`;
          break;
        }
      }
    }

    // 4. Kiểm tra đuôi tên miền bất thường hay bị lạm dụng
    if (!threatType) {
      for (const tld of SUSPICIOUS_TLDS) {
        if (urlLower.includes(tld)) {
          threatType = 'SUSPICIOUS_TLD';
          threatReason = `Đuôi tên miền lạ (${tld}) giá rẻ, thường bị kẻ xấu đăng ký hàng loạt để lừa đảo.`;
          break;
        }
      }
    }

    detectedLinks.push({
      url: cleanUrl,
      isSuspicious: !!threatType,
      threatType: threatType || 'NORMAL',
      threatReason: threatReason || 'Chưa phát hiện dấu hiệu bất thường trên đường dẫn này.'
    });
  }

  const hasThreat = detectedLinks.some(l => l.isSuspicious);
  return {
    hasThreat,
    detectedLinks
  };
}

module.exports = {
  scanLinks,
  SHORTENER_DOMAINS,
  SUSPICIOUS_TLDS,
  SPOOFED_BRANDS
};
