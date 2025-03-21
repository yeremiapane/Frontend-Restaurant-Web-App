document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    if (!window.authManager.isAuthenticated()) {
        window.location.href = '/Frontend/auth/login/index.html';
        return;
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

    // Initialize WebSocket connection
    if (window.wsClient) {
        window.wsClient.connect();
    }

    // Initialize router after everything else is set up
    if (window.router) {
        window.router.initialize();
    }
});

// Initialize router
const router = new Router();

// Check authentication before initializing
if (!window.authManager.isAuthenticated()) {
    window.location.href = '/Frontend/auth/login/index.html';
} else {
    // Initialize WebSocket connection
    window.wsClient.connect();

    // Initialize router
    router.init();
}