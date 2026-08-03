// Quản lý trạng thái dữ liệu người dùng (State)
const ProfileState = {
    userInfo: {
        name: "Lê Minh Anh",
        email: "minhanh.le@email.com",
        phone: "0987 *** 321",
        avatar: "user-avatar.jpg"
    },
    settings: {
        aqiThreshold: 50,
        pushNotification: true,
        emailUpdate: false
    }
};

// Liên kết DOM
const DOM = {
    logo: document.querySelector('[data-id="1"]'),
    avatarSmall: document.querySelector('[data-id="2"]'),
    avatarMainWrapper: document.querySelector('[data-id="3"]'),
    editBtns: document.querySelectorAll('[data-id="6"]'),
    
    aqiSlider: document.getElementById('aqi-slider'),
    aqiDisplay: document.getElementById('aqi-threshold-val'),
    
    pushToggle: document.getElementById('toggle-push'),
    emailToggle: document.getElementById('toggle-email'),
    
    logoutBtn: document.querySelector('[data-id="10"]'),
    
    // Bottom Navigation
    homeTab: document.querySelector('[data-id="11"]'),
    searchTab: document.querySelector('[data-id="12"]'),
    routeTab: document.querySelector('[data-id="13"]'),
    profileTab: document.querySelector('[data-id="14"]')
};

// --- CÁC HÀM XỬ LÝ LOGIC (LOGIC FUNCTIONS) ---

// 1 & 11. Chuyển hướng trang
function navigateTo(screenName) {
    console.log(`Chuyển hướng sang màn hình: ${screenName}`);
    // window.location.href = `${screenName}.html`;
}

// 3. Xử lý đổi ảnh đại diện
function handleAvatarChange() {
    console.log("Mở thư viện ảnh của thiết bị để chọn ảnh đại diện mới...");
    alert("端末の画像ライブラリを起動します... (Mở thư viện ảnh...)");
}

// 6. Xử lý sửa thông tin cá nhân trực tiếp (Inline Edit)
function handleInlineEdit(field) {
    const currentValue = ProfileState.userInfo[field];
    
    // Sử dụng prompt giả lập việc mở modal nhập liệu
    const newValue = prompt(`新しい${field}を入力してください (Nhập thông tin mới cho ${field}):`, currentValue);
    
    if (newValue !== null && newValue.trim() !== "") {
        ProfileState.userInfo[field] = newValue.trim();
        
        // Cập nhật lên UI
        document.getElementById(`disp-${field}`).innerText = ProfileState.userInfo[field];
        console.log(`Đã cập nhật ${field} thành: ${newValue}`);
    }
}

// 7. Cập nhật giá trị hiển thị khi kéo slider AQI
function handleAqiSliderChange(e) {
    const value = e.target.value;
    ProfileState.settings.aqiThreshold = parseInt(value);
    DOM.aqiDisplay.innerText = value;
    
    // Đổi màu hiển thị số tùy theo mức nguy hiểm
    if (value <= 50) {
        DOM.aqiDisplay.style.color = 'var(--primary-green)';
        DOM.aqiDisplay.style.backgroundColor = 'var(--light-green)';
    } else if (value <= 100) {
        DOM.aqiDisplay.style.color = '#e65100'; // Cam
        DOM.aqiDisplay.style.backgroundColor = '#fff3e0';
    } else {
        DOM.aqiDisplay.style.color = '#c62828'; // Đỏ
        DOM.aqiDisplay.style.backgroundColor = '#ffebee';
    }
}

// 8 & 9. Lưu cài đặt bật/tắt
function handleToggleChange(settingKey, isChecked) {
    ProfileState.settings[settingKey] = isChecked;
    console.log(`Đã lưu cài đặt ${settingKey}: ${isChecked ? 'ON' : 'OFF'}`);
}

// 10. Xử lý Đăng xuất
function handleLogout() {
    const confirmLogout = confirm("ログアウトしてもよろしいですか？ (Bạn có chắc chắn muốn đăng xuất không?)");
    
    if (confirmLogout) {
        console.log("Thực hiện quy trình đăng xuất, xóa session...");
        alert("ログアウトしました。(Đã đăng xuất thành công).");
        // Điều hướng về màn hình đăng nhập
        // window.location.href = 'login.html';
        navigateTo('login');
    }
}


// --- ĐĂNG KÝ SỰ KIỆN (EVENT LISTENERS) ---

function initListeners() {
    // Header & Avatar
    DOM.logo.addEventListener('click', () => navigateTo('home'));
    DOM.avatarSmall.addEventListener('click', (e) => e.preventDefault()); // Duy trì màn hình
    DOM.avatarMainWrapper.addEventListener('click', handleAvatarChange);

    // Edit User Info
    DOM.editBtns.forEach(btn => {
        btn.addEventListener('click', () => handleInlineEdit(btn.dataset.field));
    });

    // Settings Slider & Toggles
    DOM.aqiSlider.addEventListener('input', handleAqiSliderChange);
    
    DOM.pushToggle.addEventListener('change', (e) => handleToggleChange('pushNotification', e.target.checked));
    DOM.emailToggle.addEventListener('change', (e) => handleToggleChange('emailUpdate', e.target.checked));

    // Logout
    DOM.logoutBtn.addEventListener('click', handleLogout);

    // Bottom Navigation
    DOM.homeTab.addEventListener('click', () => navigateTo('home'));
    DOM.searchTab.addEventListener('click', () => navigateTo('search'));
    DOM.routeTab.addEventListener('click', () => navigateTo('route'));
    DOM.profileTab.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Duy trì trạng thái màn hình Hồ sơ & Cài đặt hiện tại.");
    });
}

// Khởi chạy khi DOM tải xong
document.addEventListener("DOMContentLoaded", initListeners);