// Quản lý trạng thái màn hình (Screen State)
const SearchScreenState = {
    isGuest: false, // Trạng thái tài khoản khách
    searchKeyword: '',
    activeFilter: 'near', // 'near' (Gần đây), 'park' (Công viên), 'gym' (Phòng gym), 'favorite' (Yêu thích)
    currentLocation: { lat: 21.0285, lng: 105.8542 }, // Giả lập tọa độ GPS hiện tại của người dùng
    searchResults: [
        { id: 101, name: "Công viên Thống Nhất", aqi: 26, distance: 0.8, isJapanFriendly: true, type: "park", img: "park.jpg" },
        { id: 102, name: "Elite Fitness", aqi: 42, distance: 1.2, isJapanFriendly: false, type: "gym", img: "gym.jpg" },
        { id: 103, name: "Hyundai Stadium", aqi: 18, distance: 2.5, isJapanFriendly: true, type: "stadium", img: "stadium.jpg" }
    ]
};

// Cấu trúc DOM đại diện cho 17 thành phần trên thiết kế
const DOM = {
    logoHeader: document.querySelector('[data-id="1"]'),
    avatarBtn: document.querySelector('[data-id="2"]'),
    searchInput: document.querySelector('[data-id="3"]'),
    nearFilterBtn: document.querySelector('[data-id="4"]'),
    categoryFilters: document.querySelectorAll('[data-id="5"] .filter-btn'), // Các nút Công viên, Gym, Yêu thích
    sectionTitle: document.querySelector('[data-id="6"]'),
    resultListContainer: document.querySelector('[data-id="7"]'),
    adviceCard: document.querySelector('[data-id="13"]'),
    // Navigation Bottom Bar
    homeTab: document.querySelector('[data-id="14"]'),
    searchTab: document.querySelector('[data-id="15"]'),
    routeTab: document.querySelector('[data-id="16"]'),
    profileTab: document.querySelector('[data-id="17"]')
};

// --- CÁC HÀM XỬ LÝ LOGIC (LOGIC FUNCTIONS) ---

// Điều hướng màn hình
function navigateTo(screenName, params = {}) {
    console.log(`Chuyển hướng tới màn hình: ${screenName}`, params);
}

// Kiểm tra quyền (Dùng cho Mục 2 & 17)
function checkAuthAndExecute(callback) {
    if (SearchScreenState.isGuest) {
        alert("Tính năng này yêu cầu đăng nhập. Vui lòng đăng nhập tài khoản!");
    } else {
        callback();
    }
}

// Thực hiện tìm kiếm dựa trên từ khóa (Mục 3)
function performSearch(keyword) {
    SearchScreenState.searchKeyword = keyword;
    console.log(`Đang tìm kiếm với từ khóa: "${keyword}" trong nội dung đã nhập.`);
    
    // Giả lập bộ lọc kết quả theo từ khóa
    const filtered = SearchScreenState.searchResults.filter(item => 
        item.name.toLowerCase().includes(keyword.toLowerCase())
    );
    renderSearchResults(filtered);
}

// Lọc kết quả theo Danh mục / Gần đây (Mục 4 & 5)
function filterResults(filterType) {
    SearchScreenState.activeFilter = filterType;
    console.log(`Đang lọc kết quả theo: ${filterType}`);
    
    // Thêm class active cho UI nút được chọn (Ví dụ làm đổi màu xanh lá cho nút hoạt động)
    // Thực hiện logic filter dữ liệu thực tế tại đây...
    
    let filtered = SearchScreenState.searchResults;
    if (filterType !== 'near' && filterType !== 'favorite') {
        filtered = SearchScreenState.searchResults.filter(item => item.type === filterType);
    }
    
    renderSearchResults(filtered);
}

// Render danh sách kết quả tìm kiếm (Mục 7 -> 12) và Thẻ gợi ý hô hấp (Mục 13)
function renderSearchResults(results) {
    DOM.resultListContainer.innerHTML = ''; // Xóa danh sách cũ
    
    if (results.length === 0) {
        DOM.resultListContainer.innerHTML = '<p class="no-result">Không tìm thấy địa điểm phù hợp</p>';
        return;
    }

    results.forEach(item => {
        // Tạo HTML Item động cho từng địa điểm (Bao gồm các mục từ 8 đến 12)
        const itemElement = document.createElement('div');
        itemElement.className = 'search-item';
        itemElement.innerHTML = `
            <img src="${item.img}" alt="${item.name}" class="spot-img"> <div class="spot-info">
                <h4 class="spot-name">${item.name}</h4> <p class="spot-distance">${item.distance} km</p> </div>
            <div class="spot-badges">
                <span class="spot-aqi">AQI ${item.aqi}</span> ${item.isJapanFriendly ? '<span class="badge-japan">日本対応</span>' : ''} </div>
        `;
        
        // Sự kiện click vào từng mục kết quả để xem chi tiết
        itemElement.addEventListener('click', () => {
            navigateTo('spot_detail_screen', { spotId: item.id });
        });
        
        DOM.resultListContainer.appendChild(itemElement);
    });

    // Cập nhật Thẻ lời khuyên hô hấp (Mục 13) dựa trên địa điểm đầu tiên tìm được (hoặc AQI trung bình)
    if (results.length > 0) {
        const topAqi = results[0].aqi;
        updateAdviceCard(topAqi);
    }
}

// Cập nhật nội dung Thẻ lời khuyên (Mục 13) dựa trên mức độ AQI hiện tại
function updateAdviceCard(aqi) {
    if (aqi <= 30) {
        DOM.adviceCard.innerHTML = `
            <h5>Hô hấp アドバイス (Lời khuyên hô hấp)</h5>
            <p>Hiện tại AQI là ${aqi}, tuyệt vời cho các hoạt động thể thao mạnh ngoài trời. Các địa điểm có tag "日本対応" là lựa chọn lý tưởng nhất với cơ sở vật chất hoàn thiện.</p>
        `;
    } else {
        DOM.adviceCard.innerHTML = `
            <h5>Hô hấp アドバイス (Lời khuyên hô hấp)</h5>
            <p>Chỉ số AQI ở mức ${aqi}. Khuyến cáo nhóm người nhạy cảm nên hạn chế tập luyện cường độ cao ngoài trời.</p>
        `;
    }
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    
    // 1. Logo Header: Quay lại Trang chủ
    DOM.logoHeader.addEventListener('click', () => {
        navigateTo('home_screen');
    });

    // 2. Ảnh đại diện (Avatar): Kiểm tra quyền, chuyển đến Hồ sơ & Cài đặt
    DOM.avatarBtn.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('profile_settings_screen'));
    });

    // 3. Thanh tìm kiếm: Bắt sự kiện khi người dùng gõ chữ hoặc nhấn Enter
    DOM.searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    // 4. Bộ lọc "Gần đây"
    DOM.nearFilterBtn.addEventListener('click', () => {
        filterResults('near');
    });

    // 5. Các bộ lọc danh mục (Công viên, Gym, Yêu thích)
    DOM.categoryFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterType = e.target.dataset.type; // Giả định có thuộc tính data-type trên HTML
            filterResults(filterType);
        });
    });

    // --- NAVIGATION BOTTOM BAR ---
    
    // 14. Tab Trang chủ: Click để chuyển về Trang chủ
    DOM.homeTab.addEventListener('click', () => {
        navigateTo('home_screen');
    });

    // 15. Tab Tìm kiếm: Duy trì trạng thái màn hình tìm kiếm hiện tại
    DOM.searchTab.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Đang ở màn hình Tìm kiếm - Duy trì trạng thái hiện tại.");
    });

    // 16. Tab Lộ trình: Chuyển tới màn hình chi tiết lộ trình và đánh giá
    DOM.routeTab.addEventListener('click', () => {
        navigateTo('route_details_screen');
    });

    // 17. Tab Hồ sơ: Kiểm tra quyền, chuyển đến màn hình Hồ sơ & Cài đặt
    DOM.profileTab.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('profile_settings_screen'));
    });
}

// Khởi tạo màn hình
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    // Render danh sách mặc định khi vào trang
    renderSearchResults(SearchScreenState.searchResults);
});