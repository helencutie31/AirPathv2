// Quản lý trạng thái màn hình cảnh báo (State)
const AQIAlertState = {
    currentAQI: 184, // Điểm số tải về trực tiếp từ API hệ thống
    suggestedSpotId: 305, // ID của địa điểm thay thế an toàn trong nhà
    expertProfile: {
        minPassingAqi: 150,
        adviceMessage: "外出が必要な場合は、標準のN95マスクを着用してください..."
    }
};

// Khởi tạo các phần tử DOM phục vụ tương tác
const DOM = {
    backToHomeBtn: document.querySelector('[data-id="1"]'),
    alertZone: document.querySelector('[data-id="2"]'),
    aqiValueDisplay: document.querySelector('[data-id="4"]'),
    aqiLevelBadge: document.querySelector('[data-id="5"]'),
    alertMsg: document.querySelector('[data-id="6"]'),
    routeGuidanceBtn: document.querySelector('[data-id="12"]'),
    expertAdviceBox: document.querySelector('[data-id="13"]')
};

// --- CÁC HÀM XỬ LÝ LOGIC (LOGIC FUNCTIONS) ---

// 1. Quay lại trang chủ khi nhấn nút Home ở góc trái
function backToHomeScreen() {
    console.log("Điều hướng quay lại trang chủ (Home Page)");
    // window.location.href = 'index.html'; 
}

// Thay đổi giao diện cảnh báo động (Mục 2 -> 6) dựa vào dữ liệu AQI thực tế nhận từ API
function setupDynamicAlertUI(aqi) {
    DOM.aqiValueDisplay.innerText = aqi;

    if (aqi >= 150) {
        // Trạng thái Nguy hiểm: đổi màu nền đỏ đậm, cập nhật nhãn
        DOM.alertZone.className = "health-alert-zone level-danger";
        DOM.aqiLevelBadge.innerText = "危険";
        DOM.alertMsg.innerText = "汚染レベルが安全基準を大幅に超えています。屋外活動を避け、敏感な方は屋内に留まってください。";
    } else if (aqi >= 100 && aqi < 150) {
        // Trạng thái Không tốt cho nhóm nhạy cảm
        DOM.alertZone.style.background = "linear-gradient(135deg, #ff9800, #f57c00)";
        DOM.aqiLevelBadge.innerText = "不健康 (敏感)";
        DOM.aqiLevelBadge.style.color = "#f57c00";
        DOM.alertMsg.innerText = "空気質は健康に影響を与える可能性があります。長時間の屋外活動を控えてください。";
    } else {
        // Trạng thái bình thường/an toàn
        DOM.alertZone.style.background = "linear-gradient(135deg, #4caf50, #2e7d32)";
        DOM.aqiLevelBadge.innerText = "良好";
        DOM.aqiLevelBadge.style.color = "#2e7d32";
        DOM.alertMsg.innerText = "空気質は安全基準を満たしています。";
    }
}

// 12. Điều hướng người dùng sang màn hình Đề xuất Lộ trình Xanh (Green Route Screen)
function handleRouteGuidanceRedirect() {
    console.log(`Chuyển hướng tới màn hình lộ trình di chuyển an toàn đến địa điểm ID: ${AQIAlertState.suggestedSpotId}`);
    // Thực hiện chuyển hướng trang thực tế kèm tham số địa điểm
    // window.location.href = `route.html?spotId=${AQIAlertState.suggestedSpotId}`;
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Nhấn nút quay lại để chuyển hướng về trang chủ
    DOM.backToHomeBtn.addEventListener('click', backToHomeScreen);

    // 12. Nhấn nút lộ trình xanh để xem đường đi tối ưu đến phòng tập thay thế
    DOM.routeGuidanceBtn.addEventListener('click', handleRouteGuidanceRedirect);
}

// Khởi chạy hệ thống tương tác màn hình
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    
    // Đồng bộ và tải dữ liệu lên giao diện
    setupDynamicAlertUI(AQIAlertState.currentAQI);
});