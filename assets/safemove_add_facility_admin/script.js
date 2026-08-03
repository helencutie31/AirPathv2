document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Map Interaction
    const mapSection = document.getElementById('mapSection');
    mapSection.addEventListener('click', (e) => {
        // Just simulating the pin drop effect
        alert("Đã cập nhật vị trí ghim trên bản đồ (Vĩ độ, Kinh độ).");
    });

    // 4. Japan-friendly Toggle
    const chkJapanFriendly = document.getElementById('chkJapanFriendly');
    chkJapanFriendly.addEventListener('change', (e) => {
        if(e.target.checked) {
            console.log("Đã BẬT nhãn Japan-friendly.");
        } else {
            console.log("Đã TẮT nhãn Japan-friendly.");
        }
    });

    // 5. Amenities Chips Selection
    const chips = document.querySelectorAll('.chip:not(.chip-add)');
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            this.classList.toggle('active'); // Cho phép chọn nhiều tiện ích (Toggle ON/OFF)
            console.log("Trạng thái tiện ích: " + this.innerText + " -> " + this.classList.contains('active'));
        });
    });

    // 5. Add New Amenity Button
    const btnAddAmenity = document.getElementById('btnAddAmenity');
    btnAddAmenity.addEventListener('click', () => {
        const newTag = prompt("Nhập tên tiện ích mới:");
        if(newTag && newTag.trim() !== "") {
            // Create new chip dynamically
            const newBtn = document.createElement('button');
            newBtn.type = 'button';
            newBtn.className = 'chip active'; // Default active when added
            newBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${newTag}`;
            
            // Add event listener to the new chip
            newBtn.addEventListener('click', function() {
                this.classList.toggle('active');
            });
            
            // Insert before the "+ Add" button
            const container = document.getElementById('amenitiesList');
            container.insertBefore(newBtn, btnAddAmenity);
        }
    });

    // 7. Save Button
    const btnSave = document.getElementById('btnSave');
    btnSave.addEventListener('click', () => {
        const spotName = document.getElementById('spotName').value;
        const address = document.getElementById('address').value;
        
        // Basic validation
        if (!spotName.trim()) {
            alert("Vui lòng nhập 'Tên địa điểm' (Bắt buộc).");
            document.getElementById('spotName').focus();
            return;
        }

        // Simulate save
        console.log({
            spotName: spotName,
            address: address,
            isJapanFriendly: chkJapanFriendly.checked,
            description: document.getElementById('description').value
        });
        
        alert("Đã lưu dữ liệu thành công! Trở về màn hình trước.");
        // Normally: window.location.href = 'previous_page.html';
    });

    // 8. Cancel Button
    const btnCancel = document.getElementById('btnCancel');
    btnCancel.addEventListener('click', () => {
        const confirmCancel = confirm("Nội dung chưa lưu sẽ bị mất. Bạn có chắc chắn muốn hủy không?");
        if (confirmCancel) {
            alert("Đã hủy. Trở về màn hình trước.");
            // Normally: window.history.back();
        }
    });
});
