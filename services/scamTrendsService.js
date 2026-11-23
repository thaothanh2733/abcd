/**
 * services/scamTrendsService.js - Bảng tin xu hướng thủ đoạn lừa đảo cộng đồng
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 * 
 * Hỗ trợ 2 chế độ:
 * 1. Chế độ động (Data-driven): Tự động đếm và xếp hạng top kịch bản bị người dùng gửi kiểm tra nhiều nhất trong 7 ngày qua từ Supabase.
 * 2. Chế độ dự phòng (Fallback): Sử dụng danh mục kịch bản chuẩn hóa khi chưa có đủ dữ liệu kiểm tra.
 */

const { getRecentAnalysisStats } = require('./supabaseService');

const SCENARIO_PROFILES = {
  'Giả danh ngân hàng': {
    title: 'Giả danh Ngân hàng dọa khóa thẻ / đòi mã OTP',
    summary: 'Nhắn tin thông báo biến động số dư lớn, tài khoản bị tạm khóa trong 24 giờ và ép bấm vào link lạ để nhập mã OTP hoặc hủy giao dịch.',
    warningSign: 'Thúc ép thời gian (trong 24h), dọa khóa tài khoản, gửi link có tên miền lạ mạo danh ngân hàng.',
    advice: 'Ngân hàng thật KHÔNG BAO GIỜ đòi mã OTP qua tin nhắn. Có thắc mắc hãy gọi hotline in ở mặt sau thẻ ATM.'
  },
  'Giả danh công an / cơ quan chức năng': {
    title: 'Giả danh Công an / Viện kiểm sát dọa bắt giữ',
    summary: 'Dọa số CCCD liên quan đường dây ma túy/rửa tiền xuyên quốc gia, yêu cầu chuyển tiền vào "tài khoản tạm giữ của Bộ Công an" để chứng minh trong sạch.',
    warningSign: 'Dọa gửi lệnh bắt qua Zalo, cấm tiết lộ cho con cháu biết, ép chuyển tiền ngay.',
    advice: 'Cơ quan Công an KHÔNG BAO GIỜ làm việc hoặc yêu cầu chuyển tiền qua điện thoại. Hãy đến thẳng Công an xã/phường gần nhất.'
  },
  'Trúng thưởng / nhận quà': {
    title: 'Bẫy trúng thưởng xe SH / quà tri ân đòi nộp phí cọc',
    summary: 'Thông báo số điện thoại trúng giải đặc biệt (xe máy SH, sổ tiết kiệm 100 triệu) nhưng ép phải nộp trước vài triệu tiền phí làm hồ sơ hoặc vận chuyển.',
    warningSign: 'Giải thưởng lớn bất ngờ, nhưng bắt chuyển tiền cọc/thuế trước vào số tài khoản cá nhân.',
    advice: 'Tuyệt đối không nộp tiền cọc để nhận quà. Không có doanh nghiệp nào bắt người trúng giải phải nộp tiền trước qua tài khoản lạ.'
  },
  'Người quen mượn tiền': {
    title: 'Giả danh con cháu báo hỏng máy, mượn tiền cấp cứu',
    summary: 'Mạo danh con cháu nói điện thoại bị rơi vào nước đổi số mới, bạn đang cấp cứu ở bệnh viện cần tiền gấp và nhờ chuyển khoản vào tài khoản bạn.',
    warningSign: 'Nhắn từ số lạ tự nhận là người nhà, thúc ép chuyển tiền khẩn cấp vì tai nạn/viện phí.',
    advice: 'Bình tĩnh gọi ngay vào số điện thoại cũ của con cháu để nghe trực tiếp giọng nói trước khi chuyển tiền.'
  },
  'Việc làm hoặc đầu tư online': {
    title: 'Việc nhẹ lương cao, giật đơn Shopee / Telegram nạp tiền',
    summary: 'Tuyển cộng tác viên đánh giá sản phẩm Shopee tại nhà, hoa hồng 30-50%, cho rút thử vài chục nghìn rồi ép nạp tiền triệu làm nhiệm vụ Telegram.',
    warningSign: 'Hứa hẹn thu nhập cao phi thực tế, bắt nạp tiền làm nhiệm vụ để nhận hoa hồng.',
    advice: 'Không có công việc nào lướt điện thoại vài phút kiếm tiền triệu mỗi ngày. Tuyệt đối không nạp tiền vào các hội nhóm kín.'
  }
};

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
    is_live_data: false,
    source: 'Bộ dữ liệu an toàn thông tin cộng đồng',
    total_trends: LATEST_SCAM_TRENDS.length,
    trends: LATEST_SCAM_TRENDS
  };
}

/**
 * Lấy bảng tin xu hướng lừa đảo động được tổng hợp từ dữ liệu Supabase 7 ngày qua
 */
async function getDynamicScamTrends(days = 7) {
  try {
    const rawData = await getRecentAnalysisStats(days);

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return getScamTrends();
    }

    // Đếm tần suất xuất hiện của từng kịch bản nghi ngờ/nguy hiểm
    const counts = {};
    let totalRiskCount = 0;

    for (const item of rawData) {
      const scen = item.scenario;
      if (scen && scen !== 'Chưa xác định được kịch bản' && SCENARIO_PROFILES[scen]) {
        counts[scen] = (counts[scen] || 0) + 1;
        totalRiskCount++;
      }
    }

    const sortedScenarios = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (sortedScenarios.length === 0) {
      return getScamTrends();
    }

    const dynamicTrends = [];

    // Tạo các thẻ xu hướng từ dữ liệu thực tế của cộng đồng
    sortedScenarios.slice(0, 3).forEach(([scenarioName, count], idx) => {
      const profile = SCENARIO_PROFILES[scenarioName];
      const rankLabel = idx === 0 ? '🔥 CỘNG ĐỒNG BÁO CÁO NHIỀU NHẤT' : `⚠️ TOP ${idx + 1} TUẦN NÀY`;
      const percentage = Math.round((count / totalRiskCount) * 100);

      dynamicTrends.push({
        id: `trend-community-${idx + 1}`,
        title: profile.title,
        tag: `${rankLabel} (${count} LƯỢT)`,
        summary: `${profile.summary} (Chiếm ${percentage}% các tin nhắn đáng ngờ được cộng đồng gửi kiểm tra tuần này).`,
        warningSign: profile.warningSign,
        advice: profile.advice,
        is_community_reported: true,
        report_count: count
      });
    });

    // Bổ sung thêm các chiêu trò công nghệ cao mới nổi (Deepfake, VNeID giả)
    const techAlerts = LATEST_SCAM_TRENDS.filter(t => t.id === 'trend-deepfake' || t.id === 'trend-vneid-fake');
    for (const alert of techAlerts) {
      if (dynamicTrends.length < 4) {
        dynamicTrends.push(alert);
      }
    }

    return {
      updated_at: new Date().toISOString(),
      is_live_data: true,
      source: `Dữ liệu thời gian thực từ ${rawData.length} lượt kiểm tra của cộng đồng trong ${days} ngày qua`,
      total_reports: rawData.length,
      top_reported_scenario: sortedScenarios[0][0],
      total_trends: dynamicTrends.length,
      trends: dynamicTrends
    };
  } catch (err) {
    console.warn('Lỗi khi tính toán xu hướng động:', err.message);
    return getScamTrends();
  }
}

module.exports = {
  SCENARIO_PROFILES,
  LATEST_SCAM_TRENDS,
  getScamTrends,
  getDynamicScamTrends
};
