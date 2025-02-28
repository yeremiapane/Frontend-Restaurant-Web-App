import { api } from './utils/api.js';
import { MenuGallery } from './components/menuGallery.js';
import { ReportCharts } from './components/reportCharts.js';
import { ProfileManager } from './components/profile.js';
import { OrderSearch } from './components/orderSearch.js';

// Definisikan Dashboard class sebelum Navigation
class Dashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.initializeWebSocket();
    }

    async loadDashboardContent() {
        try {
            const [dashboardStats, orderFlow, analytics] = await Promise.all([
                api.getDashboardStats(),
                api.getOrderFlow(),
                api.getOrderAnalytics()
            ]);
            
            this.renderDashboard(dashboardStats.data);
            this.updateOrderFlow(orderFlow.data);
            this.updateAnalytics(analytics.data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardTables(data) {
        console.log('Updating dashboard tables:', data);
        const tablesContainer = document.querySelector('.table-status-cards');
        if (!tablesContainer) return;

        switch (data.event) {
            case 'table_create':
                this.addTableToDisplay(data.data, tablesContainer);
                break;
            case 'table_update':
                this.updateTableDisplay(data.data, tablesContainer);
                break;
            case 'table_delete':
                this.removeTableFromDisplay(data.data.id, tablesContainer);
                break;
        }

        // Update statistik
        if (data.stats) {
            this.updateTableStats(data.stats);
        }
    }

    addTableToDisplay(tableData, container) {
        console.log('Adding table:', tableData);
        const tableCard = this.createTableCard(tableData);
        container.appendChild(tableCard);
    }

    updateTableDisplay(tableData, container) {
        console.log('Updating table:', tableData);
        const existingCard = container.querySelector(`[data-table-id="${tableData.id}"]`);
        if (existingCard) {
            const newCard = this.createTableCard(tableData);
            existingCard.replaceWith(newCard);
        }
    }

    removeTableFromDisplay(tableId, container) {
        console.log('Removing table:', tableId);
        const card = container.querySelector(`[data-table-id="${tableId}"]`);
        if (card) {
            card.remove();
        }
    }

    createTableCard(table) {
        const card = document.createElement('div');
        card.className = 'table-card';
        card.setAttribute('data-table-id', table.id);
        
        card.innerHTML = `
            <div class="card-header">
                <h4>Table ${table.table_number}</h4>
                <span class="status-badge ${table.status.toLowerCase()}">${table.status}</span>
            </div>
            <div class="card-body">
                <div class="table-info">
                    <p>Status: ${table.status}</p>
                    <p>Last Updated: ${new Date(table.updated_at).toLocaleString()}</p>
                </div>
            </div>
        `;
        
        return card;
    }

    updateTableStats(stats) {
        const availableCount = document.getElementById('available-count');
        const occupiedCount = document.getElementById('occupied-count');
        const dirtyCount = document.getElementById('dirty-count');
        
        if (availableCount) availableCount.textContent = stats.available || 0;
        if (occupiedCount) occupiedCount.textContent = stats.occupied || 0;
        if (dirtyCount) dirtyCount.textContent = stats.dirty || 0;
    }

    initializeWebSocket() {
        this.ws = api.connectToKDS('admin');
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received in Dashboard:', data);
                
                if (data.event.startsWith('table_')) {
                    this.updateDashboardTables(data);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
    }
}

// Navigation Handler
class Navigation {
    constructor() {
        // Cek autentikasi terlebih dahulu
        const token = localStorage.getItem('auth_token');
        const userRole = localStorage.getItem('user_role');

        console.log('Checking auth:', { token, userRole });

        if (!token || !userRole) {
            console.log('No credentials found, redirecting to login...');
            window.location.href = '/Frontend/auth/login/index.html';
            return;
        }

        if (userRole.toLowerCase() !== 'admin') {
            console.log('User is not admin, redirecting to login...');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_role');
            window.location.href = '/Frontend/auth/login/index.html';
            return;
        }

        console.log('Auth check passed, initializing dashboard...');
        this.ws = null;
        this.currentPage = null;
        this.tableUpdateQueue = new Set(); // Untuk mencegah multiple updates
        this.updateDebounceTimeout = null;
        this.init();

        // Initialize Dashboard instance
        window.dashboardInstance = new Dashboard();
    }

    async init() {
        try {
            // Test autentikasi dengan request sederhana
            console.log('Testing authentication...');
            await api.get('/admin/dashboard/stats');
            console.log('Authentication test passed');
            
            this.setupEventListeners();
            this.initializeWebSocket();
            await this.handleInitialLoad();
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            if (error.message.includes('401')) {
                console.log('Authentication failed, redirecting to login...');
                window.location.href = '/Frontend/auth/login/index.html';
            }
        }
    }

    setupEventListeners() {
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Logout handlers
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout);
        document.getElementById('logoutBtnMobile').addEventListener('click', this.handleLogout);

        // Handle back/forward browser buttons
        window.addEventListener('popstate', (e) => {
            if (e.state?.page) {
                this.navigateToPage(e.state.page, false);
            }
        });

        // Tambahkan event listener untuk overlay
        const sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);

        // Toggle sidebar
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('active');
            sidebarOverlay.classList.add('active');
        });

        // Close sidebar when clicking overlay
        sidebarOverlay.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });

        // Close sidebar button
        document.querySelector('.close-sidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.top-bar');
            if (window.scrollY > 10) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });

        // Search toggle for mobile
        const searchToggle = document.querySelector('.search-toggle');
        const searchBar = document.querySelector('.search-bar');
        
        if (searchToggle) {
            searchToggle.addEventListener('click', () => {
                searchBar.classList.toggle('active');
            });
        }

        // Close search bar when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar') && !e.target.closest('.search-toggle')) {
                searchBar.classList.remove('active');
            }
        });
    }

    async navigateToPage(page, addToHistory = true) {
        try {
            this.showLoading();
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-page="${page}"]`).classList.add('active');

            // Load page content
            const content = await this.loadPageContent(page);
            document.getElementById('pageContent').innerHTML = content;

            // Update URL and history
            if (addToHistory) {
                history.pushState({ page }, '', `#${page}`);
            }

            this.currentPage = page;
            
            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 1024) {
                document.getElementById('sidebar').classList.remove('active');
            }

            // Dalam method loadPageContent, tambahkan event listeners setelah konten dimuat
            if (page === 'orders') {
                setTimeout(() => {
                    // View Order
                    document.querySelectorAll('[data-action="view"]').forEach(btn => {
                        btn.addEventListener('click', () => this.openModal('viewOrderModal'));
                    });

                    // New Order
                    document.querySelector('.btn-primary').addEventListener('click', () => {
                        this.openModal('newOrderModal');
                    });

                    // Edit Order
                    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
                        btn.addEventListener('click', () => this.openModal('editOrderModal'));
                    });

                    // Accept Payment
                    document.querySelectorAll('[data-action="payment"]').forEach(btn => {
                        btn.addEventListener('click', () => this.openModal('paymentModal'));
                    });

                    // Print Order
                    document.querySelectorAll('[data-action="print"]').forEach(btn => {
                        btn.addEventListener('click', () => this.openModal('printOrderModal'));
                    });
                }, 0);
            }

            if (page === 'reports') {
                setTimeout(() => {
                    new ReportCharts();
                }, 0);
            }

            if (page === 'profile') {
                setTimeout(() => {
                    new ProfileManager();
                }, 0);
            }
        } catch (error) {
            console.error('Navigation error:', error);
            // Show error message to user
        } finally {
            this.hideLoading();
        }
    }

    async handleInitialLoad() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        console.log('Loading initial page:', hash);
        await this.navigateToPage(hash);
        this.initializeCharts();
    }

    async loadPageContent(page) {
        try {
            this.showLoading();
            
            const content = await this.pages[page]();
            const pageContent = document.getElementById('pageContent');
            pageContent.innerHTML = content;

            // Initialize charts setelah konten dimuat
            if (page === 'dashboard') {
                setTimeout(() => {
                    this.initializeCharts();
                }, 0);
            }

            this.hideLoading();
            return content;
        } catch (error) {
            console.error(`Error loading ${page}:`, error);
            this.hideLoading();
            return `<div class="error-message">Failed to load ${page}</div>`;
        }
    }

    pages = {
        dashboard: async () => {
            try {
                // Tampilkan loading state
                const loadingHtml = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading dashboard data...
                    </div>
                `;
                document.getElementById('pageContent').innerHTML = loadingHtml;

                // Fetch data dengan error handling
                const [dashboardStats, orderFlow, orderAnalytics] = await Promise.all([
                    api.get('/admin/dashboard/stats'),
                    api.get('/admin/orders/getflow'),
                    api.get('/admin/orders/analytics')
                ]);

                // Debug log
                console.log('Dashboard Stats:', dashboardStats);
                console.log('Order Flow:', orderFlow);

                // Pastikan data ada
                if (!dashboardStats?.data || !orderFlow?.data) {
                    throw new Error('Invalid data structure');
                }

                const stats = dashboardStats.data;
                const recentOrders = orderFlow.data.recent_orders || [];

                return `
                    <div class="dashboard-content animate__animated animate__fadeIn">
                        <div class="dashboard-header">
                            <div class="header-left">
                                <h1><i class="fas fa-chart-line"></i> Dashboard Overview</h1>
                                <p class="header-subtitle">Welcome back, Admin!</p>
                            </div>
                            <div class="header-right">
                                <div class="date-filter">
                                    <button class="btn btn-outline active">Today</button>
                                    <button class="btn btn-outline">Week</button>
                                    <button class="btn btn-outline">Month</button>
                                    <button class="btn btn-outline">
                                        <i class="fas fa-calendar"></i>
                                        Custom
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Quick Stats -->
                        <div class="stats-container">
                            <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.1s">
                                <div class="stat-header">
                                    <div class="icon revenue">
                                        <i class="fas fa-dollar-sign"></i>
                                    </div>
                                    <div class="stat-menu">
                                        <button class="btn btn-icon">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="stat-info">
                                    <p>Total Revenue</p>
                                    <h3>Rp ${(stats.total_revenue || 0).toLocaleString()}</h3>
                                    <div class="stat-footer">
                                        <span class="trend positive">
                                            <i class="fas fa-arrow-up"></i>
                                            ${stats.today_revenue ? ((stats.today_revenue / stats.total_revenue) * 100).toFixed(1) : 0}%
                                        </span>
                                        <span class="period">vs. yesterday</span>
                                    </div>
                                </div>
                            </div>

                            <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.2s">
                                <div class="stat-header">
                                    <div class="icon orders">
                                        <i class="fas fa-shopping-bag"></i>
                                    </div>
                                    <div class="stat-menu">
                                        <button class="btn btn-icon">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="stat-info">
                                    <p>Total Orders</p>
                                    <h3>${stats.total_orders || '0'}</h3>
                                    <div class="stat-footer">
                                        <span class="trend positive">
                                            <i class="fas fa-arrow-up"></i>
                                            ${stats.today_orders ? ((stats.today_orders / stats.total_orders) * 100).toFixed(1) : 0}%
                                        </span>
                                        <span class="period">vs. yesterday</span>
                                    </div>
                                </div>
                            </div>

                            <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.3s">
                                <div class="stat-header">
                                    <div class="icon tables">
                                        <i class="fas fa-chair"></i>
                                    </div>
                                    <div class="stat-menu">
                                        <button class="btn btn-icon">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="stat-info">
                                    <p>Table Status</p>
                                    <h3>${stats.table_stats.available} Available</h3>
                                    <div class="stat-footer">
                                        <span class="info-text">
                                            ${stats.table_stats.occupied} Occupied
                                            • ${stats.table_stats.dirty} Dirty
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.4s">
                                <div class="stat-header">
                                    <div class="icon cooking">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <div class="stat-menu">
                                        <button class="btn btn-icon">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="stat-info">
                                    <p>Avg. Cooking Time</p>
                                    <h3>${stats.avg_cooking_time?.toFixed(1) || '0'} min</h3>
                                    <div class="stat-footer">
                                        <span class="info-text">
                                            Based on completed orders
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Order Status Overview -->
                        <div class="order-status-overview">
                            <h2>Order Status Overview</h2>
                            <div class="status-cards">
                                <div class="status-card pending">
                                    <h4>Pending Payment</h4>
                                    <p>${stats.order_stats.pending_payment || '0'}</p>
                                </div>
                                <div class="status-card paid">
                                    <h4>Paid</h4>
                                    <p>${stats.order_stats.paid || '0'}</p>
                                </div>
                                <div class="status-card cooking">
                                    <h4>In Progress</h4>
                                    <p>${stats.order_stats.in_progress || '0'}</p>
                                </div>
                                <div class="status-card ready">
                                    <h4>Ready</h4>
                                    <p>${stats.order_stats.ready || '0'}</p>
                                </div>
                                <div class="status-card completed">
                                    <h4>Completed</h4>
                                    <p>${stats.order_stats.completed || '0'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Orders -->
                        <div class="recent-orders">
                            <div class="section-header">
                                <h2>Recent Orders</h2>
                                <a href="#orders" class="btn btn-outline">
                                    View All Orders <i class="fas fa-arrow-right"></i>
                                </a>
                            </div>
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Table</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentOrders.map(order => `
                                            <tr>
                                                <td>#${order.order_id}</td>
                                                <td>Table ${order.table_id}</td>
                                                <td>
                                                    <div class="order-items">
                                                        ${order.items?.slice(0, 2).map(item => 
                                                            `<span>${item.name} x${item.quantity}</span>`
                                                        ).join(', ') || ''}
                                                        ${(order.items?.length || 0) > 2 ? 
                                                            `<span>+${order.items.length - 2} more</span>` : 
                                                            ''}
                                                    </div>
                                                </td>
                                                <td>Rp ${(order.total || 0).toLocaleString()}</td>
                                                <td>
                                                    <span class="status-badge ${(order.status || '').toLowerCase()}">
                                                        ${order.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>${formatTime(order.created_at)}</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn btn-icon" data-action="view" data-id="${order.order_id}">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        ${order.status === 'PENDING_PAYMENT' ? `
                                                            <button class="btn btn-icon" data-action="payment" data-id="${order.order_id}">
                                                                <i class="fas fa-credit-card"></i>
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading dashboard:', error);
                return `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        Failed to load dashboard data: ${error.message}
                    </div>
                `;
            }
        },
        orders: `
            <div class="orders-content animate__animated animate__fadeIn">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-shopping-cart"></i> Orders Management</h1>
                        <p class="header-subtitle">Manage and track all orders</p>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" data-modal-target="newOrderModal">
                            <i class="fas fa-plus"></i>
                            New Order
                        </button>
                    </div>
                </div>

                <!-- Orders Filter Section -->
                <div class="orders-filter">
                    <div class="filter-group">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Search orders...">
                        </div>
                        
                        <div class="filter-buttons">
                            <button class="btn btn-outline active">All Orders</button>
                            <button class="btn btn-outline">Pending</button>
                            <button class="btn btn-outline">In Progress</button>
                            <button class="btn btn-outline">Completed</button>
                        </div>
                    </div>
                    
                    <div class="filter-actions">
                        <button class="btn btn-outline">
                            <i class="fas fa-filter"></i>
                            Filter
                        </button>
                        <button class="btn btn-outline">
                            <i class="fas fa-sort"></i>
                            Sort
                        </button>
                        <button class="btn btn-outline">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>

                <!-- Orders Table -->
                <div class="orders-table-container">
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox" class="select-all">
                                </th>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Table</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><input type="checkbox"></td>
                                <td data-label="Order ID">
                                    <span class="order-id">#ORD-001</span>
                                </td>
                                <td data-label="Customer">
                                    <div class="customer-info">
                                        <img src="assets/img/avatar1.jpg" alt="Customer">
                                        <div class="customer-details">
                                            <span class="name">John Doe</span>
                                            <span class="table">Table 5</span>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Table">Table 5</td>
                                <td data-label="Items">
                                    <div class="order-items">
                                        <span class="item-count">3 items</span>
                                        <button class="btn btn-sm btn-link">View</button>
                                    </div>
                                </td>
                                <td data-label="Total">Rp 150,000</td>
                                <td data-label="Status">
                                    <span class="status-badge completed">Completed</span>
                                </td>
                                <td data-label="Time">
                                    <div class="order-time">
                                        <span class="date">Today</span>
                                        <span class="time">14:30</span>
                                    </div>
                                </td>
                                <td data-label="Actions">
                                    <div class="action-buttons">
                                        <button class="btn btn-icon" title="View Details" data-modal-target="viewOrderModal">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-icon" title="Edit" data-modal-target="editOrderModal">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-icon" title="Payment" data-modal-target="paymentModal">
                                            <i class="fas fa-credit-card"></i>
                                        </button>
                                        <button class="btn btn-icon" title="Print" data-modal-target="printOrderModal">
                                            <i class="fas fa-print"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <!-- Add more order rows here -->
                        </tbody>
                    </table>
                </div>

                <!-- Table Footer -->
                <div class="table-footer">
                    <div class="table-info">
                        Showing 1 to 10 of 50 entries
                    </div>
                    <div class="pagination">
                        <button class="btn btn-icon" title="Previous">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn btn-icon active">1</button>
                        <button class="btn btn-icon">2</button>
                        <button class="btn btn-icon">3</button>
                        <button class="btn btn-icon" title="Next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `,
        menu: `
            <div class="menu-content animate__animated animate__fadeIn">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-utensils"></i> Menu Management</h1>
                        <p class="header-subtitle">Manage your restaurant menu items</p>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" data-modal-target="addMenuModal">
                            <i class="fas fa-plus"></i>
                            Add New Menu
                        </button>
                    </div>
                </div>

                <!-- Menu Filter Section -->
                <div class="menu-filter">
                    <div class="filter-group">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="menuSearch" placeholder="Search menu items...">
                        </div>
                        
                        <div class="category-filter">
                            <button class="btn btn-outline active" data-category="all">All</button>
                            <button class="btn btn-outline" data-category="main-course">Main Course</button>
                            <button class="btn btn-outline" data-category="appetizer">Appetizer</button>
                            <button class="btn btn-outline" data-category="dessert">Dessert</button>
                            <button class="btn btn-outline" data-category="beverage">Beverage</button>
                        </div>
                    </div>
                    
                    <div class="filter-actions">
                        <button class="btn btn-outline">
                            <i class="fas fa-sort"></i>
                            Sort
                        </button>
                        <button class="btn btn-outline">
                            <i class="fas fa-filter"></i>
                            Filter
                        </button>
                    </div>
                </div>

                <!-- Menu Table -->
                <div class="menu-table-container">
                    <table class="menu-table">
                        <thead>
                            <tr>
                                <th>Menu ID</th>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td data-label="Menu ID">
                                    <span class="menu-id">#MENU-001</span>
                                </td>
                                <td data-label="Image">
                                    <div class="menu-image">
                                        <img src="assets/img/menu/nasi-goreng.jpg" alt="Nasi Goreng">
                                    </div>
                                </td>
                                <td data-label="Name">
                                    <div class="menu-info">
                                        <span class="menu-name">Nasi Goreng Special</span>
                                        <span class="menu-description">Indonesian fried rice with special ingredients</span>
                                    </div>
                                </td>
                                <td data-label="Category">
                                    <span class="category-badge main-course">Main Course</span>
                                </td>
                                <td data-label="Price">
                                    <span class="menu-price">Rp 35,000</span>
                                </td>
                                <td data-label="Stock">
                                    <span class="stock-amount">50</span>
                                </td>
                                <td data-label="Status">
                                    <span class="status-badge available">Available</span>
                                </td>
                                <td data-label="Actions">
                                    <div class="action-buttons">
                                        <button class="btn btn-icon" title="View Details" data-modal-target="viewMenuModal">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-icon" title="Edit Menu" data-modal-target="editMenuModal">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-icon btn-danger" title="Delete Menu">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <!-- Add more menu items here -->
                        </tbody>
                    </table>
                </div>

                <!-- Table Footer -->
                <div class="table-footer">
                    <div class="table-info">
                        Showing <span id="showingStart">1</span> to <span id="showingEnd">10</span> of <span id="totalEntries">50</span> entries
                    </div>
                    <div class="pagination" id="menuPagination">
                        <!-- Pagination will be generated dynamically -->
                    </div>
                </div>
            </div>
        `,
        tables: `
            <div class="tables-content animate__animated animate__fadeIn">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-chair"></i> Tables Management</h1>
                        <p class="header-subtitle">Manage restaurant tables and seating</p>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" data-modal-target="addTableModal">
                            <i class="fas fa-plus"></i>
                            Add New Table
                        </button>
                    </div>
                </div>

                <!-- Tables Filter -->
                <div class="tables-filter">
                    <div class="filter-group">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="tableSearch" placeholder="Search tables...">
                        </div>
                        
                        <div class="status-filter">
                            <button class="btn btn-outline active" data-status="all">
                                <i class="fas fa-border-all"></i>
                                All Tables
                                <span class="count">12</span>
                            </button>
                            <button class="btn btn-success btn-outline" data-status="available">
                                <i class="fas fa-check-circle"></i>
                                Available
                                <span class="count">5</span>
                            </button>
                            <button class="btn btn-warning btn-outline" data-status="occupied">
                                <i class="fas fa-user"></i>
                                Occupied
                                <span class="count">4</span>
                            </button>
                            <button class="btn btn-danger btn-outline" data-status="dirty">
                                <i class="fas fa-broom"></i>
                                Needs Cleaning
                                <span class="count">3</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tables Grid -->
                <div class="tables-grid">
                    <!-- Available Table -->
                    <div class="table-card available" data-modal-target="viewTableModal">
                        <div class="table-header">
                            <span class="table-id">#TBL-001</span>
                        </div>
                        <div class="table-content">
                            <div class="table-icon">
                                <i class="fas fa-chair"></i>
                            </div>
                            <div class="table-info">
                                <h3>Table 1</h3>
                                <div class="table-status">
                                    <span class="status-badge available">
                                        <i class="fas fa-check-circle"></i>
                                        Available
                                    </span>
                                    <span class="capacity">4 Seats</span>
                                </div>
                            </div>
                        </div>
                        <div class="table-footer">
                            <div class="table-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Today's Orders</span>
                                    <span class="stat-value">5</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Revenue</span>
                                    <span class="stat-value">Rp 750K</span>
                                </div>
                            </div>
                        </div>
                        <div class="quick-actions">
                            <button class="btn" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn" title="Change Status">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Occupied Table -->
                    <div class="table-card occupied" data-modal-target="viewTableModal">
                        <div class="table-header">
                            <span class="table-id">#TBL-002</span>
                        </div>
                        <div class="table-content">
                            <div class="table-icon">
                                <i class="fas fa-chair"></i>
                            </div>
                            <div class="table-info">
                                <h3>Table 2</h3>
                                <div class="table-status">
                                    <span class="status-badge occupied">
                                        <i class="fas fa-user"></i>
                                        Occupied
                                    </span>
                                    <span class="capacity">6 Seats</span>
                                </div>
                                <div class="current-order">
                                    <h4>Current Order</h4>
                                    <div class="order-details">
                                        <span>#ORD-001</span>
                                        <span>30 mins ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="table-footer">
                            <div class="table-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Today's Orders</span>
                                    <span class="stat-value">3</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Revenue</span>
                                    <span class="stat-value">Rp 450K</span>
                                </div>
                            </div>
                        </div>
                        <div class="quick-actions">
                            <button class="btn" title="View Order">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn" title="Change Status">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Dirty Table -->
                    <div class="table-card dirty" data-modal-target="viewTableModal">
                        <div class="table-header">
                            <span class="table-id">#TBL-003</span>
                        </div>
                        <div class="table-content">
                            <div class="table-icon">
                                <i class="fas fa-chair"></i>
                            </div>
                            <div class="table-info">
                                <h3>Table 3</h3>
                                <div class="table-status">
                                    <span class="status-badge dirty">
                                        <i class="fas fa-broom"></i>
                                        Needs Cleaning
                                    </span>
                                    <span class="capacity">2 Seats</span>
                                </div>
                            </div>
                        </div>
                        <div class="table-footer">
                            <div class="table-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Today's Orders</span>
                                    <span class="stat-value">4</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Revenue</span>
                                    <span class="stat-value">Rp 600K</span>
                                </div>
                            </div>
                        </div>
                        <div class="quick-actions">
                            <button class="btn" title="Mark as Clean">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn" title="Change Status">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        reports: `
            <div class="reports-content animate__animated animate__fadeIn">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-chart-bar"></i> Reports & Analytics</h1>
                        <p class="header-subtitle">View and analyze your restaurant's performance</p>
                    </div>
                    <div class="header-right">
                        <div class="date-range-picker">
                            <button class="btn btn-outline active">Today</button>
                            <button class="btn btn-outline">Week</button>
                            <button class="btn btn-outline">Month</button>
                            <button class="btn btn-outline">
                                <i class="fas fa-calendar"></i>
                                Custom
                            </button>
                        </div>
                        <button class="btn btn-primary">
                            <i class="fas fa-download"></i>
                            Export Report
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="summary-cards">
                    <div class="summary-card revenue">
                        <div class="card-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="card-info">
                            <h3>Total Revenue</h3>
                            <div class="amount">Rp 8,459,000</div>
                            <div class="trend positive">
                                <i class="fas fa-arrow-up"></i>
                                23.5% vs last period
                            </div>
                        </div>
                    </div>

                    <div class="summary-card orders">
                        <div class="card-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="card-info">
                            <h3>Total Orders</h3>
                            <div class="amount">246</div>
                            <div class="trend positive">
                                <i class="fas fa-arrow-up"></i>
                                12.3% vs last period
                            </div>
                        </div>
                    </div>

                    <div class="summary-card avg-order">
                        <div class="card-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="card-info">
                            <h3>Average Order Value</h3>
                            <div class="amount">Rp 34,500</div>
                            <div class="trend negative">
                                <i class="fas fa-arrow-down"></i>
                                2.8% vs last period
                            </div>
                        </div>
                    </div>

                    <div class="summary-card items">
                        <div class="card-icon">
                            <i class="fas fa-utensils"></i>
                        </div>
                        <div class="card-info">
                            <h3>Items Sold</h3>
                            <div class="amount">1,284</div>
                            <div class="trend positive">
                                <i class="fas fa-arrow-up"></i>
                                8.4% vs last period
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="reports-grid">
                    <!-- Revenue Trend -->
                    <div class="report-card full-width">
                        <div class="card-header">
                            <div class="header-title">
                                <h3>Revenue Trend</h3>
                                <p>Daily revenue over time</p>
                            </div>
                            <div class="header-actions">
                                <button class="btn btn-sm btn-outline">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <canvas id="revenueTrendChart"></canvas>
                        </div>
                    </div>

                    <!-- Popular Items -->
                    <div class="report-card">
                        <div class="card-header">
                            <div class="header-title">
                                <h3>Popular Items</h3>
                                <p>Top selling menu items</p>
                            </div>
                            <div class="header-actions">
                                <button class="btn btn-sm btn-outline">View All</button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="popular-items-list">
                                <div class="item-row">
                                    <div class="item-info">
                                        <img src="assets/img/menu/nasi-goreng.jpg" alt="Nasi Goreng">
                                        <div class="item-details">
                                            <h4>Nasi Goreng Special</h4>
                                            <span>Main Course</span>
                                        </div>
                                    </div>
                                    <div class="item-stats">
                                        <div class="stat">
                                            <span class="label">Sold</span>
                                            <span class="value">124</span>
                                        </div>
                                        <div class="stat">
                                            <span class="label">Revenue</span>
                                            <span class="value">Rp 4.3M</span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Add more items -->
                            </div>
                        </div>
                    </div>

                    <!-- Sales by Category -->
                    <div class="report-card">
                        <div class="card-header">
                            <div class="header-title">
                                <h3>Sales by Category</h3>
                                <p>Revenue distribution</p>
                            </div>
                        </div>
                        <div class="card-body">
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>

                    <!-- Peak Hours -->
                    <div class="report-card">
                        <div class="card-header">
                            <div class="header-title">
                                <h3>Peak Hours</h3>
                                <p>Busiest hours of operation</p>
                            </div>
                        </div>
                        <div class="card-body">
                            <canvas id="peakHoursChart"></canvas>
                        </div>
                    </div>

                    <!-- Table Performance -->
                    <div class="report-card full-width">
                        <div class="card-header">
                            <div class="header-title">
                                <h3>Table Performance</h3>
                                <p>Revenue and orders by table</p>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="performance-table">
                                    <thead>
                                        <tr>
                                            <th>Table</th>
                                            <th>Orders</th>
                                            <th>Revenue</th>
                                            <th>Avg. Time</th>
                                            <th>Turnover Rate</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Table 1</td>
                                            <td>24</td>
                                            <td>Rp 960,000</td>
                                            <td>45 mins</td>
                                            <td>
                                                <div class="progress-bar">
                                                    <div class="progress" style="width: 85%"></div>
                                                </div>
                                            </td>
                                            <td><span class="status-badge available">Active</span></td>
                                        </tr>
                                        <!-- Add more rows -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        profile: `
            <div class="profile-content animate__animated animate__fadeIn">
                <div class="profile-header">
                    <div class="profile-cover">
                        <button class="btn btn-icon edit-cover" title="Change Cover">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div class="profile-info">
                        <div class="profile-avatar">
                            <img src="assets/img/avatar.jpg" alt="Profile">
                            <button class="btn btn-icon edit-avatar" title="Change Avatar">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <div class="profile-details">
                            <h2>John Doe</h2>
                            <p>Restaurant Admin</p>
                        </div>
                    </div>
                </div>

                <div class="profile-body">
                    <div class="profile-sidebar">
                        <div class="profile-nav">
                            <button class="nav-link active" data-tab="personal">
                                <i class="fas fa-user"></i>
                                Personal Info
                            </button>
                            <button class="nav-link" data-tab="security">
                                <i class="fas fa-lock"></i>
                                Security
                            </button>
                            <button class="nav-link" data-tab="preferences">
                                <i class="fas fa-cog"></i>
                                Preferences
                            </button>
                            <button class="nav-link" data-tab="activity">
                                <i class="fas fa-clock-rotate-left"></i>
                                Activity Log
                            </button>
                        </div>
                    </div>

                    <div class="profile-content-body">
                        <!-- Personal Info Tab -->
                        <div class="profile-tab active" id="personal">
                            <div class="section-header">
                                <h3>Personal Information</h3>
                                <button class="btn btn-primary btn-sm">
                                    <i class="fas fa-edit"></i>
                                    Edit Profile
                                </button>
                            </div>

                            <div class="info-grid">
                                <div class="info-group">
                                    <label>Full Name</label>
                                    <div class="info-value">John Doe</div>
                                </div>

                                <div class="info-group">
                                    <label>Email</label>
                                    <div class="info-value">john.doe@example.com</div>
                                </div>

                                <div class="info-group">
                                    <label>Phone</label>
                                    <div class="info-value">+62 812-3456-7890</div>
                                </div>

                                <div class="info-group">
                                    <label>Role</label>
                                    <div class="info-value">Restaurant Admin</div>
                                </div>

                                <div class="info-group">
                                    <label>Join Date</label>
                                    <div class="info-value">January 15, 2024</div>
                                </div>

                                <div class="info-group">
                                    <label>Location</label>
                                    <div class="info-value">Jakarta, Indonesia</div>
                                </div>
                            </div>
                        </div>

                        <!-- Security Tab -->
                        <div class="profile-tab" id="security">
                            <div class="section-header">
                                <h3>Security Settings</h3>
                            </div>

                            <div class="security-section">
                                <h4>Change Password</h4>
                                <form class="change-password-form">
                                    <div class="form-group">
                                        <label>Current Password</label>
                                        <div class="password-input">
                                            <input type="password" class="form-control" placeholder="Enter current password">
                                            <button type="button" class="btn btn-icon toggle-password">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label>New Password</label>
                                        <div class="password-input">
                                            <input type="password" class="form-control" placeholder="Enter new password">
                                            <button type="button" class="btn btn-icon toggle-password">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label>Confirm New Password</label>
                                        <div class="password-input">
                                            <input type="password" class="form-control" placeholder="Confirm new password">
                                            <button type="button" class="btn btn-icon toggle-password">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" class="btn btn-primary">Update Password</button>
                                </form>

                                <div class="security-options">
                                    <div class="option-item">
                                        <div class="option-info">
                                            <h4>Two-Factor Authentication</h4>
                                            <p>Add an extra layer of security to your account</p>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox">
                                            <span class="slider"></span>
                                        </label>
                                    </div>

                                    <div class="option-item">
                                        <div class="option-info">
                                            <h4>Login Notifications</h4>
                                            <p>Receive alerts for new login attempts</p>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" checked>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Preferences Tab -->
                        <div class="profile-tab" id="preferences">
                            <div class="section-header">
                                <h3>System Preferences</h3>
                            </div>

                            <div class="preferences-section">
                                <div class="preference-group">
                                    <h4>Theme Settings</h4>
                                    <div class="theme-options">
                                        <label class="theme-option">
                                            <input type="radio" name="theme" value="light">
                                            <span class="option-content">
                                                <i class="fas fa-sun"></i>
                                                Light
                                            </span>
                                        </label>
                                        <label class="theme-option">
                                            <input type="radio" name="theme" value="dark">
                                            <span class="option-content">
                                                <i class="fas fa-moon"></i>
                                                Dark
                                            </span>
                                        </label>
                                        <label class="theme-option">
                                            <input type="radio" name="theme" value="system" checked>
                                            <span class="option-content">
                                                <i class="fas fa-laptop"></i>
                                                System
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div class="preference-group">
                                    <h4>Notification Settings</h4>
                                    <div class="notification-options">
                                        <div class="option-item">
                                            <div class="option-info">
                                                <h4>New Order Notifications</h4>
                                                <p>Receive alerts for new orders</p>
                                            </div>
                                            <label class="switch">
                                                <input type="checkbox" checked>
                                                <span class="slider"></span>
                                            </label>
                                        </div>

                                        <div class="option-item">
                                            <div class="option-info">
                                                <h4>Low Stock Alerts</h4>
                                                <p>Get notified when items are running low</p>
                                            </div>
                                            <label class="switch">
                                                <input type="checkbox" checked>
                                                <span class="slider"></span>
                                            </label>
                                        </div>

                                        <div class="option-item">
                                            <div class="option-info">
                                                <h4>Daily Reports</h4>
                                                <p>Receive daily performance reports</p>
                                            </div>
                                            <label class="switch">
                                                <input type="checkbox">
                                                <span class="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Activity Log Tab -->
                        <div class="profile-tab" id="activity">
                            <div class="section-header">
                                <h3>Activity Log</h3>
                                <button class="btn btn-outline btn-sm">
                                    <i class="fas fa-filter"></i>
                                    Filter
                                </button>
                            </div>

                            <div class="activity-timeline">
                                <div class="activity-item">
                                    <div class="activity-icon">
                                        <i class="fas fa-sign-in-alt"></i>
                                    </div>
                                    <div class="activity-details">
                                        <div class="activity-text">Logged in to the system</div>
                                        <div class="activity-meta">
                                            <span class="time">Today, 09:30 AM</span>
                                            <span class="device">Windows 10 · Chrome Browser</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="activity-item">
                                    <div class="activity-icon">
                                        <i class="fas fa-edit"></i>
                                    </div>
                                    <div class="activity-details">
                                        <div class="activity-text">Updated menu item "Nasi Goreng Special"</div>
                                        <div class="activity-meta">
                                            <span class="time">Yesterday, 02:15 PM</span>
                                            <span class="device">Windows 10 · Chrome Browser</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Add more activity items -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
    };

    handleLogout(e) {
        e.preventDefault();
        // Handle logout logic here
        // Clear token, redirect to login, etc.
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    initializeCharts() {
        // Pastikan elemen canvas ada sebelum menginisialisasi charts
        const revenueChartEl = document.getElementById('revenueChart');
        const itemsChartEl = document.getElementById('itemsChart');

        if (revenueChartEl && itemsChartEl) {
            // Inisialisasi charts di sini
            // ... kode chart Anda ...
        }
    }

    initializeModals() {
        // Open modals
        document.addEventListener('click', (e) => {
            const modalTrigger = e.target.closest('[data-modal-target]');
            if (modalTrigger) {
                const modalId = modalTrigger.dataset.modalTarget;
                this.openModal(modalId);
            }

            // Close modal when clicking close button or outside
            if (e.target.closest('[data-modal-close]')) {
                const modalId = e.target.closest('[data-modal-close]').dataset.modalClose;
                this.closeModal(modalId);
            }

            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Payment calculation
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('payment-amount')) {
                const received = parseFloat(e.target.value) || 0;
                const total = 165000; // This should be dynamic
                const change = received - total;
                const changeElement = document.querySelector('.change-amount .amount');
                if (changeElement) {
                    changeElement.textContent = `Rp ${change >= 0 ? change.toLocaleString() : 0}`;
                }
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async loadDashboardContent(page) {
        const mainContent = document.getElementById('pageContent');
        
        try {
            switch(page) {
                case 'dashboard':
                    const dashboardStats = await api.getDashboardStats();
                    mainContent.innerHTML = this.renderDashboard(dashboardStats);
                    // Inisialisasi charts dengan data aktual
                    new ReportCharts().initializeCharts();
                    break;

                case 'orders':
                    const [orderFlow, analytics] = await Promise.all([
                        api.getOrderFlow(),
                        api.getOrderAnalytics()
                    ]);
                    mainContent.innerHTML = this.renderOrders(orderFlow, analytics);
                    this.initializeOrderMonitoring();
                    break;

                case 'menu':
                    const menus = await api.getMenus();
                    mainContent.innerHTML = this.renderMenu(menus);
                    new MenuGallery();
                    break;

                case 'tables':
                    const tables = await api.getTables();
                    mainContent.innerHTML = this.renderTables(tables);
                    this.initializeTableMonitoring();
                    break;
            }
        } catch (error) {
            mainContent.innerHTML = this.renderError(error.message);
        }
    }

    renderDashboard(stats) {
        return `
            <div class="dashboard-container">
                <div class="stats-cards">
                    <div class="stat-card">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="stat-info">
                            <h3>Total Pendapatan</h3>
                            <p>Rp ${stats.total_revenue?.toLocaleString() || '0'}</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-shopping-cart"></i>
                        <div class="stat-info">
                            <h3>Total Orders</h3>
                            <p>${stats.total_orders || '0'}</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <h3>Total Customers</h3>
                            <p>${stats.total_customers || '0'}</p>
                        </div>
                    </div>
                </div>

                <div class="charts-container">
                    <!-- Charts akan diinisialisasi oleh ReportCharts -->
                </div>
            </div>
        `;
    }

    renderOrders(orderFlow, analytics) {
        return `
            <div class="orders-container">
                <div class="order-stats">
                    <div class="stat-card">
                        <h3>Pending Orders</h3>
                        <p>${orderFlow.pending_count || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Processing Orders</h3>
                        <p>${orderFlow.processing_count || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Completed Today</h3>
                        <p>${orderFlow.completed_today || 0}</p>
                    </div>
                </div>

                <div class="orders-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Table</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderFlow.orders?.map(order => `
                                <tr>
                                    <td>#${order.id}</td>
                                    <td>${order.table_id}</td>
                                    <td>${order.items?.length || 0} items</td>
                                    <td>Rp ${order.total?.toLocaleString() || 0}</td>
                                    <td>
                                        <span class="status-badge status-${order.status?.toLowerCase()}">
                                            ${order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button onclick="viewOrder(${order.id})">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button onclick="updateOrder(${order.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    initializeOrderMonitoring() {
        // Inisialisasi WebSocket untuk monitoring order real-time
        const ws = api.connectToKDS('admin');
        
        ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            this.updateOrdersUI(update);
        };
    }

    updateOrdersUI(update) {
        // Update UI berdasarkan WebSocket message
        const ordersTable = document.querySelector('.orders-table tbody');
        if (!ordersTable) return;

        // Update atau tambah order baru
        if (update.type === 'new_order' || update.type === 'order_update') {
            // Implementasi update UI
        }
    }

    initializeWebSocket() {
        try {
            if (this.ws) {
                this.ws.close();
            }

            this.ws = api.connectToKDS('admin');

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket message received:', data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket connection closed. Attempting to reconnect...');
                setTimeout(() => this.initializeWebSocket(), 5000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            setTimeout(() => this.initializeWebSocket(), 5000);
        }
    }

    handleWebSocketMessage(data) {
        console.log('Received WebSocket message:', data);
        
        switch (data.event) {
            case 'table_create':
                this.handleTableCreate(data.data);
                break;
            case 'table_update':
                this.handleTableUpdate(data.data);
                break;
            case 'table_delete':
                this.handleTableDelete(data.data);
                break;
            case 'dashboard_update':
                this.handleDashboardUpdate(data.data);
                break;
        }
    }

    handleTableCreate(data) {
        this.queueTableUpdate();
        if (this.currentPage === 'dashboard') {
            this.updateDashboardStats(data.stats);
            this.addTableToList(data.table);
        }
    }

    handleTableUpdate(data) {
        this.queueTableUpdate();
        if (this.currentPage === 'dashboard') {
            this.updateDashboardStats(data.stats);
            this.updateTableInList(data.table);
        }
    }

    handleTableDelete(data) {
        this.queueTableUpdate();
        if (this.currentPage === 'dashboard') {
            this.updateDashboardStats(data.stats);
            this.removeTableFromList(data.table_id);
        }
    }

    queueTableUpdate() {
        if (this.updateDebounceTimeout) {
            clearTimeout(this.updateDebounceTimeout);
        }
        this.updateDebounceTimeout = setTimeout(() => {
            this.processTableUpdates();
        }, 100); // Debounce 100ms
    }

    processTableUpdates() {
        if (this.currentPage === 'dashboard') {
            this.updateDashboardTables();
        }
    }

    updateDashboardStats(stats) {
        // Update statistik dashboard
        const availableCount = document.getElementById('available-count');
        const occupiedCount = document.getElementById('occupied-count');
        const dirtyCount = document.getElementById('dirty-count');
        const totalCount = document.getElementById('total-count');

        if (stats) {
            if (availableCount) availableCount.textContent = stats.available || 0;
            if (occupiedCount) occupiedCount.textContent = stats.occupied || 0;
            if (dirtyCount) dirtyCount.textContent = stats.dirty || 0;
            if (totalCount) totalCount.textContent = stats.total || 0;
        }
    }

    addTableToList(table) {
        const tablesList = document.querySelector('.tables-list');
        if (tablesList) {
            const tableElement = this.createTableElement(table);
            tablesList.appendChild(tableElement);
        }
    }

    updateTableInList(table) {
        const tableElement = document.querySelector(`[data-table-id="${table.id}"]`);
        if (tableElement) {
            const newTableElement = this.createTableElement(table);
            tableElement.replaceWith(newTableElement);
        }
    }

    removeTableFromList(tableId) {
        const tableElement = document.querySelector(`[data-table-id="${tableId}"]`);
        if (tableElement) {
            tableElement.remove();
        }
    }

    createTableElement(table) {
        const div = document.createElement('div');
        div.className = 'table-item';
        div.setAttribute('data-table-id', table.id);
        div.innerHTML = `
            <h3>Table ${table.table_number}</h3>
            <p>Status: ${table.status}</p>
        `;
        return div;
    }

    updateDashboardTables() {
        // Implementasi untuk update tables di dashboard
        // ... kode implementasi ...
        
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Navigation...');
    new Navigation();
});

// Saat membuat row untuk orders table
function createOrderRow(order) {
    return `
        <tr>
            <td data-label="Order ID">#${order.id}</td>
            <td data-label="Customer">
                <div class="customer-info">
                    <!-- customer info content -->
                </div>
            </td>
            <td data-label="Table">${order.table_id}</td>
            <td data-label="Items">${order.items}</td>
            <td data-label="Total">${order.total}</td>
            <td data-label="Status">
                <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
            </td>
            <td data-label="Time">${order.time}</td>
            <td data-label="Actions">
                <div class="action-buttons">
                    <!-- action buttons -->
                </div>
            </td>
        </tr>
    `;
}

// Tambahkan helper function untuk format waktu
function formatTime(dateString) {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}