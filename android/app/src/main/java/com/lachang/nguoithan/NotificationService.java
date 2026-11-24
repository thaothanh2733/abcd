package com.lachang.nguoithan;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * NotificationService - Dịch vụ lắng nghe thông báo SMS/Zalo/Messenger an toàn
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI nhận diện tin nhắn lừa đảo cho người cao tuổi
 */
public class NotificationService extends NotificationListenerService {

    // Danh sách định danh app ngân hàng cần loại trừ tuyệt đối để bảo vệ mã OTP thật
    private static final String[] EXCLUDED_BANKING_PACKAGES = {
        "com.VCB", "com.vbi.vcb", "com.vietcombank.smartotp",
        "com.vnpay.bidv", "com.vietinbank.ipay", "com.mbmobile",
        "vn.com.techcombank.bb.app", "com.tpb.mb.gprsandroid",
        "com.vnpay.vpbank", "com.mservice.momotransfer",
        "vn.com.vng.zalopay", "com.viettel.viettelpay"
    };

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // 1. Kiểm tra loại trừ ngân hàng
        for (String bankPkg : EXCLUDED_BANKING_PACKAGES) {
            if (packageName.toLowerCase().contains(bankPkg.toLowerCase())) {
                return; // Bỏ qua ngay lập tức để bảo vệ tài chính của các cụ
            }
        }

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras != null) {
            String title = extras.getString(Notification.EXTRA_TITLE, "");
            CharSequence textChars = extras.getCharSequence(Notification.EXTRA_TEXT);
            String content = (textChars != null) ? textChars.toString() : "";

            if (content.trim().length() >= 5) {
                // Gửi thông báo an toàn vào giao diện Lá Chắn
                MainActivity.dispatchNotificationToWeb(title, content, packageName);
            }
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Không cần xử lý khi thông báo bị xóa
    }
}
