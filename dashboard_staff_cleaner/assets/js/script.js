document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const menuToggle = document.getElementById('menuToggle');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    
    // State Management
    let currentPage = 'dashboard';
    let currentView = 'grid';

    // Toggle Menu Function
    function toggleMenu() {
        const menuIcon = menuToggle.querySelector('i');
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        
        // Toggle icon between bars and times
        if (sidebar.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
        } else {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars');
        }
    }

    // Menu Event Listeners
    menuToggle.addEventListener('click', toggleMenu);
    closeMenu.addEventListener('click', toggleMenu);
    sidebarOverlay.addEventListener('click', toggleMenu);

    // Update HTML for menu toggle button
    document.querySelector('.mobile-menu-toggle').innerHTML = '<i class="fas fa-bars"></i>';

    // Navigation System
    async function loadContent(page) {
        try {
            const response = await fetch(`views/${page}.html`);
            if (!response.ok) throw new Error('Page not found');
            
            const content = await response.text();
            mainContent.innerHTML = content;
            currentPage = page;
            
            // Initialize page-specific features
            switch(page) {
                case 'dashboard':
                    initializeDashboard();
                    break;
                case 'tables':
                    initializeTableView();
                    break;
                case 'completed':
                    initializeCompletedOrders();
                    break;
            }

            // Close mobile menu after navigation
            if (window.innerWidth <= 1024) {
                toggleMenu();
            }

        } catch (error) {
            console.error('Error loading content:', error);
            mainContent.innerHTML = '<div class="error-message">Error loading content</div>';
        }
    }

    // Initialize Dashboard Features
    function initializeDashboard() {
        // Initialize Action Buttons
        const actionButtons = document.querySelectorAll('.action-buttons button');
        actionButtons.forEach(button => {
            button.addEventListener('click', handleOrderAction);
        });

        // Add hover effects to stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.addEventListener('mousemove', handleCardTilt);
            card.addEventListener('mouseleave', resetCardTilt);
        });
    }

    // 3D Card Tilt Effect
    function handleCardTilt(e) {
        const card = e.currentTarget;
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        const rotateX = (mouseY / centerY) * -10;
        const rotateY = (mouseX / centerX) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    }

    function resetCardTilt(e) {
        const card = e.currentTarget;
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    }

    // Handle Order Actions
    function handleOrderAction(e) {
        const button = e.currentTarget;
        const row = button.closest('tr');
        const statusBadge = row.querySelector('.status-badge');
        const paymentBadge = row.querySelector('.payment-badge');

        if (button.classList.contains('btn-mark-paid')) {
            paymentBadge.className = 'payment-badge success';
            paymentBadge.textContent = 'Paid';
            button.disabled = true;
            row.querySelector('.btn-serve').disabled = false;
        } else if (button.classList.contains('btn-serve')) {
            statusBadge.className = 'status-badge ready';
            statusBadge.textContent = 'Served';
            button.disabled = true;
            row.querySelector('.btn-close').disabled = false;
        } else if (button.classList.contains('btn-close')) {
            row.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                row.remove();
                checkEmptyTable();
            }, 500);
        }
    }

    // Initialize Table View
    function initializeTableView() {
        const viewToggle = document.querySelectorAll('.view-toggle button');
        const tableCards = document.querySelectorAll('.table-card');
        
        // View Toggle
        viewToggle.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                toggleTableView(view);
            });
        });

        // Table Card Actions
        tableCards.forEach(card => {
            card.addEventListener('click', () => {
                if (!card.classList.contains('modal-open')) {
                    showTableDetails(card);
                }
            });
        });
    }

    // Table View Toggle
    function toggleTableView(view) {
        const tablesContainer = document.querySelector('.tables-grid');
        currentView = view;
        tablesContainer.className = `tables-${view}`;
        
        document.querySelectorAll('.view-toggle button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
    }

    // Navigation Event Listeners
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            
            // Update active state
            document.querySelectorAll('.sidebar-menu li').forEach(li => {
                li.classList.remove('active');
            });
            link.parentElement.classList.add('active');
            
            loadContent(page);
        });
    });

    // Initialize first load
    loadContent('dashboard');
}); 


function initializeCompletedOrders() {
    const ordersComplete = document.querySelectorAll('.orders-complete-content');
    ordersComplete.forEach(order => {
        order.addEventListener('click', () => {
            console.log('Order clicked');
        });
    });
}