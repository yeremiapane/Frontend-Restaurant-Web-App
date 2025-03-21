class DashboardPage {
    constructor() {
        this.stats = {
            total: 0,
            pending: 0,
            preparing: 0,
            ready: 0
        };
        this.recentOrders = [];
        this.container = document.getElementById('content');
    }

    async fetchStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/admin/kitchen/display', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            if (data.data) {
                // Hitung statistik dari data kitchen display
                const orders = data.data;
                this.stats = {
                    total: orders.length,
                    pending: orders.filter(order => order.status === 'pending').length,
                    preparing: orders.filter(order => order.status === 'preparing').length,
                    ready: orders.filter(order => order.status === 'ready').length
                };
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    }

    async fetchRecentOrders() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/admin/kitchen/pending-items', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recent orders');
            }

            const data = await response.json();
            if (data.data) {
                // Kelompokkan item berdasarkan order ID
                const orderMap = new Map();
                data.data.forEach(item => {
                    if (!orderMap.has(item.order_id)) {
                        orderMap.set(item.order_id, {
                            id: item.order_id,
                            status: item.status,
                            created_at: item.created_at,
                            items: []
                        });
                    }
                    orderMap.get(item.order_id).items.push({
                        ...item,
                        menu: item.menu || { name: 'Unknown Item' }
                    });
                });
                this.recentOrders = Array.from(orderMap.values());
            }
        } catch (error) {
            console.error('Error fetching recent orders:', error);
            throw error;
        }
    }

    getStatusClass(status) {
        switch (status) {
            case 'pending': return 'badge-warning';
            case 'preparing': return 'badge-info';
            case 'ready': return 'badge-success';
            default: return 'badge-secondary';
        }
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showOrderDetails(order) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detail Pesanan #${order.id}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-info">
                        <p><strong>Waktu Pesanan:</strong> ${this.formatTime(order.created_at)}</p>
                        <p><strong>Status:</strong> <span class="badge ${this.getStatusClass(order.status)}">${order.status}</span></p>
                    </div>
                    <div class="order-items">
                        <h4>Item Pesanan</h4>
                        <ul>
                            ${order.items.map(item => `
                                <li>
                                    <div class="item-info">
                                        <span class="item-name">${item.menu.name}</span>
                                        <span class="item-quantity">x${item.quantity || 1}</span>
                                    </div>
                                    ${item.notes ? `<p class="item-notes">Catatan: ${item.notes}</p>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    ${order.status === 'pending' ? `
                        <button class="btn btn-primary" onclick="window.dashboardPage.startPreparing(${order.id})">
                            Mulai Masak
                        </button>
                    ` : order.status === 'preparing' ? `
                        <button class="btn btn-success" onclick="window.dashboardPage.markAsReady(${order.id})">
                            Selesai
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary close-modal">Tutup</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close modal
        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    async render() {
        if (!this.container) {
            console.error('Container element not found');
            return;
        }

        try {
            await Promise.all([
                this.fetchStats(),
                this.fetchRecentOrders()
            ]);

            this.container.innerHTML = `
                <div class="dashboard">
                    <div class="stats-container">
                        <div class="stat-card">
                            <i class="fas fa-clipboard-list"></i>
                            <h3>Total Pesanan</h3>
                            <p>${this.stats.total || 0}</p>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-clock"></i>
                            <h3>Menunggu</h3>
                            <p>${this.stats.pending || 0}</p>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-fire"></i>
                            <h3>Dimasak</h3>
                            <p>${this.stats.preparing || 0}</p>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-check-circle"></i>
                            <h3>Siap</h3>
                            <p>${this.stats.ready || 0}</p>
                        </div>
                    </div>

                    <div class="recent-orders">
                        <h2>Pesanan Terbaru</h2>
                        ${this.recentOrders.length > 0 ? `
                            <div class="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Pesanan</th>
                                            <th>Waktu</th>
                                            <th>Item</th>
                                            <th>Status</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.recentOrders.map(order => `
                                            <tr>
                                                <td>
                                                    <a href="#" onclick="window.dashboardPage.showOrderDetails(${JSON.stringify(order).replace(/"/g, '&quot;')})">
                                                        #${order.id}
                                                    </a>
                                                </td>
                                                <td>${this.formatTime(order.created_at)}</td>
                                                <td>${order.items.length} item</td>
                                                <td>
                                                    <span class="badge ${this.getStatusClass(order.status)}">
                                                        ${order.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    ${order.status === 'pending' ? `
                                                        <button class="btn btn-primary btn-sm" onclick="window.dashboardPage.startPreparing(${order.id})">
                                                            Mulai Masak
                                                        </button>
                                                    ` : order.status === 'preparing' ? `
                                                        <button class="btn btn-success btn-sm" onclick="window.dashboardPage.markAsReady(${order.id})">
                                                            Selesai
                                                        </button>
                                                    ` : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<p class="no-orders">Tidak ada pesanan terbaru</p>'}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            this.container.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>Terjadi Kesalahan</h2>
                    <p>Gagal memuat data dashboard. Silakan coba lagi nanti.</p>
                    <button onclick="window.dashboardPage.render()">Coba Lagi</button>
                </div>
            `;
        }
    }

    async startPreparing(orderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}/start-cooking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to start preparing order');
            }

            await this.render();
        } catch (error) {
            console.error('Error starting preparation:', error);
            alert('Gagal memulai persiapan pesanan. Silakan coba lagi.');
        }
    }

    async markAsReady(orderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}/finish-cooking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to mark order as ready');
            }

            await this.render();
        } catch (error) {
            console.error('Error marking as ready:', error);
            alert('Gagal menandai pesanan sebagai siap. Silakan coba lagi.');
        }
    }

    onMount() {
        window.wsClient.addEventListener('orderUpdate', () => this.render());
    }

    onUnmount() {
        window.wsClient.removeEventListener('orderUpdate', () => this.render());
    }
}

// Initialize dashboard page
window.dashboardPage = new DashboardPage();
window.router.addRoute('dashboard', window.dashboardPage); 