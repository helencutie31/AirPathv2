// Quản lý trạng thái màn hình (Screen State)
const ScreenState = {
    isGuest: false, // Trạng thái người dùng: true nếu là khách, false nếu đã đăng nhập
    currentSource: 'main', // Nguồn dữ liệu hiện tại: 'main' hoặc 'backup'
    aqiValue: 42,
    weather: { temp: 28, humidity: 65 }
};

// Khởi tạo các phần tử DOM tương ứng với 13 ID trong thiết kế
const DOM = {
    logoHeader: document.querySelector('[data-id="1"]'),
    avatarBtn: document.querySelector('[data-id="2"]'),
    aqiScoreCircle: document.querySelector('[data-id="3"]'),
    mainSourceBtn: document.querySelector('[data-id="4"]'),
    backupSourceBtn: document.querySelector('[data-id="5"]'),
    airStatusText: document.querySelector('[data-id="6"]'),
    healthAdviceCard: document.querySelector('[data-id="7"]'),
    weatherInfo: document.querySelector('[data-id="8"]'),
    refreshWeatherBtn: document.querySelector('[data-id="9"]'),
    homeTab: document.querySelector('[data-id="10"]'),
    searchTab: document.querySelector('[data-id="11"]'),
    routeTab: document.querySelector('[data-id="12"]'),
    profileTab: document.querySelector('[data-id="13"]')
};

// --- CÁC HÀM XỬ LÝ LOGIC CHUNG (LOGIC FUNCTIONS) ---

// Điều hướng màn hình
function navigateTo(screenName) {
    console.log(`Đang điều hướng tới màn hình: ${screenName}`);
    // Thực hiện logic chuyển trang tại đây (Ví dụ: window.location.href = screenName)
}

// Hiển thị Pop-up đăng nhập cho tài khoản khách (Guest)
function showLoginPopup() {
    alert("Tính năng này yêu cầu đăng nhập. Vui lòng đăng nhập tài khoản!");
}

// Kiểm tra quyền truy cập (Dùng cho mục 2, 3, 13)
function checkAuthAndExecute(callback) {
    if (ScreenState.isGuest) {
        showLoginPopup();
    } else {
        callback();
    }
}

// Cập nhật giao diện Trạng thái không khí & Lời khuyên (Mục 6 & 7) dựa theo điểm số AQI
function updateAQIUI(aqi) {
    DOM.aqiScoreCircle.innerText = aqi;
    
    if (aqi <= 50) {
        DOM.airStatusText.innerHTML = `<h3>Không khí trong lành</h3><p>Chất lượng không khí lý tưởng cho các hoạt động ngoài trời.</p>`;
        DOM.healthAdviceCard.innerHTML = `<p>Nguy cơ sức khỏe thấp. Rất thích hợp cho việc chạy bộ hoặc tham gia hoạt động ngoài trời.</p>`;
    } else {
        DOM.airStatusText.innerHTML = `<h3>Không khí ô nhiễm nhẹ</h3><p>Cân nhắc khi hoạt động lâu ngoài trời.</p>`;
        DOM.healthAdviceCard.innerHTML = `<p>Nhóm nhạy cảm nên hạn chế vận động mạnh ngoài trời.</p>`;
    }
}

// Tải dữ liệu AQI từ API (Mục 4 & 5)
async function fetchAQIData(sourceType) {
    console.log(`Đang tải dữ liệu từ nguồn: ${sourceType}`);
    try {
        // Giả lập gọi API tương ứng với nguồn chính hoặc nguồn dự phòng
        const mockAqi = sourceType === 'main' ? 42 : 55; 
        ScreenState.aqiValue = mockAqi;
        ScreenState.currentSource = sourceType;
        
        // Cập nhật lại giao diện sau khi có dữ liệu
        updateAQIUI(mockAqi);
        
        // Thay đổi UI kích hoạt cho nút nguồn dữ liệu
        if (sourceType === 'main') {
            DOM.mainSourceBtn.classList.add('active');
            DOM.backupSourceBtn.classList.remove('active');
        } else {
            DOM.mainSourceBtn.classList.remove('active');
            DOM.backupSourceBtn.classList.add('active');
        }
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu AQI:", error);
    }
}

// Tải dữ liệu thời tiết (Mục 8 & 9)
async function fetchWeatherData() {
    console.log("Đang làm mới dữ liệu thời tiết và biểu đồ từ API...");
    try {
        // Giả lập gọi API thời tiết real-time
        const updatedWeather = { temp: 28, humidity: 65 }; 
        ScreenState.weather = updatedWeather;
        
        // Render lên giao diện mục số 8
        DOM.weatherInfo.innerHTML = `<span>${updatedWeather.temp}°C</span><br><small>Hà Nội • Độ ẩm ${updatedWeather.humidity}%</small>`;
    } catch (error) {
        console.error("Lỗi khi làm mới thời tiết:", error);
    }
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    
    // 1. Logo Header: Click để tải lại màn hình hiện tại
    DOM.logoHeader.addEventListener('click', () => {
        window.location.reload();
    });

    // 2. Ảnh đại diện (Avatar): Kiểm tra quyền, chuyển đến Hồ sơ & Cài đặt
    DOM.avatarBtn.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('profile_settings_screen'));
    });

    // 3. Vòng tròn điểm AQI: Kiểm tra quyền, chuyển đến màn hình Cảnh báo & Gợi ý
    DOM.aqiScoreCircle.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('aqi_details_and_suggestions'));
    });

    // 4. Nút nguồn dữ liệu chính (Hanoi Monitoring Station)
    DOM.mainSourceBtn.addEventListener('click', () => {
        fetchAQIData('main');
    });

    // 5. Nút nguồn dữ liệu dự phòng (Global Air Quality Index)
    DOM.backupSourceBtn.addEventListener('click', () => {
        fetchAQIData('backup');
    });

    // 9. Nút làm mới thời tiết (Refresh Button)
    DOM.refreshWeatherBtn.addEventListener('click', () => {
        fetchWeatherData();
    });

    // 10. Tab Trang chủ: Duy trì trạng thái màn hình hiện tại
    DOM.homeTab.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Đang ở Trang chủ - Duy trì trạng thái hiện tại.");
    });

    // 11. Tab Tìm kiếm: Chuyển tới màn hình tìm kiếm và hiển thị kết quả địa điểm
    DOM.searchTab.addEventListener('click', () => {
        navigateTo('search_screen');
    });

    // 12. Tab Lộ trình: Chuyển tới màn hình chi tiết lộ trình và đánh giá
    DOM.routeTab.addEventListener('click', () => {
        navigateTo('route_details_screen');
    });

    // 13. Tab Hồ sơ: Kiểm tra quyền, chuyển đến màn hình Hồ sơ & Cài đặt
    DOM.profileTab.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('profile_settings_screen'));
    });
}

// Khởi chạy ứng dụng khi màn hình tải xong
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    // Chạy tải dữ liệu mặc định ban đầu
    fetchAQIData('main');
    fetchWeatherData();
});