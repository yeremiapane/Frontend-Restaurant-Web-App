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
        if (this.initialized) {
            return;
        }

        try {
            console.log('[DashboardPage] Initializing dashboard...');
            
            // Periksa apakah token ada
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found, cannot initialize dashboard');
                // Redirect ke login jika tidak ada token
                window.location.href = '/Frontend/auth/login/index.html';
                return;
            }
            
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
            console.log('[DashboardPage] Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            // Cek apakah error terkait token
            if (error.message && (error.message.includes('token') || error.message.includes('unauthorized'))) {
                console.error('Token invalid or expired, redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user_data');
                window.location.href = '/Frontend/auth/login/index.html';
                return;
            }
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
        try {
            console.log('[DashboardPage] Setting up WebSocket listeners');
            
            // Langsung menangani event dari WebSocket client
            if (window.wsClient) {
                // Dashboard update - event khusus dari backend untuk update dashboard
                window.wsClient.addEventListener('dashboard_update', (event) => {
                    console.log('[WebSocket] Received dashboard_update event');
                    const data = JSON.parse(event.data);
                    this.updateDashboardStats(data);
                });
                
                // Table events
                window.wsClient.addEventListener('table_update', (event) => {
                    console.log('[WebSocket] Received table_update event');
                    const data = JSON.parse(event.data);
                    this.handleTableUpdate(data);
                });
                
                window.wsClient.addEventListener('table_create', (event) => {
                    console.log('[WebSocket] Received table_create event');
                    const data = JSON.parse(event.data);
                    this.handleTableUpdate(data);
                });
                
                window.wsClient.addEventListener('table_delete', (event) => {
                    console.log('[WebSocket] Received table_delete event');
                    const data = JSON.parse(event.data);
                    this.handleTableUpdate(data);
                });
                
                // Order events
                window.wsClient.addEventListener('order_update', (event) => {
                    console.log('[WebSocket] Received order_update event');
                    const data = JSON.parse(event.data);
                    this.handleOrderUpdate(data);
                });
                
                // Payment events
                window.wsClient.addEventListener('payment_update', (event) => {
                    console.log('[WebSocket] Received payment_update event');
                    const data = JSON.parse(event.data);
                    this.handlePaymentUpdate(data);
                });
                
                window.wsClient.addEventListener('payment_success', (event) => {
                    console.log('[WebSocket] Received payment_success event');
                    const data = JSON.parse(event.data);
                    this.handlePaymentUpdate(data);
                });
                
                // Connection status
                window.wsClient.addEventListener('connection_change', (event) => {
                    console.log('[WebSocket] Connection status changed:', event.data);
                });
            }
            
            // Menangani event dari window (untuk kompatibilitas)
            window.addEventListener('dashboard_update', (event) => {
                console.log('[Window Event] Received dashboard_update event');
                this.updateDashboardStats(event.detail);
            });
            
            window.addEventListener('stats_update', (event) => {
                console.log('[Window Event] Received stats_update event');
                this.updateDashboardStats(event.detail);
            });
            
            window.addEventListener('table_update', (event) => {
                console.log('[Window Event] Received table_update event');
                this.handleTableUpdate(event.detail);
            });
            
            window.addEventListener('order_update', (event) => {
                console.log('[Window Event] Received order_update event');
                this.handleOrderUpdate(event.detail);
            });
            
            window.addEventListener('payment_update', (event) => {
                console.log('[Window Event] Received payment_update event');
                this.handlePaymentUpdate(event.detail);
            });
            
            window.addEventListener('menu_update', (event) => {
                console.log('[Window Event] Received menu_update event');
                this.loadPopularItems();
            });
            
            console.log('[DashboardPage] WebSocket listeners setup complete');
        } catch (error) {
            console.error('Error setting up WebSocket listeners:', error);
        }
    }

    async handleTableUpdate(data) {
        try {
            console.log('[DashboardPage] Handling table update:', data);
            
            // Jika data diterima dari WebSocket dashboard_update
            if (data && data.table_stats) {
                console.log('[DashboardPage] Using direct table stats from WebSocket');
                
                // Dapatkan nilai saat ini
                const currentAvailable = parseInt(document.getElementById('available-tables').textContent) || 0;
                const currentOccupied = parseInt(document.getElementById('occupied-tables').textContent) || 0;
                const currentDirty = parseInt(document.getElementById('dirty-tables').textContent) || 0;
                
                // Jika ada data statistik table lengkap, langsung update
                if (data.table_stats.available !== undefined && 
                    data.table_stats.occupied !== undefined && 
                    data.table_stats.dirty !== undefined) {
                    
                    document.getElementById('available-tables').textContent = data.table_stats.available;
                    document.getElementById('occupied-tables').textContent = data.table_stats.occupied;
                    document.getElementById('dirty-tables').textContent = data.table_stats.dirty;
                    return;
                }
                
                // Update nilai sesuai dengan perubahan
                if (data.data_type === "table_update") {
                    // Kita perlu menghitung ulang berdasarkan status tabel sebelumnya dan sesudahnya
                    const updatedTable = data.updated_table;
                    
                    if (updatedTable) {
                        // Jika kita tahu status terbaru, perbarui berdasarkan perubahan status
                        if (updatedTable.status === "available") {
                            document.getElementById('available-tables').textContent = currentAvailable + 1;
                            
                            // Jika status awalnya occupied, kurangi occupied
                            if (currentOccupied > 0) {
                                document.getElementById('occupied-tables').textContent = currentOccupied - 1;
                            }
                            // Jika status awalnya dirty, kurangi dirty
                            else if (currentDirty > 0) {
                                document.getElementById('dirty-tables').textContent = currentDirty - 1;
                            }
                        } 
                        else if (updatedTable.status === "occupied") {
                            document.getElementById('occupied-tables').textContent = currentOccupied + 1;
                            
                            // Jika status awalnya available, kurangi available
                            if (currentAvailable > 0) {
                                document.getElementById('available-tables').textContent = currentAvailable - 1;
                            }
                            // Jika status awalnya dirty, kurangi dirty
                            else if (currentDirty > 0) {
                                document.getElementById('dirty-tables').textContent = currentDirty - 1;
                            }
                        } 
                        else if (updatedTable.status === "dirty") {
                            document.getElementById('dirty-tables').textContent = currentDirty + 1;
                            
                            // Jika status awalnya available, kurangi available
                            if (currentAvailable > 0) {
                                document.getElementById('available-tables').textContent = currentAvailable - 1;
                            }
                            // Jika status awalnya occupied, kurangi occupied
                            else if (currentOccupied > 0) {
                                document.getElementById('occupied-tables').textContent = currentOccupied - 1;
                            }
                        }
                    }
                }
                // Khusus untuk penambahan tabel baru
                else if (data.data_type === "table_create") {
                    // Jika ada statistik tabel, gunakan
                    if (data.table_stats) {
                        if (data.table_stats.available) document.getElementById('available-tables').textContent = currentAvailable + 1;
                        if (data.table_stats.occupied) document.getElementById('occupied-tables').textContent = currentOccupied + 1;
                        if (data.table_stats.dirty) document.getElementById('dirty-tables').textContent = currentDirty + 1;
                    }
                    // Jika tidak, gunakan informasi tabel yang dibuat
                    else if (data.table && data.table.status) {
                        if (data.table.status === "available") document.getElementById('available-tables').textContent = currentAvailable + 1;
                        if (data.table.status === "occupied") document.getElementById('occupied-tables').textContent = currentOccupied + 1;
                        if (data.table.status === "dirty") document.getElementById('dirty-tables').textContent = currentDirty + 1;
                    }
                }
                // Khusus untuk penghapusan tabel
                else if (data.data_type === "table_delete") {
                    const updatedTable = data.updated_table || data.table;
                    
                    if (updatedTable && updatedTable.status === "available" && currentAvailable > 0) {
                        document.getElementById('available-tables').textContent = currentAvailable - 1;
                    }
                    else if (updatedTable && updatedTable.status === "occupied" && currentOccupied > 0) {
                        document.getElementById('occupied-tables').textContent = currentOccupied - 1;
                    }
                    else if (updatedTable && updatedTable.status === "dirty" && currentDirty > 0) {
                        document.getElementById('dirty-tables').textContent = currentDirty - 1;
                    }
                }
            }
            // Fallback ke API jika data tidak lengkap
            else {
                console.log('[DashboardPage] Fetching latest dashboard data');
                await this.loadDashboardData();
            }
        } catch (error) {
            console.error('Error handling table update:', error);
            // Fallback ke API jika terjadi error
            this.loadDashboardData();
        }
    }

    async handleOrderUpdate(data) {
        try {
            console.log('[DashboardPage] Handling order update:', data);
            
            // Untuk update langsung dari event dashboard_update WebSocket
            if (data.order_stats) {
                // Update order stats
                const currentTotalOrders = parseInt(document.getElementById('total-orders').textContent) || 0;
                const currentTodayOrders = parseInt(document.getElementById('today-orders').textContent) || 0;
                
                // Tentukan apakah order baru hari ini
                const isToday = data.updated_order && new Date(data.updated_order.created_at).toDateString() === new Date().toDateString();
                
                // Order baru
                if (data.order_stats.total_orders && data.data_type === "order_update") {
                    if (data.updated_order && data.updated_order.action === "create") {
                        document.getElementById('total-orders').textContent = currentTotalOrders + 1;
                        if (isToday) {
                            document.getElementById('today-orders').textContent = currentTodayOrders + 1;
                        }
                    }
                }
                
                // Update OrderStatus chart jika order status berubah
                if (data.order_stats.order_status && this.charts.orderStatus) {
                    // Get current data
                    const chartData = this.charts.orderStatus.data.datasets[0].data;
                    const labels = this.charts.orderStatus.data.labels;
                    
                    // Find the index of the status in labels
                    const statusIndex = labels.findIndex(label => {
                        return this.formatStatus(data.order_stats.order_status).includes(label);
                    });
                    
                    if (statusIndex !== -1) {
                        // Increment the count for this status
                        chartData[statusIndex] = (chartData[statusIndex] || 0) + 1;
                        this.charts.orderStatus.update('active');
                    }
                }
                
                // Update revenue if available
                if (data.revenue) {
                    const currentTotalRevenue = parseFloat(document.getElementById('total-revenue').textContent.replace(/[^\d]/g, '')) || 0;
                    const currentTodayRevenue = parseFloat(document.getElementById('today-revenue').textContent.replace(/[^\d]/g, '')) || 0;
                    
                    const revenueAmount = data.revenue.amount || 0;
                    
                    // Update total revenue
                    document.getElementById('total-revenue').textContent = this.formatCurrency(currentTotalRevenue + revenueAmount);
                    
                    // If today's order, update today's revenue
                    if (isToday) {
                        document.getElementById('today-revenue').textContent = this.formatCurrency(currentTodayRevenue + revenueAmount);
                    }
                    
                    // Update revenue chart if available
                    if (this.charts.revenue && data.revenue_trend) {
                        this.updateRevenueTrend(data);
                    }
                }
                
                // Update recent orders
                this.updateRecentOrders();
            }
            // Fallback ke API jika data tidak lengkap
            else {
                // Fetch latest dashboard stats
                const dashboardStats = await this.fetchDashboardStats();
                if (dashboardStats) {
                    // Update all stats
                    this.updateDashboardStats(dashboardStats);
                }

                // Update recent orders immediately
                await this.updateRecentOrders();
                
                // Update order stats chart
                const orderStats = await this.fetchOrderStats();
                if (orderStats) {
                    this.updateOrderStatusChart(orderStats);
                }
            }
        } catch (error) {
            console.error('Error handling order update:', error);
            // Fallback ke API jika terjadi error
            this.loadDashboardData();
        }
    }

    async handlePaymentUpdate(data) {
        try {
            console.log('[DashboardPage] Handling payment update:', data);
            
            // Jika data diterima dari WebSocket dashboard_update
            if (data.payment_stats || data.revenue) {
                console.log('[DashboardPage] Using direct payment stats from WebSocket');
                
                // Update revenue jika ada perubahan pembayaran
                if (data.revenue) {
                    const currentTotalRevenue = parseFloat(document.getElementById('total-revenue').textContent.replace(/[^\d]/g, '')) || 0;
                    const currentTodayRevenue = parseFloat(document.getElementById('today-revenue').textContent.replace(/[^\d]/g, '')) || 0;
                    
                    const revenueAmount = data.revenue.amount || 0;
                    
                    // Update total revenue
                    document.getElementById('total-revenue').textContent = this.formatCurrency(currentTotalRevenue + revenueAmount);
                    
                    // Jika pembayaran hari ini, update today's revenue
                    const isToday = data.payment && new Date(data.payment.created_at).toDateString() === new Date().toDateString();
                    if (isToday) {
                        document.getElementById('today-revenue').textContent = this.formatCurrency(currentTodayRevenue + revenueAmount);
                    }
                    
                    // Update revenue chart jika tersedia
                    if (this.charts.revenue && data.revenue_trend) {
                        this.updateRevenueTrend(data);
                    }
                }
                
                // Update payment stats jika tersedia
                if (data.payment_stats) {
                    if (data.payment_stats.payment_methods && this.charts.paymentMethods) {
                        // Update payment methods chart
                        this.updatePaymentMethodsChart(data.payment_stats.payment_methods);
                    }
                }
                
                // Update recent orders jika ada perubahan status order menjadi "paid"
                if (data.data_type === "payment_success" || data.data_type === "payment_update") {
                    this.updateRecentOrders();
                }
            }
            // Fallback ke API jika data tidak lengkap
            else {
                console.log('[DashboardPage] Fetching latest payment data');
                
                // Ambil data dashboard terbaru
                const dashboardStats = await this.fetchDashboardStats();
                if (dashboardStats) {
                    this.updateDashboardStats(dashboardStats);
                }
                
                // Update recent orders
                await this.updateRecentOrders();
                
                // Update payment methods chart
                const paymentStats = await this.fetchPaymentStats();
                if (paymentStats && paymentStats.payment_methods) {
                    this.updatePaymentMethodsChart(paymentStats.payment_methods);
                }
            }
        } catch (error) {
            console.error('Error handling payment update:', error);
            // Fallback ke API jika terjadi error
            this.loadDashboardData();
        }
    }

    async handleMenuUpdate(data) {
        // Refresh dashboard data as menu changes might affect stats
        await this.loadDashboardData();
    }

    async fetchOrderStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL}/admin/orders/stats`, {
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL}/admin/payments/stats`, {
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL}/admin/dashboard/stats`, {
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
            console.log('[DashboardPage] Loading dashboard data...');
            const token = localStorage.getItem('token');
            
            // Debugging URL dan token
            console.log(`API URL: ${window.API_BASE_URL}/admin/dashboard/stats`);
            
            const response = await fetch(`${window.API_BASE_URL}/admin/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Dashboard API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to load dashboard data: ${response.status}`);
            }

            // Ambil raw response text dulu untuk debugging
            const responseText = await response.text();
            console.log('Raw API response:', responseText);
            
            // Parse JSON setelah melihat raw response
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('Parsed dashboard data result:', result);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                throw new Error('Invalid JSON response from server');
            }
            
            // Analisis detail struktur respons untuk debugging
            this.analyzeResponseStructure(result);
            
            // Respons yang diharapkan dari backend adalah dalam format:
            // { "status": true, "message": "Dashboard stats retrieved successfully", "data": { ... } }
            
            if (result.status === true && result.data) {
                console.log('Valid API response with status=true and data field');
                this.updateDashboardStats(result.data);
            } else if (typeof result.status === 'undefined' && result.data) {
                // Format alternatif jika status tidak ada
                console.log('API response contains data field but no status field');
                this.updateDashboardStats(result.data);
            } else if (Object.keys(result).length > 0) {
                // Fallback jika data langsung dikembalikan tanpa wrapper
                console.log('Using entire response as dashboard data');
                this.updateDashboardStats(result);
            } else {
                console.warn('Unrecognized API response format:', result);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    analyzeResponseStructure(data) {
        console.log('------ RESPONSE STRUCTURE ANALYSIS ------');
        if (!data) {
            console.log('Response is null or undefined');
            return;
        }
        
        console.log('Top level keys:', Object.keys(data));
        
        if (data.status !== undefined) {
            console.log('Status field exists:', data.status);
        }
        
        if (data.message !== undefined) {
            console.log('Message field exists:', data.message);
        }
        
        if (data.data !== undefined) {
            console.log('Data field exists with keys:', Object.keys(data.data));
            
            const nestedData = data.data;
            
            // Check for specific data we need
            if (nestedData.table_stats) {
                console.log('table_stats exists:', nestedData.table_stats);
            }
            
            if (nestedData.order_stats) {
                console.log('order_stats exists with keys:', Object.keys(nestedData.order_stats));
                
                // Secara khusus, periksa properti order_status
                if (nestedData.order_stats.order_status) {
                    console.log('order_stats.order_status exists:', nestedData.order_stats.order_status);
                } else {
                    console.log('order_stats.order_status not found, checking for individual status properties');
                    
                    // Periksa properti individual
                    const statusProps = ['pending_payment', 'paid', 'in_progress', 'ready', 'completed'];
                    statusProps.forEach(prop => {
                        if (nestedData.order_stats[prop] !== undefined) {
                            console.log(`order_stats.${prop} exists:`, nestedData.order_stats[prop]);
                        }
                    });
                }
            }
            
            if (nestedData.payment_stats) {
                console.log('payment_stats exists:', nestedData.payment_stats);
            }
            
            if (nestedData.revenue) {
                console.log('revenue exists:', nestedData.revenue);
            }
            
            if (nestedData.total_orders !== undefined) {
                console.log('total_orders exists:', nestedData.total_orders);
            }
            
            if (nestedData.today_orders !== undefined) {
                console.log('today_orders exists:', nestedData.today_orders);
            }
            
            if (nestedData.revenue_trend) {
                console.log('revenue_trend exists with', nestedData.revenue_trend.length, 'entries');
            }
        } else {
            // Jika data field tidak ada, periksa properti di top level
            console.log('No nested data field, checking top level properties for dashboard data');
            
            if (data.order_stats) {
                console.log('Top level order_stats exists');
            }
            
            if (data.table_stats) {
                console.log('Top level table_stats exists');
            }
            
            if (data.total_orders !== undefined) {
                console.log('Top level total_orders exists:', data.total_orders);
            }
            
            // Periksa properti status pesanan di top level
            const topLevelStatusProps = ['pending_payment', 'paid', 'in_progress', 'ready', 'completed'];
            topLevelStatusProps.forEach(prop => {
                if (data[prop] !== undefined) {
                    console.log(`Top level ${prop} exists:`, data[prop]);
                }
            });
        }
        console.log('------ END ANALYSIS ------');
    }

    async updateDashboardStats(data) {
        try {
            console.log('[DashboardPage] Raw dashboard data received:', JSON.stringify(data));
            
            // Periksa struktur data dan normalisasi
            let dashboardData = data;
            
            // Format 1: { data: { ... } }
            if (data && data.data) {
                dashboardData = data.data;
                console.log('[DashboardPage] Using data.data format');
            }
            
            console.log('[DashboardPage] Normalized dashboard data:', JSON.stringify(dashboardData));
            
            // Debug informasi spesifik yang diharapkan
            console.log('[DashboardPage] table_stats available:', 
                dashboardData && dashboardData.table_stats ? dashboardData.table_stats.available : 'undefined');
            console.log('[DashboardPage] order_stats total:', 
                dashboardData && dashboardData.order_stats ? dashboardData.order_stats.total_orders : 'undefined');
            console.log('[DashboardPage] revenue total:', 
                dashboardData && dashboardData.revenue ? dashboardData.revenue.total : 'undefined');
            
            // Update table stats jika tersedia
            if (dashboardData && dashboardData.table_stats) {
                const tableStats = dashboardData.table_stats;
                document.getElementById('available-tables').textContent = tableStats.available || 0;
                document.getElementById('occupied-tables').textContent = tableStats.occupied || 0;
                document.getElementById('dirty-tables').textContent = tableStats.dirty || 0;
            } else {
                console.warn('[DashboardPage] No table_stats found in data');
            }
            
            // Update order stats
            if (dashboardData && dashboardData.order_stats) {
                // Pastikan nilai-nilai ada sebelum memperbarui DOM
                const orderStats = dashboardData.order_stats;
                
                // Update total dan today orders (bisa dari property yang berbeda)
                const totalOrders = dashboardData.total_orders || 
                                    (orderStats && orderStats.total_orders) || 0;
                const todayOrders = dashboardData.today_orders || 
                                    (orderStats && orderStats.today_orders) || 0;
                
                document.getElementById('total-orders').textContent = totalOrders;
                document.getElementById('today-orders').textContent = todayOrders;
                
                // Update order status chart jika tersedia
                if (this.charts && this.charts.orderStatus) {
                    console.log('[DashboardPage] Passing order_stats to chart update:', orderStats);
                    
                    // Check untuk order_status property yang valid
                    if (!orderStats.order_status) {
                        console.log('[DashboardPage] Creating order_status object from individual status counts');
                        
                        // Jika tidak ada order_status property, coba buat dari status individu
                        orderStats.order_status = {
                            'pending_payment': orderStats.pending_payment || 0,
                            'paid': orderStats.paid || 0, 
                            'in_progress': orderStats.in_progress || 0,
                            'ready': orderStats.ready || 0,
                            'completed': orderStats.completed || 0
                        };
                    }
                    
                    this.updateOrderStatusChart(orderStats);
                }
            } else {
                console.warn('[DashboardPage] No order_stats found in data');
                
                // Fallback: check if individual order status properties exist at top level
                const fallbackOrderStats = {
                    'pending_payment': dashboardData.pending_payment || 0,
                    'paid': dashboardData.paid || 0,
                    'in_progress': dashboardData.in_progress || 0,
                    'ready': dashboardData.ready || 0,
                    'completed': dashboardData.completed || 0
                };
                
                // Check if any valid data exists
                const hasAnyStats = Object.values(fallbackOrderStats).some(val => val > 0);
                
                if (hasAnyStats && this.charts && this.charts.orderStatus) {
                    console.log('[DashboardPage] Using fallback order stats from top level data');
                    this.updateOrderStatusChart({
                        order_status: fallbackOrderStats
                    });
                }
            }
            
            // Update revenue
            const revenue = dashboardData && dashboardData.revenue ? dashboardData.revenue : 
                           {total: dashboardData.total_revenue || 0, today: dashboardData.today_revenue || 0};
            
            if (revenue) {
                document.getElementById('total-revenue').textContent = this.formatCurrency(revenue.total || 0);
                document.getElementById('today-revenue').textContent = this.formatCurrency(revenue.today || 0);
                
                // Update revenue chart jika tersedia
                if (dashboardData.revenue_trend && this.charts && this.charts.revenue) {
                    this.updateRevenueTrend(dashboardData);
                }
            } else {
                console.warn('[DashboardPage] No revenue data found');
            }
            
            // Update avg cooking time
            const avgCookingTime = dashboardData && dashboardData.avg_cooking_time !== undefined 
                                 ? dashboardData.avg_cooking_time : 0;
            document.getElementById('avg-cooking-time').textContent = `${Math.round(avgCookingTime)} min`;
            
            // Update payment stats
            if (dashboardData && dashboardData.payment_stats && this.charts && this.charts.paymentMethods) {
                const paymentStats = dashboardData.payment_stats;
                
                // Check if payment_stats contains payment_methods
                if (paymentStats.payment_methods) {
                    this.updatePaymentMethodsChart(paymentStats.payment_methods);
                } else {
                    // Fallback if payment_methods doesn't exist but payment_stats does
                    const simplePaymentStats = {
                        'Pending': paymentStats.pending || 0,
                        'Success': paymentStats.success || 0
                    };
                    this.updatePaymentMethodsChart(simplePaymentStats);
                }
            } else {
                console.warn('[DashboardPage] No payment_stats found in data');
            }
            
            // Jika ada data populer item
            if (dashboardData && dashboardData.popular_items) {
                this.updatePopularItems(dashboardData.popular_items);
            }
            
            // Update recent orders jika diperlukan berdasarkan tipe data
            if (dashboardData && (dashboardData.data_type === "order_update" || dashboardData.data_type === "payment_success")) {
                this.updateRecentOrders();
            }
            
            console.log('[DashboardPage] Dashboard stats updated successfully');
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    async initializeCharts() {
        try {
            console.log('[DashboardPage] Initializing charts...');
            
            // Order Status Chart
            const orderStatusCtx = document.getElementById('order-status-chart');
            if (orderStatusCtx) {
                console.log('[DashboardPage] Initializing order status chart');
                
                this.charts.orderStatus = new Chart(orderStatusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Menunggu Pembayaran', 'Sudah Dibayar', 'Sedang Diproses', 'Siap Diambil', 'Selesai'],
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
                                position: 'bottom',
                                labels: {
                                    font: {
                                        size: 11
                                    },
                                    padding: 10
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        return `${label}: ${value}`;
                                    }
                                }
                            }
                        }
                    }
                });
                console.log('[DashboardPage] Order status chart initialized successfully');
            } else {
                console.warn('[DashboardPage] Order status chart container not found');
            }

            // Payment Stats Chart
            const paymentStatsCtx = document.getElementById('payment-stats-chart');
            if (paymentStatsCtx) {
                console.log('[DashboardPage] Initializing payment stats chart');
                
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
                
                // Store reference to payment methods chart
                this.charts.paymentMethods = this.charts.paymentStats;
                console.log('[DashboardPage] Payment stats chart initialized successfully');
            } else {
                console.warn('[DashboardPage] Payment stats chart container not found');
            }

            // Revenue Chart
            const revenueChartCtx = document.getElementById('revenue-chart');
            if (revenueChartCtx) {
                console.log('[DashboardPage] Initializing revenue chart');
                
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
                console.log('[DashboardPage] Revenue chart initialized successfully');
            } else {
                console.warn('[DashboardPage] Revenue chart container not found');
            }
            
            console.log('[DashboardPage] All charts initialized');
        } catch (error) {
            console.error('[DashboardPage] Error initializing charts:', error);
        }
    }

    updateOrderStatusChart(orderStats) {
        if (!this.charts.orderStatus) {
            console.warn('[DashboardPage] Order status chart not initialized');
            return;
        }
        
        try {
            console.log('[DashboardPage] Updating order status chart with data:', orderStats);
            
            // Extrak status jika ada dalam format khusus
            let statusData = orderStats.order_status;
            
            // Jika tidak ada order_status, buat dari properti individu
            if (!statusData) {
                console.log('[DashboardPage] No order_status object found, creating from individual properties');
                statusData = {
                    'pending_payment': orderStats.pending_payment || 0,
                    'paid': orderStats.paid || 0,
                    'in_progress': orderStats.in_progress || 0,
                    'ready': orderStats.ready || 0,
                    'completed': orderStats.completed || 0
                };
            }
            
            // Verifikasi data status ada
            if (!statusData || Object.keys(statusData).length === 0) {
                console.warn('[DashboardPage] No valid order status data found');
                return;
            }
            
            console.log('[DashboardPage] Prepared order status data:', statusData);
            
            // Extract labels and values
            const statusLabels = Object.keys(statusData).map(status => this.formatStatus(status));
            const statusValues = Object.values(statusData).map(value => parseInt(value) || 0);
            
            console.log('[DashboardPage] Status labels:', statusLabels);
            console.log('[DashboardPage] Status values:', statusValues);
            
            // Update chart data
            this.charts.orderStatus.data.labels = statusLabels;
            this.charts.orderStatus.data.datasets[0].data = statusValues;
            
            // Force update the chart
            this.charts.orderStatus.update();
            
            console.log('[DashboardPage] Order status chart updated successfully');
        } catch (error) {
            console.error('Error updating order status chart:', error);
        }
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
        if (!this.charts.revenue || !data.revenue_trend) return;
        
        try {
            // Get current chart data
            const currentLabels = this.charts.revenue.data.labels;
            const currentData = this.charts.revenue.data.datasets[0].data;
            
            // Update data with new trend
            const updatedLabels = data.revenue_trend.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('id-ID', { weekday: 'short' });
            });
            
            const updatedValues = data.revenue_trend.map(item => item.amount);
            
            // Update chart data
            this.charts.revenue.data.labels = updatedLabels;
            this.charts.revenue.data.datasets[0].data = updatedValues;
            this.charts.revenue.update('active');
            
            console.log('[DashboardPage] Revenue chart updated with new trend data');
        } catch (error) {
            console.error('Error updating revenue trend:', error);
        }
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL}/admin/orders/getflow`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recent orders');
            }

            const result = await response.json();
            
            const ordersList = document.getElementById('recent-orders-list');
            if (!ordersList) {
                return;
            }

            const recentOrders = result.data?.data?.recent_orders || [];

            if (recentOrders.length === 0) {
                ordersList.innerHTML = '<div class="no-orders">Tidak ada order terbaru</div>';
                return;
            }

            ordersList.innerHTML = recentOrders.slice(0, 5).map(order => {
                const totalAmount = parseFloat(order.total) || 0;
                
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
        if (amount === null || amount === undefined || isNaN(amount)) {
            return 'Rp 0';
        }
        
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        
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
        // Map status codes to readable labels
        const statusMap = {
            'pending_payment': 'Menunggu Pembayaran',
            'paid': 'Sudah Dibayar',
            'in_progress': 'Sedang Diproses',
            'ready': 'Siap Diambil',
            'completed': 'Selesai'
        };
        
        // If status exists in map, return mapped value
        if (statusMap[status]) {
            return statusMap[status];
        }
        
        // Otherwise, format with capitalization
        return status.replace(/_/g, ' ')
                     .replace(/\b\w/g, char => char.toUpperCase());
    }

    updatePaymentMethodsChart(paymentMethods) {
        if (!this.charts.paymentMethods || !paymentMethods) {
            console.warn('[DashboardPage] Cannot update payment methods chart, chart or data not available', 
                        { chartExists: !!this.charts.paymentMethods, dataExists: !!paymentMethods });
            return;
        }
        
        try {
            console.log('[DashboardPage] Updating payment methods chart with:', paymentMethods);
            
            // Convert data to arrays for chart
            const methodLabels = Object.keys(paymentMethods);
            const methodValues = Object.values(paymentMethods);
            
            if (methodLabels.length === 0 || methodValues.length === 0) {
                console.warn('[DashboardPage] Payment methods data is empty');
                return;
            }
            
            // Update chart data
            this.charts.paymentMethods.data.labels = methodLabels;
            this.charts.paymentMethods.data.datasets[0].data = methodValues;
            
            // Find suitable colors for the chart based on the number of payment methods
            const colorPalette = [
                '#fbbf24', // amber
                '#22c55e', // green
                '#60a5fa', // blue
                '#a78bfa', // violet
                '#f43f5e', // rose
                '#34d399', // emerald
                '#fb7185', // pink
                '#38bdf8'  // sky
            ];
            
            // Create colors array to match labels length
            const colors = methodLabels.map((_, index) => colorPalette[index % colorPalette.length]);
            this.charts.paymentMethods.data.datasets[0].backgroundColor = colors;
            
            // Update chart
            this.charts.paymentMethods.update('active');
            
            console.log('[DashboardPage] Payment methods chart updated successfully');
        } catch (error) {
            console.error('Error updating payment methods chart:', error);
        }
    }

    updatePopularItems(popularItems) {
        if (!popularItems || !popularItems.length) return;
        
        try {
            const popularItemsContainer = document.getElementById('popular-items-container');
            if (!popularItemsContainer) return;
            
            popularItemsContainer.innerHTML = '';
            
            popularItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'popular-item';
                itemElement.innerHTML = `
                    <div class="popular-item-details">
                        <h4>${item.name}</h4>
                        <p>${this.formatCurrency(item.price)} · ${item.orders_count} orders</p>
                    </div>
                    <div class="popular-item-indicator ${item.trend === 'up' ? 'trend-up' : item.trend === 'down' ? 'trend-down' : ''}">
                        ${item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : ''}
                    </div>
                `;
                popularItemsContainer.appendChild(itemElement);
            });
            
            console.log('[DashboardPage] Popular items updated');
        } catch (error) {
            console.error('Error updating popular items:', error);
        }
    }
}

// Initialize the dashboard page
window.dashboardPage = new DashboardPage();

// Register the dashboard page with the router
window.router.addRoute('dashboard', async () => {
    await window.dashboardPage.initialize();
}); 