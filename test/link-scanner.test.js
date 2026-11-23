const assert = require('node:assert/strict');
const { scanLinks } = require('../services/linkScanner');
const { getScamTrends } = require('../services/scamTrendsService');

// 1. Kiểm tra đối soát link lừa đảo
{
  const fakeBankText = 'Tai khoan quy khach bi khoa. Vui long truy cap https://vcb-xacthuc.xyz de mo khoa.';
  const report = scanLinks(fakeBankText);
  assert.equal(report.hasThreat, true, 'Detect threat from spoofed bank link on .xyz domain');
  assert.equal(report.detectedLinks.length, 1);
  assert.equal(report.detectedLinks[0].threatType, 'BRAND_IMPERSONATION');
}

{
  const shortenerText = 'Nhan thuong 100 trieu tai bit.ly/qua-tang-shopee ngay';
  const report = scanLinks(shortenerText);
  assert.equal(report.hasThreat, true, 'Detect threat from shortened link');
  assert.equal(report.detectedLinks[0].threatType, 'SHORTENED_URL');
}

{
  const directIpText = 'Truy cap http://192.168.1.100:8080 de xac minh danh tinh';
  const report = scanLinks(directIpText);
  assert.equal(report.hasThreat, true, 'Detect threat from direct IP address');
  assert.equal(report.detectedLinks[0].threatType, 'IP_DIRECT');
}

{
  const normalText = 'Chieu nay 5h di tap duong sinh nhe.';
  const report = scanLinks(normalText);
  assert.equal(report.hasThreat, false, 'Normal text has no link threats');
}

// 2. Kiểm tra bảng tin xu hướng lừa đảo
{
  const trends = getScamTrends();
  assert.ok(trends.total_trends >= 3, 'Provide at least 3 current scam trends');
  assert.ok(trends.trends.some(t => t.id === 'trend-deepfake'), 'Include Deepfake warning');
  assert.ok(trends.trends.some(t => t.id === 'trend-vneid-fake'), 'Include VNeID fake warning');
}

console.log('ĐẠT: Link Scanner phát hiện chính xác liên kết độc hại và Bảng tin xu hướng hoạt động tốt.');
