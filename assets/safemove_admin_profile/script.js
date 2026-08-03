document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Logo Header: Chuyển hướng đến Dashboard
    document.getElementById('logoHeader').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Bảng điều khiển quản trị (Dashboard)");
    });

    // 2. Profile Avatar (Góc phải): Duy trì trạng thái
    document.getElementById('headerAvatar').addEventListener('click', () => {
        console.log("Đang ở màn hình hồ sơ, không cần chuyển hướng.");
    });

    // 3. Nút sửa ảnh đại diện (Icon Camera)
    document.getElementById('btnEditAvatar').addEventListener('click', () => {
        alert("Hiển thị menu thay đổi ảnh đại diện (Tải ảnh lên / Chụp ảnh).");
    });

    // 6. Nút chỉnh sửa thông tin cá nhân (Icon bút chì)
    const editBtns = document.querySelectorAll('.btn-edit-inline');
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Lấy label của hàng để thông báo
            const label = this.closest('.info-row').querySelector('.info-label').innerText;
            alert(`Cho phép chỉnh sửa trực tiếp mục: ${label}`);
        });
    });

    // 8. Nút Đăng xuất
    document.getElementById('btnLogout').addEventListener('click', () => {
        const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?");
        if (confirmLogout) {
            alert("Thực hiện đăng xuất và chuyển hướng đến màn hình Đăng nhập.");
        }
    });

    // 9, 10, 11. Thanh điều hướng dưới cùng (Bottom Navigation)
    document.getElementById('tabDashboard').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Bảng điều khiển quản trị (Dashboard)");
    });

    document.getElementById('tabFacility').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Quản lý thông tin cơ sở");
    });

    document.getElementById('tabProfile').addEventListener('click', (e) => {
        e.preventDefault();
        // Đã ở màn hình Profile, cuộn lên đầu trang
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });
});
