// Quản lý trạng thái danh sách cơ sở dữ liệu Admin (State)
const FacilityAdminState = {
    totalActiveFacilities: 12,
    facilitiesList: [
        { id: 501, name: "ホアンキエム駅A", address: "Lý Thái Tổ, Hoàn Kiếm", updateTime: "22 phút trước", aqi: 18, isJapanFriendly: true },
        { id: 502, name: "タイホー駅 - ウォーターマーク", address: "Lạc Long Quân, Tây Hồ", updateTime: "9 giờ trước", aqi: 72, isJapanFriendly: true },
        { id: 503, name: "バディン - スポーツセンター", address: "Quần Ngựa, Ba Đình", updateTime: "5 giờ trước", aqi: 35, isJapanFriendly: false }
    ]
};

// Định nghĩa các liên kết DOM phục vụ xử lý sự kiện
const DOM = {
    logoHeader: document.querySelector('[data-id="1"]'),
    adminAvatar: document.querySelector('[data-id="2"]'),
    activeCounter: document.querySelector('[data-id="5"] .active-count-num'),
    addNewBtn: document.querySelector('[data-id="7"]'),
    listContainer: document.querySelector('.facility-management-list'),
    // Bottom Tabs
    dashboardTab: document.querySelector('[data-id="15"]'),
    facilityTab: document.querySelector('[data-id="16"]'),
    profileTab: document.querySelector('[data-id="17"]')
};

// --- CÁC HÀM XỬ LÝ SỰ KIỆN LOGIC (LOGIC FUNCTIONS) ---

// 1. Chuyển hướng đến Dashboard tổng quan hệ thống khi kích hoạt
function navigateToScreen(targetScreen) {
    console.log(`Đang chuyển hướng Admin sang màn hình: ${targetScreen}`);
}

// 7. Kích hoạt hiển thị cửa sổ con thêm địa điểm mới (Modal Window)
function openAddNewFacilityModal() {
    console.log("Hiển thị màn hình thêm địa điểm mới (dạng cửa sổ modal) ngay trên màn hình hiện tại.");
    
    // Giả lập thêm nhanh một cơ sở mới để kiểm tra tính năng render
    const mockId = Date.now();
    const newFacility = {
        id: mockId,
        name: "Cơ sở thử nghiệm mới " + FacilityAdminState.facilitiesList.length,
        address: "Đống Đa, Hà Nội",
        updateTime: "Vừa xong",
        aqi: 24,
        isJapanFriendly: false
    };

    FacilityAdminState.facilitiesList.push(newFacility);
    FacilityAdminState.totalActiveFacilities = FacilityAdminState.facilitiesList.length;
    
    // Cập nhật lại giao diện bộ đếm và danh sách
    updateSummaryCounter();
    renderFacilityList();
}

// 11. Xóa cơ sở khỏi danh sách hiện tại khi bấm thùng rác
function deleteFacilityItem(id) {
    if (confirm("Bạn có chắc chắn muốn xóa cơ sở này khỏi hệ thống hiện tại không?")) {
        // Lọc loại bỏ cơ sở được chọn
        FacilityAdminState.facilitiesList = FacilityAdminState.facilitiesList.filter(item => item.id !== id);
        FacilityAdminState.totalActiveFacilities = FacilityAdminState.facilitiesList.length;
        
        // Render đồng bộ lại UI
        updateSummaryCounter();
        renderFacilityList();
        console.log(`Đã xóa cơ sở dữ liệu ID: ${id}`);
    }
}

// Cập nhật số liệu hiển thị thẻ tổng quan (Mục 5)
function updateSummaryCounter() {
    if (DOM.activeCounter) {
        DOM.activeCounter.innerText = FacilityAdminState.totalActiveFacilities;
    }
}

// Render động danh sách các cơ sở vật chất kèm điều kiện logic (Mục 8 -> 14)
function renderFacilityList() {
    if (!DOM.listContainer) return;
    DOM.listContainer.innerHTML = ''; // Xóa sạch dữ liệu cũ

    FacilityAdminState.facilitiesList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'facility-admin-card';

        // Xác định class cảnh báo cho pin AQI dựa theo chỉ số ô nhiễm
        const batteryClass = item.aqi > 50 ? 'meta-aqi-battery warning-level' : 'meta-aqi-battery';

        card.innerHTML = `
            <div class="facility-type-icon">📶</div> <div class="facility-details-mid">
                <div class="title-row-flex">
                    <h4 class="facility-name-txt">${item.name}</h4> ${item.isJapanFriendly ? '<span class="japan-friendly-tag">日本対応</span>' : ''} </div>
                <p class="facility-address-txt">${item.address}</p> <div class="facility-meta-row">
                    <span>🕒 更新: ${item.updateTime}</span> <span class="${batteryClass}">🔋 ${item.aqi}</span> </div>
            </div>
            <button class="btn-delete-facility" title="Xóa cơ sở">🗑️</button> `;

        // Gắn sự kiện xóa cho nút thùng rác của cơ sở này
        const deleteBtn = card.querySelector('.btn-delete-facility');
        deleteBtn.addEventListener('click', () => deleteFacilityItem(item.id));

        DOM.listContainer.appendChild(card);
    });
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Logo ứng dụng điều hướng về Dashboard quản trị hệ thống
    DOM.logoHeader.addEventListener('click', () => navigateToScreen('admin_dashboard'));

    // 2. Click avatar để xem thông tin hồ sơ quản trị viên
    DOM.adminAvatar.addEventListener('click', () => navigateToScreen('admin_profile'));

    // 7. Nút tạo thêm mới địa điểm
    DOM.addNewBtn.addEventListener('click', openAddNewFacilityModal);

    // --- NAVIGATION BOTTOM CHUYỂN TAB ---
    DOM.dashboardTab.addEventListener('click', () => navigateToScreen('admin_dashboard'));
    
    DOM.facilityTab.addEventListener('click', (e) => {
        e.preventDefault(); // Giữ nguyên trạng thái vì đang ở màn hình Quản lý cơ sở vật chất
        console.log("Duy trì trạng thái màn hình quản lý thông tin cơ sở hiện tại.");
    });
    
    DOM.profileTab.addEventListener('click', () => navigateToScreen('admin_profile'));
}

// Khởi chạy ứng dụng quản trị
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    
    // Đồng bộ hiển thị ban đầu
    updateSummaryCounter();
    renderFacilityList();
});