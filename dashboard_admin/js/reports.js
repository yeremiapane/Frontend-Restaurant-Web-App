class ReportsPage {
    constructor() {
        this.initialized = false;
        this.charts = {};
        this.registerRoute();
        window.router.registerPageInstance('reports', this);
    }

    registerRoute() {
        if (window.router) {
            console.log('Registering reports route');
            window.router.addRoute('reports', () => this.initialize());
        } else {
            console.error('Router not initialized');
        }
    }

    cleanup() {
        // Destroy semua chart yang ada
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
        this.initialized = false;
    }

    async initialize() {
        console.log('Initializing reports page');
        this.cleanup();

        try {
            const content = await this.render();
            const contentContainer = document.getElementById('content-container');
            if (contentContainer) {
                contentContainer.innerHTML = content;
                
                await this.loadReportData();
                this.setupEventListeners();
                this.setupWebSocketListeners();
                this.initialized = true;
                console.log('Reports page initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing reports page:', error);
            const contentContainer = document.getElementById('content-container');
            if (contentContainer) {
                contentContainer.innerHTML = '<div class="error">Error loading reports page: ' + error.message + '</div>';
            }
        }
    }

    async render() {
        return `
            <div class="reports-page">
                <div class="page-header">
                    <h1>Menu Reports & Analytics</h1>
                    <div class="header-actions">
                        <div class="date-filter">
                            <select id="period-filter" class="period-select">
                                <option value="today">Hari Ini</option>
                                <option value="week">7 Hari Terakhir</option>
                                <option value="month">30 Hari Terakhir</option>
                                <option value="year">Tahun Ini</option>
                            </select>
                        </div>
                        <button id="export-btn" class="export-btn">
                            <i class="fas fa-download"></i> Export Data
                        </button>
                    </div>
                </div>

                <!-- Export Modal -->
                <div id="export-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Export Data</h2>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="export-options">
                                <div class="export-type">
                                    <h3>Pilih Jenis Export</h3>
                                    <div class="radio-group">
                                        <label>
                                            <input type="radio" name="export-type" value="data" checked>
                                            Data Saja (CSV)
                                        </label>
                                        <label>
                                            <input type="radio" name="export-type" value="pdf">
                                            Laporan PDF (dengan Grafik)
                                        </label>
                                    </div>
                                </div>
                                <div class="date-range">
                                    <h3>Pilih Rentang Waktu</h3>
                                    <div class="date-inputs">
                                        <div class="input-group">
                                            <label>Dari Tanggal</label>
                                            <input type="date" id="start-date">
                                        </div>
                                        <div class="input-group">
                                            <label>Sampai Tanggal</label>
                                            <input type="date" id="end-date">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="cancel-export" class="btn-secondary">Batal</button>
                            <button id="confirm-export" class="btn-primary">Export</button>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <!-- Summary Cards -->
                    <div class="summary-cards">
                        <div class="card" id="total-sales">
                            <div class="card-content">
                                <h3>Total Penjualan</h3>
                                <div class="value">Rp 0</div>
                                <div class="trend"></div>
                            </div>
                        </div>
                        <div class="card" id="total-orders">
                            <div class="card-content">
                                <h3>Total Pesanan</h3>
                                <div class="value">0</div>
                                <div class="trend"></div>
                            </div>
                        </div>
                        <div class="card" id="avg-order">
                            <div class="card-content">
                                <h3>Rata-rata Pesanan</h3>
                                <div class="value">Rp 0</div>
                                <div class="trend"></div>
                            </div>
                        </div>
                        <div class="card" id="popular-category">
                            <div class="card-content">
                                <h3>Kategori Terlaris</h3>
                                <div class="value">-</div>
                                <div class="trend"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Section -->
                    <div class="charts-section">
                        <div class="chart-wrapper">
                            <div class="chart-container">
                                <h3>Tren Penjualan</h3>
                                <div class="chart-area">
                                    <canvas id="sales-trend-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="chart-wrapper">
                            <div class="chart-container">
                                <h3>Performa Kategori</h3>
                                <div class="chart-area">
                                    <canvas id="category-performance-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Top Selling Items -->
                    <div class="top-selling-section">
                        <h3>Menu Terlaris</h3>
                        <div class="top-selling-grid" id="top-selling-items">
                            <!-- Top selling items will be loaded here -->
                        </div>
                    </div>

                    <!-- Detailed Analytics -->
                    <div class="detailed-analytics">
                        <div class="analytics-card">
                            <h3>Analisis Waktu</h3>
                            <div class="chart-wrapper">
                                <div class="chart-area">
                                    <canvas id="peak-hours-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="analytics-card">
                            <h3>Performa Menu</h3>
                            <div class="table-wrapper">
                                <table id="menu-performance" class="performance-table">
                                    <thead>
                                        <tr>
                                            <th>Menu</th>
                                            <th>Terjual</th>
                                            <th>Pendapatan</th>
                                            <th>Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Menu performance data will be loaded here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .reports-page {
                    padding: 20px;
                    max-width: 100%;
                    overflow-x: hidden;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .period-select {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background-color: white;
                    font-size: 14px;
                }

                .dashboard-grid {
                    display: grid;
                    gap: 24px;
                    grid-template-columns: 1fr;
                }

                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                }

                .card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 20px;
                }

                .card-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .card h3 {
                    color: #64748b;
                    font-size: 14px;
                    margin: 0;
                }

                .card .value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e293b;
                }

                .charts-section {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                }

                .chart-wrapper {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 20px;
                }

                .chart-container {
                    height: 100%;
                }

                .chart-area {
                    height: 300px;
                    position: relative;
                }

                .top-selling-section {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 20px;
                }

                .top-selling-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                    margin-top: 16px;
                }

                .top-selling-item {
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                }

                .item-info h4 {
                    margin: 0 0 8px 0;
                    font-size: 16px;
                    color: #1e293b;
                }

                .item-info p {
                    margin: 4px 0;
                    color: #64748b;
                    font-size: 14px;
                }

                .detailed-analytics {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                }

                .analytics-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 20px;
                }

                .table-wrapper {
                    overflow-x: auto;
                    margin-top: 16px;
                }

                .performance-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .performance-table th,
                .performance-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e2e8f0;
                }

                .performance-table th {
                    background: #f8fafc;
                    color: #64748b;
                    font-weight: 600;
                }

                .trend-up { color: #10B981; }
                .trend-down { color: #EF4444; }
                .trend-neutral { color: #64748b; }

                @media (max-width: 768px) {
                    .reports-page {
                        padding: 16px;
                    }

                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .card .value {
                        font-size: 20px;
                    }

                    .chart-area {
                        height: 250px;
                    }
                }

                @media (max-width: 480px) {
                    .summary-cards {
                        grid-template-columns: 1fr;
                    }

                    .charts-section,
                    .detailed-analytics {
                        grid-template-columns: 1fr;
                    }

                    .chart-area {
                        height: 200px;
                    }
                }

                .error-message {
                    background-color: #FEE2E2;
                    border: 1px solid #EF4444;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }

                .error-message h3 {
                    color: #B91C1C;
                    margin: 0 0 10px 0;
                }

                .error-message p {
                    color: #7F1D1D;
                    margin: 0 0 15px 0;
                }

                .error-message button {
                    background-color: #DC2626;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                }

                .error-message button:hover {
                    background-color: #B91C1C;
                }

                .header-actions {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .export-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }

                .export-btn:hover {
                    background: #1d4ed8;
                }

                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                }

                .modal-content {
                    position: relative;
                    background: white;
                    width: 90%;
                    max-width: 500px;
                    margin: 50px auto;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #1e293b;
                }

                .close-modal {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #64748b;
                }

                .modal-body {
                    padding: 20px;
                }

                .export-options {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .export-type h3,
                .date-range h3 {
                    margin: 0 0 12px 0;
                    font-size: 1rem;
                    color: #1e293b;
                }

                .radio-group {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .radio-group label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .date-inputs {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .input-group label {
                    font-size: 0.875rem;
                    color: #64748b;
                }

                .input-group input {
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.875rem;
                }

                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .btn-primary,
                .btn-secondary {
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    cursor: pointer;
                }

                .btn-primary {
                    background: #2563eb;
                    color: white;
                    border: none;
                }

                .btn-secondary {
                    background: #f1f5f9;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                }

                .btn-primary:hover {
                    background: #1d4ed8;
                }

                .btn-secondary:hover {
                    background: #e2e8f0;
                }
            </style>
        `;
    }

    async loadReportData(force = false) {
        // Check if we need to refresh (force or more than 30 seconds since last update)
        const now = Date.now();
        if (!force && this.lastUpdate && (now - this.lastUpdate) < 30000) {
            console.log('Skipping report refresh - too soon');
            return;
        }

        // Get selected period
        const periodFilter = document.getElementById('period-filter');
        const period = periodFilter ? periodFilter.value : 'week'; // Default to week if not selected

        document.dispatchEvent(new Event('reports-loading'));
        try {
            const response = await fetch(`http://localhost:8080/admin/orders/analytics?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load report data');
            }

            const result = await response.json();
            console.log('Raw analytics response:', result);
            
            if (result.status && result.data) {
                console.log('Updating dashboard with data:', result);
                this.updateDashboard(result);
                this.lastUpdate = now;
            } else {
                console.error('Invalid data format received:', result);
                throw new Error('Invalid data format received');
            }
        } catch (error) {
            console.error('Error loading report data:', error);
            // Tampilkan pesan error ke pengguna
            const container = document.getElementById('content-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <h3>Terjadi Kesalahan</h3>
                        <p>Gagal memuat data laporan: ${error.message}</p>
                        <button onclick="window.reportsPage.loadReportData(true)">Coba Lagi</button>
                    </div>
                `;
            }
            throw error;
        } finally {
            document.dispatchEvent(new Event('reports-loaded'));
        }
    }

    updateDashboard(data) {
        console.log('Updating reports dashboard with data:', data);
        
        // Extract data from the nested structure
        const analyticsData = data.data.data;
        if (!analyticsData) {
            console.error('No analytics data found in response');
            return;
        }

        console.log('Extracted analytics data:', analyticsData);
        
        // Update summary cards
        this.updateSummaryCards(analyticsData);

        // Update charts
        this.updateCharts(analyticsData);

        // Update top selling items
        this.updateTopSelling(analyticsData);

        // Update detailed analytics
        this.updateDetailedAnalytics(analyticsData);
    }

    updateSummaryCards(data) {
        console.log('Updating summary cards with data:', data);
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR'
            }).format(amount);
        };

        // Update total sales
        const totalSalesEl = document.querySelector('#total-sales .value');
        if (totalSalesEl && data.total_sales !== undefined) {
            totalSalesEl.textContent = formatCurrency(data.total_sales);
            console.log('Updated total sales:', data.total_sales);
        }

        // Update total orders
        const totalOrdersEl = document.querySelector('#total-orders .value');
        if (totalOrdersEl && data.total_orders !== undefined) {
            totalOrdersEl.textContent = data.total_orders.toLocaleString('id-ID');
            console.log('Updated total orders:', data.total_orders);
        }

        // Update average order
        const avgOrderEl = document.querySelector('#avg-order .value');
        if (avgOrderEl && data.average_order !== undefined) {
            avgOrderEl.textContent = formatCurrency(data.average_order);
            console.log('Updated average order:', data.average_order);
        }

        // Update popular category
        const popularCategoryEl = document.querySelector('#popular-category .value');
        if (popularCategoryEl && data.popular_category) {
            popularCategoryEl.textContent = data.popular_category.name || '-';
            console.log('Updated popular category:', data.popular_category);
        }
    }

    updateCharts(data) {
        console.log('Updating charts with data:', data);
        // Destroy existing charts before creating new ones
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        
        // Wait for DOM to be ready
        setTimeout(() => {
            this.updateSalesTrendChart(data);
            this.updateCategoryPerformanceChart(data);
            this.updatePeakHoursChart(data);
        }, 100);
    }

    updateSalesTrendChart(data) {
        console.log('Updating sales trend chart with data:', data.sales_trend);
        const ctx = document.getElementById('sales-trend-chart')?.getContext('2d');
        if (!ctx) {
            console.error('Sales trend chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.salesTrend) {
            this.charts.salesTrend.destroy();
        }

        // Get current period from filter
        const periodFilter = document.getElementById('period-filter');
        const period = periodFilter ? periodFilter.value : 'week';
        console.log('Current period:', period);

        // Validate and prepare data
        let chartData = [];
        let labels = [];
        
        if (data.sales_trend && Array.isArray(data.sales_trend)) {
            console.log('Processing sales trend data:', data.sales_trend);
            chartData = data.sales_trend.map(item => {
                console.log('Processing item:', item);
                return item.amount || 0;
            });
            labels = data.sales_trend.map(item => {
                if (!item.date) return '';
                const date = new Date(item.date);
                switch(period) {
                    case 'today':
                        return date.toLocaleTimeString('id-ID', { 
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    case 'week':
                    case 'month':
                        return date.toLocaleDateString('id-ID', { 
                            day: 'numeric',
                            month: 'short'
                        });
                    case 'year':
                        return date.toLocaleDateString('id-ID', { 
                            month: 'long',
                            year: 'numeric'
                        });
                    default:
                        return date.toLocaleDateString('id-ID', { 
                            day: 'numeric',
                            month: 'short'
                        });
                }
            });
            console.log('Processed chart data:', { chartData, labels });
        } else {
            console.warn('No valid sales trend data, using empty chart');
            // Create empty data for the selected period
            const now = new Date();
            let count = 0;
            
            switch(period) {
                case 'today':
                    count = 24;
                    for (let i = 0; i < count; i++) {
                        labels.push(`${i}:00`);
                        chartData.push(0);
                    }
                    break;
                case 'week':
                    count = 7;
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(date.getDate() - i);
                        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));
                        chartData.push(0);
                    }
                    break;
                case 'month':
                    count = 30;
                    for (let i = 29; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(date.getDate() - i);
                        labels.push(date.toLocaleDateString('id-ID', { day: 'numeric' }));
                        chartData.push(0);
                    }
                    break;
                case 'year':
                    count = 12;
                    for (let i = 0; i < count; i++) {
                        const date = new Date(now);
                        date.setMonth(date.getMonth() - (11 - i));
                        labels.push(date.toLocaleDateString('id-ID', { month: 'short' }));
                        chartData.push(0);
                    }
                    break;
            }
            console.log('Created empty chart data:', { chartData, labels });
        }

        // Create new chart
        this.charts.salesTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Penjualan',
                    data: chartData,
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)'
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
                            callback: value => new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR'
                            }).format(value)
                        }
                    }
                }
            }
        });
        console.log('Chart created successfully');
    }

    updateCategoryPerformanceChart(data) {
        console.log('Updating category performance chart with data:', data.category_performance);
        const ctx = document.getElementById('category-performance-chart')?.getContext('2d');
        if (!ctx) {
            console.error('Category performance chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.categoryPerformance) {
            this.charts.categoryPerformance.destroy();
        }

        if (!data.category_performance || !Array.isArray(data.category_performance) || data.category_performance.length === 0) {
            console.warn('No category performance data available');
            // Create empty chart with placeholder data
            this.charts.categoryPerformance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Tidak ada data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e2e8f0']
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
            return;
        }

        this.charts.categoryPerformance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.category_performance.map(item => item.name),
                datasets: [{
                    data: data.category_performance.map(item => item.total),
                    backgroundColor: [
                        '#4F46E5',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                        '#8B5CF6'
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

    updatePeakHoursChart(data) {
        console.log('Updating peak hours chart with data:', data.peak_hours);
        const ctx = document.getElementById('peak-hours-chart')?.getContext('2d');
        if (!ctx) {
            console.error('Peak hours chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.peakHours) {
            this.charts.peakHours.destroy();
        }

        if (!data.peak_hours || !Array.isArray(data.peak_hours) || data.peak_hours.length === 0) {
            console.warn('No peak hours data available');
            // Create empty chart with placeholder data
            this.charts.peakHours = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Tidak ada data'],
                    datasets: [{
                        label: 'Jumlah Pesanan',
                        data: [0],
                        backgroundColor: '#e2e8f0'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            return;
        }

        this.charts.peakHours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.peak_hours.map(item => `${item.hour}:00`),
                datasets: [{
                    label: 'Jumlah Pesanan',
                    data: data.peak_hours.map(item => item.count),
                    backgroundColor: '#4F46E5'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateTopSelling(data) {
        console.log('Updating top selling items with data:', data.popular_items);
        const container = document.getElementById('top-selling-items');
        if (!container) {
            console.error('Top selling items container not found');
            return;
        }

        if (!data.popular_items || !Array.isArray(data.popular_items)) {
            console.error('Invalid popular items data:', data.popular_items);
            return;
        }

        container.innerHTML = data.popular_items.map(item => `
            <div class="top-selling-item">
                <div class="item-info">
                    <h4>${item.menu_name}</h4>
                    <p>Terjual: ${item.count}</p>
                    <p>Pendapatan: ${new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(item.revenue)}</p>
                </div>
                <div class="item-trend">
                    ${this.getTrendIcon(item.trend)}
                </div>
            </div>
        `).join('');
    }

    updateDetailedAnalytics(data) {
        console.log('Updating detailed analytics with data:', data.menu_performance);
        const tbody = document.querySelector('#menu-performance tbody');
        if (!tbody) {
            console.error('Menu performance table body not found');
            return;
        }

        if (!data.menu_performance || !Array.isArray(data.menu_performance)) {
            console.error('Invalid menu performance data:', data.menu_performance);
            return;
        }

        tbody.innerHTML = data.menu_performance.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.sold}</td>
                <td>${new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                }).format(item.revenue)}</td>
                <td>${this.getTrendIcon(item.trend)}</td>
            </tr>
        `).join('');
    }

    getTrendIcon(trend) {
        if (trend > 0) {
            return '<i class="fas fa-arrow-up trend-up"></i>';
        } else if (trend < 0) {
            return '<i class="fas fa-arrow-down trend-down"></i>';
        }
        return '<i class="fas fa-minus trend-neutral"></i>';
    }

    setupEventListeners() {
        const periodFilter = document.getElementById('period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', () => {
                console.log('Period filter changed to:', periodFilter.value);
                this.loadReportData(true); // Force refresh when period changes
            });
        }

        // Add loading indicator
        document.addEventListener('reports-loading', () => {
            const header = document.querySelector('.page-header');
            if (header) {
                const loader = document.createElement('div');
                loader.className = 'loading-indicator';
                loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memperbarui data...';
                header.appendChild(loader);
            }
        });

        // Remove loading indicator
        document.addEventListener('reports-loaded', () => {
            const loader = document.querySelector('.loading-indicator');
            if (loader) {
                loader.remove();
            }
        });

        // Export button click
        const exportBtn = document.getElementById('export-btn');
        const exportModal = document.getElementById('export-modal');
        const closeModal = document.querySelector('.close-modal');
        const cancelExport = document.getElementById('cancel-export');
        const confirmExport = document.getElementById('confirm-export');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportModal.style.display = 'block';
                // Set default dates
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                
                document.getElementById('start-date').value = lastMonth.toISOString().split('T')[0];
                document.getElementById('end-date').value = today.toISOString().split('T')[0];
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                exportModal.style.display = 'none';
            });
        }

        if (cancelExport) {
            cancelExport.addEventListener('click', () => {
                exportModal.style.display = 'none';
            });
        }

        if (confirmExport) {
            confirmExport.addEventListener('click', async () => {
                const exportType = document.querySelector('input[name="export-type"]:checked').value;
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;

                try {
                    await this.handleExport(exportType, startDate, endDate);
                    exportModal.style.display = 'none';
                } catch (error) {
                    console.error('Error exporting data:', error);
                    alert('Gagal mengekspor data. Silakan coba lagi.');
                }
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === exportModal) {
                exportModal.style.display = 'none';
            }
        });
    }

    setupWebSocketListeners() {
        // Listen for order updates
        window.addEventListener('orderUpdate', async (event) => {
            console.log('Reports: Received order update:', event.detail);
            await this.handleOrderUpdate(event.detail);
        });

        // Listen for payment updates
        window.addEventListener('paymentUpdate', async (event) => {
            console.log('Reports: Received payment update:', event.detail);
            await this.handlePaymentUpdate(event.detail);
        });

        // Listen for menu updates
        window.addEventListener('menuUpdate', async (event) => {
            console.log('Reports: Received menu update:', event.detail);
            await this.handleMenuUpdate(event.detail);
        });

        // Listen for stats updates
        window.addEventListener('statsUpdate', async (event) => {
            console.log('Reports: Received stats update:', event.detail);
            await this.handleStatsUpdate(event.detail);
        });
    }

    async handleOrderUpdate(data) {
        console.log('Handling order update in reports:', data);
        try {
            // Fetch latest analytics data
            const analyticsData = await this.fetchAnalyticsData();
            if (analyticsData) {
                // Update charts and stats
                this.updateSalesTrendChart(analyticsData);
                this.updateCategoryPerformanceChart(analyticsData);
                this.updatePeakHoursChart(analyticsData);
                this.updateTopSelling(analyticsData);
                this.updateDetailedAnalytics(analyticsData);
                this.updateSummaryCards(analyticsData);
            }
        } catch (error) {
            console.error('Error handling order update in reports:', error);
        }
    }

    async handlePaymentUpdate(data) {
        console.log('Handling payment update in reports:', data);
        try {
            const analyticsData = await this.fetchAnalyticsData();
            if (analyticsData) {
                // Update revenue related components
                this.updateSummaryCards(analyticsData);
                this.updateSalesTrendChart(analyticsData);
            }
        } catch (error) {
            console.error('Error handling payment update in reports:', error);
        }
    }

    async handleMenuUpdate(data) {
        console.log('Handling menu update in reports:', data);
        try {
            const analyticsData = await this.fetchAnalyticsData();
            if (analyticsData) {
                // Update menu related components
                this.updateCategoryPerformanceChart(analyticsData);
                this.updateDetailedAnalytics(analyticsData);
            }
        } catch (error) {
            console.error('Error handling menu update in reports:', error);
        }
    }

    async handleStatsUpdate(data) {
        console.log('Handling stats update in reports:', data);
        try {
            // Update all components with new stats
            this.updateSummaryCards(data);
            if (data.sales_trend) this.updateSalesTrendChart(data);
            if (data.category_performance) this.updateCategoryPerformanceChart(data);
            if (data.peak_hours) this.updatePeakHoursChart(data);
            if (data.popular_items) this.updateTopSelling(data);
            if (data.menu_performance) this.updateDetailedAnalytics(data);
        } catch (error) {
            console.error('Error handling stats update in reports:', error);
        }
    }

    async fetchAnalyticsData() {
        try {
            const response = await fetch('http://localhost:8080/admin/orders/analytics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const result = await response.json();
            return result.data.data;
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            return null;
        }
    }

    async handleExport(type, startDate, endDate) {
        try {
            const token = localStorage.getItem('auth_token');
            let endpointUrl;
            
            // Validate dates
            if (!startDate || !endDate) {
                throw new Error('Tanggal awal dan akhir harus diisi');
            }

            if (new Date(startDate) > new Date(endDate)) {
                throw new Error('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
            }

            // Show loading state
            const confirmExportBtn = document.getElementById('confirm-export');
            if (confirmExportBtn) {
                confirmExportBtn.disabled = true;
                confirmExportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengekspor...';
            }

            if (type === 'data') {
                endpointUrl = `http://localhost:8080/admin/reports/export?start_date=${startDate}&end_date=${endDate}`;
            } else {
                endpointUrl = `http://localhost:8080/admin/reports/export-pdf?start_date=${startDate}&end_date=${endDate}`;
            }

            const response = await fetch(endpointUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mengekspor data');
            }

            // Handle the response based on type
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `report_${startDate}_${endDate}.${type === 'data' ? 'csv' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            // Show success message
            alert('Data berhasil diekspor!');

        } catch (error) {
            console.error('Error in handleExport:', error);
            alert(error.message || 'Gagal mengekspor data. Silakan coba lagi.');
        } finally {
            // Reset button state
            const confirmExportBtn = document.getElementById('confirm-export');
            if (confirmExportBtn) {
                confirmExportBtn.disabled = false;
                confirmExportBtn.innerHTML = 'Export';
            }
        }
    }
}

// Initialize the reports page after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Creating ReportsPage instance');
    window.reportsPage = new ReportsPage();
}); 