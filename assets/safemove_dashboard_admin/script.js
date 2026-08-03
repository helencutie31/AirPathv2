document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Logo Header: Nhấp vào tải lại trang hiện tại
    document.getElementById('logoHeader').addEventListener('click', () => {
        window.location.reload();
    });

    // 2. Profile Image (Avatar): Nhấp vào chuyển hướng đến hồ sơ
    document.getElementById('avatarProfile').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Hồ sơ quản trị viên");
    });

    // 7. Thông báo vi phạm (Violation Notice): Chuyển đến màn hình quản lý bình luận
    document.getElementById('violationNotice').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Quản lý bình luận tương ứng");
    });

    // 8. Tab Dashboard: Duy trì trạng thái
    document.getElementById('tabDashboard').addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 9. Tab Facility: Chuyển đến quản lý thông tin cơ sở
    document.getElementById('tabFacility').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Quản lý thông tin cơ sở");
    });

    // 10. Tab Profile: Chuyển đến hồ sơ quản trị viên
    document.getElementById('tabProfile').addEventListener('click', () => {
        alert("Chuyển hướng đến màn hình: Hồ sơ quản trị viên");
    });
});
