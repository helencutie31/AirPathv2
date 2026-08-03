// Quản lý trạng thái dữ liệu tuyến đường (State)
const GreenRouteState = {
    selectedRouteType: "safest", // Lộ trình đang chọn: 'safest' (An toàn nhất)
    userLocation: { lat: 21.0285, lng: 105.8542 },
    routeData: {
        title: "最も安全なルート",
        isRecommended: true,
        durationMinutes: 24,
        averageAqi: 18,
        distanceKm: 3.2,
        terrain: "平坦な道"
    }
};

// Khởi tạo các phần tử DOM trên bản đồ
const DOM = {
    backBtn: document.querySelector('[data-id="1"]'),
    currentLocationBtn: document.querySelector('[data-id="3"]'),
    mapLayerBtn: document.querySelector('[data-id="4"]'),
    startNavBtn: document.querySelector('[data-id="11"]')
};

// --- CÁC HÀM XỬ LÝ SỰ KIỆN LOGIC (LOGIC FUNCTIONS) ---

// 1. Quay lại màn hình tìm kiếm trước đó
function handleBackToSearch() {
    console.log("Quay lại màn hình Tìm kiếm (Search Screen)");
    // window.history.back();
}

// 3. Căn giữa bản đồ về vị trí GPS hiện tại của người dùng
function centerMapToUserLocation() {
    console.log(`Đang định vị... Căn giữa bản đồ về tọa độ hiện tại: Lat: ${GreenRouteState.userLocation.lat}, Lng: ${GreenRouteState.userLocation.lng}`);
    alert("Đang định vị và đưa vị trí của bạn vào trung tâm bản đồ.");
}

// 4. Thay đổi hoặc chọn lớp phủ bản đồ (Map Layer)
function handleMapLayerSwitch() {
    console.log("Hiển thị menu hoặc thay đổi kiểu hiển thị bản đồ (Vệ tinh / Địa hình / Luồng giao thông)...");
    // Thực hiện logic chuyển đổi layer bản đồ thực tế tại đây
}

// 11. Kích hoạt chế độ dẫn đường thời gian thực (Navigation Mode)
function startRealTimeNavigation() {
    console.log(`Bắt đầu chế độ dẫn đường cho lộ trình hiện tại: ${GreenRouteState.routeData.title}`);
    alert("Chế độ dẫn đường bằng giọng nói đã được kích hoạt. Hãy di chuyển an toàn!");
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Nút quay lại màn hình tìm kiếm
    DOM.backBtn.addEventListener('click', handleBackToSearch);

    // 3. Nút định vị vị trí hiện tại
    DOM.currentLocationBtn.addEventListener('click', centerMapToUserLocation);

    // 4. Nút thay đổi lớp bản đồ
    DOM.mapLayerBtn.addEventListener('click', handleMapLayerSwitch);

    // 11. Nút khởi hành ngay lập tức
    DOM.startNavBtn.addEventListener('click', startRealTimeNavigation);
}

// Khởi chạy ứng dụng khi màn hình sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    console.log("Màn hình lộ trình xanh đã sẵn sàng cùng dữ liệu API.");
});