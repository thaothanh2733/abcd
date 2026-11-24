# 📱 HƯỚNG DẪN ĐÓNG GÓI WEBSITE THÀNH APP ANDROID (.APK)
> **Dự án:** LÁ CHẮN NGƯỜI THÂN - AI nhận diện tin nhắn lừa đảo cho người cao tuổi

Tài liệu này hướng dẫn bạn cách chuyển đổi mã nguồn website hiện tại thành một ứng dụng Android hoàn chỉnh (.apk) có thể cài đặt trực tiếp lên điện thoại của ông bà, cha mẹ.

---

## 🌟 CƠ CHẾ HOẠT ĐỘNG AN TOÀN (NOTIFICATION LISTENER)

Khi chuyển thành App Android, hệ thống áp dụng cơ chế **Sự đồng thuận chủ động (Explicit Consent)**:
1. **Bảo vệ mã OTP & ngân hàng:** Ứng dụng tự động bỏ qua 100% thông báo từ các app ngân hàng thật (VCB, BIDV, Techcombank, MBBank...).
2. **Hỏi ý kiến trước khi làm:** Khi nhận tin nhắn lạ từ SMS/Zalo/Messenger, app sẽ **phát giọng nói hỏi**: *"Bạn vừa nhận được tin nhắn lạ, có muốn kiểm tra không?"*.
3. **Người già làm chủ:** Chỉ khi người già nói **"CÓ"** hoặc chạm nút **"CÓ"**, máy mới đưa vào phân tích.

---

## 🚀 CÁCH 1: TẠO FILE APK NHANH NHẤT (DÀNH CHO NGƯỜI KHÔNG RÀNH CODE - 5 PHÚT)

Nếu bạn không muốn cài đặt các phần mềm lập trình nặng hàng chục GB, đây là cách đơn giản nhất:

### Bước 1: Chuẩn bị đường link website của bạn
- Đảm bảo website của bạn đã được triển khai online (ví dụ trên Vercel, Render hoặc cổng nội bộ): `https://ten-mien-cua-ban.vercel.app`.

### Bước 2: Sử dụng công cụ đóng gói Web2APK tự động
1. Tải phần mềm miễn phí **Website 2 APK Builder** (hoặc dùng các trang web trực tuyến như [gonative.io](https://median.co) / [web2apk.com](https://web2apk.com)).
2. Mở phần mềm và điền các thông tin:
   - **App Title:** `Lá Chắn Người Thân`
   - **Package Name:** `com.lachang.nguoithan`
   - **Website URL:** Điền link website của bạn.
   - **App Icon:** Chọn ảnh logo chiếc khiên của dự án.
3. Bấm **Generate APK**.
4. Chờ 1 phút, phần mềm sẽ xuất ra file `LaChanNguoiThan.apk`. Bạn chỉ cần gửi file này qua Zalo cho điện thoại của bố mẹ để cài đặt!

---

## 🛠️ CÁCH 2: TẠO APP ANDROID CHUYÊN NGHIỆP BẰNG CAPACITOR & ANDROID STUDIO

Dành cho thành viên phụ trách kỹ thuật trong nhóm muốn cấu hình tính năng lắng nghe thông báo nâng cao.

### Bước 1: Cài đặt Capacitor vào dự án
Mở Terminal tại thư mục dự án và chạy:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Lá Chắn Người Thân" "com.lachang.nguoithan" --web-dir public
npx cap add android
```

### Bước 2: Thêm quyền lắng nghe thông báo vào Android
Mở file `android/app/src/main/AndroidManifest.xml` và thêm dịch vụ sau vào bên trong thẻ `<application>`:

```xml
<!-- Khai báo dịch vụ lắng nghe thông báo an toàn -->
<service
    android:name=".NotificationListener"
    android:label="Lá Chắn Người Thân - Bộ lọc tin lạ"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

### Bước 3: Tạo file `NotificationListener.java`
Tạo file `android/app/src/main/java/com/lachang/nguoithan/NotificationListener.java` với nội dung:

```java
package com.lachang.nguoithan;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;
import android.os.Bundle;

public class NotificationListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;

        if (extras != null) {
            String title = extras.getString(Notification.EXTRA_TITLE, "");
            CharSequence textChars = extras.getCharSequence(Notification.EXTRA_TEXT);
            String content = (textChars != null) ? textChars.toString() : "";

            // Gửi dữ liệu an toàn vào giao diện web Lá Chắn
            MainActivity.sendNotificationToWeb(title, content, packageName);
        }
    }
}
```

### Bước 4: Xuất file APK (Build APK)
1. Mở dự án trong Android Studio:
   ```bash
   npx cap open android
   ```
2. Trên thanh menu Android Studio, chọn:
   **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
3. Android Studio sẽ tự động biên dịch và tạo ra file `app-debug.apk`.
4. Copy file này vào điện thoại Android và mở lên cài đặt!

---

## 🔒 HƯỚNG DẪN CẤP QUYỀN TRÊN ĐIỆN THOẠI CỦA NGƯỜI CAO TUỔI

Khi cài app lần đầu trên điện thoại của ông bà/cha mẹ:
1. Vào **Cài đặt (Settings)** trên điện thoại $\rightarrow$ Chọn **Ứng dụng**.
2. Chọn **Quyền truy cập đặc biệt** $\rightarrow$ **Quyền truy cập thông báo (Notification Access)**.
3. Tìm **Lá Chắn Người Thân** và gạt nút **Cho phép**.
4. Kể từ giờ phút này, mỗi khi có tin nhắn từ số lạ gửi đến, chiếc điện thoại sẽ tự động lên tiếng hỏi và bảo vệ các cụ 24/7!
