// Quản lý trạng thái dữ liệu (State)
const SignupState = {
    form: {
        name: '',
        email: '',
        password: ''
    }
};

// Liên kết DOM
const DOM = {
    logo: document.querySelector('[data-id="1"]'),
    inputName: document.querySelector('[data-id="4"]'),
    inputEmail: document.querySelector('[data-id="5"]'),
    inputPwd: document.querySelector('[data-id="6"]'),
    submitBtn: document.querySelector('[data-id="7"]'),
    loginLink: document.querySelector('[data-id="9"]'),
    // Social buttons
    googleBtn: document.querySelector('[data-id="10"]'),
    fbBtn: document.querySelector('[data-id="11"]'),
    appleBtn: document.querySelector('[data-id="12"]'),
    // Tabs
    tabs: [
        document.querySelector('[data-id="13"]'),
        document.querySelector('[data-id="14"]'),
        document.querySelector('[data-id="15"]'),
        document.querySelector('[data-id="16"]')
    ]
};

// --- CÁC HÀM LOGIC (LOGIC FUNCTIONS) ---

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 7. Xử lý Đăng ký và Kiểm tra lỗi (Validation)
function handleSignup() {
    // Reset thông báo lỗi
    document.getElementById('name-error').innerText = "";
    document.getElementById('email-error').innerText = "";
    document.getElementById('password-error').innerText = "";

    let isValid = true;
    const name = DOM.inputName.value.trim();
    const email = DOM.inputEmail.value.trim();
    const pwd = DOM.inputPwd.value;

    // Kiểm tra tên rỗng
    if (!name) {
        document.getElementById('name-error').innerText = "Vui lòng nhập tên";
        isValid = false;
    }

    // Kiểm tra định dạng Email (Mục 5)
    if (!email || !validateEmail(email)) {
        document.getElementById('email-error').innerText = "Vui lòng nhập địa chỉ email hợp lệ";
        isValid = false;
    }

    // Kiểm tra độ dài mật khẩu 8-16 (Mục 6)
    if (!pwd || pwd.length < 8 || pwd.length > 16) {
        document.getElementById('password-error').innerText = "Mật khẩu phải từ 8 đến 16 ký tự";
        isValid = false;
    }

    if (isValid) {
        console.log("Đăng ký thành công!", { name, email });
        alert("Tài khoản đã được tạo thành công!");
        // Điều hướng sang trang chủ
        window.location.href = 'index.html'; 
    }
}

// 10, 11, 12. Giả lập OAuth Login
function handleSocialLogin(platform) {
    console.log(`Đang kết nối tới ${platform}...`);
    alert(`Đang đăng nhập bằng ${platform}...`);
}

// --- ĐĂNG KÝ SỰ KIỆN (EVENT LISTENERS) ---

function initListeners() {
    // 1. Click Logo -> Reload trang
    DOM.logo.addEventListener('click', () => window.location.reload());

    // 7. Click Nút đăng ký
    DOM.submitBtn.addEventListener('click', handleSignup);

    // 9. Click chuyển sang trang Đăng nhập
    DOM.loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'login.html';
    });

    // 10-12. Social buttons
    DOM.googleBtn.addEventListener('click', () => handleSocialLogin('Google'));
    DOM.fbBtn.addEventListener('click', () => handleSocialLogin('Facebook'));
    DOM.appleBtn.addEventListener('click', () => handleSocialLogin('Apple'));

    // 13-16. Tabs điều hướng
    DOM.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Điều hướng tab...");
        });
    });
}

document.addEventListener("DOMContentLoaded", initListeners);