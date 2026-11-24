/**
 * notificationBridge.js - Cầu nối tiếp nhận thông báo an toàn cho App Android
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 * 
 * NGUYÊN TẮC BẢO MẬT:
 * 1. Danh sách loại trừ an toàn (Banking Exclusion): Bỏ qua 100% thông báo từ app ngân hàng thật.
 * 2. Quyền đồng thuận chủ động (Explicit Consent): Bắt buộc người dùng bấm/nói "CÓ" mới phân tích.
 * 3. Che dữ liệu nhạy cảm trước khi xử lý.
 */

// Danh sách định danh ứng dụng ngân hàng và ví điện tử chính thức cần BỎ QUA TUYỆT ĐỐI
const EXCLUDED_BANKING_PACKAGES = [
  'com.VCB',                   // VCB Digibank
  'com.vbi.vcb',
  'com.vietcombank.smartotp',
  'com.vnpay.bidv',            // BIDV SmartBanking
  'com.vietinbank.ipay',       // VietinBank iPay
  'com.mbmobile',              // MB Bank
  'vn.com.techcombank.bb.app', // Techcombank Mobile
  'com.tpb.mb.gprsandroid',    // TPBank Mobile
  'com.vnpay.vpbank',          // VPBank NEO
  'com.mservice.momotransfer', // MoMo
  'vn.com.vng.zalopay',        // ZaloPay
  'com.viettel.viettelpay'     // Viettel Money
];

// Danh sách từ khóa người gửi ngân hàng chính thức
const EXCLUDED_BANKING_TITLES = [
  'vcb digibank', 'vietcombank', 'bidv smartbanking', 'bidv',
  'vietinbank ipay', 'mbbank', 'techcombank', 'vpbank neo', 'tpbank'
];

/**
 * Kiểm tra xem thông báo có thuộc ứng dụng tài chính/ngân hàng cần bảo mật hay không
 */
function isExcludedBankingNotification(packageName, title) {
  const pkgLower = (packageName || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // 1. Kiểm tra mã ứng dụng
  if (EXCLUDED_BANKING_PACKAGES.some(pkg => pkgLower.includes(pkg.toLowerCase()))) {
    return true;
  }

  // 2. Kiểm tra tên người gửi/tiêu đề
  if (EXCLUDED_BANKING_TITLES.some(bank => titleLower.includes(bank))) {
    return true;
  }

  return false;
}

/**
 * Xử lý thông báo đến từ Android NotificationListenerService
 */
function handleIncomingNotification(payload) {
  const { title = '', content = '', packageName = '' } = payload || {};

  // 1. Bỏ qua ngay nếu là thông báo từ ngân hàng thật để bảo vệ OTP & số dư
  if (isExcludedBankingNotification(packageName, title)) {
    console.log('🛡️ [Lá Chắn] Bỏ qua thông báo ngân hàng chính thức để bảo mật thông tin tài chính.');
    return { status: 'IGNORED_BANKING', reason: 'Thông báo ngân hàng được bảo mật riêng tư' };
  }

  // 2. Bỏ qua nếu nội dung quá ngắn
  if (!content || content.trim().length < 5) {
    return { status: 'IGNORED_EMPTY', reason: 'Nội dung thông báo không đủ để phân tích' };
  }

  // 3. Kích hoạt quy trình hỏi ý kiến người cao tuổi
  if (typeof window.triggerNotificationInquiry === 'function') {
    window.triggerNotificationInquiry({
      sender: title || 'Người gửi lạ',
      content: content.trim(),
      packageName
    });
    return { status: 'INQUIRY_PROMPTED', sender: title };
  }

  return { status: 'READY_WAITING_HANDLER' };
}

// Cung cấp hàm toàn cục cho lớp Android WebView gọi vào
if (typeof window !== 'undefined') {
  window.onReceiveAppNotification = function (jsonStringOrObject) {
    let payload = jsonStringOrObject;
    if (typeof jsonStringOrObject === 'string') {
      try {
        payload = JSON.parse(jsonStringOrObject);
      } catch (err) {
        payload = { content: jsonStringOrObject };
      }
    }
    return handleIncomingNotification(payload);
  };
}

// Hỗ trợ môi trường Node.js kiểm thử
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EXCLUDED_BANKING_PACKAGES,
    EXCLUDED_BANKING_TITLES,
    isExcludedBankingNotification,
    handleIncomingNotification
  };
}
