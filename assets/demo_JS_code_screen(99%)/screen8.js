// Quản lý trạng thái biểu mẫu (State)
const NewFacilityFormState = {
    selectedLocation: { lat: 21.0285, lng: 105.8542 }, // Mặc định từ bản đồ chọn vị trí
    selectedAmenities: [] // Danh sách chứa các tag tiện ích được người dùng bấm chọn
};

// Khởi tạo đối tượng liên kết DOM
const DOM = {
    mapPicker: document.querySelector('[data-id="1"]'),
    inputName: document.querySelector('[data-id="2"]'),
    inputAddress: document.querySelector('[data-id="3"]'),
    toggleJapanFriendly: document.getElementById('facility-japan-friendly'),
    amenityButtons: document.querySelectorAll('.amenity-select-btn'),
    inputIntro: document.querySelector('[data-id="6"]'),
    saveBtn: document.querySelector('[data-id="7"]'),
    cancelBtn: document.querySelector('[data-id="8"]'),
    nameError: document.getElementById('name-error'),
    hiddenLat: document.getElementById('facility-lat'),
    hiddenLng: document.getElementById('facility-lng')
};

// --- CÁC HÀM XỬ LÝ LOGIC (LOGIC FUNCTIONS) ---

// 1. Giả lập tương tác di chuyển ghim trên bản đồ để xác định vị trí trực quan
function handleMapInteraction() {
    console.log("Xử lý di chuyển ghim (pin) để xác định vị trí mới.");
    
    // Giả lập cập nhật tọa độ ngẫu nhiên khi quản trị viên bấm vào bản đồ
    const mockLat = (21.0285 + (Math.random() - 0.5) * 0.01).toFixed(4);
    const mockLng = (105.8542 + (Math.random() - 0.5) * 0.01).toFixed(4);
    
    NewFacilityFormState.selectedLocation = { lat: mockLat, lng: mockLng };
    DOM.hiddenLat.value = mockLat;
    DOM.hiddenLng.value = mockLng;
    
    alert(`Địa điểm đã được ghim trực quan tại tọa độ:\nVĩ độ (Lat): ${mockLat}\nKinh độ (Lng): ${mockLng}`);
}

// 5. Thay đổi trạng thái làm nổi bật các tiện ích khi nhấn chọn (Toggle class selected)
function handleAmenitySelection(button) {
    const value = button.dataset.value;
    
    if (button.classList.contains('selected')) {
        button.classList.remove('selected');
        // Xóa khỏi mảng lưu trữ trạng thái
        NewFacilityFormState.selectedAmenities = NewFacilityFormState.selectedAmenities.filter(item => item !== value);
    } else {
        button.classList.add('selected');
        // Thêm vào mảng lưu trữ trạng thái
        NewFacilityFormState.selectedAmenities.push(value);
    }
    console.log("Mảng tiện ích hiện tại đã chọn:", NewFacilityFormState.selectedAmenities);
}

// 7. Kiểm tra dữ liệu nhập (Validation) và tiến hành Lưu/Gửi dữ liệu lên máy chủ
function submitFacilityForm() {
    // Reset thông báo lỗi cũ
    DOM.nameError.innerText = "";
    
    const facilityName = DOM.inputName.value.trim();
    const facilityAddress = DOM.inputAddress.value.trim();
    const isJapanFriendly = DOM.toggleJapanFriendly.checked;
    const introduction = DOM.inputIntro.value.trim();

    // Kiểm tra ràng buộc bắt buộc của Tên địa điểm (Mục 2)
    if (!facilityName) {
        DOM.nameError.innerText = "スポット名は必須項目です。入力してください。(Tên địa điểm không được để trống)";
        DOM.inputName.focus();
        return;
    }

    // Cấu trúc gói dữ liệu chuẩn hóa để gửi đi
    const postData = {
        name: facilityName,
        address: facilityAddress,
        location: NewFacilityFormState.selectedLocation,
        japanFriendly: isJapanFriendly,
        amenities: NewFacilityFormState.selectedAmenities,
        description: introduction
    };

    console.log("Dữ liệu kiểm tra hợp lệ! Tiến hành gửi dữ liệu lên máy chủ:", postData);
    alert("施設 thông tin đã được đăng ký thành công vào cơ sở dữ liệu!");
    
    // Điều hướng quay lại màn hình quản lý sau khi lưu thành công
    handleFormExit();
}

// 8. Hủy bỏ nội dung nhập và quay lại màn hình trước đó
function handleFormExit() {
    console.log("Hủy bỏ dữ liệu nhập, quay lại màn hình quản lý danh sách (Facility Management Screen)");
    // window.history.back(); // Trở về màn hình trước
}


// --- ĐĂNG KÝ SỰ KIỆN CHO CÁC THÀNH PHẦN (EVENT LISTENERS) ---

function initEventListeners() {
    // 1. Sự kiện tương tác trên khung bản đồ vị trí
    DOM.mapPicker.addEventListener('click', handleMapInteraction);

    // 5. Gắn sự kiện click cho từng nút chọn tiện ích chính
    DOM.amenityButtons.forEach(btn => {
        btn.addEventListener('click', () => handleAmenitySelection(btn));
    });

    // 7. Sự kiện nhấn nút Lưu dữ liệu
    DOM.saveBtn.addEventListener('click', submitFacilityForm);

    // 8. Sự kiện nhấn nút Hủy / Quay lại
    DOM.cancelBtn.addEventListener('click', handleFormExit);
}

// Khởi chạy module form nhập liệu
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
});