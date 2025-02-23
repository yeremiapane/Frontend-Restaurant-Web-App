export class ReportCharts {
    constructor() {
        this.initializeCharts();
    }

    initializeCharts() {
        this.initRevenueTrendChart();
        this.initCategoryChart();
        this.initPeakHoursChart();
    }

    initRevenueTrendChart() {
        const ctx = document.getElementById('revenueTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [1200000, 1500000, 1300000, 1800000, 2000000, 2500000, 2200000],
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
                            callback: value => `Rp ${value/1000000}M`
                        }
                    }
                }
            }
        });
    }

    initCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Main Course', 'Beverages', 'Desserts', 'Appetizers'],
                datasets: [{
                    data: [40, 25, 20, 15],
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

    initPeakHoursChart() {
        const ctx = document.getElementById('peakHoursChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
                datasets: [{
                    label: 'Orders',
                    data: [15, 30, 25, 18, 35, 28],
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
} 