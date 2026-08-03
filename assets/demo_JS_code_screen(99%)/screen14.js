// Xử lý các sự kiện cho Modal
const DOM_MODAL = {
    overlay: document.querySelector('.modal-overlay'),
    loginBtn: document.querySelector('.modal-card [data-id="5"]'),
    cancelBtn: document.querySelector('.modal-card [data-id="6"]')
};

// Hàm mở modal (Được gọi từ các màn hình khác khi Guest bấm vào tính năng khóa)
function showLoginRequirementModal() {
    DOM_MODAL.overlay.classList.add('active');
}

// 6. Xử lý nút Hủy (Đóng Modal)
DOM_MODAL.cancelBtn.addEventListener('click', () => {
    DOM_MODAL.overlay.classList.remove('active');
    console.log("Đã đóng Pop-up yêu cầu đăng nhập.");
});

// 5. Xử lý nút Đăng nhập (Chuyển trang)
DOM_MODAL.loginBtn.addEventListener('click', () => {
    console.log("Chuyển hướng đến màn hình Đăng nhập (Login Screen).");
    // window.location.href = 'login.html';
});