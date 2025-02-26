import { api } from '../utils/api.js';

export class ReportCharts {
    constructor() {
        this.initializeCharts();
    }

    async initializeCharts() {
        try {
            const stats = await api.getDashboardStats();
            this.initRevenueTrendChart(stats.revenue_trend);
            this.initCategoryChart(stats.category_sales);
            this.initPeakHoursChart(stats.peak_hours);
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    initRevenueTrendChart(data) {
        const ctx = document.getElementById('revenueTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Revenue',
                    data: data.map(item => item.amount),
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

    initCategoryChart(data) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.category),
                datasets: [{
                    data: data.map(item => item.sales),
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

    initPeakHoursChart(data) {
        const ctx = document.getElementById('peakHoursChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.hour),
                datasets: [{
                    label: 'Orders',
                    data: data.map(item => item.order_count),
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