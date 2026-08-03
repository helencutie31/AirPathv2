// Quản lý trạng thái màn hình Đăng nhập
const LoginState = {
    email: '',
    password: ''
};

// Khởi tạo các phần tử DOM
const DOM = {
    logoHeader: document.querySelector('[data-id="1"]'),
    emailInput: document.querySelector('[data-id="6"]'),
    passwordInput: document.querySelector('[data-id="9"]'),
    forgotPwdBtn: document.querySelector('[data-id="8"]'),
    loginBtn: document.querySelector('[data-id="10"]'),
    registerLink: document.querySelector('[data-id="12"]'),
    emailError: document.getElementById('email-error'),
    passwordError: document.getElementById('password-error')
};

// --- CÁC HÀM XỬ LÝ (LOGIC FUNCTIONS) ---

// 1. & 12. Hàm giả lập điều hướng chung
function navigateTo(screenName) {
    console.log(`Đang chuyển hướng tới màn hình: ${screenName}`);
}

// 8. Xử lý khi bấm quên mật khẩu
function handleForgotPassword() {
    const email = DOM.emailInput.value.trim();
    if (email) {
        alert(`Đã gửi liên kết đặt lại mật khẩu đến "${email}".`);
    } else {
        alert("Vui lòng nhập địa chỉ email trước khi yêu cầu đặt lại mật khẩu.");
    }
}

// Hàm kiểm tra định dạng Email (RFC chuẩn cơ bản)
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// 10. Xử lý quá trình đăng nhập (Kiểm tra lỗi và Điều hướng Role)
function handleLogin() {
    // Reset lỗi
    DOM.emailError.innerText = "";
    DOM.passwordError.innerText = "";
    
    let isValid = true;
    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value;

    // Kiểm tra Mục 6: Rỗng hoặc sai định dạng Email
    if (!email || !validateEmail(email)) {
        DOM.emailError.innerText = "Vui lòng nhập địa chỉ email hợp lệ";
        isValid = false;
    }

    // Kiểm tra Mục 9: Độ dài mật khẩu (8-16 ký tự)
    if (!password || password.length < 8 || password.length > 16) {
        DOM.passwordError.innerText = "Mật khẩu phải từ 8 đến 16 ký tự";
        isValid = false;
    }

    // Nếu thông tin hợp lệ, tiến hành giả lập đăng nhập
    if (isValid) {
        console.log("Xác thực thông tin hợp lệ, tiến hành đăng nhập...");
        
        // Giả lập logic kiểm tra Role (Phân quyền đích đến như trong bảng thiết kế Mục 10)
        // Ví dụ: Nếu email có chứa từ 'admin', gán Role 2. Nếu không, gán Role 1.
        if (email.includes("admin")) {
            console.log("Role 2 phát hiện. Đăng nhập thành công -> Admin Dashboard");
            navigateTo("admin_dashboard_screen");
            // window.location.href = 'dashboard.html';
        } else {
            console.log("Role 1 phát hiện. Đăng nhập thành công -> Trang chủ người dùng");
            navigateTo("home_screen");
            // window.location.href = 'index.html';
        }
    }
}

// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Nhấn vào Logo để quay về trang chủ (Dành cho khách chưa đăng nhập muốn lướt app)
    DOM.logoHeader.addEventListener('click', () => navigateTo('home_screen'));

    // 8. Nhấn vào liên kết quên mật khẩu
    DOM.forgotPwdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    // 10. Bấm nút Login để kiểm tra và gửi form
    DOM.loginBtn.addEventListener('click', handleLogin);

    // Xử lý sự kiện nhấn phím Enter khi đang gõ Password
    DOM.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // 12. Nhấn vào liên kết Đăng ký tài khoản mới
    DOM.registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('signup_screen');
    });
}

// Khởi chạy file script
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
});