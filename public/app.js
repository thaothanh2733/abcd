/**
 * app.js - Logic giao diện và xử lý kiểm tra tin nhắn
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

// ==========================================================================
// KHỞI TẠO BIẾN VÀ ELEMENT DOM
// ==========================================================================
let currentFile = null;
let currentPreviewUrl = null;
let currentExtractedText = '';
let currentResultText = '';
let currentResultData = null;
let preferredVietnameseVoice = null;
let currentAudio = null;
let currentAudioFallback = null;
let audioQueue = [];
let audioQueueIndex = 0;
let audioPlaybackToken = 0;
let speechStartTimer = null;
let isSpeechActive = false;
let activeSpeechButton = null;
let currentUtterance = null;
let isSpeechPaused = false;
let speechRecognition = null;
let speechRecognitionResult = '';
let shouldAnalyzeAfterSpeech = false;
let smsVoiceRecognition = null;
let smsVoiceStage = null;
let smsVoiceCommand = null;
let smsVoiceError = null;
let smsVoiceRetryCount = 0;
let smsVoiceFlowActive = false;
let isServerOnline = false;
const SLOW_RULES_SPEECH_TEXT = 'Nguyên tắc 3 chậm khi nhận tin lạ: Một, chậm lại: không vội làm theo, không hoảng sợ. Hai, chậm bấm: không bấm vào liên kết lạ, không gửi mã OTP. Ba, chậm chuyển: luôn gọi điện thoại cho con cháu trước khi chuyển tiền.';

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const textInput = document.getElementById('messageInput');
const charCount = document.getElementById('charCount');
const clearTextBtn = document.getElementById('clearTextBtn');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const previewImg = document.getElementById('previewImg');
const removeImgBtn = document.getElementById('removeImgBtn');
const ocrProgressBox = document.getElementById('ocrProgressBox');
const ocrProgressBar = document.getElementById('ocrProgressBar');
const ocrProgressText = document.getElementById('ocrProgressText');
const ocrResultBox = document.getElementById('ocrResultBox');
const ocrResultText = document.getElementById('ocrResultText');
const ocrErrorMessage = document.getElementById('ocrErrorMessage');
const analyzeBtn = document.getElementById('analyzeBtn');

// Loading & Result Elements
const loadingBox = document.getElementById('loadingBox');
const resultCard = document.getElementById('resultCard');
const alertLevelText = document.getElementById('alertLevelText');
const explanationText = document.getElementById('explanationText');
const detectedList = document.getElementById('detectedList');
const actionsList = document.getElementById('actionsList');
const safetyReminderText = document.getElementById('safetyReminderText');
const ttsBtn = document.getElementById('ttsBtn');
const speechPlaybackStatus = document.getElementById('speechPlaybackStatus');
const slowRulesSpeechStatus = document.getElementById('slowRulesSpeechStatus');
const shareResultBtn = document.getElementById('shareResultBtn');
const shareResultStatus = document.getElementById('shareResultStatus');
const emergencyCallLink = document.getElementById('emergencyCallLink');
const emergencyFamilyBtn = document.getElementById('emergencyFamilyBtn');
const linkThreatContainer = document.getElementById('linkThreatContainer');
const linkThreatList = document.getElementById('linkThreatList');
const openFamilyPhoneBtn = document.getElementById('openFamilyPhoneBtn');
const familyPhoneDialog = document.getElementById('familyPhoneDialog');
const familyPhoneInput = document.getElementById('familyPhoneInput');
const familyPhoneStatus = document.getElementById('familyPhoneStatus');
const saveFamilyPhoneBtn = document.getElementById('saveFamilyPhoneBtn');
const closeFamilyPhoneBtn = document.getElementById('closeFamilyPhoneBtn');
const familyPhoneLabel = document.getElementById('familyPhoneLabel');
const slowRulesCard = document.getElementById('slowRulesCard');
const slowRulesSpeakBtn = document.getElementById('slowRulesSpeakBtn');
const resetBtn = document.getElementById('resetBtn');

// Accessibility controls
const fontDecreaseBtn = document.getElementById('fontDecreaseBtn');
const fontIncreaseBtn = document.getElementById('fontIncreaseBtn');
const fontSizeIndicator = document.getElementById('fontSizeIndicator');
const themeBtn = document.getElementById('contrastBtn');
const speechInputBtn = document.getElementById('speechInputBtn');
const speechInputStatus = document.getElementById('speechInputStatus');
const smsDemoBtn = document.getElementById('smsDemoBtn');
const smsDemoDialog = document.getElementById('smsDemoDialog');
const smsDemoAcceptBtn = document.getElementById('smsDemoAcceptBtn');
const smsDemoDismissBtn = document.getElementById('smsDemoDismissBtn');
const smsDemoMicStatus = document.getElementById('smsDemoMicStatus');
const smsDemoVoiceStatus = document.getElementById('smsDemoVoiceStatus');
const smsVoicePageStatus = document.getElementById('smsVoicePageStatus');
const smsVoicePageActions = document.getElementById('smsVoicePageActions');
const smsVoiceRepeatYesBtn = document.getElementById('smsVoiceRepeatYesBtn');
const smsVoiceRepeatNoBtn = document.getElementById('smsVoiceRepeatNoBtn');
const historyList = document.getElementById('historyList');
const historyStatus = document.getElementById('historyStatus');
const sidebarMenuBtn = document.getElementById('sidebarMenuBtn');
const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const newCheckBtn = document.getElementById('newCheckBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const MIN_FONT_SIZE = 15;
const MAX_FONT_SIZE = 31;
let currentFontSize = 19;
let historyItems = [];
let currentHistoryId = null;
let analysisInProgress = false;
let analysisCooldownUntil = 0;
let analysisCooldownTimer = null;
let ocrIsRunning = false;
let ocrWorker = null;
let ocrWorkerPromise = null;
let ocrRecognitionQueue = Promise.resolve();
let ocrProgressHandler = null;

// ==========================================================================
// 3. LOGIC LUẬT CỨNG PHÍA CLIENT (Hỗ trợ chạy độc lập không cần backend)
// ==========================================================================
function clientMaskData(text) {
  if (!text) return '';
  let masked = text;
  masked = masked.replace(/(otp|mã\s*(?:xác\s*thực|otp|bảo\s*mật|pin|gd)?[:\s-]*)([0-9]{4,8})/gi, '$1******');
  masked = masked.replace(/(stk|số\s*tài\s*khoản|tk[:\s]*)([0-9]{3,4})([0-9]{3,10})([0-9]{2})/gi, '$1$2****$4');
  masked = masked.replace(/(0[35789]\d)(\d{4})(\d{3})/g, '$1****$3');
  masked = masked.replace(/(mật\s*khẩu|password|pass[:\s]+)([^\s,.\n]+)/gi, '$1******');
  return masked;
}

function clientAnalyzeOffline(text) {
  const lower = text.toLowerCase();
  const hasOtp = /(mã\s*otp|ma\s*otp|mã\s*xác\s*thực|smart\s*otp|soft\s*otp|cung\s*cấp\s*mã|gửi\s*mã|otp)/i.test(lower);
  const hasMoney = /(chuyển\s*khoản|chuyển\s*tiền|nộp\s*tiền|nộp\s*phí|đặt\s*cọc|mượn\s*tiền|vay\s*gấp|mượn\s*gấp|bắn\s*tiền)/i.test(lower);
  const hasLink = /(bit\.ly|tinyurl|gg\.gg|\.xyz|\.top|\.vip|\.club|cutt\.ly|shorturl)/i.test(lower) || /https?:\/\//i.test(lower);
  const hasUrgency = /(trong\s*24h|khẩn\s*cấp|ngay\s*lập\s*tức|sẽ\s*bị\s*khóa|lệnh\s*bắt|truy\s*nã|công\s*an)/i.test(lower);

  let scenario = 'Chưa xác định được kịch bản';
  let alert_level = 'CHƯA THẤY DẤU HIỆU RÕ';
  const signs = [];
  let explanation = '';
  const actions = [];

  // Phân loại kịch bản
  if (/(ngân\s*hàng|vietcombank|vcb|techcombank|bidv|mbbank|tài\s*khoản\s*bị\s*khóa)/i.test(lower)) {
    scenario = 'Giả danh ngân hàng';
  } else if (/(công\s*an|viện\s*kiểm\s*sát|tòa\s*án|lệnh\s*bắt|rửa\s*tiền|truy\s*nã)/i.test(lower)) {
    scenario = 'Giả danh công an / cơ quan chức năng';
  } else if (/(trúng\s*thưởng|xe\s*sh|tri\s*ân|chúc\s*mừng|quà\s*tặng|100\s*triệu)/i.test(lower)) {
    scenario = 'Trúng thưởng / nhận quà';
  } else if (/(mẹ\s*ơi|bố\s*ơi|con\s*đây|cháu\s*đây|mượn\s*tiền|vay\s*gấp|cấp\s*cứu)/i.test(lower)) {
    scenario = 'Người quen mượn tiền';
  } else if (/(việc\s*làm|hoa\s*hồng|giật\s*đơn|nhiệm\s*vụ|shopee|telegram|đầu\s*tư)/i.test(lower)) {
    scenario = 'Việc làm hoặc đầu tư online';
  }

  // Thu thập dấu hiệu
  if (hasOtp) signs.push('Yêu cầu cung cấp mã xác thực bảo mật OTP (Dấu hiệu nguy hiểm nhất).');
  if (hasLink) signs.push('Chứa đường dẫn trang web lạ hoặc liên kết rút gọn.');
  if (hasMoney) signs.push('Yêu cầu chuyển tiền, nộp lệ phí hoặc chuyển vào tài khoản cá nhân.');
  if (hasUrgency) signs.push('Tạo áp lực thời gian gấp rút hoặc đe dọa xử lý để làm nạn nhân hoảng sợ.');

  // Xác định mức cảnh báo & luật cứng
  if (hasOtp || (scenario !== 'Chưa xác định được kịch bản' && (hasMoney || hasLink || hasUrgency))) {
    alert_level = 'NGUY HIỂM CAO';
  } else if (hasMoney || hasLink || signs.length >= 1) {
    alert_level = 'CÓ DẤU HIỆU ĐÁNG NGỜ';
  } else {
    alert_level = 'CHƯA THẤY DẤU HIỆU RÕ';
  }

  // Lời giải thích và hành động
  if (alert_level === 'NGUY HIỂM CAO') {
    if (scenario === 'Giả danh ngân hàng') {
      explanation = 'Tin nhắn này giả danh ngân hàng để tạo áp lực rằng tài khoản của bạn bị khóa và yêu cầu truy cập liên kết lạ hoặc gửi mã OTP. Ngân hàng thật không bao giờ gửi tin nhắn đòi mã OTP hoặc yêu cầu nhấp vào link không phải tên miền chính thức. Đây là dấu hiệu lừa đảo nhằm đánh cắp toàn bộ số dư ngân hàng.';
      actions.push('Tuyệt đối không nhấn vào đường liên kết trong tin nhắn.');
      actions.push('Không chia sẻ mã xác thực OTP hay mật khẩu cho bất kỳ ai.');
      actions.push('Gọi ngay tổng đài in trên mặt sau thẻ ATM hoặc nhờ con cháu kiểm tra.');
    } else if (scenario === 'Giả danh công an / cơ quan chức năng') {
      explanation = 'Kẻ xấu đang mạo danh cơ quan công an hoặc viện kiểm sát để đe dọa bạn dính líu đến tội phạm và ép chuyển tiền chứng minh. Cơ quan Nhà nước không bao giờ làm việc, gửi lệnh bắt hay yêu cầu chuyển tiền qua tin nhắn hay mạng xã hội. Bạn hãy an tâm vì đây là thủ đoạn dọa nạt thường thấy của tội phạm mạng.';
      actions.push('Bình tĩnh, không làm theo bất kỳ yêu cầu chuyển tiền nào.');
      actions.push('Không cung cấp số CCCD, tài khoản ngân hàng cho số máy lạ.');
      actions.push('Báo ngay cho con cháu hoặc trực tiếp đến trụ sở Công an phường/xã gần nhất.');
    } else if (scenario === 'Trúng thưởng / nhận quà') {
      explanation = 'Tin nhắn báo tin vui trúng giải thưởng lớn nhưng lại ép bạn phải nộp trước một khoản phí làm hồ sơ hoặc tiền cọc chuyển phát. Đây là bẫy lừa đảo, ngay sau khi chuyển phí thì kẻ gian sẽ khóa liên lạc và bạn không nhận được bất kỳ giải thưởng nào. Không có chương trình chính thống nào yêu cầu đóng phí qua tài khoản cá nhân để nhận quà.';
      actions.push('Tuyệt đối không chuyển tiền cọc hoặc nộp lệ phí cho người lạ.');
      actions.push('Không cung cấp số căn cước và số tài khoản ngân hàng.');
      actions.push('Xóa tin nhắn và chia sẻ cảnh báo cho người thân trong nhà.');
    } else if (scenario === 'Người quen mượn tiền') {
      explanation = 'Tin nhắn tự xưng là con cháu hoặc người quen báo mất điện thoại và nhờ chuyển khoản gấp vào số tài khoản lạ. Kẻ gian thường lợi dụng tình thương và sự lo lắng của người lớn tuổi đối với con cháu để lừa tiền khẩn cấp. Mọi yêu cầu tài chính bất thường từ người thân đều cần kiểm chứng trước khi chuyển.';
      actions.push('Chưa vội chuyển tiền ngay dù người gửi có hối thúc đến đâu.');
      actions.push('Gọi điện thoại trực tiếp vào số cũ của người thân để nghe giọng nói xác nhận.');
      actions.push('Hỏi lại các thông tin riêng tư chỉ có gia đình biết.');
    } else if (scenario === 'Việc làm hoặc đầu tư online') {
      explanation = 'Tin nhắn quảng cáo làm việc nhẹ lương cao, giật đơn hàng Shopee hoặc đầu tư tài chính sinh lời mỗi ngày và yêu cầu nạp tiền làm nhiệm vụ. Kẻ gian có thể cho bạn rút một chút tiền lúc đầu, sau đó dụ dỗ nạp số tiền lớn rồi chặn liên lạc. Bạn tuyệt đối không tin vào các lời mời chào kiếm tiền dễ dàng qua mạng.';
      actions.push('Không nạp tiền hoặc chuyển tiền làm bất kỳ nhiệm vụ nào.');
      actions.push('Rời khỏi các hội nhóm lạ trên mạng xã hội Telegram hoặc Zalo.');
      actions.push('Nhờ người thân có hiểu biết kiểm tra lại thông tin tuyển dụng.');
    } else {
      explanation = 'Tin nhắn có các biểu hiện nguy cơ cao như đòi hỏi thông tin bí mật hoặc hối thúc chuyển tiền. Bạn cần hết sức đề phòng và không làm theo yêu cầu trong tin nhắn.';
      actions.push('Không nhấp vào bất kỳ đường link nào.');
      actions.push('Không cung cấp mã OTP hay thông tin tài khoản.');
      actions.push('Tham khảo ý kiến của con cháu hoặc người thân.');
    }
  } else if (alert_level === 'CÓ DẤU HIỆU ĐÁNG NGỜ') {
    explanation = 'Tin nhắn có chứa một số dấu hiệu bất thường như liên kết rút gọn, đề cập đến tiền bạc hoặc thúc ép thời gian. Dù chưa thể khẳng định chắc chắn 100% là lừa đảo, bạn vẫn cần cẩn trọng xác minh trước khi có bất kỳ hành động nào.';
    actions.push('Không nhấn vào đường dẫn lạ.');
    actions.push('Liên hệ lại với bên gửi qua kênh độc lập đáng tin cậy.');
    actions.push('Hỏi ý kiến của con cháu trong nhà trước khi làm theo.');
  } else {
    explanation = 'Chưa phát hiện dấu hiệu lừa đảo phổ biến trong nội dung được cung cấp. Tuy nhiên, điều này không đồng nghĩa tin nhắn chắc chắn an toàn 100%. Bạn vẫn nên giữ cảnh giác nếu các tin nhắn tiếp theo có yêu cầu liên quan đến tài chính.';
    actions.push('Giữ thái độ cẩn trọng khi nhận các tin nhắn bất ngờ.');
    actions.push('Nếu có nội dung lạ tiếp theo, hãy hỏi ngay người thân.');
    actions.push('Tra cứu kênh liên lạc chính thức nếu cần kiểm tra thêm.');
  }

  return {
    alert_level,
    scenario,
    detected_signs: signs.length > 0 ? signs : ['Chưa ghi nhận dấu hiệu lừa đảo điển hình trong đoạn tin nhắn này.'],
    explanation,
    recommended_actions: actions,
    safety_reminder: 'Đừng vội làm theo yêu cầu trong tin nhắn. Nếu chưa chắc chắn, hãy hỏi người thân hoặc liên hệ trực tiếp với cơ quan, tổ chức qua kênh chính thức.',
    analyzed_by: 'rule_engine',
    sanitized_input_preview: clientMaskData(text)
  };
}

// ==========================================================================
// 4. KIỂM TRA TRẠNG THÁI SERVER VÀ CẤU HÌNH AI
// ==========================================================================
async function checkSystemStatus() {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      await res.json();
      isServerOnline = true;
    } else {
      setOfflineStatus();
    }
  } catch (err) {
    setOfflineStatus();
  }
}

function setOfflineStatus() {
  isServerOnline = false;
}

// ==========================================================================
// 5. CHỨC NĂNG OCR TRÍCH XUẤT CHỮ TỪ ẢNH (Tesseract.js)
// ==========================================================================
async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Không thể mở ảnh đã chọn.'));
      element.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
      close: () => URL.revokeObjectURL(objectUrl)
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function prepareImageForOcr(file) {
  const bitmap = await decodeImageFile(file);
  const scale = Math.min(
    1,
    1200 / bitmap.width,
    Math.sqrt(8000000 / (bitmap.width * bitmap.height))
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể chuẩn bị ảnh để nhận diện chữ.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    if (typeof bitmap.draw === 'function') bitmap.draw(context, width, height);
    else context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Không thể xử lý ảnh. Vui lòng thử ảnh khác.'));
      }, 'image/jpeg', 0.8);
    });
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function getOcrWorker() {
  if (ocrWorker) return Promise.resolve(ocrWorker);
  if (ocrWorkerPromise) return ocrWorkerPromise;
  if (typeof Tesseract === 'undefined') {
    return Promise.reject(new Error('Thư viện OCR chưa tải xong, vui lòng đợi vài giây hoặc kiểm tra kết nối mạng.'));
  }

  ocrWorkerPromise = Tesseract.createWorker('vie+eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text' && ocrProgressHandler) {
        const progress = Math.round((message.progress || 0) * 100);
        ocrProgressBar.style.width = `${progress}%`;
        ocrProgressText.textContent = `Đang đọc chữ trong ảnh chụp: ${progress}%...`;
      }
    }
  }).then(async (worker) => {
    await worker.setParameters({ preserve_interword_spaces: '1' });
    ocrWorker = worker;
    return worker;
  }).catch((error) => {
    ocrWorkerPromise = null;
    throw error;
  });

  return ocrWorkerPromise;
}

function recognizeImage(image) {
  const recognition = ocrRecognitionQueue.then(async () => {
    const worker = await getOcrWorker();
    return worker.recognize(image);
  });
  ocrRecognitionQueue = recognition.catch(() => {});
  return recognition;
}

function warmOcrWorker() {
  const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 0));
  schedule(() => {
    getOcrWorker().catch((error) => {
      console.warn('Không thể khởi động trước worker OCR:', error);
    });
  }, { timeout: 2000 });
}

window.addEventListener('load', warmOcrWorker, { once: true });

async function runOcrOnImage(file) {
  ocrProgressBox.style.display = 'block';
  ocrResultBox.style.display = 'none';
  ocrErrorMessage.style.display = 'none';
  ocrErrorMessage.textContent = '';
  ocrErrorMessage.classList.remove('is-info');
  ocrProgressBar.style.width = '10%';
  ocrProgressText.textContent = 'Đang chuẩn bị ảnh và tải bộ nhận diện chữ tiếng Việt...';
  ocrIsRunning = true;
  refreshAnalyzeButton();

  try {
    const imageForOcr = await prepareImageForOcr(file);
    ocrProgressHandler = true;
    const ret = await recognizeImage(imageForOcr);
    ocrProgressHandler = null;

    const extracted = ret.data.text.trim();
    ocrProgressBox.style.display = 'none';

    if (!isUsableOcrText(extracted, ret.data.confidence)) {
      currentExtractedText = '';
      currentFile = null;
      fileInput.value = '';
      textInput.value = '';
      ocrResultText.value = '';
      updateCharCount();
      ocrErrorMessage.classList.add('is-info');
      ocrErrorMessage.textContent = '⚠️ Ảnh này chưa phù hợp để kiểm tra. Bạn vui lòng tải ảnh chụp hợp lệ có nội dung tin nhắn từ SMS, Zalo hoặc Facebook, hoặc dán nội dung tin nhắn vào ô nhập.';
      ocrErrorMessage.style.display = 'block';
      speakStaticText('Ảnh này chưa có nội dung tin nhắn phù hợp. Bạn vui lòng chọn ảnh chụp tin nhắn hợp lệ nhé!');
      return;
    }

    ocrErrorMessage.classList.remove('is-info');
    currentExtractedText = extracted;
    ocrResultBox.style.display = 'block';
    ocrResultText.value = extracted;
    textInput.value = extracted;
    updateCharCount();
    ocrResultText.focus();

  } catch (err) {
    console.error('OCR Error:', err);
    ocrProgressBox.style.display = 'none';
    alert('Không thể đọc chữ tự động: ' + err.message + '\n\nBạn có thể dán nội dung tin nhắn trực tiếp vào ô bên cạnh để kiểm tra ngay.');
  } finally {
    ocrProgressHandler = null;
    ocrIsRunning = false;
    refreshAnalyzeButton();
  }
}

// ==========================================================================
// XỬ LÝ SỰ KIỆN GIAO DIỆN (TABS, UPLOAD)
// ==========================================================================

// Tabs chuyển đổi
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanes.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const targetPane = document.getElementById(btn.dataset.tab);
    if (targetPane) targetPane.classList.add('active');
  });
});

const startCheckFromGuideBtn = document.getElementById('startCheckFromGuideBtn');
if (startCheckFromGuideBtn) {
  startCheckFromGuideBtn.addEventListener('click', () => {
    const textTabBtn = document.querySelector('[data-tab="tab-text"]');
    if (textTabBtn) textTabBtn.click();
  });
}

// Đếm ký tự
textInput.addEventListener('input', updateCharCount);
ocrResultText.addEventListener('input', () => {
  currentExtractedText = ocrResultText.value;
  textInput.value = currentExtractedText;
  updateCharCount();
});
function updateCharCount() {
  const len = textInput.value.length;
  charCount.textContent = `${len} ký tự`;
  if (ocrResultBox.style.display !== 'none' && ocrResultText.value !== textInput.value) {
    ocrResultText.value = textInput.value;
    currentExtractedText = textInput.value;
  }
}

// Xóa văn bản
clearTextBtn.addEventListener('click', () => {
  textInput.value = '';
  updateCharCount();
  textInput.focus();
});

// Kéo thả và chọn tệp ảnh
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleSelectedImage(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleSelectedImage(e.target.files[0]);
  }
});

function handleSelectedImage(file) {
  // Kiểm tra định dạng
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    alert('Định dạng tệp không hợp lệ! Vui lòng chọn ảnh chụp màn hình dạng PNG, JPG, JPEG hoặc WEBP.');
    return;
  }

  // Giới hạn kích thước (tối đa 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('Ảnh chụp quá lớn (vượt quá 10MB). Vui lòng chọn ảnh có dung lượng nhỏ hơn.');
    return;
  }

  currentFile = file;
  textInput.value = '';
  ocrResultText.value = '';
  currentExtractedText = '';
  ocrResultBox.style.display = 'none';
  ocrErrorMessage.style.display = 'none';
  ocrErrorMessage.textContent = '';
  ocrErrorMessage.classList.remove('is-info');
  resultCard.style.display = 'none';
  syncSlowRulesVisibility();
  emergencyCallLink.hidden = true;
  if (emergencyFamilyBtn) emergencyFamilyBtn.hidden = true;
  if (linkThreatContainer) linkThreatContainer.hidden = true;
  if (emergencyFamilyBtn) emergencyFamilyBtn.hidden = true;
  if (linkThreatContainer) linkThreatContainer.hidden = true;
  resetBtn.style.display = 'none';
  updateCharCount();
  if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  currentPreviewUrl = URL.createObjectURL(file);
  previewImg.src = currentPreviewUrl;
  previewContainer.style.display = 'block';
  runOcrOnImage(file);
}

// Xóa ảnh đã chọn
removeImgBtn.addEventListener('click', () => {
  const removedOcrText = currentExtractedText;
  currentFile = null;
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  fileInput.value = '';
  previewImg.src = '';
  previewContainer.style.display = 'none';
  ocrResultBox.style.display = 'none';
  ocrProgressBox.style.display = 'none';
  ocrErrorMessage.style.display = 'none';
  ocrErrorMessage.textContent = '';
  ocrErrorMessage.classList.remove('is-info');
  if (removedOcrText && textInput.value === removedOcrText) {
    textInput.value = '';
    updateCharCount();
  }
  currentExtractedText = '';
});

// ==========================================================================
// QUY TRÌNH PHÂN TÍCH CHÍNH
// ==========================================================================
analyzeBtn.addEventListener('click', () => handleAnalyze());

function refreshAnalyzeButton() {
  const isCoolingDown = Date.now() < analysisCooldownUntil;
  const isLocked = analysisInProgress || ocrIsRunning || isCoolingDown;
  analyzeBtn.disabled = isLocked;
  smsDemoBtn.disabled = isLocked;
  analyzeBtn.setAttribute('aria-busy', String(analysisInProgress || ocrIsRunning));
  analyzeBtn.textContent = isLocked ? 'Đang kiểm tra...' : 'Kiểm tra tin nhắn';
}

function beginAnalysisAttempt() {
  if (analysisInProgress || ocrIsRunning || Date.now() < analysisCooldownUntil) return false;
  analysisInProgress = true;
  analysisCooldownUntil = Date.now() + 2500;
  if (analysisCooldownTimer) window.clearTimeout(analysisCooldownTimer);
  refreshAnalyzeButton();
  return true;
}

function finishAnalysisAttempt() {
  analysisInProgress = false;
  if (analysisCooldownTimer) window.clearTimeout(analysisCooldownTimer);
  const remaining = analysisCooldownUntil - Date.now();
  if (remaining > 0) {
    analysisCooldownTimer = window.setTimeout(() => {
      analysisCooldownTimer = null;
      refreshAnalyzeButton();
    }, remaining);
  } else {
    analysisCooldownTimer = null;
  }
  refreshAnalyzeButton();
}

async function handleAnalyze(options = {}) {
  if (!beginAnalysisAttempt()) return;
  if (!options.voiceDemo) cancelSmsVoiceFlow();
  cancelSpeechInput();
  const content = textInput.value.trim();

  // Kiểm tra đầu vào rỗng
  if (!content) {
    const hasUploadedImage = previewContainer.style.display !== 'none';
    alert(hasUploadedImage
      ? 'Ảnh bạn vừa tải chưa phải ảnh chụp hợp lệ có nội dung tin nhắn. Vui lòng chọn ảnh chụp tin nhắn SMS, Zalo hoặc Facebook, hoặc dán nội dung tin nhắn vào ô nhập.'
      : 'Bạn vui lòng dán nội dung tin nhắn hoặc tải ảnh chụp hợp lệ có nội dung tin nhắn để kiểm tra.');
    textInput.focus();
    finishAnalysisAttempt();
    return;
  }

  // Kiểm tra độ dài tối thiểu
  if (content.length < 4) {
    alert('Nội dung quá ngắn để nhận diện chính xác. Bạn vui lòng nhập đầy đủ câu chữ trong tin nhắn nhé.');
    finishAnalysisAttempt();
    return;
  }

  // 1. Hiển thị trạng thái đang xử lý
  loadingBox.style.display = 'block';
  resultCard.style.display = 'none';
  syncSlowRulesVisibility();
  emergencyCallLink.hidden = true;
  if (emergencyFamilyBtn) emergencyFamilyBtn.hidden = true;
  if (linkThreatContainer) linkThreatContainer.hidden = true;
  refreshAnalyzeButton();
  loadingBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Dừng giọng nói cũ nếu đang phát
  stopSpeaking();
  if (options.autoRead !== false && isMobileSpeechEnvironment() && hasSpeechSynthesisSupport()) {
    speakText('Đang kiểm tra.', null, ttsBtn);
  }

  let analysisResult;

  try {
    if (isServerOnline) {
      // Gửi lên backend Node.js
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi xử lý từ máy chủ.');
      }
      analysisResult = await response.json();
    } else {
      // Chạy Rule Engine nội bộ độc lập trên client
      await new Promise((r) => setTimeout(r, 700)); // Hiệu ứng nhẹ
      analysisResult = clientAnalyzeOffline(content);
    }

    // Hiển thị kết quả
    renderResult(analysisResult, {
      historyText: content,
      autoRead: options.autoRead !== false,
      voiceDemo: options.voiceDemo === true
    });
  } catch (err) {
    console.warn('Lỗi phân tích mạng, chuyển sang phân tích an toàn nội bộ:', err);
    // Tự động chuyển fallback an toàn
    const fallbackResult = clientAnalyzeOffline(content);
    fallbackResult.fallback_notice = 'Đã tự động chuyển sang chế độ phân tích quy tắc an toàn nội bộ.';
    renderResult(fallbackResult, {
      historyText: content,
      autoRead: options.autoRead !== false,
      voiceDemo: options.voiceDemo === true
    });
  } finally {
    loadingBox.style.display = 'none';
    finishAnalysisAttempt();
  }
}

// ==========================================================================
// 8. KẾT XUẤT KẾT QUẢ PHÂN TÍCH (RENDER RESULT)
// ==========================================================================
function syncSlowRulesVisibility() {
  slowRulesCard.hidden = resultCard.style.display === 'block';
}

function renderResult(data, options = {}) {
  currentResultText = typeof options.historyText === 'string'
    ? options.historyText
    : textInput.value.trim();
  currentResultData = data;

  // Đặt class mức độ cho card kết quả
  resultCard.className = 'result-card';
  let levelClass = 'level-unclear';

  if (data.alert_level === 'NGUY HIỂM CAO') {
    levelClass = 'level-high';
  } else if (data.alert_level === 'CÓ DẤU HIỆU ĐÁNG NGỜ') {
    levelClass = 'level-suspicious';
  }

  resultCard.classList.add(levelClass);
  resultCard.style.display = 'block';
  syncSlowRulesVisibility();
  emergencyCallLink.hidden = data.alert_level !== 'NGUY HIỂM CAO';
  if (emergencyFamilyBtn) emergencyFamilyBtn.hidden = data.alert_level !== 'NGUY HIỂM CAO';

  // Hiển thị kết quả đối soát liên kết độc hại nếu có
  if (linkThreatContainer && linkThreatList) {
    const threats = data.link_threat_report?.detectedLinks?.filter((l) => l.isSuspicious) || [];
    if (threats.length > 0) {
      linkThreatList.innerHTML = threats
        .map((t) => `<li class="link-threat-item"><strong>${escapeHtml(t.url)}</strong>: ${escapeHtml(t.threatReason)}</li>`)
        .join('');
      linkThreatContainer.hidden = false;
    } else {
      linkThreatContainer.hidden = true;
    }
  }
  resetBtn.style.display = 'inline-flex';
  resultCard.querySelectorAll('.result-disclosure').forEach((disclosure) => {
    disclosure.open = false;
  });

  // 1. Mức độ cảnh báo
  alertLevelText.textContent = data.alert_level;
  shareResultStatus.textContent = '';
  speechPlaybackStatus.textContent = '';

  // 2. Vì sao tin nhắn đáng ngờ?
  explanationText.textContent = data.explanation;

  // Dấu hiệu phát hiện
  detectedList.innerHTML = '';
  if (Array.isArray(data.detected_signs)) {
    data.detected_signs.forEach((sign) => {
      const li = document.createElement('li');
      li.className = 'detected-item';
      li.textContent = sign;
      detectedList.appendChild(li);
    });
  }

  // 4. Những việc nên làm
  actionsList.innerHTML = '';
  if (Array.isArray(data.recommended_actions)) {
    data.recommended_actions.forEach((act, idx) => {
      const li = document.createElement('li');
      li.className = 'action-item';
      const number = document.createElement('span');
      number.className = 'action-item-icon';
      number.textContent = String(idx + 1);
      const text = document.createElement('span');
      text.textContent = act;
      li.append(number, text);
      actionsList.appendChild(li);
    });
  }

  // 5. Lời nhắc an toàn
  safetyReminderText.textContent = data.safety_reminder || 'Đừng vội làm theo yêu cầu trong tin nhắn. Nếu chưa chắc chắn, hãy hỏi người thân hoặc liên hệ trực tiếp với cơ quan, tổ chức qua kênh chính thức.';

  if (options.historyText && options.saveHistory !== false) {
    saveHistoryEntry(options.historyText, data);
  }

  if (data.alert_level === 'NGUY HIỂM CAO' && options.historyText) {
    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch (error) {
      console.warn('Thiết bị không hỗ trợ rung cảnh báo:', error);
    }
  }

  if (options.voiceDemo) {
    speakSmsDemoAlert(true);
  } else if (options.autoRead) {
    speakResult();
  }

  // Cuộn mượt đến bảng kết quả
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

shareResultBtn.addEventListener('click', async () => {
  const result = currentResultData;
  const messageText = (currentResultText || textInput.value || '').trim();
  if (!result || !messageText) {
    shareResultStatus.textContent = 'Chưa có nội dung và kết quả để chia sẻ. Bạn hãy kiểm tra tin nhắn trước.';
    return;
  }

  const alertLevel = result.alert_level || alertLevelText.textContent || 'Chưa xác định';
  const scenario = result.scenario && result.scenario !== 'Chưa xác định được kịch bản'
    ? result.scenario
    : 'Thủ đoạn đáng ngờ mới';
  const signs = Array.isArray(result.detected_signs) && result.detected_signs.length > 0
    ? result.detected_signs.join('; ')
    : (result.explanation || 'Chưa ghi nhận dấu hiệu cụ thể.');
  const actions = Array.isArray(result.recommended_actions)
    ? result.recommended_actions.slice(0, 2).filter(Boolean).join('; ')
    : '';
  const isImageInput = Boolean(currentFile);
  const canAttachImage = isImageInput &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    (() => {
      try {
        return navigator.canShare({ files: [currentFile] });
      } catch (error) {
        console.warn('Không thể xác nhận hỗ trợ chia sẻ ảnh:', error);
        return false;
      }
    })();
  const websiteUrl = window.location.origin || window.location.href;
  const sharedMessageContent = isImageInput
    ? (canAttachImage
      ? '📩 Nội dung: (Vui lòng xem chi tiết trong ảnh chụp màn hình đính kèm)'
      : '📩 Nội dung: Ảnh chụp màn hình cần được gửi kèm riêng vì thiết bị hoặc ứng dụng chia sẻ không hỗ trợ đính kèm ảnh.')
    : `📩 Nội dung tin nhắn:\n"${messageText}"`;
  const message = [
    '[LÁ CHẮN NGƯỜI THÂN - CẢNH BÁO AN TOÀN]',
    '',
    'Tôi vừa kiểm tra một tin nhắn đáng ngờ trên Lá Chắn Người Thân và nhận được kết quả:',
    `⚠️ Mức độ: ${alertLevel}`,
    `📋 Kịch bản: ${scenario}`,
    '',
    sharedMessageContent,
    '',
    `💡 Dấu hiệu: ${signs}`,
    `🛡️ Việc cần làm ngay: ${actions || 'Hãy xác minh qua kênh chính thức trước khi làm theo yêu cầu.'}`,
    '',
    'Bạn hãy xem giúp tôi với nhé!',
    `👉 Link công cụ kiểm tra: ${websiteUrl}`
  ].join('\n');
  shareResultBtn.disabled = true;
  shareResultStatus.textContent = 'Đang mở lựa chọn chia sẻ.';

  try {
    if (typeof navigator.share === 'function') {
      const shareData = { title: 'Lá Chắn Người Thân - Cảnh báo an toàn', text: message };
      if (canAttachImage) shareData.files = [currentFile];
      await navigator.share(shareData);
      shareResultStatus.textContent = isImageInput && !canAttachImage
        ? 'Đã chia sẻ nội dung kết quả. Thiết bị không hỗ trợ đính kèm ảnh; bạn hãy gửi ảnh riêng nếu cần.'
        : 'Đã gửi kết quả chia sẻ.';
      return;
    }

    const shareUrl = `https://zalo.me/share?text=${encodeURIComponent(message)}`;
    const shareWindow = window.open(shareUrl, '_blank');
    if (shareWindow) shareWindow.opener = null;
    shareResultStatus.textContent = shareWindow
      ? 'Đã mở Zalo để chia sẻ kết quả.'
      : 'Trình duyệt đã chặn cửa sổ Zalo. Bạn hãy cho phép cửa sổ bật lên rồi thử lại.';
  } catch (error) {
    if (error.name === 'AbortError') {
      shareResultStatus.textContent = 'Bạn đã đóng lựa chọn chia sẻ.';
    } else {
      console.error('Không thể chia sẻ kết quả:', error);
      shareResultStatus.textContent = 'Không thể chia sẻ lúc này. Bạn hãy thử lại sau.';
    }
  } finally {
    shareResultBtn.disabled = false;
  }
});

// ==========================================================================
// 9. ĐỌC KẾT QUẢ BẰNG GIỌNG NÓI (TEXT-TO-SPEECH CHO NGƯỜI CAO TUỔI)
// ==========================================================================
ttsBtn.addEventListener('click', () => {
  cancelSmsVoiceFlow();
  toggleSpeech(ttsBtn);
});
slowRulesSpeakBtn.addEventListener('click', () => toggleSpeech(slowRulesSpeakBtn));

function toggleSpeech(button = ttsBtn) {
  if (isSpeechActive) {
    const controlButton = activeSpeechButton || button;
    if (isSpeechPaused) {
      if (currentAudio) {
        const playback = currentAudio.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(() => {
            if (currentAudioFallback) currentAudioFallback();
          });
        }
      } else {
        window.speechSynthesis.resume();
      }
      isSpeechPaused = false;
      controlButton.textContent = '⏸️ Tạm dừng đọc';
    } else {
      if (currentAudio) currentAudio.pause();
      else window.speechSynthesis.pause();
      isSpeechPaused = true;
      controlButton.textContent = '▶️ Đọc tiếp';
    }
    return;
  }

  if (button === slowRulesSpeakBtn) {
    speakStaticText(SLOW_RULES_SPEECH_TEXT, null, button);
  } else {
    speakResult();
  }
}

function getResultSpeechText() {
  const level = alertLevelText.textContent;
  const why = explanationText.textContent;

  const actionItems = Array.from(actionsList.querySelectorAll('.action-item > span:last-child'))
    .slice(0, 2)
    .map((item, i) => `Việc thứ ${i + 1}: ${item.textContent}`)
    .join('. ');

  return `
    Xin thông báo.
    Mức độ cảnh báo: ${level}.
    Vì sao cần cảnh giác: ${why}.
    Việc bạn nên làm ngay là: ${actionItems}.
    ${safetyReminderText.textContent}
  `;
}

function speakResult() {
  speakText(getResultSpeechText(), null, ttsBtn);
}

function speakStaticText(text, onEnd, controlButton = ttsBtn) {
  if (isMobileSpeechEnvironment() && hasSpeechSynthesisSupport()) {
    if (speakText(text, onEnd, controlButton)) return;
  }

  if (typeof Audio !== 'function' || !navigator.onLine) {
    speakText(text, onEnd, controlButton);
    return;
  }

  stopSpeaking();
  activeSpeechButton = controlButton;
  audioQueue = MessageTts.splitText(text);
  audioQueueIndex = 0;
  const playbackToken = ++audioPlaybackToken;
  isSpeechActive = true;
  isSpeechPaused = false;
  setSpeechPlaybackStatus(controlButton, '');
  controlButton.textContent = '⏸️ Tạm dừng đọc';

  const finish = () => {
    if (playbackToken !== audioPlaybackToken) return;
    currentAudio = null;
    currentAudioFallback = null;
    audioQueue = [];
    resetSpeechState(controlButton);
    activeSpeechButton = null;
    setSpeechPlaybackStatus(controlButton, '');
    if (onEnd) onEnd();
  };

  const fallbackToDevice = () => {
    if (playbackToken !== audioPlaybackToken) return;
    const remainingText = audioQueue.slice(audioQueueIndex).join(' ');
    speakText(remainingText || text, onEnd, controlButton);
  };
  currentAudioFallback = fallbackToDevice;

  const playNext = () => {
    if (playbackToken !== audioPlaybackToken) return;
    if (audioQueueIndex >= audioQueue.length) {
      finish();
      return;
    }

    const sentence = audioQueue[audioQueueIndex];
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(sentence)}`;
    let audio;
    try {
      audio = new Audio(audioUrl);
    } catch (error) {
      fallbackToDevice();
      return;
    }
    currentAudio = audio;
    audio.volume = 1;
    audio.onended = () => {
      if (playbackToken !== audioPlaybackToken) return;
      currentAudio = null;
      audioQueueIndex += 1;
      playNext();
    };
    audio.onerror = fallbackToDevice;

    try {
      const playback = audio.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(fallbackToDevice);
      }
    } catch (error) {
      fallbackToDevice();
    }
  };

  controlButton.classList.add('speaking');
  playNext();
}

function chooseVietnameseVoice(voices) {
  const normalizeName = (name) => name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
  const voicePriorityPatterns = [
    /google.*tieng viet|vi[-_]vn[-_]standard[-_]a/i,
    /hoai\s*-?\s*my|microsoft.*hoai\s*-?\s*my.*natural/i,
    /\blinh\b|vietnamese\s*\(female\)/i
  ];

  for (const pattern of voicePriorityPatterns) {
    const match = voices.find((voice) => pattern.test(normalizeName(voice.name)));
    if (match) return match;
  }

  return voices.find((voice) => /^vi[-_]vn$/i.test(voice.lang)) || null;
}

function refreshVietnameseVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return;

  preferredVietnameseVoice = chooseVietnameseVoice(voices);
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = refreshVietnameseVoices;
  refreshVietnameseVoices();
}

function hasSpeechSynthesisSupport() {
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
}

function isMobileSpeechEnvironment() {
  const hasCoarsePointer = typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return MessageTts.isMobileDevice(navigator, hasCoarsePointer);
}

function setSpeechPlaybackStatus(controlButton, message) {
  const status = controlButton === slowRulesSpeakBtn
    ? slowRulesSpeechStatus
    : speechPlaybackStatus;
  status.textContent = message;
}

function speakText(text, onEnd, controlButton = ttsBtn) {
  if (!hasSpeechSynthesisSupport()) {
    controlButton.textContent = controlButton === slowRulesSpeakBtn
      ? '🔊 BẤM ĐỂ NGHE 3 NGUYÊN TẮC'
      : '🔊 BẤM ĐỂ NGHE KẾT QUẢ';
    setSpeechPlaybackStatus(controlButton, 'Trình duyệt này chưa hỗ trợ đọc giọng nói trên thiết bị.');
    return false;
  }

  stopSpeaking();
  activeSpeechButton = controlButton;
  currentUtterance = new SpeechSynthesisUtterance(text);
  const utterance = currentUtterance;
  utterance.lang = 'vi-VN';
  utterance.rate = 0.9;
  utterance.pitch = 1.08;
  utterance.volume = 1;
  isSpeechPaused = false;
  isSpeechActive = true;
  setSpeechPlaybackStatus(controlButton, '');
  controlButton.textContent = '⏸️ Tạm dừng đọc';

  let voices = [];
  try {
    voices = window.speechSynthesis.getVoices();
  } catch (error) {
    console.warn('Không thể tải danh sách giọng đọc:', error);
  }
  utterance.voice = chooseVietnameseVoice(voices) || preferredVietnameseVoice || null;

  const finish = (error = null, callOnEnd = true) => {
    if (currentUtterance !== utterance) return;
    if (speechStartTimer) {
      window.clearTimeout(speechStartTimer);
      speechStartTimer = null;
    }
    currentUtterance = null;
    resetSpeechState(controlButton);
    activeSpeechButton = null;
    const wasInterrupted = error === 'canceled' || error === 'interrupted';
    setSpeechPlaybackStatus(controlButton, error && !wasInterrupted
      ? 'Không phát được âm thanh. Hãy kiểm tra âm lượng, chế độ im lặng và thử lại.'
      : '');
    if (!error && callOnEnd && onEnd) onEnd();
  };

  utterance.onend = () => finish();
  utterance.onerror = (event) => finish(event && event.error ? event.error : 'unknown');
  let hasStarted = false;
  utterance.onstart = () => {
    if (currentUtterance !== utterance) return;
    hasStarted = true;
    if (speechStartTimer) {
      window.clearTimeout(speechStartTimer);
      speechStartTimer = null;
    }
    isSpeechActive = true;
    controlButton.classList.add('speaking');
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Không thể phát giọng nói trên thiết bị:', error);
    finish('speech-start-failed', false);
    return false;
  }

  if (!hasStarted) {
    speechStartTimer = window.setTimeout(() => {
      speechStartTimer = null;
      if (currentUtterance !== utterance || hasStarted) return;
      finish('speech-start-timeout', false);
      try {
        window.speechSynthesis.cancel();
      } catch (error) {
        console.warn('Không thể dừng giọng đọc chưa bắt đầu:', error);
      }
    }, 8000);
  }

  if (isMobileSpeechEnvironment()) {
    try {
      window.speechSynthesis.resume();
    } catch (error) {
      console.warn('Không thể tiếp tục phát giọng nói trên thiết bị:', error);
    }
  }
  return true;
}

function resetSpeechState(controlButton = activeSpeechButton || ttsBtn) {
  isSpeechActive = false;
  isSpeechPaused = false;
  controlButton.classList.remove('speaking');
  controlButton.textContent = controlButton === slowRulesSpeakBtn
    ? '🔊 BẤM ĐỂ NGHE 3 NGUYÊN TẮC'
    : '🔊 BẤM ĐỂ NGHE KẾT QUẢ';
}

function stopSpeaking() {
  const controlButton = activeSpeechButton;
  const hasActiveUtterance = currentUtterance !== null;
  audioPlaybackToken += 1;
  currentAudioFallback = null;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  audioQueue = [];
  audioQueueIndex = 0;
  if (speechStartTimer) {
    window.clearTimeout(speechStartTimer);
    speechStartTimer = null;
  }
  currentUtterance = null;
  if (hasActiveUtterance && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  resetSpeechState(controlButton || ttsBtn);
  setSpeechPlaybackStatus(controlButton || ttsBtn, '');
  activeSpeechButton = null;
}

function createSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = 'vi-VN';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

function setListeningState(listening) {
  speechInputBtn.classList.toggle('is-listening', listening);
  speechInputBtn.setAttribute('aria-pressed', String(listening));
  speechInputBtn.textContent = listening
    ? '⏹️ Đang lắng nghe... Bấm để dừng'
    : '🎙️ BẤM ĐỂ NÓI NỘI DUNG TIN';
}

speechInputBtn.addEventListener('click', () => {
  if (speechRecognition) {
    shouldAnalyzeAfterSpeech = true;
    speechRecognition.stop();
    return;
  }

  speechRecognition = createSpeechRecognition();
  if (!speechRecognition) {
    speechInputStatus.textContent = 'Trình duyệt này chưa hỗ trợ nhập bằng giọng nói. Bạn có thể dán nội dung hoặc tải ảnh lên.';
    return;
  }

  speechRecognitionResult = '';
  shouldAnalyzeAfterSpeech = false;
  speechInputStatus.textContent = 'Đang nghe. Hãy đọc nội dung tin nhắn sau tiếng bíp.';
  setListeningState(true);

  const recognition = speechRecognition;
  recognition.onresult = (event) => {
    if (speechRecognition !== recognition) return;
    let transcript = '';
    for (let index = 0; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }
    speechRecognitionResult = transcript.trim();
    textInput.value = speechRecognitionResult;
    updateCharCount();
  };

  recognition.onerror = (event) => {
    if (speechRecognition !== recognition) return;
    shouldAnalyzeAfterSpeech = false;
    speechInputStatus.textContent = event.error === 'not-allowed'
      ? 'Bạn cần cho phép sử dụng micro trong trình duyệt để nhập bằng giọng nói.'
      : 'Chưa nhận được giọng nói rõ. Bạn hãy thử lại hoặc dán nội dung tin nhắn.';
  };

  recognition.onend = () => {
    if (speechRecognition !== recognition) return;
    const shouldAnalyze = shouldAnalyzeAfterSpeech;
    shouldAnalyzeAfterSpeech = false;
    speechRecognition = null;
    setListeningState(false);

    if (speechRecognitionResult) {
      textInput.value = speechRecognitionResult;
      updateCharCount();
      speechInputStatus.textContent = 'Đã nhận nội dung. Đang kiểm tra tin nhắn...';
      if (shouldAnalyze) handleAnalyze();
    } else if (!speechInputStatus.textContent.includes('cho phép')) {
      speechInputStatus.textContent = 'Chưa nhận được nội dung. Bạn hãy thử nói lại hoặc dán tin nhắn.';
    }
  };

  try {
    recognition.start();
  } catch (error) {
    speechRecognition = null;
    setListeningState(false);
    speechInputStatus.textContent = 'Không thể bật micro lúc này. Bạn hãy thử lại hoặc dán nội dung tin nhắn.';
    console.error('Không thể bắt đầu nhận dạng giọng nói:', error);
  }
});

function cancelSpeechInput() {
  if (!speechRecognition) return;

  const recognition = speechRecognition;
  speechRecognition = null;
  speechRecognitionResult = '';
  shouldAnalyzeAfterSpeech = false;
  setListeningState(false);
  speechInputStatus.textContent = '';
  recognition.stop();
}

const SMS_DEMO_QUESTION = 'Bạn vừa nhận được một tin nhắn lạ. Bạn có muốn kiểm tra không? Nếu có, hãy nói CÓ. Nếu không, hãy nói KHÔNG.';
const SMS_REPEAT_QUESTION = 'Bạn có muốn nghe lại không? Hãy nói CÓ hoặc KHÔNG.';
const SMS_UNCLEAR_PROMPT = 'Chưa nghe rõ, bạn vui lòng nói CÓ hoặc KHÔNG, hoặc bấm nút trên màn hình.';
const SMS_DEMO_ALERT = 'Xin thông báo: Tin nhắn này NGUY HIỂM CAO. Kẻ xấu đang giả mạo ngân hàng đòi mã OTP để lấy tiền. Việc bạn cần làm ngay là: Tuyệt đối không gửi mã OTP cho ai và gọi ngay con cháu giúp đỡ.';

function setSmsVoiceStatus(message, listening = false) {
  smsDemoVoiceStatus.textContent = message;
  smsDemoMicStatus.classList.toggle('is-listening', listening);
  smsDemoMicStatus.setAttribute('aria-label', listening ? 'Micro đang nghe' : message);
  const showOnPage = !smsDemoDialog.open && smsVoiceFlowActive;
  smsVoicePageStatus.hidden = !showOnPage;
  smsVoicePageStatus.textContent = message;
  smsVoicePageStatus.classList.toggle('is-listening', listening);
  smsVoicePageActions.hidden = !showOnPage || smsVoiceStage !== 'repeat';
}

function normalizeVoiceCommand(text) {
  return text.toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifySmsVoiceCommand(text) {
  const command = normalizeVoiceCommand(text);
  if (!command) return null;

  if (/\b(khong|bo qua|thoi)\b/.test(command)) return 'no';
  if (/\b(co|dong y|kiem tra)\b/.test(command)) return 'yes';
  return null;
}

function startSmsVoiceRecognition(stage) {
  if (!smsVoiceFlowActive) return;

  const recognition = createSpeechRecognition();
  if (!recognition) {
    setSmsVoiceStatus('Trình duyệt không hỗ trợ micro. Hãy chọn một nút trên màn hình.');
    return;
  }

  recognition.continuous = false;
  recognition.interimResults = false;
  smsVoiceRecognition = recognition;
  smsVoiceStage = stage;
  smsVoiceCommand = null;
  smsVoiceError = null;
  setSmsVoiceStatus('Đang nghe. Nói CÓ hoặc KHÔNG.', true);

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join(' ')
      .trim();
    smsVoiceCommand = classifySmsVoiceCommand(transcript);
  };

  recognition.onerror = (event) => {
    if (smsVoiceRecognition !== recognition) return;
    smsVoiceError = event.error;
  };

  recognition.onend = () => {
    if (smsVoiceRecognition !== recognition) return;
    smsVoiceRecognition = null;
    smsDemoMicStatus.classList.remove('is-listening');

    const command = smsVoiceCommand;
    const error = smsVoiceError;
    const activeStage = smsVoiceStage;
    smsVoiceCommand = null;
    smsVoiceError = null;

    if (command) {
      smsVoiceRetryCount = 0;
      handleSmsVoiceCommand(command, activeStage);
    } else if (error === 'not-allowed' || error === 'service-not-allowed') {
      setSmsVoiceStatus('Micro chưa được cấp quyền. Hãy chọn một nút trên màn hình.');
    } else if (error === 'aborted') {
      setSmsVoiceStatus('Hãy nói CÓ hoặc KHÔNG, hoặc chọn một nút.');
    } else {
      repeatSmsVoicePrompt(activeStage);
    }
  };

  try {
    recognition.start();
  } catch (error) {
    smsVoiceRecognition = null;
    smsDemoMicStatus.classList.remove('is-listening');
    setSmsVoiceStatus('Không thể bật micro. Hãy chọn một nút trên màn hình.');
    console.error('Không thể bắt đầu nhận dạng khẩu lệnh SMS:', error);
  }
}

function stopSmsVoiceRecognition() {
  if (!smsVoiceRecognition) return;
  const recognition = smsVoiceRecognition;
  smsVoiceRecognition = null;
  recognition.stop();
  smsDemoMicStatus.classList.remove('is-listening');
}

function speakSmsPrompt(text, next) {
  setSmsVoiceStatus('Đang đọc câu hỏi...');
  speakStaticText(text, () => {
    if (smsVoiceFlowActive) next();
  });
}

function repeatSmsVoicePrompt(stage) {
  smsVoiceRetryCount += 1;
  if (smsVoiceRetryCount > 1) {
    setSmsVoiceStatus('Hãy chọn một nút trên màn hình.');
    return;
  }

  speakSmsPrompt(SMS_UNCLEAR_PROMPT, () => startSmsVoiceRecognition(stage));
}

function handleSmsVoiceCommand(command, stage) {
  stopSmsVoiceRecognition();
  if (stage === 'initial') {
    if (command === 'yes') acceptSmsDemo();
    else dismissSmsDemo();
    return;
  }

  if (command === 'yes') {
    setSmsVoiceStatus('Đang đọc lại kết quả...');
    smsVoiceFlowActive = false;
    smsVoiceStage = null;
    smsVoicePageActions.hidden = true;
    speakStaticText(SMS_DEMO_ALERT, () => {
      smsVoicePageStatus.hidden = true;
    });
  } else {
    setSmsVoiceStatus('Đã hoàn thành kiểm tra.');
    smsVoiceFlowActive = false;
    smsVoiceStage = null;
    smsVoicePageActions.hidden = true;
    speakStaticText('Đã hoàn thành kiểm tra.', () => {
      smsVoicePageStatus.hidden = true;
    });
  }
}

function speakSmsDemoAlert(askToRepeat) {
  if (!('speechSynthesis' in window)) {
    setSmsVoiceStatus('Trình duyệt không hỗ trợ đọc giọng nói. Bạn có thể bấm nút nghe kết quả.');
    smsVoiceFlowActive = false;
    return;
  }

  speakStaticText(SMS_DEMO_ALERT, () => {
    if (!askToRepeat || !smsVoiceFlowActive) return;
    smsVoiceRetryCount = 0;
    smsVoiceStage = 'repeat';
    speakSmsPrompt(SMS_REPEAT_QUESTION, () => startSmsVoiceRecognition('repeat'));
  });
}

function acceptSmsDemo() {
  smsVoiceStage = 'analysis';
  stopSmsVoiceRecognition();
  if (smsDemoDialog.open) smsDemoDialog.close();

  startNewCheck({ keepSmsVoiceFlow: true });
  textInput.value = 'Thông báo từ ngân hàng: Tài khoản của bạn sẽ bị khóa. Vui lòng cung cấp mã OTP để xác minh ngay.';
  updateCharCount();
  handleAnalyze({ voiceDemo: true });
}

function dismissSmsDemo() {
  smsVoiceFlowActive = false;
  smsVoiceStage = null;
  stopSmsVoiceRecognition();
  if (smsDemoDialog.open) smsDemoDialog.close();
  setSmsVoiceStatus('Đã bỏ qua tin nhắn này.');
  speakStaticText('Đã bỏ qua tin nhắn này.');
}

function cancelSmsVoiceFlow() {
  if (!smsVoiceFlowActive && !smsVoiceRecognition) return;
  smsVoiceFlowActive = false;
  smsVoiceStage = null;
  smsVoiceRetryCount = 0;
  stopSmsVoiceRecognition();
  if (smsDemoDialog.open) smsDemoDialog.close();
  smsVoicePageStatus.hidden = true;
  smsVoicePageActions.hidden = true;
}

smsDemoBtn.addEventListener('click', () => {
  if (typeof smsDemoDialog.showModal !== 'function') {
    alert('Trình duyệt này chưa hỗ trợ hộp thoại mô phỏng SMS.');
    return;
  }

  cancelSmsVoiceFlow();
  cancelSpeechInput();
  stopSpeaking();
  smsVoiceFlowActive = true;
  smsVoiceStage = 'initial';
  smsVoiceRetryCount = 0;
  smsDemoDialog.showModal();
  speakSmsPrompt(SMS_DEMO_QUESTION, () => startSmsVoiceRecognition('initial'));
  smsDemoAcceptBtn.focus();
});

smsDemoAcceptBtn.addEventListener('click', acceptSmsDemo);
smsDemoDismissBtn.addEventListener('click', dismissSmsDemo);
smsVoiceRepeatYesBtn.addEventListener('click', () => handleSmsVoiceCommand('yes', 'repeat'));
smsVoiceRepeatNoBtn.addEventListener('click', () => handleSmsVoiceCommand('no', 'repeat'));
smsDemoDialog.addEventListener('close', () => {
  if (!smsVoiceFlowActive || smsVoiceStage !== 'initial') return;
  cancelSmsVoiceFlow();
  stopSpeaking();
  setSmsVoiceStatus('Đã đóng thông báo.');
});

// ==========================================================================
// CÁC NÚT ĐIỀU KHIỂN: KIỂM TRA LẠI
// ==========================================================================

// Kiểm tra tin nhắn khác
resetBtn.addEventListener('click', () => {
  startNewCheck();
});

function startNewCheck(options = {}) {
  if (!options.keepSmsVoiceFlow) cancelSmsVoiceFlow();
  cancelSpeechInput();
  speechInputStatus.textContent = '';
  stopSpeaking();
  removeImgBtn.click();
  textInput.value = '';
  updateCharCount();
  resultCard.style.display = 'none';
  syncSlowRulesVisibility();
  emergencyCallLink.hidden = true;
  if (emergencyFamilyBtn) emergencyFamilyBtn.hidden = true;
  if (linkThreatContainer) linkThreatContainer.hidden = true;
  if (emergencyFamilyBtn) emergencyFamilyBtn.hidden = true;
  if (linkThreatContainer) linkThreatContainer.hidden = true;
  resetBtn.style.display = 'none';
  currentHistoryId = null;
  updateHistorySelection();
  if (!tabBtns[0].classList.contains('active')) tabBtns[0].click();
  closeMobileSidebar();
  textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  textInput.focus();
}

function showHistoryError(message) {
  historyStatus.textContent = message;
  console.error(message);
}

function persistHistory() {
  try {
    MessageHistory.save(window.localStorage, historyItems);
    historyStatus.textContent = '';
  } catch (error) {
    showHistoryError('Không thể lưu lịch sử trên thiết bị này. Bạn vẫn có thể tiếp tục kiểm tra.');
  }
}

function saveHistoryEntry(text, result) {
  const entry = MessageHistory.createEntry(text, result, new Date());
  historyItems = [entry, ...historyItems].slice(0, MessageHistory.MAX_ITEMS);
  currentHistoryId = entry.id;
  persistHistory();
  renderHistoryList();
}

function formatHistoryTime(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function getHistoryLevel(alertLevel) {
  if (alertLevel === 'NGUY HIỂM CAO') return { icon: '🔴', label: 'Nguy hiểm cao' };
  if (alertLevel === 'CÓ DẤU HIỆU ĐÁNG NGỜ') return { icon: '🟠', label: 'Có dấu hiệu đáng ngờ' };
  return { icon: '🔵', label: 'Chưa thấy dấu hiệu rõ' };
}

function renderHistoryList() {
  historyList.replaceChildren();

  if (historyItems.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'history-empty';
    emptyMessage.textContent = 'Chưa có tin nhắn nào được kiểm tra.';
    historyList.appendChild(emptyMessage);
    return;
  }

  historyItems.forEach((item) => {
    const level = getHistoryLevel(item.result.alert_level);
    const row = document.createElement('div');
    row.className = 'history-row';
    row.setAttribute('role', 'listitem');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.setAttribute('aria-label', `${level.label}: ${item.text.slice(0, 100)}. ${formatHistoryTime(item.createdAt)}`);
    if (item.id === currentHistoryId) button.setAttribute('aria-current', 'true');

    const icon = document.createElement('span');
    icon.className = 'history-level-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = level.icon;

    const copy = document.createElement('span');
    copy.className = 'history-item-copy';
    const excerpt = document.createElement('span');
    excerpt.className = 'history-excerpt';
    excerpt.textContent = item.text.replace(/\s+/g, ' ').trim();
    const time = document.createElement('time');
    time.className = 'history-time';
    time.dateTime = item.createdAt;
    time.textContent = formatHistoryTime(item.createdAt);
    copy.append(excerpt, time);
    button.append(icon, copy);
    button.addEventListener('click', () => restoreHistoryEntry(item));
    row.appendChild(button);
    historyList.appendChild(row);
  });
}

function updateHistorySelection() {
  historyList.querySelectorAll('.history-item').forEach((item, index) => {
    if (historyItems[index] && historyItems[index].id === currentHistoryId) {
      item.setAttribute('aria-current', 'true');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function restoreHistoryEntry(item) {
  stopSpeaking();
  removeImgBtn.click();
  currentHistoryId = item.id;
  textInput.value = item.text;
  updateCharCount();
  if (!tabBtns[0].classList.contains('active')) tabBtns[0].click();
  renderResult(item.result, { saveHistory: false });
  updateHistorySelection();
  closeMobileSidebar();
}

function openMobileSidebar() {
  document.body.classList.add('sidebar-open');
  sidebarBackdrop.hidden = false;
  sidebarMenuBtn.setAttribute('aria-expanded', 'true');
  sidebarMenuBtn.setAttribute('aria-label', 'Đóng lịch sử kiểm tra');
}

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
  sidebarBackdrop.hidden = true;
  sidebarMenuBtn.setAttribute('aria-expanded', 'false');
  sidebarMenuBtn.setAttribute('aria-label', 'Mở lịch sử kiểm tra');
}

sidebarMenuBtn.addEventListener('click', () => {
  if (document.body.classList.contains('sidebar-open')) closeMobileSidebar();
  else openMobileSidebar();
});

sidebarBackdrop.addEventListener('click', closeMobileSidebar);
sidebarCloseBtn.addEventListener('click', closeMobileSidebar);

sidebarCollapseBtn.addEventListener('click', () => {
  const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
  sidebarCollapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
  sidebarCollapseBtn.setAttribute('aria-label', isCollapsed ? 'Mở rộng thanh lịch sử' : 'Thu gọn thanh lịch sử');
});

newCheckBtn.addEventListener('click', startNewCheck);

clearHistoryBtn.addEventListener('click', () => {
  if (historyItems.length === 0) return;
  if (!window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử kiểm tra trên thiết bị này không?')) return;

  historyItems = [];
  currentHistoryId = null;
  persistHistory();
  renderHistoryList();
});

function initializeHistory() {
  try {
    historyItems = MessageHistory.load(window.localStorage);
    renderHistoryList();
  } catch (error) {
    historyItems = [];
    renderHistoryList();
    showHistoryError('Không thể đọc lịch sử trên thiết bị này. Các lần kiểm tra hiện tại vẫn hoạt động bình thường.');
  }
}

// Cỡ chữ
function updateFontSize(nextSize) {
  currentFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, nextSize));
  document.documentElement.style.setProperty('--base-size', `${currentFontSize}px`);
  fontSizeIndicator.textContent = 'A';
  fontSizeIndicator.setAttribute('aria-label', `Cỡ chữ hiện tại: ${currentFontSize} pixel`);
  fontDecreaseBtn.disabled = currentFontSize === MIN_FONT_SIZE;
  fontIncreaseBtn.disabled = currentFontSize === MAX_FONT_SIZE;
}

fontDecreaseBtn.addEventListener('click', () => updateFontSize(currentFontSize - 4));
fontIncreaseBtn.addEventListener('click', () => updateFontSize(currentFontSize + 4));

// Chế độ tương phản cao
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  themeBtn.setAttribute('aria-pressed', String(isDarkMode));
  themeBtn.setAttribute(
    'aria-label',
    isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  );
});

// Khởi động
window.addEventListener('DOMContentLoaded', () => {
  checkSystemStatus();
  updateCharCount();
  resetBtn.style.display = 'none';
  updateFontSize(currentFontSize);
  initializeHistory();
  initFamilyPhoneFeatures();
  loadScamTrends();
});

// ==========================================================================
// TÍNH NĂNG MỚI: BÁO ĐỘNG CHO CON CHÁU & BẢNG TIN LỪA ĐẢO
// ==========================================================================
function getFamilyPhone() {
  try {
    return localStorage.getItem('laChanFamilyPhone') || '';
  } catch (e) {
    return '';
  }
}

function updateFamilyPhoneUI() {
  const phone = getFamilyPhone();
  if (familyPhoneLabel) {
    familyPhoneLabel.textContent = phone ? `SĐT người thân: ${phone}` : 'Cài số điện thoại con cháu';
  }
  if (familyPhoneInput) {
    familyPhoneInput.value = phone;
  }
}

function initFamilyPhoneFeatures() {
  updateFamilyPhoneUI();

  if (openFamilyPhoneBtn && familyPhoneDialog) {
    openFamilyPhoneBtn.addEventListener('click', () => {
      updateFamilyPhoneUI();
      if (familyPhoneStatus) familyPhoneStatus.textContent = '';
      if (typeof familyPhoneDialog.showModal === 'function') {
        familyPhoneDialog.showModal();
      } else {
        familyPhoneDialog.setAttribute('open', '');
      }
    });
  }

  if (closeFamilyPhoneBtn && familyPhoneDialog) {
    closeFamilyPhoneBtn.addEventListener('click', () => {
      if (typeof familyPhoneDialog.close === 'function') {
        familyPhoneDialog.close();
      } else {
        familyPhoneDialog.removeAttribute('open');
      }
    });
  }

  if (saveFamilyPhoneBtn && familyPhoneInput) {
    saveFamilyPhoneBtn.addEventListener('click', () => {
      const raw = familyPhoneInput.value.trim().replace(/\s+/g, '');
      if (!/^[0-9]{9,11}$/.test(raw)) {
        if (familyPhoneStatus) {
          familyPhoneStatus.style.color = '#dc2626';
          familyPhoneStatus.textContent = 'Vui lòng nhập số điện thoại hợp lệ (9-11 chữ số).';
        }
        return;
      }
      try {
        localStorage.setItem('laChanFamilyPhone', raw);
      } catch (err) {
        console.error('Không thể lưu số điện thoại:', err);
      }
      updateFamilyPhoneUI();
      if (familyPhoneStatus) {
        familyPhoneStatus.style.color = '#15803d';
        familyPhoneStatus.textContent = '✅ Đã lưu số điện thoại người thân thành công!';
      }
      setTimeout(() => {
        if (familyPhoneDialog && familyPhoneDialog.open && typeof familyPhoneDialog.close === 'function') {
          familyPhoneDialog.close();
        }
      }, 1000);
    });
  }

  if (emergencyFamilyBtn) {
    emergencyFamilyBtn.addEventListener('click', () => {
      const phone = getFamilyPhone();
      if (!phone) {
        if (familyPhoneDialog) {
          updateFamilyPhoneUI();
          if (familyPhoneStatus) {
            familyPhoneStatus.style.color = '#dc2626';
            familyPhoneStatus.textContent = 'Vui lòng nhập và lưu số con cháu trước khi gửi báo động.';
          }
          if (typeof familyPhoneDialog.showModal === 'function') {
            familyPhoneDialog.showModal();
          }
        }
        return;
      }

      const messageText = (currentResultText || textInput.value || '').trim();
      const preview = messageText.length > 140 ? `${messageText.slice(0, 140)}...` : messageText;
      const smsBody = `[LÁ CHẮN NGƯỜI THÂN - BÁO ĐỘNG KHẨN]\nBố/Mẹ/Ông/Bà vừa nhận được tin nhắn NGUY HIỂM CAO:\n"${preview}"\nCon/Cháu hãy gọi lại kiểm tra giúp ngay nhé!`;
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(smsBody)}`;
      window.location.href = smsUrl;
    });
  }
}

async function loadScamTrends() {
  try {
    const res = await fetch('/api/trends');
    if (!res.ok) return;
    const data = await res.json();
    const grid = document.getElementById('scamTrendsGrid');
    if (!grid || !Array.isArray(data.trends) || data.trends.length === 0) return;
    grid.innerHTML = data.trends
      .map(
        (t, idx) => `
      <article class="trend-item">
        <div class="trend-tag ${t.tag.includes('NGUY HIỂM') ? 'tag-urgent' : t.tag.includes('MỚI') ? 'tag-warning' : 'tag-common'}">${escapeHtml(t.tag)}</div>
        <h3 class="trend-item-title">${idx + 1}. ${escapeHtml(t.title)}</h3>
        <p class="trend-item-summary">${escapeHtml(t.summary)}</p>
        <div class="trend-item-tip">💡 <strong>Cách xử lý:</strong> ${escapeHtml(t.advice)}</div>
      </article>`
      )
      .join('');
  } catch (err) {
    // Giữ nguyên nội dung tĩnh dự phòng
  }
}
