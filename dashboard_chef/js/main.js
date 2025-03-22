document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/Frontend/auth/login/index.html';
        return;
    }

    // Load user profile
    loadUserProfile();

    // Get elements
    const sidebar = document.querySelector('.sidebar');
    const toggleButtons = document.querySelectorAll('.sidebar-toggle-btn');
    const overlay = document.querySelector('.sidebar-overlay');
    const menuItems = document.querySelectorAll('.menu-item');

    console.log('Sidebar:', sidebar);
    console.log('Toggle buttons:', toggleButtons);
    console.log('Overlay:', overlay);

    // Create overlay if it doesn't exist
    if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.className = 'sidebar-overlay';
        document.body.appendChild(newOverlay);
    }

    // Toggle sidebar function
    function toggleSidebar() {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
            document.querySelector('.sidebar-overlay').classList.toggle('active');
            document.body.classList.toggle('sidebar-open');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    // Handle window resize
    function handleResize() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            document.querySelector('.sidebar-overlay').classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    }

    // Setup toggle buttons
    toggleButtons.forEach(button => {
        console.log('Setting up toggle button:', button);
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    });

    // Close sidebar when clicking overlay
    document.querySelector('.sidebar-overlay').addEventListener('click', () => {
        sidebar.classList.remove('active');
        document.querySelector('.sidebar-overlay').classList.remove('active');
        document.body.classList.remove('sidebar-open');
    });

    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            // Update active state
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Close sidebar on mobile after clicking menu item
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                document.querySelector('.sidebar-overlay').classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }

            // Navigate to page
            window.router.navigateTo(page);
        });
    });

    // Handle logout
    document.getElementById('logout-button')?.addEventListener('click', (e) => {
        e.preventDefault();
        // Tampilkan modal konfirmasi logout
        const logoutModal = document.getElementById('logout-modal');
        logoutModal.classList.add('active');
    });

    // Handle konfirmasi logout
    document.getElementById('confirm-logout')?.addEventListener('click', () => {
        // Tambahkan efek animasi sebelum logout
        const modalContainer = document.querySelector('#logout-modal .modal-container');
        
        // Animasi menghilang
        modalContainer.style.transform = 'scale(0.8)';
        modalContainer.style.opacity = '0';
        
        // Tunggu sebentar untuk animasi
        setTimeout(() => {
            document.getElementById('logout-modal').classList.remove('active');
            // Hapus token dan redirect ke halaman login
            localStorage.removeItem('token');
            window.location.href = '/Frontend/auth/login/index.html';
        }, 300);
    });

    // Handle pembatalan logout
    document.getElementById('cancel-logout')?.addEventListener('click', () => {
        // Animasi menutup modal
        const modalContainer = document.querySelector('#logout-modal .modal-container');
        modalContainer.style.transform = 'scale(0.8)';
        modalContainer.style.opacity = '0';
        
        // Tunggu sebentar untuk animasi
        setTimeout(() => {
            document.getElementById('logout-modal').classList.remove('active');
            // Reset style setelah modal tertutup
            setTimeout(() => {
                modalContainer.removeAttribute('style');
            }, 300);
        }, 300);
    });

    // Add resize event listener
    window.addEventListener('resize', handleResize);

    // Initialize WebSocket if available
    if (window.wsClient) {
        window.wsClient.connect();
    }

    // Initialize router
    if (window.router) {
        window.router.initialize();
    } else {
        console.error('Router not found');
    }

    // Set initial sidebar state based on screen size
    handleResize();
});

// Function to load user profile from server
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        
        // Fetch profile data from server
        const response = await fetch('http://localhost:8080/admin/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch profile data');
        }
        
        const data = await response.json();
        
        if (data.status && data.data) {
            const user = data.data;
            
            // Update profile information in header
            const userProfileDiv = document.querySelector('.user-profile');
            if (userProfileDiv) {
                userProfileDiv.innerHTML = `
                    <div class="user-avatar">
                        <img src="assets/img/chef.png" alt="Chef Profile">
                    </div>
                    <div class="user-info">
                        <span class="user-name">${user.name || 'Chef'}</span>
                        <span class="user-role">${getUserRole(user.role)}</span>
                    </div>
                `;
            }
            
            // Also update sidebar header if exists
            const sidebarHeader = document.querySelector('.sidebar-header h2');
            if (sidebarHeader) {
                sidebarHeader.textContent = `Dapur ${user.name || 'Chef'}`;
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Helper function to format role name
function getUserRole(role) {
    switch (role) {
        case 'chef':
            return 'Chef Dapur';
        case 'head_chef':
            return 'Kepala Chef';
        case 'staff':
            return 'Staff Dapur';
        default:
            return 'Kitchen Staff';
    }
} 