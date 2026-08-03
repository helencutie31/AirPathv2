// Quản lý trạng thái màn hình (Screen State)
const SpotDetailState = {
    isGuest: false, // Trạng thái tài khoản khách
    spotInfo: {
        id: 201,
        name: "Công viên Bách Thảo (バックタオ公園)",
        safetyScore: 92,
        pm25: 12,
        amenities: ["water", "shade"], // Trạm nước, bóng râm...
        description: "Môi trường trong lành, không gian lý tưởng cho các hoạt động ngoài trời..."
    },
    reviews: [
        { id: 1, author: "チャン・アン", rating: 5, date: "2 ngày trước", content: "Không khí rất trong lành, chạy bộ buổi sáng ở đây rất tuyệt!" }
    ]
};

// Cấu trúc DOM đại diện cho 16 thành phần trên thiết kế
const DOM = {
    logoHeader: document.querySelector('[data-id="1"]'),
    avatarBtn: document.querySelector('[data-id="2"]'),
    spotName: document.querySelector('[data-id="3"]'),
    safetyScoreCircle: document.querySelector('[data-id="4"]'),
    pm25Value: document.querySelector('[data-id="5"]'),
    amenitiesIconContainer: document.querySelector('[data-id="6"]'),
    descriptionText: document.querySelector('[data-id="7"]'),
    viewAllReviewsBtn: document.querySelector('[data-id="8"]'),
    reviewInput: document.querySelector('[data-id="9"]'),
    submitReviewBtn: document.querySelector('[data-id="10"]'),
    reviewListContainer: document.querySelector('[data-id="11"]'),
    floatingRouteBtn: document.querySelector('[data-id="12"]'), // Nút lộ trình nổi (Floating Button)
    // Navigation Bottom Bar
    homeTab: document.querySelector('[data-id="13"]'),
    searchTab: document.querySelector('[data-id="14"]'),
    routeTab: document.querySelector('[data-id="15"]'),
    profileTab: document.querySelector('[data-id="16"]')
};

// --- CÁC HÀM XỬ LÝ LOGIC (LOGIC FUNCTIONS) ---

function navigateTo(screenName, params = {}) {
    console.log(`Chuyển hướng tới màn hình: ${screenName}`, params);
}

// Kiểm tra và hiển thị Pop-up thông báo nếu là khách (Guest)
function checkAuthAndExecute(callback) {
    if (SpotDetailState.isGuest) {
        alert("Tính năng này yêu cầu đăng nhập. Vui lòng đăng nhập tài khoản!");
    } else {
        callback();
    }
}

// Đổ dữ liệu chi tiết địa điểm lên UI (Mục 3, 4, 5, 6, 7)
function renderSpotDetails() {
    const spot = SpotDetailState.spotInfo;
    
    DOM.spotName.innerText = spot.name;
    DOM.safetyScoreCircle.innerText = `${spot.safetyScore}`; // Thang điểm 0 - 100
    DOM.pm25Value.innerHTML = `<strong>${spot.pm25} µg/m³</strong><br><small>Chỉ số hiện tại</small>`;
    DOM.descriptionText.innerText = spot.description;

    // Render danh sách icon tiện ích (Mục 6)
    DOM.amenitiesIconContainer.innerHTML = '';
    spot.amenities.forEach(amenity => {
        const icon = document.createElement('span');
        icon.className = `icon-${amenity}`;
        icon.innerText = amenity === 'water' ? '💧 Trạm nước' : '🌳 Bóng râm';
        DOM.amenitiesIconContainer.appendChild(icon);
    });
}

// Render danh sách bình luận/đánh giá (Mục 11)
function renderReviews() {
    DOM.reviewListContainer.innerHTML = '';
    
    SpotDetailState.reviews.forEach(rev => {
        const revElement = document.createElement('div');
        revElement.className = 'review-item';
        revElement.innerHTML = `
            <div class="review-header">
                <strong>${rev.author}</strong> <span>${'★'.repeat(rev.rating)}</span>
                <small class="review-date">${rev.date}</small>
            </div>
            <p class="review-content">${rev.content}</p> `;
        DOM.reviewListContainer.appendChild(revElement);
    });
}

// Xử lý logic gửi bài đánh giá (Mục 9 & 10)
function handleReviewSubmission() {
    // 1. Nếu là Khách (Guest): Vô hiệu hóa tính năng, hiển thị thông báo đăng nhập
    if (SpotDetailState.isGuest) {
        alert("Hãy đăng nhập để đăng bài đánh giá.");
        return;
    }

    const content = DOM.reviewInput.value.trim();
    if (!content) {
        alert("Vui lòng nhập nội dung đánh giá!");
        return;
    }

    // 2. Nếu đã đăng nhập: Tiến hành thêm đánh giá mới
    const newReview = {
        id: Date.now(),
        author: "Người dùng hiện tại",
        rating: 5,
        date: "Vừa xong",
        content: content
    };

    SpotDetailState.reviews.unshift(newReview); // Thêm lên đầu danh sách
    DOM.reviewInput.value = ''; // Reset ô nhập liệu
    renderReviews(); // Cập nhật lại UI danh sách đánh giá
    console.log("Đã gửi đánh giá thành công lên máy chủ.");
}

// Thiết lập trạng thái ô nhập liệu ban đầu dựa trên quyền User/Guest
function setupReviewInputPlaceholder() {
    if (SpotDetailState.isGuest) {
        DOM.reviewInput.placeholder = "Hãy đăng nhập để đăng bài đánh giá...";
        DOM.submitReviewBtn.disabled = true; // Vô hiệu hóa nút gửi đối với khách
    } else {
        DOM.reviewInput.placeholder = "Hãy nhập đánh giá của bạn...";
        DOM.submitReviewBtn.disabled = false;
    }
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    
    // 1. Logo Header -> Quay về trang chủ
    DOM.logoHeader.addEventListener('click', () => {
        navigateTo('home_screen');
    });

    // 2. Ảnh đại diện (Avatar) -> Kiểm tra quyền, đi tới Hồ sơ
    DOM.avatarBtn.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('profile_settings_screen'));
    });

    // 8. Nút "Xem tất cả" bình luận chính gốc
    DOM.viewAllReviewsBtn.addEventListener('click', () => {
        navigateTo('all_reviews_screen', { spotId: SpotDetailState.spotInfo.id });
    });

    // 10. Nút Gửi bài đánh giá
    DOM.submitReviewBtn.addEventListener('click', () => {
        handleReviewSubmission();
    });

    // 12. Nút Lộ trình màu xanh lá nổi (Floating Route Button)
    DOM.floatingRouteBtn.addEventListener('click', () => {
        // Kiểm tra quyền, nếu là khách yêu cầu đăng nhập, ngược lại đề xuất lộ trình xanh
        checkAuthAndExecute(() => navigateTo('suggested_green_route_screen', { spotId: SpotDetailState.spotInfo.id }));
    });

    // --- NAVIGATION BOTTOM BAR ---

    // 13. Tab Trang chủ
    DOM.homeTab.addEventListener('click', () => {
        navigateTo('home_screen');
    });

    // 14. Tab Tìm kiếm
    DOM.searchTab.addEventListener('click', () => {
        navigateTo('search_screen');
    });

    // 15. Tab Lộ trình: Duy trì trạng thái màn hình chi tiết địa điểm hiện tại
    DOM.routeTab.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Duy trì trạng thái màn hình chi tiết địa điểm và đánh giá hiện tại.");
    });

    // 16. Tab Hồ sơ
    DOM.profileTab.addEventListener('click', () => {
        checkAuthAndExecute(() => navigateTo('profile_settings_screen'));
    });
}

// Khởi chạy ứng dụng
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    setupReviewInputPlaceholder();
    
    // Đổ dữ liệu ban đầu
    renderSpotDetails();
    renderReviews();
});