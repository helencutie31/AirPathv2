document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Back Button
    document.getElementById('btnBack').addEventListener('click', () => {
        alert("Chuyển hướng về màn hình: Bảng điều khiển quản trị (Dashboard)");
    });

    // 6. Location Filters
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active class from all
            chips.forEach(c => c.classList.remove('active'));
            // Add active class to clicked
            this.classList.add('active');
            console.log("Đã lọc theo: " + this.innerText);
        });
    });

    // 8 & 9. Checkboxes
    const chkUnprocessed = document.getElementById('chkUnprocessed');
    const chkDeleted = document.getElementById('chkDeleted');

    chkUnprocessed.addEventListener('change', (e) => {
        console.log("Hiển thị bình luận chưa xử lý: " + e.target.checked);
    });

    chkDeleted.addEventListener('change', (e) => {
        console.log("Hiển thị bình luận đã xóa: " + e.target.checked);
    });

    // 19 & 20. Action Buttons (Delete / Restore)
    const deleteBtns = document.querySelectorAll('.btn-delete');
    const restoreBtns = document.querySelectorAll('.btn-restore');

    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.comment-card');
            card.style.opacity = '0.5';
            alert("Đã xóa bình luận này.");
        });
    });

    restoreBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.comment-card');
            card.style.opacity = '1';
            alert("Đã khôi phục bình luận này.");
        });
    });
});
