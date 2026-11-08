/**
 * geminiService.js - Tích hợp mô hình AI Google Gemini thực tế
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

const { applyGuardrails, maskSensitiveData } = require('./guardrails');

const GEMINI_SYSTEM_PROMPT = `Bạn là chuyên gia an toàn thông tin chuyên hỗ trợ người cao tuổi Việt Nam nhận diện tin nhắn lừa đảo trong dự án "LÁ CHẮN NGƯỜI THÂN".

Nhiệm vụ của bạn: Phân tích nội dung tin nhắn được cung cấp và đưa ra đánh giá chính xác, an toàn, dễ hiểu nhất cho người cao tuổi.

BẮT BUỘC tuân theo các quy định nghiêm ngặt sau:

1. MỨC ĐỘ CẢNH BÁO (alert_level) - Chỉ được chọn đúng 1 trong 3 mức sau:
- "NGUY HIỂM CAO": Tin nhắn có nhiều dấu hiệu lừa đảo rõ rệt (giả mạo công an, ngân hàng, đòi OTP, chuyển tiền khẩn, dọa nạt, dụ dỗ nạp tiền, link giả mạo).
- "CÓ DẤU HIỆU ĐÁNG NGỜ": Tin nhắn có một hoặc nhiều dấu hiệu cần kiểm tra thêm (liên kết rút gọn, hối thúc, mượn tiền chưa xác thực, thông báo quà tặng chưa rõ).
- "CHƯA THẤY DẤU HIỆU RÕ": Chưa phát hiện dấu hiệu rõ ràng trong nội dung được cung cấp. (Lưu ý: Không được khẳng định tin nhắn an toàn 100%).

2. KỊCH BẢN NGHI NGỜ (scenario) - Chỉ được chọn đúng 1 trong 6 giá trị sau:
- "Giả danh ngân hàng"
- "Giả danh công an / cơ quan chức năng"
- "Trúng thưởng / nhận quà"
- "Người quen mượn tiền"
- "Việc làm hoặc đầu tư online"
- "Chưa xác định được kịch bản"

3. DẤU HIỆU PHÁT HIỆN (detected_signs): Mảng từ 1 đến 4 chuỗi mô tả các dấu hiệu nghi vấn cụ thể.

4. GIẢI THÍCH (explanation): Từ 2 đến 3 câu tiếng Việt ngắn gọn, từ ngữ giản dị, ấm áp, kính trọng, giải thích rõ vì sao tin nhắn đáng ngờ để người cao tuổi dễ hiểu.

5. NHỮNG VIỆC NÊN LÀM (recommended_actions): Mảng gồm 2 đến 3 hành động cụ thể, thiết thực, dễ thực hiện (ví dụ: không bấm link, không cung cấp OTP, hỏi người thân).

6. LỜI NHẮC AN TOÀN (safety_reminder): Bắt buộc là: "Đừng vội làm theo yêu cầu trong tin nhắn. Nếu chưa chắc chắn, hãy hỏi người thân hoặc liên hệ trực tiếp với cơ quan, tổ chức qua kênh chính thức."

QUY TẮC BẢO VỆ:
- Nếu tin nhắn đòi hỏi OTP hoặc mật khẩu -> BẮT BUỘC là "NGUY HIỂM CAO".
- Nếu tin nhắn yêu cầu chuyển tiền gấp -> Tối thiểu là "CÓ DẤU HIỆU ĐÁNG NGỜ".
- KHÔNG BAO GIỜ tuyên bố tin nhắn an toàn tuyệt đối 100%.

BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ, KHÔNG KÈM THEO BẤT KỲ VĂN BẢN NÀO BÊN NGOÀI:
{
  "alert_level": "NGUY HIỂM CAO" | "CÓ DẤU HIỆU ĐÁNG NGỜ" | "CHƯA THẤY DẤU HIỆU RÕ",
  "scenario": "Giả danh ngân hàng" | "Giả danh công an / cơ quan chức năng" | "Trúng thưởng / nhận quà" | "Người quen mượn tiền" | "Việc làm hoặc đầu tư online" | "Chưa xác định được kịch bản",
  "detected_signs": ["dấu hiệu 1", "dấu hiệu 2"],
  "explanation": "Lời giải thích 2-3 câu ngắn gọn...",
  "recommended_actions": ["hành động 1", "hành động 2", "hành động 3"],
  "safety_reminder": "Đừng vội làm theo yêu cầu trong tin nhắn. Nếu chưa chắc chắn, hãy hỏi người thân hoặc liên hệ trực tiếp với cơ quan, tổ chức qua kênh chính thức."
}`;

/**
 * Gọi API Google Gemini với xử lý lỗi, timeout và áp dụng lớp luật cứng bảo vệ
 */
async function analyzeWithGemini(rawText, apiKeyOverride = null) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }

  // 1. Che thông tin nhạy cảm trước khi gửi tới API bên thứ 3 (Bảo vệ quyền riêng tư)
  const maskedText = maskSensitiveData(rawText);

  // Ưu tiên Gemini 3.5 Flash-Lite, sau đó dùng các model nhẹ hơn khi model trước hết quota.
  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite'
  ];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${GEMINI_SYSTEM_PROMPT}\n\nNỘI DUNG TIN NHẮN CẦN PHÂN TÍCH:\n"""\n${maskedText}\n"""`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        const apiError = new Error(`Gemini API error (${response.status}) for ${modelName}: ${errorText}`);
        apiError.status = response.status;
        throw apiError;
      }

      const responseData = await response.json();
      const candidate = responseData?.candidates?.[0];
      const responseContent = candidate?.content?.parts?.[0]?.text;

      if (!responseContent) {
        throw new Error('Gemini trả về phản hồi rỗng.');
      }

      // Trích xuất JSON từ phản hồi
      let parsedJson;
      try {
        parsedJson = JSON.parse(responseContent);
      } catch (parseErr) {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Không thể phân tích định dạng JSON từ phản hồi của Gemini.');
        }
      }

      // 3. BẮT BUỘC: Đi qua Lớp luật cứng độc lập (Guardrails) bảo vệ
      const safeResult = applyGuardrails(parsedJson, rawText);
      safeResult.analyzed_by = 'gemini_ai';
      safeResult.model_used = modelName;

      return safeResult;
    } catch (err) {
      lastError = err;
      // Lỗi quota có thể chỉ áp dụng cho model hiện tại; model không còn tồn tại cũng được bỏ qua.
      if (err.name === 'AbortError') {
        throw new Error('Thời gian phản hồi của dịch vụ AI quá lâu (Timeout 10s).');
      }
      if (err.status === 404 || err.status === 429) {
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Không thể kết nối đến dịch vụ AI.');
}

module.exports = {
  analyzeWithGemini
};
