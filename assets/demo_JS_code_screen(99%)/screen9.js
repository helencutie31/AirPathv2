// Quản lý trạng thái dữ liệu Dashboard (State)
const DashboardState = {
    adminName: "管理者様", // Tên Admin
    systemAQI: 42,
    activeUsers: 1284,
    urgentTasks: [
        {
            id: 1,
            title: "新規規約違反コンテンツ",
            description: "バーディン駅での5件のコメントのモデレーション要求。",
            station: "Ba Đình",
            count: 5
        }
    ]
};

// Liên kết DOM
const DOM = {
    logoHeader: document.querySelector('[data-id="1"]'),
    adminAvatar: document.querySelector('[data-id="2"]'),
    violationAlertBtn: document.querySelector('[data-id="7"]'),
    // Bottom Nav Tabs
    dashboardTab: document.querySelector('[data-id="8"]'),
    facilityTab: document.querySelector('[data-id="9"]'),
    profileTab: document.querySelector('[data-id="10"]')
};

// --- CÁC HÀM XỬ LÝ LOGIC (LOGIC FUNCTIONS) ---

// 1. Tải lại màn hình hiện tại
function reloadDashboard() {
    console.log("Đang tải lại dữ liệu tổng quan hệ thống (Reloading Dashboard)...");
    // Thực tế sẽ gọi API refresh data tại đây, mô phỏng tải lại trang:
    // window.location.reload();
}

// 7. Chuyển hướng đến màn hình xử lý vi phạm (Comment Moderation)
function handleViolationAlertClick() {
    const task = DashboardState.urgentTasks[0];
    console.log(`Chuyển đến màn hình quản lý bình luận. Trạm: ${task.station}, Số lượng cần duyệt: ${task.count}件`);
    alert(`Đang mở giao diện kiểm duyệt nội dung cho trạm: ${task.station}`);
    // Thực tế chuyển trang: window.location.href = 'moderation.html';
}

// Chuyển hướng điều hướng (Navigation)
function navigateToScreen(screenName) {
    console.log(`Chuyển hướng đến màn hình: ${screenName}`);
}

// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Click Logo để tải lại trang
    DOM.logoHeader.addEventListener('click', reloadDashboard);

    // 2 & 10. Click Avatar hoặc Tab Hồ sơ để sang màn hình Profile
    DOM.adminAvatar.addEventListener('click', () => navigateToScreen('admin_profile'));
    DOM.profileTab.addEventListener('click', () => navigateToScreen('admin_profile'));

    // 7. Click Thẻ cảnh báo đỏ để xử lý vi phạm
    DOM.violationAlertBtn.addEventListener('click', handleViolationAlertClick);

    // 8. Tab Dashboard (Duy trì màn hình)
    DOM.dashboardTab.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Duy trì trạng thái màn hình bảng điều khiển quản trị hệ thống hiện tại.");
    });

    // 9. Tab Cơ sở vật chất (Chuyển sang màn hình Management đã làm ở Screen 7)
    DOM.facilityTab.addEventListener('click', () => navigateToScreen('facility_management'));
}

// Khởi chạy ứng dụng
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
});