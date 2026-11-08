# 🛡️ LÁ CHẮN NGƯỜI THÂN
> **AI giúp nhận ra tin nhắn lừa đảo, bắt đầu từ người cao tuổi.**  
> *Dự án đổi mới sáng tạo vì cộng đồng của học sinh THPT.*  
> 💬 **Thông điệp:** *“Nhận được tin lạ, không ai phải đoán một mình.”*

---

## 📌 I. GIỚI THIỆU DỰ ÁN

**Lá Chắn Người Thân** là website ứng dụng Trí tuệ Nhân tạo (AI) kết hợp cùng Lớp luật cứng độc lập (Guardrails), được thiết kế đặc biệt nhằm hỗ trợ người cao tuổi và các gia đình Việt Nam dễ dàng nhận biết, phòng ngừa các tin nhắn lừa đảo tinh vi trên điện thoại thông minh.

### 👥 Đối tượng thụ hưởng
1. **Người cao tuổi (Đối tượng chính):** Giao diện chữ lớn (A/A+/A++), tương phản cao, thao tác 1 chạm, hỗ trợ **đọc kết quả bằng giọng nói (Text-to-Speech)**.
2. **Con cháu và người thân:** Dễ dàng kiểm tra hộ cho ông bà, có nút sao chép kết quả gửi gia đình.
3. **Cộng đồng người dùng Internet:** Cẩm nang nhận diện 5 kịch bản lừa đảo nguy hiểm nhất hiện nay.

---

## 🎯 II. 5 KỊCH BẢN LỪA ĐẢO TRỌNG TÂM

Website nhận diện chính xác 5 nhóm kịch bản và 3 mức độ cảnh báo quy chuẩn:

| Kịch bản | Dấu hiệu đặc trưng | Mức cảnh báo chuẩn |
| :--- | :--- | :---: |
| **1. Giả danh ngân hàng** | Báo khóa tài khoản, biến động số dư, ép bấm vào liên kết lạ, đòi mã OTP. | **NGUY HIỂM CAO** |
| **2. Giả danh công an / cơ quan chức năng** | Dọa dẫm dính líu vụ án ma túy, rửa tiền, gửi lệnh bắt, yêu cầu chuyển tiền "tạm giữ". | **NGUY HIỂM CAO** |
| **3. Trúng thưởng / nhận quà** | Thông báo trúng xe SH, quà tri ân tiền triệu, yêu cầu nộp trước phí cọc hoặc thuế. | **NGUY HIỂM CAO** |
| **4. Người quen mượn tiền** | Mạo danh con cháu báo rơi máy, cấp cứu, mượn tiền gấp chuyển vào số tài khoản lạ. | **NGUY HIỂM CAO** |
| **5. Việc làm / đầu tư online** | Việc nhẹ lương cao, giật đơn Shopee, hoa hồng 30-50%, nạp tiền làm nhiệm vụ Telegram. | **NGUY HIỂM CAO** |
| **Tin nhắn thông thường** | Lời nhắn sinh hoạt, họp tổ dân phố, hỏi thăm không có yếu tố tài chính/áp lực. | **CHƯA THẤY DẤU HIỆU RÕ** |

> ⚠️ **Lưu ý an toàn:** Website **KHÔNG BAO GIỜ** khẳng định tin nhắn an toàn tuyệt đối 100%. Khi kết quả là *"CHƯA THẤY DẤU HIỆU RÕ"*, hệ thống luôn cảnh báo người dùng duy trì sự thận trọng.

---

## 🏗️ III. CẤU TRÚC THƯ MỤC VÀ TỆP TIN

```text
abcd/
├── public/                     # Giao diện Website (Frontend tĩnh có thể chạy độc lập)
│   ├── index.html              # Trang chủ hoàn chỉnh, chuẩn ngữ nghĩa và trợ năng
│   ├── style.css               # Phong cách hiện đại (Xanh dương, xanh ngọc), responsive 100%
│   └── app.js                  # Xử lý giao diện, OCR Tesseract, Voice TTS, Dual-mode AI
├── test/
│   └── run-tests.js            # Bộ kiểm thử tự động 12 tình huống thực tế
├── guardrails.js               # Lớp luật cứng độc lập & Rule-based Engine bảo vệ người dùng
├── geminiService.js            # Tích hợp mô hình AI Google Gemini thực tế (REST API)
├── server.js                   # Máy chủ Node.js Express (bảo mật biến môi trường)
├── package.json                # Cấu hình dự án và thư viện phụ thuộc
├── .env.example                # Tệp mẫu cấu hình môi trường
└── README.md                   # Tài liệu hướng dẫn chi tiết
```

---

## ⚡ IV. CÔNG NGHỆ SỬ DỤNG

- **Frontend:** HTML5 Semantic, CSS3 Custom Properties (Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6+).
- **Trợ năng (Accessibility):** Web Speech API (`SpeechSynthesis`) đọc to kết quả bằng giọng nói tiếng Việt; Bộ chỉnh cỡ chữ (`A`, `A+`, `A++`); Chế độ tương phản cao (`High Contrast`).
- **Thị giác máy tính (OCR):** Tesseract.js (nhận diện chữ tiếng Việt `vie` + `eng` trực tiếp trên trình duyệt, có thanh tiến trình thời gian thực).
- **Backend:** Node.js, Express.js, CORS, Dotenv.
- **Trí tuệ nhân tạo (AI):** Google Gemini API (`gemini-2.5-flash`, `gemini-1.5-flash`) kết hợp Lớp luật cứng độc lập (**Guardrails**).

---

## 🚀 V. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY WEBSITE

### Cách 1: Chạy đầy đủ tính năng với Node.js Backend (Khuyên dùng)

1. **Mở thư mục dự án trong Terminal / PowerShell:**
   ```bash
   cd "C:\Users\LIEN NGUYEN\Documents\abcd"
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Khởi chạy máy chủ:**
   ```bash
   npm start
   ```

4. **Mở trình duyệt:**
   Truy cập: [http://localhost:3001](http://localhost:3001)

---

### Cách 2: Chạy trực tiếp không cần máy chủ (Dành cho người chưa biết lập trình)

- Nhấp đúp chuột mở trực tiếp tệp `public/index.html` trên bất kỳ trình duyệt nào (Chrome, Edge, Safari, Firefox).
- Website có cơ chế **Dual Mode**: Tự động chuyển sang chế độ phân tích độc lập bằng **Bộ luật an toàn nội bộ** và chạy OCR cục bộ mà không cần cài đặt Node.js hay API key!

---

## 🔑 VI. HƯỚNG DẪN CẤU HÌNH API AI (GOOGLE GEMINI)

Dự án hỗ trợ 2 cách thêm Google Gemini API Key:

### Cách A: Cấu hình qua tệp `.env` (Bảo mật backend)
1. Lấy API Key miễn phí tại: [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Mở tệp `.env` trong thư mục gốc và điền khóa của bạn:
   ```env
   PORT=3001
   GEMINI_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Khởi động lại server: `npm start`.

### Cách B: Nhập trực tiếp trên giao diện website
- Nhấn vào nút **⚙️ AI** ở góc trên thanh điều hướng Navbar.
- Nhập Gemini API Key vào ô và nhấn **Lưu cấu hình AI cho phiên này**.

> 💡 **Chế độ thử nghiệm minh bạch:** Nếu chưa cấu hình API Key, hệ thống tự động hiển thị huy hiệu: *"Khóa AI chưa cấu hình - Đang bảo vệ bằng Bộ quy tắc an toàn nội bộ"*. Tuyệt đối không sinh dữ liệu giả lập ngẫu nhiên gây nhầm lẫn!

### Fallback model khi Gemini giới hạn quota

- Hệ thống thử lần lượt `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` và `gemini-2.5-flash-lite` ([danh sách model](https://ai.google.dev/gemini-api/docs/models)).
- Chỉ tự chuyển model khi API báo model không tồn tại (404) hoặc giới hạn tần suất/quota (429). Lỗi API key hay quyền truy cập sẽ không bị che giấu bằng cách thử model khác.
- Hạn mức Gemini phụ thuộc vào dự án, không chỉ API key ([hướng dẫn hạn mức](https://ai.google.dev/gemini-api/docs/rate-limits)). Chuyển model có thể giúp khi giới hạn riêng của model đầu tiên đã hết, nhưng không vượt qua hạn mức dùng chung của dự án; nếu mọi model đều bị giới hạn, ứng dụng sẽ chuyển sang Bộ quy tắc an toàn nội bộ.

---

## 🧪 VII. KẾT QUẢ KIỂM THỬ THỰC TẾ (12/12 TÌNH HUỐNG)

Kiểm thử tự động được thực hiện qua lệnh: `npm test`

| STT | Tình huống kiểm thử | Thao tác | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Lỗi & Cách khắc phục |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **1** | Tin nhắn giả danh ngân hàng | Dán tin nhắn VCB báo khóa tài khoản | Kịch bản: *Giả danh ngân hàng*, Mức: *NGUY HIỂM CAO* | Kịch bản: *Giả danh ngân hàng*, Mức: *NGUY HIỂM CAO* | **ĐẠT** | Không có lỗi. |
| **2** | Tải ảnh chụp màn hình | Tải ảnh chụp tin nhắn qua OCR | Trích xuất chữ và kích hoạt cảnh báo nguy cơ | Trích xuất chuẩn, kích hoạt mức: *NGUY HIỂM CAO* | **ĐẠT** | Tesseract.js nhận diện chữ tiếng Việt thành công. |
| **3** | Đòi mã OTP | Dán tin nhắn yêu cầu mã OTP 6 số | Luật cứng nâng lên *NGUY HIỂM CAO*, khuyên không gửi OTP | Mức: *NGUY HIỂM CAO*, Khuyến nghị không chia sẻ OTP | **ĐẠT** | Lớp luật cứng ngăn chặn triệt để việc hạ mức cảnh báo. |
| **4** | Yêu cầu chuyển tiền gấp | Dán tin nhắn cần vay 20 triệu gấp | Tối thiểu mức *CÓ DẤU HIỆU ĐÁNG NGỜ* | Kích hoạt mức *NGUY HIỂM CAO* do kèm áp lực thời gian | **ĐẠT** | Bổ sung từ khóa chuyển tiền không dấu. |
| **5** | Trúng thưởng nộp lệ phí | Dán tin trúng xe SH nộp 3 triệu phí | Kịch bản: *Trúng thưởng / nhận quà*, Mức: *NGUY HIỂM CAO* | Kịch bản: *Trúng thưởng / nhận quà*, Mức: *NGUY HIỂM CAO* | **ĐẠT** | Khớp chính xác kịch bản và bẫy phí cọc. |
| **6** | Giả con cháu mượn tiền | Dán tin "Me oi, con day, cap cuu..." | Kịch bản: *Người quen mượn tiền*, Mức: *NGUY HIỂM CAO* | Kịch bản: *Người quen mượn tiền*, Mức: *NGUY HIỂM CAO* | **ĐẠT** | Đã sửa nhận diện chữ không dấu ("me oi", "cap cuu"). |
| **7** | Việc làm / đầu tư online | Dán tin CTV Shopee giật đơn nạp 200k | Kịch bản: *Việc làm hoặc đầu tư online*, Mức: *NGUY HIỂM CAO* | Kịch bản: *Việc làm hoặc đầu tư online*, Mức: *NGUY HIỂM CAO* | **ĐẠT** | Đã bổ sung mẫu nạp tiền nhiệm vụ Telegram/Shopee. |
| **8** | Nhập nội dung trống | Bấm phân tích khi ô chữ trống | Chặn phân tích, hiện thông báo nhắc nhở | Báo lỗi 400 và nhắc người dùng nhập nội dung cụ thể | **ĐẠT** | Bắt lỗi ở cả Client và Server. |
| **9** | Ảnh không có chữ | Tải ảnh phong cảnh hoặc ảnh mờ | Báo không đọc được chữ, khuyên chụp lại | Thông báo ảnh không rõ nét và hướng dẫn nhập chữ | **ĐẠT** | Đã kiểm tra độ dài chữ OCR (< 5 ký tự). |
| **10** | Lỗi API hoặc mất mạng | Giả lập mất kết nối API AI | Tự động fallback sang Bộ luật an toàn nội bộ | Fallback mượt mà, trả về kết quả an toàn không sập web | **ĐẠT** | Bộ đệm try/catch và timeout 10 giây. |
| **11** | Giao diện trên điện thoại | Kiểm tra responsive và cỡ chữ | Thân thiện người già, responsive 100%, có nút A+/A++ | Giao diện co giãn chuẩn, có đọc giọng nói và tương phản cao | **ĐẠT** | Đạt chuẩn thiết kế Mobile-First. |
| **12** | Kiểm tra liên tiếp | Bấm "Kiểm tra tin khác" và dán tin mới | Không bị lưu đè trạng thái giữa 2 lần kiểm tra | Lượt 1: *NGUY HIỂM CAO*, Lượt 2: *CHƯA THẤY DẤU HIỆU RÕ* | **ĐẠT** | Đã reset sạch toàn bộ biến trạng thái DOM. |

---

## 🎤 VIII. TRẢ LỜI CÂU HỎI THẢO LUẬN (THEO SLIDE TẬP HUẤN 47)

1. **AI hỗ trợ tạo hay nằm trong sản phẩm?**
   - **Cả hai:** Nhóm học sinh sử dụng AI hỗ trợ xây dựng code, đồng thời tích hợp mô hình **Google Gemini (Flash)** trực tiếp vào backend để phân tích ngữ cảnh tin nhắn tiếng Việt theo thời gian thực.
2. **Dữ liệu từ đâu và ai kiểm tra?**
   - Dữ liệu nhận diện được tổng hợp từ các cảnh báo chính thức của **Cục An toàn thông tin (Bộ TT&TT)**, tài liệu từ các Ngân hàng thương mại và số điện thoại tiếp nhận 156 / 5656. Nhóm học sinh đã tự tay rà soát và kiểm thử từng mẫu.
3. **Nếu nhận diện sai thì ứng dụng làm gì?**
   - Có **Lớp luật cứng độc lập (Guardrails)** can thiệp: Bất kỳ tin nhắn nào có dấu hiệu OTP, link lạ hoặc ép chuyển tiền đều bị ép mức cảnh báo không được thấp hơn ngưỡng nguy hiểm, bất kể AI có nhận định sai. Ngoài ra luôn có cảnh báo: *"Không khẳng định an toàn 100%"*.
4. **Người khác mở demo được không?**
   - **Có:** Người xem có thể chạy trực tiếp qua mạng local (`http://localhost:3001`), mở thẳng tệp `public/index.html` hoặc đưa lên GitHub Pages / Vercel chỉ với 1 cú click chuột.
5. **Nhóm đã tự quyết định và sửa điều gì?**
   - Nhóm tự thiết kế thêm **tính năng đọc giọng nói (Text-to-Speech)** tiếng Việt vì nhận thấy người cao tuổi mắt kém ngại đọc chữ dài; đồng thời nhóm tự sửa lỗi nhận diện tiếng Việt không dấu vốn rất phổ biến trong tin nhắn SMS lừa đảo tại Việt Nam.

---

## ⚖️ IX. CAM KẾT BẢO VỆ DỮ LIỆU CÁ NHÂN

- **Không lưu trữ:** Máy chủ hoàn toàn không có cơ sở dữ liệu để lưu nội dung tin nhắn của người dùng.
- **Không lưu ảnh:** Ảnh chụp màn hình được xử lý tạm thời và hủy ngay lập tức sau khi phân tích xong.
- **Che dữ liệu nhạy cảm (Sanitization):** Tự động che số tài khoản ngân hàng, mã OTP và số điện thoại trước khi đưa vào phân tích.
- **Không thương mại hóa:** Dự án phi lợi nhuận phục vụ học tập và bảo vệ cộng đồng.
