// Quản lý dữ liệu danh sách bình luận đầy đủ (State)
const ReviewsScreenState = {
    spotName: "Công viên Bách Thảo (バックタオ公園)",
    currentSort: "latest", // Thao tác phân loại: 'latest' (Mới nhất) hoặc 'highest' (Đánh giá cao nhất)
    allReviews: [
        {
            id: 1,
            author: "チャン・アン",
            avatar: "avatar1.png",
            rating: 5,
            date: "2 ngày trước",
            content: "Không khí rất trong lành, chạy bộ buổi sáng ở đây rất tuyệt! Khu vực gần cổng số 2 rất sạch sẽ."
        },
        {
            id: 2,
            author: "田中 健",
            avatar: "avatar2.png",
            rating: 5,
            date: "3 ngày trước",
            content: "週末の朝に家族で訪れました。緑が多く、子供たちが走り回るのに十分な広さがあります。ベンチも多く、休憩しやすいです。"
        },
        {
            id: 3,
            author: "Nguyễn Văn B",
            avatar: "", // Không có ảnh để kiểm tra trạng thái ảnh mặc định
            rating: 4,
            date: "5 ngày trước",
            content: "Điểm cộng là nhiều cây cổ thụ bóng mát lớn, không gian thoáng đãng giữa lòng Hà Nội."
        }
    ]
};

// Khởi tạo các thành phần DOM dựa trên thiết kế mẫu
const DOM = {
    backBtn: document.querySelector('[data-id="1"]'),
    sortBtn: document.querySelector('[data-id="5"]'),
    sortLabel: document.getElementById('current-sort-label'),
    reviewsContainer: document.getElementById('reviews-container')
};

// --- CÁC HÀM XỬ LÝ (LOGIC FUNCTIONS) ---

// Quay lại màn hình chi tiết địa điểm trước đó (Mục 1)
function handleBackAction() {
    console.log("Quay lại màn hình trước (Chi tiết địa điểm)");
    // window.history.back(); // Kích hoạt chuyển trang thực tế
}

// Xử lý đổi bộ lọc và sắp xếp danh sách nhận xét (Mục 5)
function toggleSortOrder() {
    if (ReviewsScreenState.currentSort === "latest") {
        ReviewsScreenState.currentSort = "highest";
        DOM.sortLabel.innerText = "評価の高い順"; // Đổi nhãn hiển thị sang Đánh giá cao nhất
        
        // Thực hiện logic sắp xếp theo số sao giảm dần
        ReviewsScreenState.allReviews.sort((a, b) => b.rating - a.rating);
    } else {
        ReviewsScreenState.currentSort = "latest";
        DOM.sortLabel.innerText = "最新順"; // Trở về mặc định mới nhất
        
        // Thực hiện logic sắp xếp theo ID / thời gian nhận bài
        ReviewsScreenState.allReviews.sort((a, b) => a.id - b.id);
    }
    
    // Render lại danh sách sau khi thay đổi thứ tự
    renderReviewsList(ReviewsScreenState.allReviews);
}

// Render danh sách bình luận động từ DB (Mục 6 -> 9)
function renderReviewsList(reviews) {
    DOM.reviewsContainer.innerHTML = ''; // Làm trống khung danh sách cũ

    reviews.forEach(item => {
        // Tạo thẻ bao bọc ngoài cho mỗi nhận xét
        const reviewBlock = document.createElement('div');
        reviewBlock.className = 'review-item-block';

        // Xử lý ảnh đại diện: lấy ảnh từ DB người dùng, nếu rỗng hiển thị ảnh mặc định (Mục 6)
        const avatarSrc = item.avatar ? item.avatar : 'default-avatar.png';

        reviewBlock.innerHTML = `
            <div class="review-user-row">
                <img src="${avatarSrc}" alt="${item.author}" class="user-avatar-circle">
                
                <div class="user-meta-details">
                    <h5 class="user-name-txt">${item.author}</h5>
                    <span class="timestamp-txt">${item.date}</span>
                </div>
                
                <div class="individual-stars">
                    ${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}
                </div>
            </div>
            
            <p class="review-body-text">「${item.content}」</p>
        `;

        DOM.reviewsContainer.appendChild(reviewBlock);
    });
}

// --- KHỞI TẠO SỰ KIỆN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Nhấn nút quay lại chuyển hướng về màn hình trước đó
    DOM.backBtn.addEventListener('click', handleBackAction);

    // 5. Nhấn nút sắp xếp để thay đổi thứ tự hiển thị danh sách
    DOM.sortBtn.addEventListener('click', toggleSortOrder);
}

// Chạy ứng dụng khi sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    // Tải danh sách lên giao diện lần đầu tiên
    renderReviewsList(ReviewsScreenState.allReviews);
});