class ReportManager {
    constructor() {
        this.charts = {};
        this.currentDateRange = 'month';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.loadReportData();
        this.renderBestSellingItems();
    }

    setupEventListeners() {
        // Date range filter
        const dateRange = document.getElementById('dateRange');
        dateRange.addEventListener('change', (e) => {
            this.currentDateRange = e.target.value;
            this.loadReportData();
        });

        // Export buttons
        document.getElementById('exportPDF').addEventListener('click', () => this.exportReport('pdf'));
        document.getElementById('exportExcel').addEventListener('click', () => this.exportReport('excel'));

        // Chart period filters
        document.querySelectorAll('.chart-filters').forEach(filterGroup => {
            filterGroup.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const buttons = filterGroup.querySelectorAll('button');
                    buttons.forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    const chartId = filterGroup.closest('.chart-container').querySelector('canvas').id;
                    this.updateChartPeriod(chartId, e.target.textContent.toLowerCase());
                }
            });
        });
    }

    initializeCharts() {
        // Revenue Chart
        this.charts.revenue = new Chart(document.getElementById('revenueChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: '#2A9D8F',
                    backgroundColor: 'rgba(42, 157, 143, 0.1)',
                    fill: true,
                    tension: 0.4
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
                            callback: value => `Rp ${this.formatNumber(value)}`
                        }
                    }
                }
            }
        });

        // Orders Chart
        this.charts.orders = new Chart(document.getElementById('ordersChart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Orders',
                    data: [],
                    backgroundColor: '#E9C46A'
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
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Peak Hours Chart
        this.charts.peakHours = new Chart(document.getElementById('peakHoursChart'), {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Orders',
                    data: [],
                    borderColor: '#264653',
                    backgroundColor: 'rgba(38, 70, 83, 0.1)',
                    fill: true,
                    tension: 0.4
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
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    async loadReportData() {
        try {
            // Simulate API call
            const data = await this.fetchReportData(this.currentDateRange);
            this.updateCharts(data);
            this.updateSummaryCards(data.summary);
        } catch (error) {
            console.error('Error loading report data:', error);
            this.showToast('Failed to load report data', 'error');
        }
    }

    updateCharts(data) {
        // Update Revenue Chart
        this.charts.revenue.data.labels = data.revenue.labels;
        this.charts.revenue.data.datasets[0].data = data.revenue.data;
        this.charts.revenue.update();

        // Update Orders Chart
        this.charts.orders.data.labels = data.orders.labels;
        this.charts.orders.data.datasets[0].data = data.orders.data;
        this.charts.orders.update();

        // Update Peak Hours Chart
        this.charts.peakHours.data.datasets[0].data = data.peakHours;
        this.charts.peakHours.update();
    }

    updateSummaryCards(summary) {
        document.querySelector('.summary-card .amount').textContent = 
            `Rp ${this.formatNumber(summary.revenue)}`;
        document.querySelectorAll('.summary-card .amount')[1].textContent = 
            this.formatNumber(summary.orders);
        document.querySelectorAll('.summary-card .amount')[2].textContent = 
            `Rp ${this.formatNumber(summary.averageOrder)}`;
        document.querySelectorAll('.summary-card .amount')[3].textContent = 
            this.formatNumber(summary.customers);
    }

    renderBestSellingItems() {
        const tbody = document.querySelector('.data-table tbody');
        const items = [
            { name: 'Nasi Goreng Spesial', quantity: 256, revenue: 8960000 },
            { name: 'Es Teh Manis', quantity: 428, revenue: 3424000 },
            { name: 'Ayam Goreng', quantity: 185, revenue: 5550000 },
            { name: 'Mie Goreng', quantity: 142, revenue: 4260000 },
            { name: 'Es Jeruk', quantity: 315, revenue: 2520000 }
        ];

        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>Rp ${this.formatNumber(item.revenue)}</td>
            </tr>
        `).join('');
    }

    updateChartPeriod(chartId, period) {
        // Simulate updating chart data based on period
        this.loadReportData();
    }

    async exportReport(type) {
        try {
            this.showToast(`Exporting report as ${type.toUpperCase()}...`, 'success');
            // Implement actual export logic here
            await new Promise(resolve => setTimeout(resolve, 1500));
            this.showToast(`Report exported successfully`, 'success');
        } catch (error) {
            this.showToast('Failed to export report', 'error');
        }
    }

    formatNumber(number) {
        return number.toLocaleString('id-ID');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    // Simulate API call
    async fetchReportData(dateRange) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate sample data
        const days = 30;
        const revenue = {
            labels: Array.from({length: days}, (_, i) => `Day ${i + 1}`),
            data: Array.from({length: days}, () => Math.floor(Math.random() * 1000000) + 500000)
        };

        const orders = {
            labels: Array.from({length: days}, (_, i) => `Day ${i + 1}`),
            data: Array.from({length: days}, () => Math.floor(Math.random() * 50) + 20)
        };

        const peakHours = Array.from({length: 24}, () => Math.floor(Math.random() * 20) + 5);

        return {
            revenue,
            orders,
            peakHours,
            summary: {
                revenue: 12345678,
                orders: 1234,
                averageOrder: 85000,
                customers: 856
            }
        };
    }
}

// Initialize
let reportManager;
document.addEventListener('DOMContentLoaded', () => {
    reportManager = new ReportManager();
}); 