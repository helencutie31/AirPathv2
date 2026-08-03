document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Logo Header: Chuyển hướng đến Dashboard
    document.getElementById('logoHeader').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Bảng điều khiển quản trị (Dashboard)");
    });

    // 2. Profile Avatar: Chuyển hướng đến hồ sơ
    document.getElementById('avatarProfile').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Hồ sơ quản trị viên");
    });

    // 7. Nút Thêm mới (+ 新規追加)
    document.getElementById('btnAddFacility').addEventListener('click', () => {
        alert("Hiển thị cửa sổ (modal) thêm địa điểm mới.");
    });

    // 11. Nút Xóa (Thùng rác)
    const deleteBtns = document.querySelectorAll('.btn-delete');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
            const isConfirm = confirm("Bạn có chắc chắn muốn xóa cơ sở này khỏi danh sách không?");
            if (isConfirm) {
                const item = this.closest('.facility-item');
                item.style.display = 'none'; // Ẩn khỏi giao diện
            }
        });
    });

    // 15, 16, 17. Bottom Navigation
    document.getElementById('tabDashboard').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Bảng điều khiển quản trị");
    });

    document.getElementById('tabFacility').addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Đang ở tab cơ sở, cuộn lên đầu
    });

    document.getElementById('tabProfile').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Hồ sơ quản trị viên");
    });
});
