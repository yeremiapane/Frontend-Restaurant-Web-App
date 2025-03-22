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
                                        <label class="radio-label">
                                            <input type="radio" name="export-type" value="data" checked>
                                            <span class="radio-custom"></span>
                                            <span class="radio-text">Data Saja (CSV)</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="export-type" value="pdf">
                                            <span class="radio-custom"></span>
                                            <span class="radio-text">Laporan PDF (dengan Grafik)</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="date-range">
                                    <h3>Pilih Rentang Waktu</h3>
                                    <div class="date-inputs">
                                        <div class="input-group">
                                            <label>Dari Tanggal</label>
                                            <input type="date" id="start-date" class="date-input">
                                        </div>
                                        <div class="input-group">
                                            <label>Sampai Tanggal</label>
                                            <input type="date" id="end-date" class="date-input">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="cancel-export" class="btn-secondary">Batal</button>
                            <button id="confirm-export" class="btn-primary">
                                <i class="fas fa-download"></i> Export
                            </button>
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
                    overflow-y: auto;
                    padding: 20px;
                    box-sizing: border-box;
                    animation: fadeIn 0.3s ease;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .modal.show {
                    opacity: 1;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-content {
                    position: relative;
                    background: white;
                    width: 90%;
                    max-width: 550px;
                    margin: 40px auto;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    animation: slideDown 0.3s ease;
                    transform: translateY(0);
                    transition: transform 0.3s ease;
                }
                
                @keyframes slideDown {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    animation: fadeIn 0.3s ease;
                }
                
                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    color: #2563eb;
                    font-weight: 500;
                }
                
                .loading-spinner i {
                    font-size: 32px;
                }
                
                .export-error {
                    background-color: #fee2e2;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-top: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                }
                
                .export-error.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .export-error .error-icon {
                    color: #dc2626;
                    font-size: 20px;
                }
                
                .export-error p {
                    margin: 0;
                    color: #b91c1c;
                    font-size: 0.95rem;
                }
                
                .export-success-notification {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    background-color: #f0fdf4;
                    border-left: 4px solid #10b981;
                    padding: 16px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 2000;
                    opacity: 0;
                    transform: translateX(30px);
                    transition: all 0.3s ease;
                }
                
                .export-success-notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .export-success-notification i {
                    color: #10b981;
                    font-size: 20px;
                }
                
                .export-success-notification span {
                    color: #064e3b;
                    font-size: 0.95rem;
                    font-weight: 500;
                }

                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #f8fafc;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #1e293b;
                    font-weight: 600;
                }

                .close-modal {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #64748b;
                    transition: color 0.2s;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                }

                .close-modal:hover {
                    color: #ef4444;
                    background-color: rgba(239, 68, 68, 0.1);
                }

                .modal-body {
                    padding: 24px;
                }

                .export-options {
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                }

                .export-type h3,
                .date-range h3 {
                    margin: 0 0 16px 0;
                    font-size: 0.95rem;
                    color: #1e293b;
                    font-weight: 600;
                }

                .radio-group {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .radio-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    padding: 8px 12px;
                    border-radius: 8px;
                    transition: background-color 0.2s;
                }

                .radio-label:hover {
                    background-color: #f1f5f9;
                }

                .radio-label input[type="radio"] {
                    position: absolute;
                    opacity: 0;
                    cursor: pointer;
                }

                .radio-custom {
                    position: relative;
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid #cbd5e1;
                    border-radius: 50%;
                    transition: all 0.2s;
                }

                .radio-label input[type="radio"]:checked + .radio-custom {
                    border-color: #2563eb;
                    background: #fff;
                }

                .radio-label input[type="radio"]:checked + .radio-custom:after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #2563eb;
                }

                .radio-text {
                    font-size: 0.95rem;
                    color: #1e293b;
                }

                .date-inputs {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 8px;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .input-group label {
                    font-size: 0.875rem;
                    color: #64748b;
                    font-weight: 500;
                }

                .date-input {
                    padding: 10px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    background-color: #f8fafc;
                    color: #1e293b;
                    transition: all 0.2s;
                    outline: none;
                }

                .date-input:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    background-color: #fff;
                }

                .modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 16px;
                    background-color: #f8fafc;
                }

                .btn-primary,
                .btn-secondary {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
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
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .btn-secondary:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }

                .btn-primary:active,
                .btn-secondary:active {
                    transform: translateY(1px);
                    box-shadow: none;
                }

                .btn-primary:disabled {
                    background: #93c5fd;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 640px) {
                    .date-inputs {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .modal-content {
                        width: 95%;
                        margin: 20px auto;
                    }

                    .modal-header,
                    .modal-body,
                    .modal-footer {
                        padding: 16px;
                    }
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
        console.log('Loading report data for period:', period);

        document.dispatchEvent(new Event('reports-loading'));
        try {
            const response = await fetch(`http://localhost:8080/admin/orders/analytics?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load report data');
            }

            const result = await response.json();
            console.log('Raw analytics response:', result);
            
            if (result.status && result.data) {
                if (period === 'today') {
                    console.log('Today sales trend data (debugging):', JSON.stringify(result.data.data.sales_trend, null, 2));
                    
                    // Jika filter 'today' tapi tidak ada data di jam tertentu, coba ambil data order hari ini
                    if (this.shouldUpdateWithOrderData(result.data.data.sales_trend)) {
                        console.log('Mencoba mendapatkan data dari orders untuk hari ini');
                        await this.updateTodaySalesTrendWithOrderData(result.data.data);
                    }
                }
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
    
    shouldUpdateWithOrderData(salesTrend) {
        // Periksa apakah data tren penjualan untuk hari ini terlalu sederhana atau tidak sesuai
        if (!salesTrend || !Array.isArray(salesTrend)) {
            console.log('Sales trend is not valid, will update with orders data');
            return true;
        }
        
        // Periksa jika semua data di jam selain 00:00 adalah 0, tapi ada pesanan sebenarnya di UI
        let nonZeroCount = 0;
        let totalAmount = 0;
        let hasDataAt00 = false;
        
        salesTrend.forEach((item, index) => {
            if (item.amount && item.amount > 0) {
                nonZeroCount++;
                totalAmount += item.amount;
                
                // Cek jika semua data ada di jam 00:00
                if (item.date === "00:00" || item.hour === 0 || index === 0) {
                    hasDataAt00 = true;
                }
            }
        });
        
        console.log(`Sales trend analysis: nonZeroCount=${nonZeroCount}, totalAmount=${totalAmount}, hasDataAt00=${hasDataAt00}`);
        
        // Jika semua nilai 0 atau semua data ada di jam 00:00
        if (nonZeroCount === 0 || (nonZeroCount === 1 && hasDataAt00)) {
            console.log('All data is zero or all at 00:00, will update with orders data');
            return true;
        }
        
        // Periksa waktu sekarang untuk memastikan kita tidak melewatkan data terbaru
        const now = new Date();
        const currentHour = now.getHours();
        
        // Selalu update jika kita berada di antara jam 12:00 - 23:59 dan tidak ada data pada jam ini
        // tapi ada pesanan yang terlihat di UI
        if (currentHour >= 12) {
            let hasDataForCurrentHour = false;
            for (const item of salesTrend) {
                if ((item.hour === currentHour || item.date === `${String(currentHour).padStart(2, '0')}:00`) && item.amount > 0) {
                    hasDataForCurrentHour = true;
                    break;
                }
            }
            
            if (!hasDataForCurrentHour) {
                console.log(`No data for current hour (${currentHour}:00), will update with orders data`);
                return true;
            }
        }
        
        return false;
    }
    
    async updateTodaySalesTrendWithOrderData(analyticsData) {
        try {
            // Ambil data pesanan hari ini
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0]; // format YYYY-MM-DD
            
            console.log('Mengambil data pesanan untuk tanggal:', formattedDate);
            
            // Mencoba endpoint yang benar untuk mendapatkan pesanan hari ini
            let url = `http://localhost:8080/admin/orders?date=${formattedDate}`;
            
            // Mencoba beberapa endpoint yang mungkin, karena kita tidak tahu persis struktur API
            let response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.log(`Endpoint ${url} tidak berhasil, mencoba alternatif...`);
                // Coba alternatif URL jika yang pertama gagal
                url = `http://localhost:8080/admin/orders/list?date=${formattedDate}`;
                response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    console.log(`Endpoint ${url} tidak berhasil, mencoba mendapatkan semua pesanan...`);
                    // Coba dapatkan semua pesanan saja jika kedua endpoint gagal
                    url = `http://localhost:8080/admin/orders`;
                    response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                }
            }
            
            if (!response.ok) {
                throw new Error(`Failed to load orders: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Orders API response:', result);
            
            if (!result.status) {
                throw new Error('Invalid response format from server');
            }
            
            // Ekstrak data pesanan, menyesuaikan dengan struktur respon
            let orders = [];
            if (result.data && Array.isArray(result.data)) {
                orders = result.data;
            } else if (result.data && result.data.orders && Array.isArray(result.data.orders)) {
                orders = result.data.orders;
            } else if (result.orders && Array.isArray(result.orders)) {
                orders = result.orders;
            }
            
            if (orders.length === 0) {
                console.warn('No orders found in API response');
                return;
            }
            
            console.log('Orders data loaded:', orders.length, 'orders found');
            
            // Filter hanya pesanan hari ini
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const todayOrders = orders.filter(order => {
                try {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= todayStart && order.status === 'completed';
                } catch (e) {
                    return false;
                }
            });
            
            console.log('Filtered today completed orders:', todayOrders.length);
            
            if (todayOrders.length === 0) {
                console.warn('No completed orders found for today');
                return;
            }
            
            // Proses data pesanan untuk membuat tren penjualan per jam
            // Buat data kosong untuk 24 jam
            const hourlyData = Array(24).fill(0);
            
            console.log('Processing today orders for hourly chart data...');
            
            todayOrders.forEach(order => {
                // Cek berbagai kemungkinan nama field untuk total
                const totalAmount = 
                    parseFloat(order.total_amount || order.total || order.amount || 0);
                
                if (order.created_at && totalAmount > 0) {
                    try {
                        const orderDate = new Date(order.created_at);
                        if (!isNaN(orderDate.getTime())) {
                            const hour = orderDate.getHours();
                            if (hour >= 0 && hour < 24) {
                                hourlyData[hour] += totalAmount;
                                console.log(`Pesanan pada jam ${hour}: +${totalAmount} (ID: ${order.id}, created: ${orderDate.toLocaleTimeString()})`);
                            }
                        }
                    } catch (e) {
                        console.warn('Error parsing order date:', e, order);
                    }
                } else {
                    console.warn('Order missing created_at or has zero amount:', order);
                }
            });
            
            console.log('Hourly sales data processed from orders:', hourlyData);
            
            // Verifikasi apakah ada data yang berhasil diproses
            const totalSalesAmount = hourlyData.reduce((sum, amount) => sum + amount, 0);
            if (totalSalesAmount <= 0) {
                console.warn('No valid sales data was processed from orders');
                return;
            }
            
            console.log('Total sales amount for today:', totalSalesAmount);
            
            // Periksa data yang sudah ada di sales_trend
            let existingTotal = 0;
            if (analyticsData.sales_trend && Array.isArray(analyticsData.sales_trend)) {
                existingTotal = analyticsData.sales_trend.reduce((sum, item) => sum + (item.amount || 0), 0);
            }
            
            console.log('Existing total in analytics data:', existingTotal);
            
            // Update sales_trend di analyticsData dengan data yang kita proses
            analyticsData.sales_trend = hourlyData.map((amount, index) => {
                return {
                    hour: index,
                    date: `${String(index).padStart(2, '0')}:00`,
                    amount: amount
                };
            });
            
            console.log('Updated sales trend data with order-based data:', analyticsData.sales_trend);
            
        } catch (error) {
            console.error('Error updating today sales trend with order data:', error);
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
        console.log('Current period for chart:', period);

        // Validate and prepare data
        let chartData = [];
        let labels = [];
        
        if (data.sales_trend && Array.isArray(data.sales_trend)) {
            console.log('Processing sales trend data:', data.sales_trend);
            
            // Untuk filter 'today', data mungkin dikirim dalam format yang berbeda
            if (period === 'today') {
                console.log('Processing data for today view');
                
                // Cek semua kemungkinan format data untuk hari ini
                if (data.sales_trend.length > 0) {
                    // Buat data kosong untuk semua jam
                    [chartData, labels] = this.createEmptyChartData(period);
                    
                    // Jika ada data dengan format jam:menit (seperti "00:00")
                    if (data.sales_trend[0].date && 
                        typeof data.sales_trend[0].date === 'string' && 
                        /^\d{2}:\d{2}$/.test(data.sales_trend[0].date)) {
                        
                        console.log('Data menggunakan format jam:menit (HH:MM)');
                        
                        // Petakan data ke slot jam yang sesuai
                        data.sales_trend.forEach(item => {
                            if (item.date && typeof item.date === 'string') {
                                const hourStr = item.date.split(':')[0];
                                const hour = parseInt(hourStr, 10);
                                
                                if (!isNaN(hour) && hour >= 0 && hour < 24) {
                                    chartData[hour] = item.amount || 0;
                                    console.log(`Memetakan data jam ${hour}: ${item.amount}`);
                                }
                            }
                        });
                    }
                    // Jika data menggunakan properti 'hour'
                    else if ('hour' in data.sales_trend[0]) {
                        data.sales_trend.forEach(item => {
                            const hour = parseInt(item.hour, 10);
                            if (!isNaN(hour) && hour >= 0 && hour < 24) {
                                chartData[hour] = item.amount || 0;
                                console.log(`Memetakan data jam ${hour}: ${item.amount}`);
                            }
                        });
                    }
                    // Jika data order menggunakan format created_at lengkap (timestamp atau ISO string)
                    else {
                        data.sales_trend.forEach(item => {
                            if (item.date) {
                                try {
                                    const date = new Date(item.date);
                                    if (!isNaN(date.getTime())) {
                                        const hour = date.getHours();
                                        if (hour >= 0 && hour < 24) {
                                            chartData[hour] = (chartData[hour] || 0) + (item.amount || 0);
                                            console.log(`Memetakan data jam ${hour}: ${item.amount}`);
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Error parsing date in sales trend:', e);
                                }
                            }
                        });
                    }
                    
                    console.log('Final chart data by hour:', { chartData, labels });
                } else {
                    console.log('Tidak ada data tren penjualan untuk hari ini');
                    // Gunakan data kosong jika tidak ada data
                    [chartData, labels] = this.createEmptyChartData(period);
                }
            } else {
                // Proses normal untuk periode selain today
                chartData = data.sales_trend.map(item => item.amount || 0);
                labels = this.processDateLabels(data.sales_trend, period);
            }
            
            console.log('Final processed chart data:', { chartData, labels });
        } else {
            console.warn('No valid sales trend data, using empty chart');
            // Create empty data for the selected period
            [chartData, labels] = this.createEmptyChartData(period);
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR'
                                }).format(context.raw || 0);
                            }
                        }
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
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
        console.log('Chart created successfully');
    }
    
    // Fungsi untuk memproses label tanggal dengan penanganan error
    processDateLabels(data, period) {
        return data.map(item => {
            // Memastikan item.date ada dan valid
            if (!item.date) {
                console.warn('Date is missing in trend item:', item);
                return 'No date';
            }
            
            // Jika item.date sudah dalam format string jam (xx:xx), gunakan langsung
            if (typeof item.date === 'string' && /^\d{1,2}:\d{2}$/.test(item.date)) {
                console.log('Date is already in time format:', item.date);
                return item.date;
            }
            
            try {
                // Coba parse date sebagai ISO string atau Unix timestamp
                let date;
                if (typeof item.date === 'number') {
                    // Jika angka asumsi Unix timestamp
                    date = new Date(item.date * 1000);
                } else {
                    // Jika string, coba parse sebagai ISO date
                    date = new Date(item.date);
                }
                
                // Validasi date sebelum memformatnya
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date value:', item.date);
                    return 'Invalid date';
                }
                
                // Format berdasarkan periode
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
                            month: 'long'
                        });
                    default:
                        return date.toLocaleDateString('id-ID', { 
                            day: 'numeric',
                            month: 'short'
                        });
                }
            } catch (error) {
                console.error('Error formatting date:', item.date, error);
                return 'Error';
            }
        });
    }
    
    // Fungsi untuk membuat data kosong untuk chart
    createEmptyChartData(period) {
        const now = new Date();
        let chartData = [];
        let labels = [];
        let count = 0;
        
        switch(period) {
            case 'today':
                count = 24;
                for (let i = 0; i < count; i++) {
                    const hour = i.toString().padStart(2, '0');
                    labels.push(`${hour}:00`);
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
                    const date = new Date(now.getFullYear(), i, 1);
                    labels.push(date.toLocaleDateString('id-ID', { month: 'short' }));
                    chartData.push(0);
                }
                break;
        }
        console.log('Created empty chart data:', { chartData, labels });
        return [chartData, labels];
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
                // Set default dates
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                
                document.getElementById('start-date').value = lastMonth.toISOString().split('T')[0];
                document.getElementById('end-date').value = today.toISOString().split('T')[0];
                
                // Tampilkan modal dengan animasi
                exportModal.style.display = 'block';
                setTimeout(() => {
                    exportModal.classList.add('show');
                }, 10);
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeExportModal());
        }

        if (cancelExport) {
            cancelExport.addEventListener('click', () => this.closeExportModal());
        }

        if (confirmExport) {
            confirmExport.addEventListener('click', async () => {
                const exportType = document.querySelector('input[name="export-type"]:checked').value;
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;

                try {
                    await this.handleExport(exportType, startDate, endDate);
                    this.closeExportModal();
                } catch (error) {
                    console.error('Error exporting data:', error);
                    this.showExportError(error.message || 'Gagal mengekspor data. Silakan coba lagi.');
                }
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === exportModal) {
                this.closeExportModal();
            }
        });
    }
    
    closeExportModal() {
        const exportModal = document.getElementById('export-modal');
        exportModal.classList.remove('show');
        // Tambahkan delay agar animasi selesai sebelum menyembunyikan
        setTimeout(() => {
            exportModal.style.display = 'none';
        }, 300);
    }
    
    showExportError(message) {
        // Menampilkan pesan error di dalam modal
        const modalBody = document.querySelector('.modal-body');
        const errorMsgEl = document.createElement('div');
        errorMsgEl.className = 'export-error';
        errorMsgEl.innerHTML = `
            <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <p>${message}</p>
        `;
        
        // Hapus pesan error sebelumnya jika ada
        const existingError = modalBody.querySelector('.export-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Tambahkan pesan error dan animasikan
        modalBody.appendChild(errorMsgEl);
        setTimeout(() => {
            errorMsgEl.classList.add('show');
        }, 10);
        
        // Hapus setelah beberapa detik
        setTimeout(() => {
            errorMsgEl.classList.remove('show');
            setTimeout(() => {
                errorMsgEl.remove();
            }, 300);
        }, 5000);
    }

    async handleExport(type, startDate, endDate) {
        try {
            const token = localStorage.getItem('token');
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
            const cancelExportBtn = document.getElementById('cancel-export');
            if (confirmExportBtn) {
                confirmExportBtn.disabled = true;
                const originalText = confirmExportBtn.innerHTML;
                confirmExportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengekspor...';
                
                // Disable cancel button juga
                if (cancelExportBtn) {
                    cancelExportBtn.disabled = true;
                }
                
                // Tambahkan overlay loading ke modal
                const modalContent = document.querySelector('.modal-content');
                const loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'loading-overlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Sedang memproses data...</span>
                    </div>
                `;
                modalContent.appendChild(loadingOverlay);

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

                // Tampilkan notifikasi sukses
                this.showExportSuccess(`Berhasil mengekspor data dalam format ${type === 'data' ? 'CSV' : 'PDF'}`);
                
                // Reset modal
                if (loadingOverlay) {
                    loadingOverlay.remove();
                }
                
                // Reset button states
                confirmExportBtn.disabled = false;
                confirmExportBtn.innerHTML = originalText;
                if (cancelExportBtn) {
                    cancelExportBtn.disabled = false;
                }
            }

        } catch (error) {
            console.error('Error in handleExport:', error);
            
            // Reset UI
            const confirmExportBtn = document.getElementById('confirm-export');
            const cancelExportBtn = document.getElementById('cancel-export');
            const loadingOverlay = document.querySelector('.loading-overlay');
            
            if (confirmExportBtn) {
                confirmExportBtn.disabled = false;
                confirmExportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
            }
            
            if (cancelExportBtn) {
                cancelExportBtn.disabled = false;
            }
            
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
            
            throw error;
        }
    }
    
    showExportSuccess(message) {
        // Tambahkan notifikasi sukses yang muncul dan hilang dengan animasi
        const notification = document.createElement('div');
        notification.className = 'export-success-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Tampilkan dengan animasi
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hilangkan setelah beberapa detik
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
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
}

// Initialize the reports page after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Creating ReportsPage instance');
    window.reportsPage = new ReportsPage();
}); 