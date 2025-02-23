import { MenuGallery } from './components/menuGallery.js';
import { ReportCharts } from './components/reportCharts.js';
import { ProfileManager } from './components/profile.js';

// Navigation Handler
class Navigation {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
        this.initializeModals();
    }

    init() {
        this.setupEventListeners();
        this.handleInitialLoad();
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

    async loadPageContent(page) {
        const pages = {
            dashboard: `
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
                                <h3>Rp 8,459,000</h3>
                                <div class="stat-footer">
                                    <span class="trend positive">
                                        <i class="fas fa-arrow-up"></i>
                                        23.5%
                                    </span>
                                    <span class="period">vs last month</span>
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
                                <h3>246</h3>
                                <div class="stat-footer">
                                    <span class="trend positive">
                                        <i class="fas fa-arrow-up"></i>
                                        12.3%
                                    </span>
                                    <span class="period">vs last month</span>
                                </div>
                            </div>
                        </div>

                        <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.3s">
                            <div class="stat-header">
                                <div class="icon customers">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="stat-menu">
                                    <button class="btn btn-icon">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="stat-info">
                                <p>Total Customers</p>
                                <h3>128</h3>
                                <div class="stat-footer">
                                    <span class="trend negative">
                                        <i class="fas fa-arrow-down"></i>
                                        2.8%
                                    </span>
                                    <span class="period">vs last month</span>
                                </div>
                            </div>
                        </div>

                        <div class="stat-card animate__animated animate__fadeInUp" style="animation-delay: 0.4s">
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
                                <p>Active Tables</p>
                                <h3>18/24</h3>
                                <div class="stat-footer">
                                    <div class="progress-bar">
                                        <div class="progress" style="width: 75%"></div>
                                    </div>
                                    <span class="period">75% Occupied</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Section -->
                    <div class="charts-container">
                        <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.5s">
                            <div class="chart-header">
                                <div class="chart-title">
                                    <h3>Revenue Overview</h3>
                                    <p>Monthly revenue statistics</p>
                                </div>
                                <div class="chart-actions">
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-outline">Weekly</button>
                                        <button class="btn btn-sm btn-outline active">Monthly</button>
                                        <button class="btn btn-sm btn-outline">Yearly</button>
                                    </div>
                                </div>
                            </div>
                            <div class="chart-body">
                                <canvas id="revenueChart"></canvas>
                            </div>
                        </div>

                        <div class="chart-card animate__animated animate__fadeInUp" style="animation-delay: 0.6s">
                            <div class="chart-header">
                                <div class="chart-title">
                                    <h3>Popular Items</h3>
                                    <p>Top selling menu items</p>
                                </div>
                                <button class="btn btn-sm btn-outline">
                                    <i class="fas fa-download"></i>
                                    Report
                                </button>
                            </div>
                            <div class="chart-body">
                                <canvas id="itemsChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Orders -->
                    <div class="recent-orders animate__animated animate__fadeInUp" style="animation-delay: 0.7s">
                        <div class="section-header">
                            <div class="section-title">
                                <h3>Recent Orders</h3>
                                <p>Latest customer orders</p>
                            </div>
                            <div class="section-actions">
                                <button class="btn btn-outline btn-sm">
                                    <i class="fas fa-filter"></i>
                                    Filter
                                </button>
                                <a href="#orders" class="btn btn-primary btn-sm">View All</a>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="orders-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Time</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><span class="order-id">#ORD-001</span></td>
                                        <td>
                                            <div class="customer-info">
                                                <img src="assets/img/avatar1.jpg" alt="Customer">
                                                <span>John Doe</span>
                                            </div>
                                        </td>
                                        <td>3 items</td>
                                        <td>Rp 150,000</td>
                                        <td><span class="status-badge completed">Completed</span></td>
                                        <td>5 min ago</td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="btn btn-icon" title="View Details">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-icon" title="Print">
                                                    <i class="fas fa-print"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <!-- Add more rows as needed -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `,
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

        // Initialize charts after content is loaded
        if (page === 'dashboard') {
            setTimeout(() => {
                this.initializeCharts();
            }, 0);
        }

        return pages[page] || '<div>Page not found</div>';
    }

    handleInitialLoad() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.navigateToPage(hash, false);
    }

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
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [6500000, 5900000, 8000000, 8100000, 7800000, 8459000],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + (value/1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                }
            }
        });

        // Popular Items Chart
        const itemsCtx = document.getElementById('itemsChart').getContext('2d');
        new Chart(itemsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Nasi Goreng', 'Ayam Bakar', 'Es Teh', 'Sate'],
                datasets: [{
                    data: [30, 25, 20, 15],
                    backgroundColor: [
                        '#2563eb',
                        '#22c55e',
                        '#f59e0b',
                        '#64748b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
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
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
    new MenuGallery();
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
            <td data-label="Table">${order.table}</td>
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