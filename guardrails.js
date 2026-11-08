/**
 * guardrails.js - Bộ luật cứng bảo vệ và Công cụ phân tích quy tắc nội bộ
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

// Danh sách các kịch bản chuẩn hóa
const SCENARIOS = {
  BANK: 'Giả danh ngân hàng',
  AUTHORITY: 'Giả danh công an / cơ quan chức năng',
  PRIZE: 'Trúng thưởng / nhận quà',
  RELATIVE: 'Người quen mượn tiền',
  JOB_INVESTMENT: 'Việc làm hoặc đầu tư online',
  UNKNOWN: 'Chưa xác định được kịch bản'
};

// Ba mức độ cảnh báo chuẩn hóa theo quy định
const ALERT_LEVELS = {
  HIGH: 'NGUY HIỂM CAO',
  SUSPICIOUS: 'CÓ DẤU HIỆU ĐÁNG NGỜ',
  UNCLEAR: 'CHƯA THẤY DẤU HIỆU RÕ'
};

const STANDARD_SAFETY_REMINDER =
  'Đừng vội làm theo yêu cầu trong tin nhắn. Nếu chưa chắc chắn, hãy hỏi người thân hoặc liên hệ trực tiếp với cơ quan, tổ chức qua kênh chính thức.';

/**
 * Che giấu thông tin nhạy cảm trước khi xử lý hoặc hiển thị
 * (Bảo vệ thông tin cá nhân: OTP, Số tài khoản, Số điện thoại, Mật khẩu)
 */
function maskSensitiveData(text) {
  if (!text || typeof text !== 'string') return '';

  let masked = text;

  // 1. Che mã OTP (4-8 chữ số đi liền từ khóa mã/otp/xác thực/code)
  masked = masked.replace(/(otp|mã\s*(?:xác\s*thực|otp|bảo\s*mật|pin|gd)?[:\s-]*)([0-9]{4,8})/gi, (match, prefix, digits) => {
    return `${prefix}******`;
  });

  // 2. Che số tài khoản ngân hàng (8-16 chữ số sau stk/tài khoản/tk/stk)
  masked = masked.replace(/(stk|số\s*tài\s*khoản|tk[:\s]*)([0-9]{3,4})([0-9]{3,10})([0-9]{2})/gi, (match, prefix, head, mid, tail) => {
    return `${prefix}${head}****${tail}`;
  });

  // 3. Che số điện thoại Việt Nam (10 chữ số bắt đầu bằng 03, 05, 07, 08, 09)
  masked = masked.replace(/(0[35789]\d)(\d{4})(\d{3})/g, '$1****$3');

  // 4. Che mật khẩu (sau từ khóa mật khẩu / password)
  masked = masked.replace(/(mật\s*khẩu|password|pass[:\s]+)([^\s,.\n]+)/gi, '$1******');

  return masked;
}

/**
 * Kiểm tra các dấu hiệu kích hoạt luật cứng (Hard Rule Triggers)
 * Hỗ trợ cả tiếng Việt có dấu và KHÔNG DẤU (SMS thông dụng)
 */
function inspectHardRuleTriggers(text) {
  const lower = text.toLowerCase();

  // Kiểm tra OTP
  const hasOtpRequest =
    /(mã\s*otp|ma\s*otp|mã\s*xác\s*thực|ma\s*xac\s*thuc|smart\s*otp|soft\s*otp|cung\s*cấp\s*mã|cung\s*cap\s*ma|gửi\s*mã|gui\s*ma|nhập\s*mã|nhap\s*ma|chia\s*sẻ\s*mã|chia\s*se\s*ma)/i.test(lower) ||
    /\botp\b/i.test(lower);

  // Kiểm tra yêu cầu chuyển tiền / nộp phí / nạp tiền làm nhiệm vụ
  const hasMoneyTransfer =
    /(chuyển\s*khoản|chuyen\s*khoan|chuyển\s*tiền|chuyen\s*tien|nộp\s*tiền|nop\s*tien|nộp\s*phí|nop\s*phi|đặt\s*cọc|dat\s*coc|chuyển\s*vào|chuyen\s*vao|bắn\s*tiền|ban\s*tien|mượn\s*tiền|muon\s*tien|vay\s*tiền|vay\s*tien|vay\s*gấp|vay\s*gap|mượn\s*gấp|muon\s*gap|kẹt\s*tiền|ket\s*tien|nạp\s*tiền|nap\s*tien|nạp\s*vốn|nap\s*von|nạp\s*[0-9]+[kK]?|nap\s*[0-9]+[kK]?)/i.test(lower) ||
    /(nộp|nop|đóng|dong|chuyển|chuyen).*(phí|phi|tiền|tien|lệ\s*phí|le\s*phi|cọc|coc)/i.test(lower);

  // Kiểm tra liên kết rút gọn hoặc liên kết lạ
  const hasShortOrSuspiciousLink =
    /(bit\.ly|tinyurl\.com|t\.co|is\.gd|buff\.ly|goo\.gl|cutt\.ly|gg\.gg|ow\.ly|s\.id|shorturl\.at)/i.test(lower) ||
    /https?:\/\/[^\s]+(\.xyz|\.top|\.vip|\.club|\.online|\.site|\.tk|\.ga|\.ml|\.cf|\.gq|\.app|\.cc|\.live|\.me)/i.test(lower) ||
    /https?:\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i.test(lower) || // Địa chỉ IP trực tiếp
    /https?:\/\/[^\s]*(vietcombank|techcombank|bidv|mbbank|agribank|vcb|acb)[^\s]*\.(?!com\.vn|vn)[a-z0-9.-]+/i.test(lower); // Tên miền giả ngân hàng

  // Kiểm tra thúc ép thời gian / đe dọa
  const hasUrgencyOrThreat =
    /(trong\s*(?:vòng\s*)?(?:24|12|48)\s*(?:giờ|tiếng|h)|ngay\s*lập\s*tức|ngay\s*lap\s*tuc|khẩn\s*cấp|khan\s*cap|sẽ\s*bị\s*khóa|se\s*bi\s*khoa|tạm\s*khóa|tam\s*khoa|sẽ\s*bị\s*hủy|se\s*bi\s*huy|lệnh\s*bắt|lenh\s*bat|truy\s*nã|truy\s*na|khởi\s*tố|khoi\s*to|tạm\s*giam|tam\s*giam|công\s*an\s*triệu\s*tập|cong\s*an\s*trieu\s*tap)/i.test(lower);

  return {
    hasOtpRequest,
    hasMoneyTransfer,
    hasShortOrSuspiciousLink,
    hasUrgencyOrThreat
  };
}

/**
 * Bộ quy tắc phân tích nội bộ (Rule-based Analysis Engine)
 * Phục vụ chế độ độc lập/thử nghiệm minh bạch khi chưa có API AI hoặc khi API lỗi.
 */
function analyzeWithRuleEngine(rawText) {
  const text = rawText || '';
  const lower = text.toLowerCase();
  const triggers = inspectHardRuleTriggers(text);

  let scenario = SCENARIOS.UNKNOWN;
  let alert_level = ALERT_LEVELS.UNCLEAR;
  const detected_signs = [];
  let explanation = '';
  const recommended_actions = [];

  // Điểm số phân loại cho từng kịch bản
  let bankScore = 0;
  let authorityScore = 0;
  let prizeScore = 0;
  let relativeScore = 0;
  let jobScore = 0;

  // 1. Phân tích kịch bản Ngân hàng (hỗ trợ có dấu và không dấu)
  if (/(ngân\s*hàng|ngan\s*hang|vietcombank|vcb|techcombank|bidv|mbbank|agribank|acb|vpbank|tpbank|sacombank|hdbank|shb|msb|vib|ocb|scb|pvcombank|vietinbank)/i.test(lower)) bankScore += 3;
  if (/(tài\s*khoản|tai\s*khoan|thẻ|the).*(bị|sẽ\s*bị|bi|se\s*bi)?\s*(khóa|tạm\s*khóa|đình\s*chỉ|hủy|khoa|tam\s*khoa)/i.test(lower) ||
      /(biến\s*động\s*số\s*dư|bien\s*dong\s*so\s*du|đăng\s*nhập\s*bất\s*thường|dang\s*nhap\s*bat\s*thuong|xác\s*thực\s*sinh\s*trắc\s*học|nâng\s*cấp\s*hệ\s*thống)/i.test(lower)) bankScore += 3;
  if (/e-?banking|i-?banking|digibank|smartbanking/i.test(lower)) bankScore += 2;

  // 2. Phân tích kịch bản Công an / Cơ quan chức năng
  if (/(công\s*an|cong\s*an|viện\s*kiểm\s*sát|vien\s*kiem\s*sat|tòa\s*án|toa\s*an|bộ\s*công\s*an|bo\s*cong\s*an|cục\s*an\s*ninh|cuc\s*an\s*ninh|cảnh\s*sát\s*giao\s*thông|csgt)/i.test(lower)) authorityScore += 4;
  if (/(lệnh\s*bắt|lenh\s*bat|truy\s*nã|truy\s*na|khởi\s*tố|khoi\s*to|rửa\s*tiền|rua\s*tien|buôn\s*ma\s*túy|buon\s*ma\s*tuy|vi\s*phạm\s*pháp\s*luật|vi\s*pham\s*phap\s*luat|vụ\s*án|vu\s*an)/i.test(lower)) authorityScore += 4;
  if (/(điều\s*tra\s*bí\s*mật|dieu\s*tra\s*bi\s*mat|tuyệt\s*đối\s*không\s*tiết\s*lộ|tuyet\s*doi\s*khong\s*tiet\s*lo|chuyển\s*vào\s*tài\s*khoản\s*tạm\s*giữ|chuyen\s*vao\s*tai\s*khoan\s*tam\s*giu|chứng\s*minh\s*trong\s*sạch|chung\s*minh\s*trong\s*sach)/i.test(lower)) authorityScore += 4;

  // 3. Phân tích kịch bản Trúng thưởng / Nhận quà
  if (/(trúng\s*thưởng|trung\s*thuong|quà\s*tặng|qua\s*tang|tri\s*ân|tri\s*an|chúc\s*mừng|chuc\s*mung|quay\s*số|quay\s*so|giải\s*thưởng|giai\s*thuong|xe\s*sh|sổ\s*tiết\s*kiệm|100\s*triệu|iphone)/i.test(lower)) prizeScore += 4;
  if (/(nộp\s*lệ\s*phí|nop\s*le\s*phi|đóng\s*thuế|dong\s*thue|phí\s*vận\s*chuyển|phi\s*van\s*chuyen|đặt\s*cọc\s*nhận|dat\s*coc\s*nhan|đóng\s*tiền\s*trước|dong\s*tien\s*truoc)/i.test(lower)) prizeScore += 4;

  // 4. Phân tích kịch bản Người quen mượn tiền (kể cả không dấu: me oi, con day, cap cuu...)
  if (/(mẹ\s*ơi|me\s*oi|bố\s*ơi|bo\s*oi|ba\s*ơi|ba\s*oi|ông\s*ơi|ong\s*oi|bà\s*ơi|ba\s*oi|con\s*đây|con\s*day|cháu\s*đây|chau\s*day|anh\s*chị\s*ơi|anh\s*chi\s*oi|bạn\s*à|ban\s*a|mình\s*là|minh\s*la)/i.test(lower)) relativeScore += 3;
  if (/(cho\s*(?:mình|em|con|cháu|minh|chau)\s*(?:mượn|vay|muon)|vay\s*gấp|vay\s*gap|mượn\s*gấp|muon\s*gap|kẹt\s*tiền|ket\s*tien|cần\s*gấp|can\s*gap|chuyển\s*khoản\s*hộ|chuyen\s*khoan\s*ho|chuyển\s*giúp|chuyen\s*giup|cấp\s*cứu|cap\s*cuu|bệnh\s*viện|benh\s*vien|viện\s*phí|vien\s*phi)/i.test(lower)) relativeScore += 4;
  if (/(số\s*mới|so\s*moi|mất\s*máy|mat\s*may|rơi\s*xuống\s*nước|roi\s*xuong\s*nuoc|hỏng\s*máy|hong\s*may|tài\s*khoản.*bạn|tai\s*khoan.*ban|stk.*bạn|stk.*ban)/i.test(lower)) relativeScore += 3;

  // 5. Phân tích kịch bản Việc làm / Đầu tư online
  if (/(việc\s*làm\s*tại\s*nhà|viec\s*lam\s*tai\s*nha|tuyển\s*dụng|tuyen\s*dung|ctv|cộng\s*tác\s*viên|cong\s*tac\s*vien|đánh\s*giá\s*sản\s*phẩm|danh\s*gia\s*san\s*pham|thả\s*tim|tha\s*tim|giật\s*đơn|giat\s*don|xem\s*video|tiktok|shopee|lazada)/i.test(lower)) jobScore += 3;
  if (/(hoa\s*hồng|hoa\s*hong|[0-9]+%|thu\s*nhập|thu\s*nhap|[0-9]+\s*(?:triệu|k)|kiếm\s*tiền|kiem\s*tien|đầu\s*tư|dau\s*tu|chứng\s*khoán|chung\s*khoan|tiền\s*ảo|tien\s*ao|forex)/i.test(lower)) jobScore += 3;
  if (/(nạp.*nhiệm\s*vụ|nap.*nhiem\s*vu|nạp\s*tiền|nap\s*tien|nạp\s*vốn|nap\s*von|telegram|nhóm\s*zalo|nhom\s*zalo|nâng\s*cấp\s*vip|nang\s*cap\s*vip)/i.test(lower)) jobScore += 4;

  // Xác định kịch bản có điểm cao nhất
  const scores = [
    { type: SCENARIOS.BANK, score: bankScore },
    { type: SCENARIOS.AUTHORITY, score: authorityScore },
    { type: SCENARIOS.PRIZE, score: prizeScore },
    { type: SCENARIOS.RELATIVE, score: relativeScore },
    { type: SCENARIOS.JOB_INVESTMENT, score: jobScore }
  ];

  scores.sort((a, b) => b.score - a.score);
  const highest = scores[0];

  if (highest.score >= 3) {
    scenario = highest.type;
  } else {
    scenario = SCENARIOS.UNKNOWN;
  }

  // Thu thập các dấu hiệu nhận biết cụ thể
  if (triggers.hasOtpRequest) {
    detected_signs.push('Yêu cầu cung cấp hoặc chia sẻ mã xác thực bảo mật OTP.');
  }
  if (triggers.hasShortOrSuspiciousLink) {
    detected_signs.push('Chứa đường dẫn liên kết rút gọn hoặc trang web lạ không rõ nguồn gốc.');
  }
  if (triggers.hasUrgencyOrThreat) {
    detected_signs.push('Tạo áp lực tâm lý khẩn cấp (giới hạn thời gian, đe dọa khóa thẻ, xử lý vi phạm).');
  }
  if (triggers.hasMoneyTransfer) {
    detected_signs.push('Thúc ép chuyển tiền, nộp phí hoặc chuyển khoản vào số tài khoản cá nhân.');
  }
  if (prizeScore >= 3) {
    detected_signs.push('Hứa hẹn quà tặng hoặc giải thưởng lớn bất thường nhưng bắt đóng phí trước.');
  }
  if (jobScore >= 3) {
    detected_signs.push('Quảng cáo việc làm nhẹ nhàng, hoa hồng cao phi thực tế, bắt nạp tiền làm nhiệm vụ.');
  }
  if (relativeScore >= 3) {
    detected_signs.push('Giả danh người thân nhờ chuyển khoản gấp hoặc mượn tiền qua số tài khoản lạ.');
  }

  // Xác định mức độ cảnh báo
  const totalRiskCount = detected_signs.length;

  if (
    triggers.hasOtpRequest ||
    (authorityScore >= 4 && (triggers.hasMoneyTransfer || triggers.hasUrgencyOrThreat)) ||
    (bankScore >= 3 && (triggers.hasShortOrSuspiciousLink || triggers.hasOtpRequest || triggers.hasUrgencyOrThreat)) ||
    (prizeScore >= 4 && triggers.hasMoneyTransfer) ||
    (jobScore >= 3 && (triggers.hasMoneyTransfer || jobScore >= 6)) ||
    (relativeScore >= 4 && triggers.hasMoneyTransfer) ||
    totalRiskCount >= 2
  ) {
    alert_level = ALERT_LEVELS.HIGH;
  } else if (
    totalRiskCount >= 1 ||
    triggers.hasMoneyTransfer ||
    triggers.hasShortOrSuspiciousLink ||
    highest.score >= 3
  ) {
    alert_level = ALERT_LEVELS.SUSPICIOUS;
  } else {
    alert_level = ALERT_LEVELS.UNCLEAR;
  }

  // Xây dựng lời giải thích dễ hiểu (2-3 câu ngắn gọn cho người cao tuổi)
  if (alert_level === ALERT_LEVELS.HIGH) {
    if (scenario === SCENARIOS.BANK) {
      explanation =
        'Tin nhắn này giả danh ngân hàng để tạo áp lực rằng tài khoản của bạn đang gặp sự cố và yêu cầu nhấp vào liên kết hoặc cung cấp mã OTP. Ngân hàng thật không bao giờ yêu cầu khách hàng cung cấp mã OTP hay bấm vào link lạ để mở khóa tài khoản. Đây là thủ đoạn lừa đảo rất phổ biến nhằm chiếm đoạt toàn bộ tiền tiết kiệm trong tài khoản.';
      recommended_actions.push('Tuyệt đối không nhấn vào bất kỳ liên kết nào trong tin nhắn.');
      recommended_actions.push('Không cung cấp mã OTP, mật khẩu ngân hàng cho bất kỳ ai.');
      recommended_actions.push('Gọi ngay tổng đài in trên thẻ ATM hoặc nhờ con cháu ra quầy giao dịch kiểm tra.');
    } else if (scenario === SCENARIOS.AUTHORITY) {
      explanation =
        'Tin nhắn hoặc kẻ gửi đang giả mạo cơ quan công an, viện kiểm sát để đe dọa bạn liên quan đến vụ án và ép buộc chuyển tiền hoặc cung cấp thông tin. Cơ quan chức năng Nhà nước không bao giờ làm việc, gửi lệnh bắt hay yêu cầu công dân chuyển tiền qua tin nhắn điện thoại. Bạn không cần lo lắng vì đây hoàn toàn là chiêu trò dọa nạt nhằm chiếm đoạt tài sản.';
      recommended_actions.push('Bình tĩnh, tuyệt đối không chuyển bất kỳ khoản tiền nào theo hướng dẫn.');
      recommended_actions.push('Không gọi lại số điện thoại lạ hoặc làm theo lời dọa dẫm.');
      recommended_actions.push('Báo ngay cho con cháu hoặc trực tiếp đến trụ sở Công an phường/xã gần nhất để trình báo.');
    } else if (scenario === SCENARIOS.PRIZE) {
      explanation =
        'Tin nhắn thông báo bạn trúng giải thưởng có giá trị lớn nhưng lại yêu cầu bạn phải đóng trước một khoản lệ phí hoặc tiền vận chuyển để nhận thưởng. Đây là bẫy lừa đảo thường gặp, sau khi bạn gửi tiền thì kẻ lừa đảo sẽ cắt đứt liên lạc và không có món quà nào cả. Doanh nghiệp uy tín không bao giờ yêu cầu người trúng giải phải chuyển tiền trước qua tài khoản cá nhân.';
      recommended_actions.push('Tuyệt đối không chuyển tiền cọc hay tiền phí nhận giải cho người lạ.');
      recommended_actions.push('Không gửi thông tin căn cước công dân hoặc số tài khoản ngân hàng.');
      recommended_actions.push('Bỏ qua hoặc xóa tin nhắn trúng thưởng đáng ngờ này.');
    } else if (scenario === SCENARIOS.JOB_INVESTMENT) {
      explanation =
        'Tin nhắn dụ dỗ làm việc nhẹ lương cao hoặc tham gia đầu tư sinh lời nhanh, yêu cầu nạp tiền làm nhiệm vụ rồi hứa trả hoa hồng. Kẻ lừa đảo thường cho rút thử một số tiền nhỏ ban đầu để tạo lòng tin, sau đó ép nạp số tiền lớn hơn rồi khóa tài khoản. Không có công việc nào vừa dễ dàng lại mang lại thu nhập cao bất thường như vậy trên mạng.';
      recommended_actions.push('Không nạp tiền hoặc chuyển khoản vào bất kỳ tài khoản nào để làm nhiệm vụ.');
      recommended_actions.push('Rời khỏi các hội nhóm kín lạ trên Telegram hoặc Zalo.');
      recommended_actions.push('Cảnh báo người thân và bạn bè không tham gia các hình thức đầu tư này.');
    } else if (scenario === SCENARIOS.RELATIVE) {
      explanation =
        'Tin nhắn xưng là con cháu hoặc người quen đang gặp chuyện gấp và nhờ bạn chuyển tiền gấp vào một số tài khoản lạ. Kẻ xấu thường chiếm đoạt tài khoản mạng xã hội hoặc mạo danh người thân để lợi dụng lòng tốt và tâm lý lo lắng của người cao tuổi. Khi nhận yêu cầu mượn tiền bất ngờ, bạn luôn cần xác minh cẩn thận.';
      recommended_actions.push('Chưa vội chuyển tiền ngay dù người gửi có hối thúc đến đâu.');
      recommended_actions.push('Gọi điện thoại trực tiếp vào số cũ của người thân để nghe giọng xác nhận.');
      recommended_actions.push('Hỏi lại các thông tin chỉ hai người trong gia đình biết để kiểm chứng.');
    } else {
      explanation =
        'Tin nhắn có chứa các dấu hiệu nguy cơ lừa đảo nghiêm trọng như yêu cầu cung cấp thông tin bảo mật bí mật hoặc thúc ép giao dịch tài chính. Kẻ gian thường đánh vào tâm lý lo sợ hoặc tò mò của người nhận để chiếm đoạt tiền. Bạn cần hết sức thận trọng và không thao tác theo tin nhắn này.';
      recommended_actions.push('Không nhấn vào liên kết lạ hoặc gửi mã xác thực cho bất kỳ ai.');
      recommended_actions.push('Không chuyển tiền cho bất kỳ tài khoản lạ nào.');
      recommended_actions.push('Tham khảo ý kiến của con cháu hoặc người có chuyên môn.');
    }
  } else if (alert_level === ALERT_LEVELS.SUSPICIOUS) {
    explanation =
      'Tin nhắn này có một số dấu hiệu bất thường cần phải cẩn trọng kiểm tra lại trước khi phản hồi hoặc làm theo. Mặc dù chưa đủ căn cứ khẳng định 100% là lừa đảo, nội dung có biểu hiện bất thường như liên kết không rõ ràng, yêu cầu tiền bạc hoặc hối thúc thời gian. Để đảm bảo an toàn tối đa cho bản thân, người dùng không nên thực hiện theo yêu cầu ngay.';
    recommended_actions.push('Không vội vàng làm theo các chỉ dẫn hay bấm vào đường dẫn lạ.');
    recommended_actions.push('Liên hệ trực tiếp với người gửi qua một kênh độc lập đáng tin cậy để xác minh.');
    recommended_actions.push('Hỏi ý kiến con cháu hoặc người trong gia đình trước khi đưa ra quyết định.');
  } else {
    // CHƯA THẤY DẤU HIỆU RÕ
    explanation =
      'Hệ thống chưa tìm thấy các dấu hiệu lừa đảo phổ biến trong nội dung tin nhắn được cung cấp. Tuy nhiên, điều này không khẳng định tin nhắn chắc chắn an toàn 100%. Kẻ lừa đảo liên tục thay đổi hình thức tinh vi, do đó bạn hãy luôn giữ tinh thần cảnh giác.';
    recommended_actions.push('Vẫn giữ cảnh giác nếu tin nhắn tiếp theo có yêu cầu liên quan đến tiền bạc hoặc mã số bảo mật.');
    recommended_actions.push('Nếu có bất kỳ điều gì băn khoăn, hãy trao đổi ngay với con cháu trong nhà.');
    recommended_actions.push('Tra cứu thông tin tại các kênh chính thống của cơ quan hoặc ngân hàng.');
  }

  return {
    alert_level,
    scenario,
    detected_signs: detected_signs.length > 0 ? detected_signs : ['Chưa ghi nhận dấu hiệu lừa đảo điển hình trong đoạn tin nhắn này.'],
    explanation,
    recommended_actions,
    safety_reminder: STANDARD_SAFETY_REMINDER,
    is_hard_rule_applied: alert_level !== ALERT_LEVELS.UNCLEAR,
    analyzed_by: 'rule_engine'
  };
}

/**
 * LỚP LUẬT CỨNG ĐỘC LẬP BẢO VỆ NGƯỜI DÙNG (Hard-rule Guardrails)
 * Áp dụng lên kết quả phân tích (dù là từ AI hay Rule Engine) để đảm bảo không vi phạm các nguyên tắc sinh tử:
 * 1. Chứa OTP -> không được thấp hơn CÓ DẤU HIỆU ĐÁNG NGỜ.
 * 2. Chuyển tiền đáng ngờ -> không được thấp hơn CÓ DẤU HIỆU ĐÁNG NGỜ.
 * 3. Link rút gọn/lạ -> không được thấp hơn CÓ DẤU HIỆU ĐÁNG NGỜ.
 * 4. Không được tuyên bố an toàn tuyệt đối 100%.
 * 5. Chuẩn hóa mức độ cảnh báo và kịch bản theo đúng định dạng.
 */
function applyGuardrails(result, rawText) {
  const safeResult = { ...result };
  const triggers = inspectHardRuleTriggers(rawText || '');

  // Chuẩn hóa mức độ cảnh báo về 3 mức chuẩn
  let level = safeResult.alert_level;
  if (![ALERT_LEVELS.HIGH, ALERT_LEVELS.SUSPICIOUS, ALERT_LEVELS.UNCLEAR].includes(level)) {
    if (level && level.includes('NGUY HIỂM')) level = ALERT_LEVELS.HIGH;
    else if (level && (level.includes('ĐÁNG NGỜ') || level.includes('NGHI NGỜ') || level.includes('TRUNG BÌNH'))) level = ALERT_LEVELS.SUSPICIOUS;
    else level = ALERT_LEVELS.UNCLEAR;
  }

  // Chuẩn hóa kịch bản về 5 nhóm chuẩn hoặc Chưa xác định
  let scenario = safeResult.scenario;
  const validScenarios = Object.values(SCENARIOS);
  if (!validScenarios.includes(scenario)) {
    if (scenario && scenario.includes('ngân hàng')) scenario = SCENARIOS.BANK;
    else if (scenario && (scenario.includes('công an') || scenario.includes('chức năng'))) scenario = SCENARIOS.AUTHORITY;
    else if (scenario && (scenario.includes('thưởng') || scenario.includes('quà'))) scenario = SCENARIOS.PRIZE;
    else if (scenario && (scenario.includes('mượn tiền') || scenario.includes('người quen') || scenario.includes('người thân'))) scenario = SCENARIOS.RELATIVE;
    else if (scenario && (scenario.includes('việc làm') || scenario.includes('đầu tư'))) scenario = SCENARIOS.JOB_INVESTMENT;
    else scenario = SCENARIOS.UNKNOWN;
  }

  const guardrailOverrides = [];

  // LUẬT 1: Yêu cầu OTP -> Không được thấp hơn CÓ DẤU HIỆU ĐÁNG NGỜ
  if (triggers.hasOtpRequest) {
    if (level === ALERT_LEVELS.UNCLEAR) {
      level = ALERT_LEVELS.HIGH; // Thậm chí yêu cầu OTP là nguy cơ cực kỳ nghiêm trọng
      guardrailOverrides.push('Luật cứng kích hoạt: Tin nhắn có yêu cầu OTP, nâng cảnh báo lên NGUY HIỂM CAO.');
    }
    // Bắt buộc có dấu hiệu cảnh báo OTP
    if (!safeResult.detected_signs || !safeResult.detected_signs.some(s => /otp|xác thực/i.test(s))) {
      safeResult.detected_signs = safeResult.detected_signs || [];
      safeResult.detected_signs.unshift('Yêu cầu cung cấp mã xác thực OTP (Dấu hiệu nguy hiểm hàng đầu).');
    }
    // Bắt buộc có khuyến nghị không chia sẻ OTP
    if (!safeResult.recommended_actions || !safeResult.recommended_actions.some(a => /otp/i.test(a))) {
      safeResult.recommended_actions = safeResult.recommended_actions || [];
      safeResult.recommended_actions.unshift('Tuyệt đối KHÔNG chia sẻ mã OTP cho bất kỳ ai dưới mọi hình thức.');
    }
  }

  // LUẬT 2: Chuyển tiền đáng ngờ -> Không được thấp hơn CÓ DẤU HIỆU ĐÁNG NGỜ
  if (triggers.hasMoneyTransfer) {
    if (level === ALERT_LEVELS.UNCLEAR) {
      level = ALERT_LEVELS.SUSPICIOUS;
      guardrailOverrides.push('Luật cứng kích hoạt: Tin nhắn có yêu cầu chuyển tiền/nộp phí, tối thiểu CÓ DẤU HIỆU ĐÁNG NGỜ.');
    }
    if (!safeResult.detected_signs || !safeResult.detected_signs.some(s => /chuyển tiền|nộp tiền|lệ phí|mượn|vay|nạp tiền/i.test(s))) {
      safeResult.detected_signs = safeResult.detected_signs || [];
      safeResult.detected_signs.push('Nội dung đề cập yêu cầu chuyển khoản hoặc giao dịch tài chính.');
    }
  }

  // LUẬT 3: Đường dẫn lạ / rút gọn -> Không được thấp hơn CÓ DẤU HIỆU ĐÁNG NGỜ
  if (triggers.hasShortOrSuspiciousLink) {
    if (level === ALERT_LEVELS.UNCLEAR) {
      level = ALERT_LEVELS.SUSPICIOUS;
      guardrailOverrides.push('Luật cứng kích hoạt: Tin nhắn có liên kết rút gọn/trang web lạ, tối thiểu CÓ DẤU HIỆU ĐÁNG NGỜ.');
    }
    if (!safeResult.detected_signs || !safeResult.detected_signs.some(s => /liên kết|đường link|link/i.test(s))) {
      safeResult.detected_signs = safeResult.detected_signs || [];
      safeResult.detected_signs.push('Chứa đường dẫn liên kết rút gọn hoặc trang web không rõ nguồn gốc.');
    }
    if (!safeResult.recommended_actions || !safeResult.recommended_actions.some(a => /liên kết|link/i.test(a))) {
      safeResult.recommended_actions = safeResult.recommended_actions || [];
      safeResult.recommended_actions.unshift('Không nhấn vào bất kỳ đường dẫn liên kết nào trong tin nhắn.');
    }
  }

  // LUẬT 4: Tuyệt đối không khẳng định an toàn 100%
  if (level === ALERT_LEVELS.UNCLEAR) {
    if (safeResult.explanation && (safeResult.explanation.includes('an toàn tuyệt đối') || safeResult.explanation.includes('hoàn toàn an toàn'))) {
      safeResult.explanation = safeResult.explanation.replace(/an toàn tuyệt đối|hoàn toàn an toàn/g, 'chưa thấy dấu hiệu rõ ràng');
    }
    // Luôn đính kèm lời nhắc thận trọng
    if (!safeResult.explanation.includes('không đồng nghĩa tin nhắn chắc chắn an toàn')) {
      safeResult.explanation += ' Lưu ý: Kết quả này không đồng nghĩa tin nhắn chắc chắn an toàn 100%. Hãy luôn cảnh giác.';
    }
  }

  // Đảm bảo số lượng khuyến nghị 2-3 điều dễ thực hiện
  if (!Array.isArray(safeResult.recommended_actions) || safeResult.recommended_actions.length === 0) {
    safeResult.recommended_actions = [
      'Không làm theo các hướng dẫn đáng ngờ trong tin nhắn.',
      'Gọi điện cho người thân tin cậy để hỏi lại trước khi làm bất kỳ điều gì.'
    ];
  } else if (safeResult.recommended_actions.length > 4) {
    safeResult.recommended_actions = safeResult.recommended_actions.slice(0, 3);
  }

  safeResult.alert_level = level;
  safeResult.scenario = scenario;
  safeResult.safety_reminder = STANDARD_SAFETY_REMINDER;
  safeResult.guardrail_overrides = guardrailOverrides;

  return safeResult;
}

module.exports = {
  SCENARIOS,
  ALERT_LEVELS,
  STANDARD_SAFETY_REMINDER,
  maskSensitiveData,
  inspectHardRuleTriggers,
  analyzeWithRuleEngine,
  applyGuardrails
};
