class DashboardPage {
    constructor() {
        this.stats = {};
        this.charts = {};
        this.initialized = false;
        this.revenueChart = null;
        // Register this instance with the router
        window.router.registerPageInstance('dashboard', this);
    }

    async initialize() {
        console.log('Initializing dashboard page');
        if (this.initialized) {
            console.log('Dashboard already initialized');
            return;
        }

        try {
            // Render content first
            const content = await this.render();
            const contentContainer = document.getElementById('content-container');
            if (contentContainer) {
                contentContainer.innerHTML = content;
            }

            // Add base styles for recent orders
            this.setupRecentOrdersStyles();

            // Initialize charts
            await this.initializeCharts();

            // Setup WebSocket listeners
            this.setupWebSocketListeners();

            // Load initial data
            await this.loadDashboardData();
            
            // Load recent orders separately
            await this.updateRecentOrders();

            this.initialized = true;
            console.log('Dashboard initialization complete');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.initialized = false;
        }
    }

    async render() {
        return `
            <div class="dashboard-container">
                <!-- Stats Cards -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Total Orders</h3>
                            <p id="total-orders">0</p>
                            <small>Today: <span id="today-orders">0</span></small>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Revenue</h3>
                            <p id="total-revenue">Rp 0</p>
                            <small>Today: <span id="today-revenue">Rp 0</span></small>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Avg. Cooking Time</h3>
                            <p id="avg-cooking-time">0 min</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chair"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Tables</h3>
                            <div class="table-stats">
                                <span><i class="fas fa-check-circle"></i> <span id="available-tables">0</span> Available</span>
                                <span><i class="fas fa-users"></i> <span id="occupied-tables">0</span> Occupied</span>
                                <span><i class="fas fa-broom"></i> <span id="dirty-tables">0</span> Dirty</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3>Order Status</h3>
                        <div class="chart-container">
                            <canvas id="order-status-chart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>Payment Stats</h3>
                        <div class="chart-container">
                            <canvas id="payment-stats-chart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card wide">
                        <h3>Revenue Trend</h3>
                        <div class="chart-container">
                            <canvas id="revenue-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Recent Orders Section -->
                <div class="recent-orders-section">
                    <div class="section-header">
                        <h3>Recent Orders</h3>
                        <button class="view-all-btn" onclick="window.router.navigateTo('orders')">
                            View All <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div class="recent-orders-list" id="recent-orders-list">
                        <!-- Recent orders will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    setupWebSocketListeners() {
        // Stats updates
        window.addEventListener('statsUpdate', (event) => {
            console.log('Received stats update:', event.detail);
            this.updateDashboardStats(event.detail);
        });

        // Table updates
        window.addEventListener('tableUpdate', (event) => {
            console.log('Received table update:', event.detail);
            this.handleTableUpdate(event.detail);
        });

        // Order updates
        window.addEventListener('orderUpdate', (event) => {
            console.log('Received order update:', event.detail);
            this.handleOrderUpdate(event.detail);
        });

        // Payment updates
        window.addEventListener('paymentUpdate', (event) => {
            console.log('Received payment update:', event.detail);
            this.handlePaymentUpdate(event.detail);
        });

        // Menu updates
        window.addEventListener('menuUpdate', (event) => {
            console.log('Received menu update:', event.detail);
            this.handleMenuUpdate(event.detail);
        });
    }

    async handleTableUpdate(data) {
        console.log('Handling table update in dashboard:', data);
        try {
            // Update table stats directly from the data
            if (data.table_stats) {
                document.getElementById('available-tables').textContent = data.table_stats.available || 0;
                document.getElementById('occupied-tables').textContent = data.table_stats.occupied || 0;
                document.getElementById('dirty-tables').textContent = data.table_stats.dirty || 0;
            } else {
                // If table_stats not provided, fetch latest stats
                await this.loadDashboardData();
            }
        } catch (error) {
            console.error('Error handling table update:', error);
        }
    }

    async handleOrderUpdate(data) {
        console.log('Handling order update in dashboard:', data);
        try {
            // Fetch latest dashboard stats
            const dashboardStats = await this.fetchDashboardStats();
            if (dashboardStats) {
                // Update revenue and trend
                this.updateRevenue(dashboardStats);
                if (this.charts.revenue && dashboardStats.revenue_trend) {
                    const labels = dashboardStats.revenue_trend.map(item => {
                        const date = new Date(item.date);
                        return date.toLocaleDateString('id-ID', { weekday: 'short' });
                    });
                    const values = dashboardStats.revenue_trend.map(item => item.amount);

                    this.charts.revenue.data.labels = labels;
                    this.charts.revenue.data.datasets[0].data = values;
                    this.charts.revenue.update('active');
                }
            }

            // Update recent orders immediately
            await this.updateRecentOrders();
            
            // Update order stats chart
            const orderStats = await this.fetchOrderStats();
            if (orderStats) {
                this.updateOrderStatusChart(orderStats);
            }
        } catch (error) {
            console.error('Error handling order update:', error);
        }
    }

    async handlePaymentUpdate(data) {
        console.log('Handling payment update in dashboard:', data);
        try {
            // Update payment stats chart if available
            if (this.charts.paymentStats) {
                const paymentStats = await this.fetchPaymentStats();
                if (paymentStats) {
                    this.updatePaymentStatsChart(paymentStats);
                }
            }

            // Update dashboard stats for revenue
            const dashboardStats = await this.fetchDashboardStats();
            if (dashboardStats) {
                this.updateRevenue(dashboardStats);
                if (this.charts.revenue) {
                    this.updateRevenueTrend(dashboardStats);
                }
            }
        } catch (error) {
            console.error('Error handling payment update:', error);
        }
    }

    async handleMenuUpdate(data) {
        console.log('Handling menu update in dashboard:', data);
        // Refresh dashboard data as menu changes might affect stats
        await this.loadDashboardData();
    }

    async fetchOrderStats() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/orders/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch order stats');
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching order stats:', error);
            return null;
        }
    }

    async fetchPaymentStats() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/payments/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment stats');
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching payment stats:', error);
            return null;
        }
    }

    async fetchDashboardStats() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            const result = await response.json();
            return result.data.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return null;
        }
    }

    cleanup() {
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};

        this.initialized = false;
    }

    async loadDashboardData() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load dashboard data');
            }

            const result = await response.json();
            if (result.status && result.data.data) {
                this.updateDashboardStats(result.data.data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateDashboardStats(data) {
        console.log('Updating dashboard with data:', data);
        
        // Update total orders
        const totalOrdersEl = document.getElementById('total-orders');
        const todayOrdersEl = document.getElementById('today-orders');
        if (totalOrdersEl) totalOrdersEl.textContent = data.total_orders || 0;
        if (todayOrdersEl) todayOrdersEl.textContent = data.today_orders || 0;

        // Update revenue
        const totalRevenueEl = document.getElementById('total-revenue');
        const todayRevenueEl = document.getElementById('today-revenue');
        if (totalRevenueEl) totalRevenueEl.textContent = this.formatCurrency(data.total_revenue || 0);
        if (todayRevenueEl) todayRevenueEl.textContent = this.formatCurrency(data.today_revenue || 0);

        // Update cooking time
        const avgCookingTimeEl = document.getElementById('avg-cooking-time');
        if (avgCookingTimeEl) avgCookingTimeEl.textContent = `${Math.round(data.avg_cooking_time || 0)} min`;

        // Update table status
        if (data.table_stats) {
            const availableTablesEl = document.getElementById('available-tables');
            const occupiedTablesEl = document.getElementById('occupied-tables');
            const dirtyTablesEl = document.getElementById('dirty-tables');
            
            if (availableTablesEl) availableTablesEl.textContent = data.table_stats.available || 0;
            if (occupiedTablesEl) occupiedTablesEl.textContent = data.table_stats.occupied || 0;
            if (dirtyTablesEl) dirtyTablesEl.textContent = data.table_stats.dirty || 0;
        }

        // Update charts
        if (data.order_stats && this.charts.orderStatus) {
            this.updateOrderStatusChart(data.order_stats);
        }
        if (data.payment_stats && this.charts.paymentStats) {
            this.updatePaymentStatsChart(data.payment_stats);
        }

        // Update revenue trend chart
        if (data.revenue_trend && this.charts.revenue) {
            const labels = data.revenue_trend.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('id-ID', { weekday: 'short' });
            });
            const values = data.revenue_trend.map(item => item.amount);

            this.charts.revenue.data.labels = labels;
            this.charts.revenue.data.datasets[0].data = values;
            this.charts.revenue.update('active');
        }

        // Update recent orders
        this.updateRecentOrders();
    }

    async initializeCharts() {
        // Order Status Chart
        const orderStatusCtx = document.getElementById('order-status-chart');
        if (orderStatusCtx) {
            this.charts.orderStatus = new Chart(orderStatusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending Payment', 'Paid', 'In Progress', 'Ready', 'Completed'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            '#fbbf24', // amber
                            '#60a5fa', // blue
                            '#34d399', // emerald
                            '#a78bfa', // violet
                            '#22c55e'  // green
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Payment Stats Chart
        const paymentStatsCtx = document.getElementById('payment-stats-chart');
        if (paymentStatsCtx) {
            this.charts.paymentStats = new Chart(paymentStatsCtx, {
                type: 'pie',
                data: {
                    labels: ['Pending', 'Success'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: [
                            '#fbbf24', // amber
                            '#22c55e'  // green
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Revenue Chart
        const revenueChartCtx = document.getElementById('revenue-chart');
        if (revenueChartCtx) {
            this.charts.revenue = new Chart(revenueChartCtx, {
                type: 'line',
                data: {
                    labels: Array(7).fill('').map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        return d.toLocaleDateString('id-ID', { weekday: 'short' });
                    }),
                    datasets: [{
                        label: 'Revenue',
                        data: Array(7).fill(0),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2.5,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: value => this.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }
    }

    updateOrderStatusChart(orderStats) {
        const data = [
            orderStats.pending_payment || 0,
            orderStats.paid || 0,
            orderStats.in_progress || 0,
            orderStats.ready || 0,
            orderStats.completed || 0
        ];
        this.charts.orderStatus.data.datasets[0].data = data;
        this.charts.orderStatus.update();
    }

    updatePaymentStatsChart(paymentStats) {
        const data = [
            paymentStats.pending || 0,
            paymentStats.success || 0
        ];
        this.charts.paymentStats.data.datasets[0].data = data;
        this.charts.paymentStats.update();
    }

    updateRevenue(data) {
        if (!data) return;
        
        const totalRevenue = document.getElementById('total-revenue');
        const todayRevenue = document.getElementById('today-revenue');
        
        if (totalRevenue) {
            totalRevenue.textContent = this.formatCurrency(data.total_revenue || 0);
        }
        if (todayRevenue) {
            todayRevenue.textContent = this.formatCurrency(data.today_revenue || 0);
        }
    }

    updateCookingTime(data) {
        if (!data) return;
        
        const avgCookingTime = document.getElementById('avg-cooking-time');
        if (avgCookingTime) {
            avgCookingTime.textContent = `${Math.round(data.avg_cooking_time || 0)} min`;
        }
    }

    updateRevenueTrend(data) {
        if (!data || !data.revenue_trend || !this.charts.revenue) return;

        const labels = data.revenue_trend.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('id-ID', { weekday: 'short' });
        });

        const values = data.revenue_trend.map(item => item.amount);

        this.charts.revenue.data.labels = labels;
        this.charts.revenue.data.datasets[0].data = values;
        this.charts.revenue.update();
    }

    setupRecentOrdersStyles() {
        const styleId = 'recent-orders-styles';
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        styleElement.textContent = `
            .recent-orders-section {
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin-top: 24px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .view-all-btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .recent-orders-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .order-item {
                background: #f8fafc;
                border-radius: 8px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
            }

            .order-item:hover {
                background: #f1f5f9;
                transform: translateY(-1px);
            }

            .order-info {
                flex: 1;
            }

            .order-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .order-id {
                font-weight: 600;
                color: #1e293b;
            }

            .order-time {
                color: #64748b;
                font-size: 0.9em;
            }

            .order-details {
                display: flex;
                gap: 16px;
                margin-bottom: 8px;
            }

            .table {
                color: #475569;
                font-size: 0.9em;
            }

            .amount {
                font-weight: 600;
                color: #0f172a;
            }

            .order-items {
                color: #64748b;
                font-size: 0.9em;
            }

            .order-status {
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.9em;
                font-weight: 500;
            }

            .status-pending_payment {
                background: #fef3c7;
                color: #92400e;
            }

            .status-paid {
                background: #dbeafe;
                color: #1e40af;
            }

            .status-in_progress {
                background: #d1fae5;
                color: #065f46;
            }

            .status-ready {
                background: #ede9fe;
                color: #5b21b6;
            }

            .status-completed {
                background: #dcfce7;
                color: #166534;
            }

            .no-orders {
                text-align: center;
                padding: 32px;
                color: #64748b;
                background: #f8fafc;
                border-radius: 8px;
                font-size: 0.95em;
            }

            .error {
                text-align: center;
                padding: 32px;
                color: #ef4444;
                background: #fef2f2;
                border-radius: 8px;
                font-size: 0.95em;
            }
        `;
    }

    async updateRecentOrders() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/orders/getflow', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recent orders');
            }

            const result = await response.json();
            console.log('Recent orders response:', result);
            
            const ordersList = document.getElementById('recent-orders-list');
            if (!ordersList) {
                console.log('Recent orders list element not found, skipping update');
                return;
            }

            const recentOrders = result.data?.data?.recent_orders || [];
            console.log('Recent orders data:', recentOrders);

            if (recentOrders.length === 0) {
                ordersList.innerHTML = '<div class="no-orders">Tidak ada order terbaru</div>';
                return;
            }

            ordersList.innerHTML = recentOrders.slice(0, 5).map(order => {
                console.log('Processing order:', order);
                const totalAmount = parseFloat(order.total) || 0;
                console.log('Total amount:', totalAmount);
                
                return `
                <div class="order-item">
                    <div class="order-info">
                        <div class="order-header">
                            <div class="order-id">Order #${order.order_id}</div>
                            <div class="order-time">${this.formatDate(order.created_at)}</div>
                        </div>
                        <div class="order-details">
                            <span class="table">Meja ${order.table_number}</span>
                            <span class="amount">${this.formatCurrency(totalAmount)}</span>
                        </div>
                        ${order.items ? `
                            <div class="order-items">
                                ${order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="order-status status-${order.status.toLowerCase()}">
                        ${this.formatStatus(order.status)}
                    </div>
                </div>
            `}).join('');

        } catch (error) {
            console.error('Error updating recent orders:', error);
            const ordersList = document.getElementById('recent-orders-list');
            if (ordersList) {
                ordersList.innerHTML = '<div class="error">Gagal memuat data order terbaru</div>';
            }
        }
    }

    formatCurrency(amount) {
        // Handle null, undefined, or invalid values
        if (amount === null || amount === undefined || isNaN(amount)) {
            console.log('Invalid amount:', amount);
            return 'Rp 0';
        }
        
        // Convert to number if it's a string
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        console.log('Formatting amount:', numericAmount);
        
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(numericAmount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatStatus(status) {
        const statusMap = {
            'pending_payment': 'Menunggu Pembayaran',
            'paid': 'Sudah Dibayar',
            'in_progress': 'Sedang Diproses',
            'ready': 'Siap',
            'completed': 'Selesai'
        };
        return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Initialize the dashboard page
window.dashboardPage = new DashboardPage();

// Register the dashboard page with the router
window.router.addRoute('dashboard', async () => {
    await window.dashboardPage.initialize();
}); 