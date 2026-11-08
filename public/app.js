/**
 * app.js - Logic giao diện và xử lý kiểm tra tin nhắn
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

// ==========================================================================
// KHỞI TẠO BIẾN VÀ ELEMENT DOM
// ==========================================================================
let currentFile = null;
let currentExtractedText = '';
let isSpeechActive = false;
let currentUtterance = null;
let isServerOnline = false;

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
const resetBtn = document.getElementById('resetBtn');

// Accessibility controls
const fontDecreaseBtn = document.getElementById('fontDecreaseBtn');
const fontIncreaseBtn = document.getElementById('fontIncreaseBtn');
const fontSizeIndicator = document.getElementById('fontSizeIndicator');
const themeBtn = document.getElementById('contrastBtn');
const MIN_FONT_SIZE = 15;
const MAX_FONT_SIZE = 31;
let currentFontSize = 19;

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
      explanation = 'Tin nhắn quảng cáo làm việc nhẹ lương cao, giật đơn hàng Shopee hoặc đầu tư tài chính sinh lời mỗi ngày và yêu cầu nạp tiền làm nhiệm vụ. Kẻ gian có thể cho bạn rút một chút tiền lúc đầu, sau đó dụ dỗ nạp số tiền lớn rồi chặn liên lạc. Bác/Cô/Chú tuyệt đối không tin vào các lời mời chào kiếm tiền dễ dàng qua mạng.';
      actions.push('Không nạp tiền hoặc chuyển tiền làm bất kỳ nhiệm vụ nào.');
      actions.push('Rời khỏi các hội nhóm lạ trên mạng xã hội Telegram hoặc Zalo.');
      actions.push('Nhờ người thân có hiểu biết kiểm tra lại thông tin tuyển dụng.');
    } else {
      explanation = 'Tin nhắn có các biểu hiện nguy cơ cao như đòi hỏi thông tin bí mật hoặc hối thúc chuyển tiền. Bác/Cô/Chú cần hết sức đề phòng và không làm theo yêu cầu trong tin nhắn.';
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
    explanation = 'Chưa phát hiện dấu hiệu lừa đảo phổ biến trong nội dung được cung cấp. Tuy nhiên, điều này không đồng nghĩa tin nhắn chắc chắn an toàn 100%. Bác/Cô/Chú vẫn nên giữ cảnh giác nếu các tin nhắn tiếp theo có yêu cầu liên quan đến tài chính.';
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
async function prepareImageForOcr(file) {
  if (typeof createImageBitmap !== 'function') return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    2.5,
    2800 / bitmap.width,
    Math.sqrt(8000000 / (bitmap.width * bitmap.height))
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Không thể chuẩn bị ảnh để nhận diện chữ.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    const image = context.getImageData(0, 0, width, height);
    for (let index = 0; index < image.data.length; index += 4) {
      const luminance = Math.round(
        image.data[index] * 0.299 +
        image.data[index + 1] * 0.587 +
        image.data[index + 2] * 0.114
      );
      const enhanced = Math.max(0, Math.min(255, (luminance - 128) * 1.12 + 128));
      image.data[index] = enhanced;
      image.data[index + 1] = enhanced;
      image.data[index + 2] = enhanced;
    }
    context.putImageData(image, 0, 0);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Không thể xử lý ảnh. Vui lòng thử ảnh khác.'));
      }, 'image/png');
    });
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function runOcrOnImage(file) {
  ocrProgressBox.style.display = 'block';
  ocrResultBox.style.display = 'none';
  ocrErrorMessage.style.display = 'none';
  ocrErrorMessage.textContent = '';
  ocrProgressBar.style.width = '10%';
  ocrProgressText.textContent = 'Đang chuẩn bị ảnh và tải bộ nhận diện chữ tiếng Việt...';
  analyzeBtn.disabled = true;
  let worker;

  try {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Thư viện OCR chưa tải xong, vui lòng đợi vài giây hoặc kiểm tra kết nối mạng.');
    }

    const imageForOcr = await prepareImageForOcr(file);
    worker = await Tesseract.createWorker('vie+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round((m.progress || 0) * 100);
          ocrProgressBar.style.width = `${progress}%`;
          ocrProgressText.textContent = `Đang đọc chữ trong ảnh chụp: ${progress}%...`;
        }
      }
    });

    await worker.setParameters({ preserve_interword_spaces: '1' });
    const ret = await worker.recognize(imageForOcr);

    const extracted = ret.data.text.trim();
    ocrProgressBox.style.display = 'none';

    if (!isUsableOcrText(extracted, ret.data.confidence)) {
      currentExtractedText = '';
      textInput.value = '';
      ocrResultText.value = '';
      updateCharCount();
      ocrErrorMessage.textContent = 'Ảnh này không có hoặc không đọc rõ nội dung tin nhắn. Bác/Cô/Chú vui lòng gửi lại ảnh chụp màn hình tin nhắn rõ chữ, hoặc chọn “Dán tin nhắn” để nhập nội dung cần kiểm tra.';
      ocrErrorMessage.style.display = 'block';
      return;
    }

    currentExtractedText = extracted;
    ocrResultBox.style.display = 'block';
    ocrResultText.value = extracted;
    textInput.value = extracted;
    updateCharCount();
    ocrResultText.focus();

  } catch (err) {
    console.error('OCR Error:', err);
    ocrProgressBox.style.display = 'none';
    alert('Không thể đọc chữ tự động: ' + err.message + '\n\nBác/Cô/Chú có thể dán nội dung tin nhắn trực tiếp vào ô bên cạnh để kiểm tra ngay ạ.');
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.warn('Không thể đóng bộ nhận diện OCR:', err);
      }
    }
    analyzeBtn.disabled = false;
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
  resultCard.style.display = 'none';
  resetBtn.style.display = 'none';
  updateCharCount();
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewContainer.style.display = 'block';
    // Tự động chạy OCR
    runOcrOnImage(file);
  };
  reader.readAsDataURL(file);
}

// Xóa ảnh đã chọn
removeImgBtn.addEventListener('click', () => {
  const removedOcrText = currentExtractedText;
  currentFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewContainer.style.display = 'none';
  ocrResultBox.style.display = 'none';
  ocrProgressBox.style.display = 'none';
  ocrErrorMessage.style.display = 'none';
  ocrErrorMessage.textContent = '';
  if (removedOcrText && textInput.value === removedOcrText) {
    textInput.value = '';
    updateCharCount();
  }
  currentExtractedText = '';
});

// ==========================================================================
// QUY TRÌNH PHÂN TÍCH CHÍNH
// ==========================================================================
analyzeBtn.addEventListener('click', handleAnalyze);

async function handleAnalyze() {
  const content = textInput.value.trim();

  // Kiểm tra đầu vào rỗng
  if (!content) {
    alert('Bác/Cô/Chú vui lòng dán nội dung tin nhắn hoặc tải ảnh có chứa chữ để Lá Chắn Người Thân kiểm tra giúp ạ!');
    textInput.focus();
    return;
  }

  // Kiểm tra độ dài tối thiểu
  if (content.length < 4) {
    alert('Nội dung quá ngắn để nhận diện chính xác. Bác/Cô/Chú vui lòng nhập đầy đủ câu chữ trong tin nhắn nhé.');
    return;
  }

  // 1. Hiển thị trạng thái đang xử lý
  loadingBox.style.display = 'block';
  resultCard.style.display = 'none';
  analyzeBtn.disabled = true;
  loadingBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Dừng giọng nói cũ nếu đang phát
  stopSpeaking();

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
    renderResult(analysisResult);
  } catch (err) {
    console.warn('Lỗi phân tích mạng, chuyển sang phân tích an toàn nội bộ:', err);
    // Tự động chuyển fallback an toàn
    const fallbackResult = clientAnalyzeOffline(content);
    fallbackResult.fallback_notice = 'Đã tự động chuyển sang chế độ phân tích quy tắc an toàn nội bộ.';
    renderResult(fallbackResult);
  } finally {
    loadingBox.style.display = 'none';
    analyzeBtn.disabled = false;
  }
}

// ==========================================================================
// 8. KẾT XUẤT KẾT QUẢ PHÂN TÍCH (RENDER RESULT)
// ==========================================================================
function renderResult(data) {
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
  resetBtn.style.display = 'inline-flex';

  // 1. Mức độ cảnh báo
  alertLevelText.textContent = data.alert_level;

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

  // Cuộn mượt đến bảng kết quả
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================================================
// 9. ĐỌC KẾT QUẢ BẰNG GIỌNG NÓI (TEXT-TO-SPEECH CHO NGƯỜI CAO TUỔI)
// ==========================================================================
ttsBtn.addEventListener('click', toggleSpeech);

function toggleSpeech() {
  if (isSpeechActive) {
    stopSpeaking();
    return;
  }

  if (!('speechSynthesis' in window)) {
    alert('Rất tiếc, trình duyệt của bạn không hỗ trợ tính năng đọc bằng giọng nói.');
    return;
  }

  const level = alertLevelText.textContent;
  const why = explanationText.textContent;

  const actionItems = Array.from(actionsList.querySelectorAll('.action-item > span:last-child'))
    .map((item, i) => `Việc thứ ${i + 1}: ${item.textContent}`)
    .join('. ');
  const detectedItems = Array.from(detectedList.querySelectorAll('li'))
    .map((item) => item.textContent)
    .join('. ');

  const fullSpeech = `
    Kết quả kiểm tra từ Lá Chắn Người Thân.
    Mức độ cảnh báo: ${level}.
    Những việc bác cô chú nên làm ngay: ${actionItems}.
    Dấu hiệu nhận biết: ${detectedItems}.
    Vì sao cần cảnh giác: ${why}.
    Lời nhắc an toàn: Đừng vội làm theo yêu cầu trong tin nhắn. Nếu chưa chắc chắn, hãy hỏi con cháu hoặc người thân đáng tin cậy.
  `;

  currentUtterance = new SpeechSynthesisUtterance(fullSpeech);
  currentUtterance.lang = 'vi-VN';
  currentUtterance.rate = 0.9; // Giọng đọc chậm rãi, rõ ràng cho người cao tuổi

  currentUtterance.onstart = () => {
    isSpeechActive = true;
    ttsBtn.classList.add('speaking');
    ttsBtn.textContent = 'Dừng đọc';
  };

  currentUtterance.onend = () => {
    stopSpeaking();
  };

  currentUtterance.onerror = () => {
    stopSpeaking();
  };

  window.speechSynthesis.speak(currentUtterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeechActive = false;
  ttsBtn.classList.remove('speaking');
  ttsBtn.textContent = 'Đọc kết quả bằng giọng nói';
}

// ==========================================================================
// CÁC NÚT ĐIỀU KHIỂN: KIỂM TRA LẠI
// ==========================================================================

// Kiểm tra tin nhắn khác
resetBtn.addEventListener('click', () => {
  stopSpeaking();
  textInput.value = '';
  updateCharCount();
  removeImgBtn.click();
  resultCard.style.display = 'none';
  resetBtn.style.display = 'none';
  if (!tabBtns[0].classList.contains('active')) tabBtns[0].click();
  textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  textInput.focus();
});

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
});
