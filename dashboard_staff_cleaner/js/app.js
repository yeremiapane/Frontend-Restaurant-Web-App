/**
 * Main Application Entry Point
 * Handle initialization of components, authentication, and websocket
 */
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('Initializing application...');
    
    // Create content container if not exists
    ensureContentContainers();
    
    // Set up global event listeners
    setupGlobalEvents();
    
    // Initialize auth manager and check authentication
    if (window.authManager) {
        const isAuthenticated = await window.authManager.checkAuth();
        if (!isAuthenticated) {
            // Auth failed or not available
            console.log('Authentication failed. In a real app, user would be redirected to login.');
            // For demo purposes, continue with fallback user profile
            loadDefaultUserProfile();
        }
    } else {
        // Fallback if auth manager is not available
        console.warn('Auth manager not available. Using fallback authentication.');
        loadDefaultUserProfile();
    }
    
    // Initialize WebSocket connection
    if (window.wsClient) {
        setTimeout(() => {
            window.wsClient.connect();
        }, 1000); // Small delay to ensure auth is checked first
    } else {
        console.warn('WebSocket client not available.');
    }
    
    // Setup UI components
    setupUIComponents();
    
    // Initialize the router
    if (window.router) {
        window.router.initialize();
    } else {
        console.error('Router not available!');
    }
}

/**
 * Ensure all required content containers exist
 */
function ensureContentContainers() {
    const ordersPage = document.getElementById('orders-page');
    const tablesPage = document.getElementById('tables-page');
    
    // Add content-container to orders-page if not exists
    if (ordersPage && !ordersPage.querySelector('#orders-content-container')) {
        const contentContainer = document.createElement('div');
        contentContainer.id = 'orders-content-container';
        ordersPage.appendChild(contentContainer);
    }
    
    // Ensure there's a content-container in tables-page as well
    if (tablesPage && !tablesPage.querySelector('#tables-content-container')) {
        const contentContainer = document.createElement('div');
        contentContainer.id = 'tables-content-container';
        tablesPage.appendChild(contentContainer);
    }
}

/**
 * Set up global event listeners
 */
function setupGlobalEvents() {
    // WebSocket connection events
    window.addEventListener('websocketConnected', (event) => {
        console.log('WebSocket connected successfully');
        updateConnectionStatus(true);
        
        // Bersihkan pesan error status koneksi jika ada
        clearConnectionErrors();
        
        // Nyalakan LED indikator koneksi
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = 'connection-status connected';
            statusIndicator.title = 'Terhubung ke server (real-time)';
        }
    });
    
    window.addEventListener('websocketDisconnected', (event) => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = 'connection-status disconnected';
            statusIndicator.title = 'Terputus dari server: ' + (event.detail?.reason || 'Koneksi terputus');
        }
    });
    
    window.addEventListener('websocketError', (event) => {
        console.error('WebSocket error:', event.detail.error);
        updateConnectionStatus(false);
        
        // Tampilkan error status koneksi
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = 'connection-status disconnected';
            statusIndicator.title = 'Error koneksi: ' + (event.detail?.error?.message || 'Koneksi error');
        }
    });
    
    window.addEventListener('websocketReconnectFailed', () => {
        console.error('WebSocket reconnect failed');
        showToast('Gagal terhubung kembali. Silakan refresh halaman.', 'error');
        
        // Update UI dengan pesan error
        displayConnectionError('Koneksi terputus', 'Gagal terhubung kembali ke server. Silakan refresh halaman.');
    });
    
    // Toast notification event 
    window.addEventListener('showToast', (event) => {
        if (event.detail) {
            showToast(event.detail.message, event.detail.type);
        }
    });
    
    // Auth events
    window.addEventListener('authReady', (event) => {
        // console.log('Auth ready:', event.detail.user);
    });
    
    window.addEventListener('userLoggedOut', () => {
        // console.log('User logged out');
    });
    
    // Staff notification events
    window.addEventListener('staffNotification', (event) => {
        // console.log('Staff notification received:', event.detail);
        
        // Perbarui bagian-bagian UI jika perlu, sebagai respons terhadap notifikasi staf
        if (event.detail.data && event.detail.data.refresh_required) {
            const targetComponent = event.detail.data.component;
            if (targetComponent === 'orders' && window.ordersPage) {
                window.ordersPage.loadOrders();
            } else if (targetComponent === 'tables' && window.tablesPage) {
                window.tablesPage.loadTables();
            } else if (targetComponent === 'dashboard' && window.dashboardPage) {
                window.dashboardPage.loadStats();
            }
        }
    });
}

/**
 * Display connection error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function displayConnectionError(title, message) {
    // Cek apakah error message sudah ada
    let errorContainer = document.getElementById('connection-error');
    
    if (!errorContainer) {
        // Buat error container jika belum ada
        errorContainer = document.createElement('div');
        errorContainer.id = 'connection-error';
        errorContainer.className = 'connection-error';
        
        const header = document.querySelector('.header');
        if (header) {
            header.parentNode.insertBefore(errorContainer, header.nextSibling);
        } else {
            document.querySelector('.main-content').prepend(errorContainer);
        }
    }
    
    // Update content
    errorContainer.innerHTML = `
        <div class="error-icon"><span class="material-icons">error_outline</span></div>
        <div class="error-content">
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
        <button class="retry-button" onclick="retryConnection()">
            <span class="material-icons">refresh</span> Coba Lagi
        </button>
    `;
    
    // Tampilkan container
    errorContainer.style.display = 'flex';
}

/**
 * Clear connection error messages
 */
function clearConnectionErrors() {
    const errorContainer = document.getElementById('connection-error');
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

/**
 * Retry WebSocket connection
 */
function retryConnection() {
    if (window.wsClient) {
        // Reset connection attempts
        window.wsClient.reconnectAttempts = 0;
        
        // Update UI
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = 'connection-status connecting';
            statusIndicator.title = 'Mencoba terhubung kembali...';
        }
        
        // Show toast
        showToast('Mencoba terhubung kembali...', 'info');
        
        // Try to connect
        window.wsClient.connect();
    }
}

// Expose retry function globally
window.retryConnection = retryConnection;

/**
 * Setup UI components
 */
function setupUIComponents() {
    // Initialize sidebar toggle functionality
    setupSidebar();
    
    // Handle logout functionality
    setupLogout();
}

/**
 * Setup sidebar functionality
 */
function setupSidebar() {
    const sidebarOpenBtn = document.getElementById('sidebar-open');
    const sidebarCloseBtn = document.getElementById('sidebar-close');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    
    // Function to open sidebar on mobile
    const openSidebar = () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.classList.add('sidebar-open');
    };
    
    // Function to close sidebar on mobile
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    };
    
    // Add event listeners for sidebar toggle
    if (sidebarOpenBtn) sidebarOpenBtn.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Close sidebar when clicking on menu items on mobile
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            // On desktop
            closeSidebar();
        }
    });
    
    // Set initial sidebar state based on screen size
    if (window.innerWidth < 768) {
        sidebar.classList.remove('active');
    }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logout-button');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.authManager) {
                // Use auth manager's logout confirmation
                window.authManager.showLogoutConfirmation();
            } else {
                // Fallback to basic modal
                logoutModal.classList.add('active');
            }
        });
    }
    
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.classList.remove('active');
        });
    }
    
    if (confirmLogoutBtn && !window.authManager) {
        confirmLogoutBtn.addEventListener('click', () => {
            handleBasicLogout();
        });
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info, warning)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';
    
    // Add content
    toast.innerHTML = `
        <span class="material-icons toast-icon">${icon}</span>
        <div class="toast-message">${message}</div>
        <button class="toast-close">
            <span class="material-icons">close</span>
        </button>
    `;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Add close button event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
    
    // Auto close after duration
    if (duration) {
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

/**
 * Update connection status indicator
 * @param {boolean} isConnected - Whether WebSocket is connected
 */
function updateConnectionStatus(isConnected) {
    // Add connection status indicator if it doesn't exist
    let statusIndicator = document.getElementById('connection-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'connection-status';
        statusIndicator.className = 'connection-status';
        
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(statusIndicator);
        }
    }
    
    // Update status
    if (isConnected) {
        statusIndicator.className = 'connection-status connected';
        statusIndicator.title = 'Terhubung ke server (real-time)';
    } else {
        statusIndicator.className = 'connection-status disconnected';
        statusIndicator.title = 'Terputus dari server';
    }
}

/**
 * Basic logout handling as fallback
 */
function handleBasicLogout() {
    // Close WebSocket connection if exists
    if (window.wsClient && window.wsClient.ws) {
        window.wsClient.ws.close();
    }
    
    // Clear authentication token
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    
    // Close modal
    const logoutModal = document.getElementById('logout-modal');
    if (logoutModal) {
        logoutModal.classList.remove('active');
    }
    
    // For demo purposes
    alert('Logged out successfully. In a real app, you would be redirected to the login page.');
    
    // Redirect in real app
    // window.location.href = '/Frontend/auth/login/index.html';
}

/**
 * Load default user profile for demo purposes
 */
async function loadDefaultUserProfile() {
    try {
        // For demo purposes, we'll use sample data
        const user = {
            name: 'Staf Dapur',
            role: 'Kitchen Staff',
            avatar: 'assets/img/staff.png'
        };
        
        updateUserProfile(user);
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

/**
 * Update user profile in the UI
 * @param {Object} user - User data
 */
function updateUserProfile(user) {
    // Update user profile in sidebar
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');
    const userAvatarElement = document.querySelector('.user-avatar img');
    
    if (userNameElement) userNameElement.textContent = user.name || 'Staff User';
    if (userRoleElement) userRoleElement.textContent = formatUserRole(user.role) || 'Staff';
    if (userAvatarElement) userAvatarElement.src = user.avatar || 'assets/img/staff.png';
}

/**
 * Format user role in Indonesian
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
function formatUserRole(role) {
    switch (role) {
        case 'chef':
            return 'Chef Dapur';
        case 'head_chef':
            return 'Kepala Chef';
        case 'staff':
            return 'Staff Dapur';
        case 'cleaner':
            return 'Staff Kebersihan';
        default:
            return 'Staff Dapur';
    }
}

/**
 * Update CSS for orders page tables
 */
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Orders page specific styles */
        .orders-container {
            width: 100%;
        }

        .filters-container {
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }

        .search-container {
            position: relative;
            flex: 1;
            min-width: 200px;
        }

        .search-icon {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--gray-dark);
            font-size: 20px;
        }

        .search-input {
            width: 100%;
            padding: 10px 10px 10px 40px;
            border: 1px solid var(--gray-color);
            border-radius: var(--border-radius);
            font-size: 0.9rem;
        }

        .status-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .filter-btn {
            padding: 8px 16px;
            border-radius: var(--border-radius);
            background-color: white;
            border: 1px solid var(--gray-color);
            font-size: 0.9rem;
            color: var(--gray-dark);
            transition: var(--transition);
        }

        .filter-btn:hover {
            background-color: var(--gray-color);
        }

        .filter-btn.active {
            background-color: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }

        .orders-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .order-card {
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            overflow: hidden;
            border-left: 4px solid transparent;
            transition: var(--transition);
        }

        .order-card.status-pending {
            border-left-color: var(--warning-color);
        }

        .order-card.status-in-progress {
            border-left-color: var(--info-color);
        }

        .order-card.status-ready {
            border-left-color: var(--success-color);
        }

        .order-card.status-completed {
            border-left-color: var(--secondary-color);
            opacity: 0.8;
        }

        .order-card.updating {
            opacity: 0.7;
            pointer-events: none;
        }

        .order-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--gray-color);
        }

        .order-info {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .order-id {
            font-weight: 600;
            color: var(--dark-color);
        }

        .order-table {
            font-size: 0.85rem;
            color: var(--gray-dark);
            background-color: var(--gray-color);
            padding: 2px 8px;
            border-radius: 12px;
        }

        .order-status {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: var(--secondary-color);
        }

        .status-text {
            font-size: 0.85rem;
            font-weight: 500;
        }

        .order-card.status-pending .status-indicator {
            background-color: var(--warning-color);
        }

        .order-card.status-in-progress .status-indicator {
            background-color: var(--info-color);
        }

        .order-card.status-ready .status-indicator {
            background-color: var(--success-color);
        }

        .order-body {
            padding: 15px;
        }

        .order-items {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .order-item {
            display: flex;
            flex-direction: column;
        }

        .item-info {
            display: flex;
            gap: 8px;
        }

        .item-quantity {
            font-weight: 600;
            color: var(--primary-color);
        }

        .item-notes {
            font-size: 0.85rem;
            color: var(--gray-dark);
            margin-left: 25px;
            font-style: italic;
        }

        .order-footer {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--gray-color);
        }

        .order-time {
            font-size: 0.85rem;
            color: var(--gray-dark);
        }

        .complete-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.85rem;
        }

        .btn-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
            color: var(--gray-dark);
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(0,0,0,0.1);
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }

        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
            color: var(--danger-color);
        }

        .error-icon {
            font-size: 40px;
            margin-bottom: 15px;
        }

        .retry-btn {
            margin-top: 15px;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
            color: var(--gray-dark);
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 15px;
            color: var(--gray-color);
        }

        .empty-subtitle {
            font-size: 0.9rem;
            color: var(--secondary-color);
            margin-top: 5px;
        }

        /* Tables page specific styles */
        .tables-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }

        .table-card {
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            overflow: hidden;
            border-left: 4px solid transparent;
            transition: var(--transition);
        }

        .table-card.status-available {
            border-left-color: var(--success-color);
        }

        .table-card.status-occupied {
            border-left-color: var(--info-color);
        }

        .table-card.status-reserved {
            border-left-color: var(--warning-color);
        }

        .table-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--gray-color);
        }

        .table-info {
            display: flex;
            flex-direction: column;
        }

        .table-number {
            font-weight: 600;
            color: var(--dark-color);
        }

        .table-capacity {
            font-size: 0.85rem;
            color: var(--gray-dark);
        }

        .table-status {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .status-icon {
            font-size: 24px;
            margin-bottom: 4px;
        }

        .table-card.status-available .status-icon {
            color: var(--success-color);
        }

        .table-card.status-occupied .status-icon {
            color: var(--info-color);
        }

        .table-card.status-reserved .status-icon {
            color: var(--warning-color);
        }

        .table-body {
            padding: 15px;
        }

        .table-order-info, .table-reservation-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .order-detail, .reservation-detail {
            display: flex;
            flex-direction: column;
        }

        .detail-label {
            font-size: 0.8rem;
            color: var(--gray-dark);
        }

        .detail-value {
            font-weight: 500;
        }

        .table-footer {
            padding: 15px;
            display: flex;
            justify-content: flex-end;
            border-top: 1px solid var(--gray-color);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Responsive fixes */
        @media (max-width: 768px) {
            .orders-grid, .tables-grid {
                grid-template-columns: 1fr;
            }

            .filters-container {
                flex-direction: column;
                gap: 10px;
            }

            .search-container {
                width: 100%;
            }

            .status-filters {
                width: 100%;
                justify-content: space-between;
            }

            .filter-btn {
                flex: 1;
                text-align: center;
                padding: 8px 10px;
                font-size: 0.8rem;
            }
        }
    `;
    document.head.appendChild(style);
});

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Add closing animation class
    modal.classList.add('modal-closing');
    
    // Remove active class after a short delay
    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('modal-closing');
    }, 300);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Show the modal
    modal.classList.add('active');
}

function setupLogoutModal() {
    const logoutBtn = document.getElementById('logout-button');
    const cancelLogoutBtn = document.getElementById('cancel-logout');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const closeModalBtn = document.getElementById('close-logout-modal');
    const modal = document.getElementById('logout-modal');
    
    if (!logoutBtn || !cancelLogoutBtn || !confirmLogoutBtn || !modal) {
        console.error('Logout modal elements not found');
        return;
    }
    
    // Open logout modal when logout button is clicked
    logoutBtn.addEventListener('click', () => {
        openModal('logout-modal');
    });
    
    // Close modal when cancel button is clicked
    cancelLogoutBtn.addEventListener('click', () => {
        closeModal('logout-modal');
    });
    
    // Close modal when X button is clicked
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            closeModal('logout-modal');
        });
    }
    
    // Handle logout when confirm button is clicked
    confirmLogoutBtn.addEventListener('click', async () => {
        // Show loading state
        confirmLogoutBtn.innerHTML = `
            <span class="spinner"></span>
            <span>Logging out...</span>
        `;
        confirmLogoutBtn.disabled = true;
        
        try {
            // Simulate API call for logout
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clear token from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Show success message
            showToast('Successfully logged out', 'success');
            
            // Redirect to login page after slight delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
            
        } catch (error) {
            console.error('Logout failed:', error);
            showToast('Failed to logout. Please try again.', 'error');
            
            // Reset button state
            confirmLogoutBtn.innerHTML = 'Logout';
            confirmLogoutBtn.disabled = false;
            
            // Close the modal
            closeModal('logout-modal');
        }
    });
}

// Make showToast function globally available
window.showToast = function(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Set icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';
    
    // Add content
    toast.innerHTML = `
        <span class="material-icons toast-icon">${icon}</span>
        <div class="toast-message">${message}</div>
        <button class="toast-close">
            <span class="material-icons">close</span>
        </button>
    `;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Add close button event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
    
    // Auto close after duration
    if (duration) {
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}; 