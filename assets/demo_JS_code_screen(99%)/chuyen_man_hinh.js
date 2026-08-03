// Quản lý phân quyền hiện tại của hệ thống
const AppContext = {
    currentRole: 3, // Mặc định là 3 (Guest). Sẽ đổi thành 1 (User) hoặc 2 (Admin) sau khi Login
};

// Định nghĩa trung tâm các tuyến đường (Routes) theo đúng sơ đồ
const Routes = {
    HOME: 'index.html',
    SEARCH: 'search.html',
    DETAIL: 'detail.html',
    ALL_COMMENTS: 'reviews.html',
    GREEN_ROUTE: 'route.html',
    AQI_ALERT: 'alert.html',
    PROFILE: 'profile.html',
    
    // Auth
    LOGIN: 'login.html',
    SIGNUP: 'signup.html',
    
    // Admin
    ADMIN_DASHBOARD: 'dashboard.html',
    ADMIN_FACILITY: 'management.html',
    ADMIN_ADD_FACILITY: 'add-facility.html',
    ADMIN_MODERATION: 'moderation.html',
    ADMIN_PROFILE: 'admin-profile.html'
};

/**
 * Hàm điều hướng trung tâm (Centralized Navigation Function)
 * Xử lý chính xác các đường nối trong sơ đồ Role 1, Role 2 và Role 3
 */
function navigateTo(targetRoute) {
    console.log(`[Router] Đang kiểm tra quyền chuyển hướng tới: ${targetRoute}`);

    // Luồng xử lý cho Role 3 (Khách) - Sơ đồ 3
    if (AppContext.currentRole === 3) {
        const publicRoutes = [Routes.HOME, Routes.SEARCH, Routes.DETAIL, Routes.LOGIN, Routes.SIGNUP];
        
        // Nếu Khách cố gắng truy cập trang yêu cầu quyền (như Lộ trình xanh, Cài đặt hồ sơ)
        if (!publicRoutes.includes(targetRoute)) {
            console.log("[Router] Khách bị chặn! Hiển thị Pop-up yêu cầu Đăng nhập.");
            showLoginRequirementModal(); // Gọi hàm hiển thị Modal (Đã viết ở màn Login)
            return;
        }
    }

    // Thực hiện chuyển trang thực tế
    window.location.href = targetRoute;
}

/**
 * Xử lý luồng rẽ nhánh đặc biệt sau khi Đăng nhập thành công (Theo sơ đồ 3)
 */
function handleLoginSuccess(userRole) {
    AppContext.currentRole = userRole;
    
    if (userRole === 1) {
        // Role 1 đăng nhập thành công -> Trang chủ
        console.log("[Router] Login Role 1. Chuyển về Home.");
        window.location.href = Routes.HOME;
    } else if (userRole === 2) {
        // Role 2 đăng nhập thành công -> Bảng điều khiển quản trị
        console.log("[Router] Login Role 2. Chuyển về Dashboard.");
        window.location.href = Routes.ADMIN_DASHBOARD;
    }
}