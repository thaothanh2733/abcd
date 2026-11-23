/**
 * services/scamTrendsService.js - Bảng tin xu hướng thủ đoạn lừa đảo cộng đồng
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

const LATEST_SCAM_TRENDS = [
  {
    id: 'trend-deepfake',
    title: 'Cuộc gọi Video Deepfake giả mặt con cháu',
    tag: 'RẤT NGUY HIỂM',
    summary: 'Kẻ xấu dùng AI ghép mặt và giọng nói con cháu gọi video vài giây rồi tắt (bảo mạng yếu), sau đó nhắn tin giục chuyển tiền gấp viện phí/học phí.',
    warningSign: 'Hình ảnh khuôn mặt hơi giật hoặc chớp mắt bất thường, luôn viện cớ đường truyền kém để tắt máy nhanh.',
    advice: 'Gọi lại bằng cuộc gọi thoại thông thường hoặc gọi vào số điện thoại lưu sẵn của người thân khác để kiểm chứng.'
  },
  {
    id: 'trend-vneid-fake',
    title: 'Giả danh Công an hỗ trợ kích hoạt VNeID mức 2',
    tag: 'MỚI NỔI',
    summary: 'Mạo danh công an khu vực gọi điện bảo định danh VNeID bị lỗi, gửi đường link tải ứng dụng lạ có đuôi .apk để chiếm quyền điều khiển điện thoại.',
    warningSign: 'Bảo người già bấm vào link lạ để tải file "Dichvucong.apk" hoặc "VNeID.apk".',
    advice: 'Công an KHÔNG BAO GIỜ hướng dẫn cài app qua điện thoại hoặc gửi file lạ. Hãy ra trực tiếp Công an phường/xã.'
  },
  {
    id: 'trend-fake-bill',
    title: 'Biên lai chuyển tiền thành công giả mạo',
    tag: 'PHỔ BIẾN',
    summary: 'Gửi ảnh chụp màn hình chuyển tiền ngân hàng "thành công" nhưng tài khoản người nhận chưa có tiền, bảo do nghẽn mạng và giục giao hàng.',
    warningSign: 'Chữ in trên biên lai có thể bị lệch phông, thời gian bất thường, tiền chưa tinh ting vào app ngân hàng.',
    advice: 'Chỉ tin khi tiền ĐÃ VÀO tài khoản và hiển thị trên ứng dụng ngân hàng chính thức của mình.'
  },
  {
    id: 'trend-traffic-fine',
    title: 'Tin nhắn phạt nguội vi phạm giao thông',
    tag: 'GÂY HOANG MANG',
    summary: 'Nhắn tin dọa xe máy/ô tô bị phạt nguội 5 - 10 triệu đồng, yêu cầu nộp phạt trực tuyến trong 24 giờ qua link lạ.',
    warningSign: 'Cảnh sát giao thông KHÔNG gửi thông báo phạt nguội qua tin nhắn SMS thông thường.',
    advice: 'Tra cứu phạt nguội chỉ tra tại website chính thức csgt.vn của Cục Cảnh sát Giao thông.'
  }
];

function getScamTrends() {
  return {
    updated_at: new Date().toISOString(),
    total_trends: LATEST_SCAM_TRENDS.length,
    trends: LATEST_SCAM_TRENDS
  };
}

module.exports = {
  LATEST_SCAM_TRENDS,
  getScamTrends
};
