/**
 * server.js - Máy chủ Web ứng dụng "LÁ CHẮN NGƯỜI THÂN"
 * Hỗ trợ nhận diện tin nhắn lừa đảo cho người cao tuổi bằng AI và Lớp luật cứng độc lập
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { analyzeWithRuleEngine, applyGuardrails, maskSensitiveData } = require('./guardrails');
const { analyzeWithGemini } = require('./geminiService');

const app = express();
const PORT = process.env.PORT || 3000;

// Bộ nhớ tạm lưu session key khi người dùng muốn thử nghiệm trực tiếp từ giao diện
let sessionApiKey = null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Danh sách các tin nhắn mẫu thực tế để thử nghiệm nhanh
const SAMPLE_MESSAGES = [
  {
    id: 'bank-otp',
    title: 'Giả danh Ngân hàng đòi OTP',
    type: 'Giả danh ngân hàng',
    expectedAlert: 'NGUY HIỂM CAO',
    content: '[VCB Digibank] Phat hien giao dich bat thuong 25,000,000 VND vao luc 08:30. Tai khoan cua quy khach se bi tam khoa trong 24h. Vui long truy cap https://vcb-xacthuc-taikhoan.xyz va nhap ma OTP 682910 de huy giao dich.'
  },
  {
    id: 'police-threat',
    title: 'Giả mạo Công an dọa bắt giữ',
    type: 'Giả danh công an / cơ quan chức năng',
    expectedAlert: 'NGUY HIỂM CAO',
    content: 'CUC AN NINH MANG VA PHONG CHONG TOI PHAM THONG BAO: So dien thoai va so CCCD cua ong/ba dang lien quan den duong day rua tien xuyen quoc gia. Yeu cau co mat tai Co quan Dieu tra hoac chuyen ngay 50.000.000d vao tai khoan tam giu cua Bo Cong an de chung minh trong sach. Tuyet doi khong duoc tiet lo cho nguoi khac biet.'
  },
  {
    id: 'prize-scam',
    title: 'Trúng thưởng xe SH nộp phí cọc',
    type: 'Trúng thưởng / nhận quà',
    expectedAlert: 'NGUY HIỂM CAO',
    content: 'CHUC MUNG QUY KHACH! So thue bao cua ban da may man quay trung giai dac biet tu chuong trinh Tri an khach hang la 01 Xe may Honda SH 150i tri gia 98 trieu dong. De nhan thuong, quy khach vui long nop 3.500.000d le phi lam thu tuc ho so va van chuyen qua so tai khoan 1903678901234.'
  },
  {
    id: 'relative-borrow',
    title: 'Giả danh con cháu mượn tiền gấp',
    type: 'Người quen mượn tiền',
    expectedAlert: 'NGUY HIỂM CAO',
    content: 'Me oi, con day. Dien thoai con bi roi vao nuoc hong roi, day la so moi cua con. Ban con dang cap cuu o benh vien can tien nop vien phi gap ma con quen the, me chuyen gap 10 trieu vao so tai khoan nay cua ban con giup con voi: STK 0912345678 Ngân hàng Techcombank. Con dang voi lam me chuyen ngay nhe!'
  },
  {
    id: 'job-task',
    title: 'Việc làm online nạp tiền giật đơn',
    type: 'Việc làm hoặc đầu tư online',
    expectedAlert: 'NGUY HIỂM CAO',
    content: 'Tuyen cong tac vien danh gia san pham Shopee tai nha, chi can luot dien thoai 15 phut moi ngay, hoa hong 30-50%, thu nhap 800k - 2 trieu/ngay. Nhan tien sau moi don hang qua Telegram. Nhan vao lien ket bit.ly/shopee-kiemtien de nap 200k nhan tien thuong dau tien.'
  },
  {
    id: 'safe-normal',
    title: 'Tin nhắn sinh hoạt thông thường',
    type: 'Chưa xác định được kịch bản',
    expectedAlert: 'CHƯA THẤY DẤU HIỆU RÕ',
    content: 'Bác Ba ơi, chiều nay 5 giờ Hội Người cao tuổi tổ dân phố họp chuẩn bị cho ngày hội thể dục dưỡng sinh tại Nhà văn hóa nhé. Bác nhớ đến đúng giờ ạ!'
  }
];

/**
 * GET /api/status - Kiểm tra trạng thái hệ thống và cấu hình AI
 */
app.get('/api/status', (req, res) => {
  const envKey = process.env.GEMINI_API_KEY;
  const isEnvConfigured = !!envKey && envKey.trim() !== '' && envKey !== 'YOUR_GEMINI_API_KEY';
  const isSessionConfigured = !!sessionApiKey;
  const isAiActive = isEnvConfigured || isSessionConfigured;

  res.json({
    project: 'LÁ CHẮN NGƯỜI THÂN',
    slogan: 'Nhận được tin lạ, không ai phải đoán một mình.',
    version: '1.0.0',
    ai_status: {
      is_configured: isAiActive,
      active_mode: isAiActive ? 'gemini_ai' : 'rule_engine',
      provider: isAiActive ? 'Google Gemini (Flash)' : 'Bộ quy tắc an toàn nội bộ (Rule Engine)',
      key_source: isSessionConfigured ? 'Giao diện tạm thời' : isEnvConfigured ? 'Tệp môi trường (.env)' : 'Chưa cấu hình (Đang chạy chế độ an toàn nội bộ)'
    },
    privacy: {
      data_stored: false,
      images_stored: false,
      masking_enabled: true
    }
  });
});

/**
 * GET /api/samples - Trả về danh sách mẫu tin nhắn thử nghiệm
 */
app.get('/api/samples', (req, res) => {
  res.json({ samples: SAMPLE_MESSAGES });
});

/**
 * POST /api/set-key - Thiết lập API key trong phiên làm việc (cho mục đích demo/thử nghiệm)
 */
app.post('/api/set-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    sessionApiKey = null;
    return res.json({ success: true, message: 'Đã hủy cấu hình API key phiên làm việc.', isAiActive: false });
  }

  sessionApiKey = apiKey.trim();
  res.json({ success: true, message: 'Đã lưu cấu hình API key Gemini thành công cho phiên này.', isAiActive: true });
});

/**
 * POST /api/analyze - Phân tích nội dung tin nhắn
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, clientMode } = req.body;

    // Kiểm tra tính hợp lệ của văn bản
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        error: 'NỘI DUNG TRỐNG',
        message: 'Bác/Cô/Chú vui lòng dán nội dung tin nhắn hoặc tải ảnh có chứa chữ để hệ thống kiểm tra giúp ạ.'
      });
    }

    const trimmedText = text.trim();

    if (trimmedText.length < 3) {
      return res.status(400).json({
        error: 'NỘI DUNG QUÁ NGẮN',
        message: 'Nội dung tin nhắn quá ngắn để có thể nhận diện. Vui lòng cung cấp đầy đủ câu chữ trong tin nhắn.'
      });
    }

    // Bảo vệ quyền riêng tư: Che thông tin nhạy cảm trước khi xử lý
    const sanitizedText = maskSensitiveData(trimmedText);

    const activeApiKey = sessionApiKey || process.env.GEMINI_API_KEY;
    const canUseGemini = activeApiKey && activeApiKey.trim() !== '' && activeApiKey !== 'YOUR_GEMINI_API_KEY';
    const forceRule = clientMode === 'rule';

    let result;
    let fallbackInfo = null;

    if (canUseGemini && !forceRule) {
      try {
        // Thử phân tích bằng Gemini AI
        result = await analyzeWithGemini(trimmedText, activeApiKey);
      } catch (aiErr) {
        // Nếu AI gặp sự cố (mạng, quota, invalid key), chuyển sang Rule Engine minh bạch
        console.warn('Gemini AI failed, smoothly falling back to rule engine:', aiErr.message);
        const ruleResult = analyzeWithRuleEngine(trimmedText);
        result = applyGuardrails(ruleResult, trimmedText);
        fallbackInfo = {
          triggered: true,
          original_error: aiErr.message,
          message: 'Dịch vụ AI tạm thời không khả dụng, hệ thống tự động bảo vệ bạn bằng Bộ quy tắc an toàn nội bộ.'
        };
      }
    } else {
      // Chế độ phân tích bằng Rule Engine nội bộ
      const ruleResult = analyzeWithRuleEngine(trimmedText);
      result = applyGuardrails(ruleResult, trimmedText);
      if (!canUseGemini) {
        fallbackInfo = {
          triggered: false,
          is_rule_mode: true,
          message: 'Chế độ an toàn nội bộ đang hoạt động độc lập (Bảo đảm kiểm tra chính xác các dấu hiệu lừa đảo phổ biến).'
        };
      }
    }

    // Luôn che dữ liệu nhạy cảm trong phản hồi hiển thị
    result.sanitized_input_preview = sanitizedText;
    result.fallback_info = fallbackInfo;
    result.timestamp = new Date().toISOString();

    return res.json(result);
  } catch (error) {
    console.error('Lỗi trong quá trình phân tích:', error);
    return res.status(500).json({
      error: 'LỖI HỆ THỐNG',
      message: 'Hệ thống gặp sự cố kỹ thuật tạm thời. Vui lòng thử lại sau ít phút hoặc nhờ con cháu kiểm tra giúp.'
    });
  }
});

// Chuyển hướng các trang khác về index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi chạy máy chủ với cơ chế tự động chuyển cổng nếu bị trùng
if (process.env.NODE_ENV !== 'test') {
  const startServer = (portToTry) => {
    const serverInstance = app.listen(portToTry, () => {
      console.log(`====================================================`);
      console.log(`🛡️  DỰ ÁN: LÁ CHẮN NGƯỜI THÂN - PHIÊN BẢN 1.0.0`);
      console.log(`🎯  "Nhận được tin lạ, không ai phải đoán một mình."`);
      console.log(`🚀  Máy chủ đang chạy tại: http://localhost:${portToTry}`);
      console.log(`🤖  Trạng thái AI: ${process.env.GEMINI_API_KEY ? 'ĐÃ CẤU HÌNH API KEY' : 'CHẾ ĐỘ QUY TẮC NỘI BỘ (RULE ENGINE)'}`);
      console.log(`====================================================`);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Cổng ${portToTry} đang bận, tự động chuyển sang cổng ${portToTry + 1}...`);
        startServer(portToTry + 1);
      } else {
        console.error('Lỗi khởi động máy chủ:', err);
      }
    });
  };

  startServer(Number(PORT) || 3001);
}

module.exports = app;
