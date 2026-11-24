const assert = require('node:assert/strict');
const {
  isExcludedBankingNotification,
  handleIncomingNotification
} = require('../public/notificationBridge');

// 1. Kiểm tra loại trừ thông báo từ app ngân hàng thật
{
  assert.equal(
    isExcludedBankingNotification('com.VCB', 'VCB Digibank'),
    true,
    'VCB package should be excluded'
  );
  assert.equal(
    isExcludedBankingNotification('com.vnpay.bidv', 'Bien dong so du'),
    true,
    'BIDV package should be excluded'
  );
  assert.equal(
    isExcludedBankingNotification('com.zing.zalo', 'BIDV SmartBanking'),
    true,
    'Bank sender title should be excluded even on other channels'
  );
  assert.equal(
    isExcludedBankingNotification('com.zing.zalo', 'Nguyen Van A'),
    false,
    'Ordinary message from Zalo should NOT be excluded'
  );
  assert.equal(
    isExcludedBankingNotification('com.google.android.apps.messaging', '0912345678'),
    false,
    'Ordinary SMS from phone number should NOT be excluded'
  );
}

// 2. Kiểm tra xử lý thông báo với cơ chế bảo vệ
{
  const bankNotification = {
    packageName: 'com.vietcombank.smartotp',
    title: 'Vietcombank',
    content: 'Ma OTP xac thuc cua ban la 123456'
  };
  const res = handleIncomingNotification(bankNotification);
  assert.equal(res.status, 'IGNORED_BANKING', 'Banking notifications must be safely ignored');
}

{
  let triggeredPayload = null;
  global.window = {
    triggerNotificationInquiry: (payload) => {
      triggeredPayload = payload;
    }
  };

  const scamNotification = {
    packageName: 'com.zing.zalo',
    title: 'Ban cu cap 3',
    content: 'Ban oi chuyen gap cho minh 5 trieu vao stk 1234 nay voi'
  };

  const res = handleIncomingNotification(scamNotification);
  assert.equal(res.status, 'INQUIRY_PROMPTED', 'Scam notification triggers user consent inquiry');
  assert.equal(triggeredPayload.sender, 'Ban cu cap 3');
  assert.equal(triggeredPayload.content, 'Ban oi chuyen gap cho minh 5 trieu vao stk 1234 nay voi');
}

console.log('ĐẠT: Notification Bridge loại trừ ngân hàng thật và kích hoạt hỏi ý kiến người cao tuổi chuẩn xác.');
