document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard admin page loaded');
    
    // Konsol log untuk debugging
    console.log('API Base URL:', window.API_BASE_URL);
    console.log('WS Base URL:', window.WS_BASE_URL);
    
    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found, redirecting to login page');
        window.location.href = '/Frontend/auth/login/index.html';
        return;
    }
    
    console.log('Token found:', token ? 'Yes' : 'No');
    console.log('User role:', localStorage.getItem('user_role'));
    
    try {
        // Verify token is valid by making a request to the profile endpoint
        const profileResponse = await fetch(`${window.API_BASE_URL}/admin/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Profile API response status:', profileResponse.status);
        
        if (!profileResponse.ok) {
            console.error('Invalid or expired token, redirecting to login page');
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            window.location.href = '/Frontend/auth/login/index.html';
            return;
        }
        
        const profileData = await profileResponse.json();
        console.log('Profile data:', profileData);
        
        // Verifikasi sukses, inisialisasi koneksi WebSocket
        initWebSocket();
        
        // Testing dashboard API connection
        testDashboardAPI();
    } catch (error) {
        console.error('Error verifying token:', error);
    }

    // Elements
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarToggles = document.querySelectorAll('#sidebar-toggle');
    let overlay;

    // Create overlay element
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            toggleSidebar(false);
        });
    }

    // Initialize overlay
    createOverlay();

    // Toggle sidebar function
    function toggleSidebar(show = null) {
        if (show === null) {
            sidebar.classList.toggle('collapsed');
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed', !show);
            sidebar.classList.toggle('active', show);
        }
        
        if (window.innerWidth <= 768) {
            overlay.classList.toggle('show', !sidebar.classList.contains('collapsed'));
        }
    }

    // Add click handlers to sidebar toggles
    sidebarToggles.forEach(toggle => {
        toggle.addEventListener('click', () => toggleSidebar());
    });

    // Handle sidebar menu items
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            menuItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // On mobile, collapse sidebar after clicking
            if (window.innerWidth <= 768) {
                toggleSidebar(false);
            }

            const page = item.dataset.page;
            if (page && window.router) {
                window.router.navigateTo(page);
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            if (!sidebar.classList.contains('collapsed')) {
                overlay.classList.add('show');
            }
        } else {
            overlay.classList.remove('show');
        }
    });

    // Tunggu sebentar untuk memberi waktu semua modul halaman terdaftar ke router
    console.log('Waiting for modules to register with router...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Initialize router after everything else is set up
    console.log('Initializing router');
    if (window.router) {
        window.router.initialize();
    } else {
        console.error('Router is not available');
    }
    
    // Force first load of orders page after 2 seconds to ensure all components are loaded
    setTimeout(() => {
        console.log('Force loading orders page');
        if (window.router) {
            window.router.navigateTo('orders');
        }
    }, 2000);
});

// Fungsi untuk test dashboard API
async function testDashboardAPI() {
    try {
        const token = localStorage.getItem('token');
        console.log('Testing dashboard API...');
        
        const response = await fetch(`${window.API_BASE_URL}/admin/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Dashboard API response status:', response.status);
        
        if (response.ok) {
            // Ambil raw response text untuk debugging
            const responseText = await response.text();
            console.log('Raw API response text:', responseText);
            
            try {
                // Parse JSON response
                const result = JSON.parse(responseText);
                console.log('Parsed dashboard API data:', result);
                
                // Analisis struktur respons
                console.log('Response structure:');
                console.log('- Has status field:', result.status !== undefined);
                console.log('- Has message field:', result.message !== undefined);
                console.log('- Has data field:', result.data !== undefined);
                
                if (result.data) {
                    console.log('Data field keys:', Object.keys(result.data));
                    
                    // Verifikasi data yang dibutuhkan
                    const nestedData = result.data;
                    
                    if (nestedData.table_stats) {
                        console.log('Found table_stats:', nestedData.table_stats);
                    } else {
                        console.warn('Missing table_stats in response');
                    }
                    
                    if (nestedData.order_stats) {
                        console.log('Found order_stats:', nestedData.order_stats);
                    } else {
                        console.warn('Missing order_stats in response');
                    }
                    
                    if (nestedData.payment_stats) {
                        console.log('Found payment_stats:', nestedData.payment_stats);
                    } else {
                        console.warn('Missing payment_stats in response');
                    }
                }
                
                // Mengirim event dengan data
                if (result.status === true && result.data) {
                    // Format standar: { status: true, message: "...", data: {...} }
                    console.log('Dispatching standard format data');
                    window.dispatchEvent(new CustomEvent('dashboard_update', { 
                        detail: result.data 
                    }));
                } else if (result.data) {
                    // Format alternatif: { data: {...} }
                    console.log('Dispatching data field');
                    window.dispatchEvent(new CustomEvent('dashboard_update', { 
                        detail: result.data 
                    }));
                } else {
                    // Fallback: gunakan seluruh respons
                    console.log('Dispatching entire result as fallback');
                    window.dispatchEvent(new CustomEvent('dashboard_update', { 
                        detail: result 
                    }));
                }
                
                console.log('Dashboard event dispatched');
            } catch (parseError) {
                console.error('Error parsing dashboard API response:', parseError);
            }
        } else {
            console.error('Dashboard API error:', await response.text());
        }
    } catch (error) {
        console.error('Error testing dashboard API:', error);
    }
}

// Fungsi untuk inisialisasi dan memantau koneksi WebSocket
function initWebSocket() {
    if (!window.wsClient) {
        console.error('WebSocket client is not available');
        return;
    }
    
    console.log('Initializing WebSocket connection');
    
    // Tambahkan listener status koneksi
    window.wsClient.addEventListener('connection_change', (status) => {
        console.log('WebSocket connection status changed:', status);
        
        // Update UI untuk menampilkan status koneksi
        updateConnectionStatus(status);
    });
    
    // Coba buat koneksi
    window.wsClient.connect();
    
    // Tambahkan event listener untuk window focus/blur
    window.addEventListener('focus', () => {
        console.log('Window focused, checking WebSocket connection');
        if (!window.wsClient.isConnected()) {
            console.log('Reconnecting WebSocket due to window focus');
            window.wsClient.connect();
        }
    });
    
    // Cek koneksi secara periodik
    setInterval(() => {
        if (!window.wsClient.isConnected()) {
            console.log('Periodic connection check: WebSocket disconnected, attempting to reconnect');
            window.wsClient.connect();
        }
    }, 60000); // Cek setiap 60 detik

    // Perbaikan WebSocket untuk dashboard_update
    window.wsClient.addEventListener('dashboard_update', function(event) {
        const data = JSON.parse(event.data);
        console.log('Dashboard update received:', data);
        
        // Dispatch window event untuk dashboard
        window.dispatchEvent(new CustomEvent('dashboard_update', { detail: data }));
    });
}

// Fungsi untuk memperbarui UI status koneksi
function updateConnectionStatus(status) {
    // Cek apakah elemen status koneksi sudah ada
    let statusElem = document.getElementById('connection-status');
    
    // Jika belum ada, buat elemen baru
    if (!statusElem) {
        statusElem = document.createElement('div');
        statusElem.id = 'connection-status';
        statusElem.className = 'connection-status';
        
        // Tambahkan ke header
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(statusElem);
        }
    }
    
    // Update tampilan berdasarkan status
    if (status.status === 'connected') {
        statusElem.className = 'connection-status connected';
        statusElem.title = 'Terhubung ke server';
        
        // Hapus pesan error jika ada
        const errorMsg = document.getElementById('connection-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    } else if (status.status === 'connecting') {
        statusElem.className = 'connection-status connecting';
        statusElem.title = 'Menghubungkan ke server...';
    } else if (status.status === 'disconnected' || status.status === 'error') {
        statusElem.className = 'connection-status disconnected';
        statusElem.title = 'Koneksi terputus';
        
        // Tambahkan pesan error jika belum ada
        if (!document.getElementById('connection-error-message')) {
            const errorMsg = document.createElement('div');
            errorMsg.id = 'connection-error-message';
            errorMsg.className = 'connection-error-message';
            errorMsg.innerHTML = `
                <div class="connection-error">
                    <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="error-content">
                        <h3>Koneksi Terputus</h3>
                        <p>Koneksi ke server terputus. Beberapa fitur mungkin tidak berfungsi.</p>
                    </div>
                    <button id="retry-connection" class="retry-button">
                        <i class="fas fa-sync-alt"></i> Coba Lagi
                    </button>
                </div>
            `;
            
            // Tambahkan ke main-content
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertBefore(errorMsg, mainContent.firstChild);
                
                // Tambahkan event listener ke tombol retry
                const retryBtn = document.getElementById('retry-connection');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        window.wsClient.connect();
                    });
                }
            }
        }
    } else if (status.status === 'failed') {
        statusElem.className = 'connection-status disconnected';
        statusElem.title = 'Koneksi gagal';
        
        // Tampilkan pesan error yang lebih serius
        if (!document.getElementById('connection-failed-message')) {
            const errorMsg = document.createElement('div');
            errorMsg.id = 'connection-failed-message';
            errorMsg.className = 'connection-error-message';
            errorMsg.innerHTML = `
                <div class="connection-error serious">
                    <div class="error-icon"><i class="fas fa-times-circle"></i></div>
                    <div class="error-content">
                        <h3>Koneksi Gagal</h3>
                        <p>${status.message || 'Gagal menghubungkan ke server. Silakan refresh halaman.'}</p>
                    </div>
                    <button id="refresh-page" class="refresh-button">
                        <i class="fas fa-redo-alt"></i> Refresh Halaman
                    </button>
                </div>
            `;
            
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertBefore(errorMsg, mainContent.firstChild);
                
                const refreshBtn = document.getElementById('refresh-page');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => {
                        window.location.reload();
                    });
                }
            }
        }
    }
}