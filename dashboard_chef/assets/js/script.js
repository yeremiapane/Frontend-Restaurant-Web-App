document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const menuToggle = document.getElementById('menuToggle');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');

    // Debug untuk memastikan elemen ditemukan
    console.log('menuToggle:', menuToggle);
    console.log('sidebar:', sidebar);

    // Toggle Menu Function
    function toggleMenu() {
        if (!sidebar.classList.contains('active')) {
            // Opening menu
            sidebar.style.transform = 'translateX(0)';
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            document.body.classList.add('menu-open');
        } else {
            // Closing menu
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    }

    // Event Listeners for Menu
    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    closeMenu.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    sidebarOverlay.addEventListener('click', function(e) {
        e.preventDefault();
        if (sidebar.classList.contains('active')) {
            toggleMenu();
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            toggleMenu();
        }
    });

    // Load Content Function
    function loadContent(page) {
        fetch(`views/${page}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(content => {
                mainContent.innerHTML = content;
                initializeButtons();
            })
            .catch(error => {
                console.error('Error loading content:', error);
                mainContent.innerHTML = '<div class="error-message">Error loading content</div>';
            });
    }

    // Handle Action Buttons
    function initializeButtons() {
        const actionButtons = document.querySelectorAll('.action-buttons button');
        actionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const row = this.closest('tr');
                const statusBadge = row.querySelector('.status-badge');
                const buttons = row.querySelectorAll('.action-buttons button');

                if (this.classList.contains('btn-start')) {
                    statusBadge.className = 'status-badge cooking';
                    statusBadge.textContent = 'Cooking';
                    buttons[0].disabled = true;
                    buttons[1].disabled = false;
                    buttons[2].disabled = false;
                } 
                else if (this.classList.contains('btn-finish')) {
                    statusBadge.className = 'status-badge completed';
                    statusBadge.textContent = 'Completed';
                    buttons.forEach(btn => btn.disabled = true);
                    
                    // Add fade out animation
                    row.style.animation = 'fadeOut 0.5s ease forwards';
                    
                    // Remove row after animation
                    setTimeout(() => {
                        row.remove();
                        
                        // Check if table is empty
                        const tbody = document.querySelector('.orders-table tbody');
                        if (tbody && tbody.children.length === 0) {
                            tbody.innerHTML = `
                                <tr class="empty-state">
                                    <td colspan="7" style="text-align: center; padding: 2rem;">
                                        <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success-color); margin-bottom: 1rem;"></i>
                                        <p>All orders completed!</p>
                                    </td>
                                </tr>
                            `;
                        }
                    }, 500);
                } 
                else if (this.classList.contains('btn-pending')) {
                    statusBadge.className = 'status-badge pending';
                    statusBadge.textContent = 'Pending';
                    buttons[0].disabled = false;
                    buttons[1].disabled = true;
                    buttons[2].disabled = true;
                }
            });
        });
    }

    // Navigation Links
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            
            // Update active state
            document.querySelectorAll('.sidebar-menu li').forEach(li => {
                li.classList.remove('active');
            });
            this.parentElement.classList.add('active');
            
            // Load content
            loadContent(page);
            
            // Close menu on mobile
            if (window.innerWidth <= 1024) {
                toggleMenu();
            }
        });
    });

    // Window Resize Handler
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024 && sidebar.classList.contains('active')) {
            toggleMenu();
        }
    });

    // Load initial content
    loadContent('dashboard');
});
