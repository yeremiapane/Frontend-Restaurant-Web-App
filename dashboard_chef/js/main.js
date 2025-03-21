document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/Frontend/auth/login/index.html';
        return;
    }

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
    document.getElementById('logout-button')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/Frontend/auth/login/index.html';
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