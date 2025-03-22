class OrdersPage {
    constructor() {
        this.orders = [];
        this.currentFilter = 'completed';
        this.dateFilter = 'all'; // 'today', 'week', 'month', 'all'
    }

    async fetchOrders() {
        try {
            // Dapatkan ID chef yang sedang login
            const currentUserId = this.getCurrentUserId();
            
            // Fetch order data
            const response = await fetch('http://localhost:8080/admin/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch orders');
            
            const data = await response.json();
            if (data.status) {
                // Filter hanya orders yang dimasak oleh chef ini
                this.orders = data.data.filter(order => 
                    order.chef_id === currentUserId && 
                    ['ready', 'completed'].includes(order.status)
                );
                
                // Terapkan filter waktu
                this.filterByDate();
                
                console.log('Filtered orders:', this.orders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    filterByDate() {
        if (this.dateFilter === 'all') return;
        
        const now = new Date();
        let startDate;
        
        switch (this.dateFilter) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            default:
                return;
        }
        
        this.orders = this.orders.filter(order => {
            const finishDate = order.finish_cooking_time ? new Date(order.finish_cooking_time) : null;
            return finishDate && finishDate >= startDate;
        });
    }

    getFilteredOrders() {
        // Filter berdasarkan status
        return this.orders.filter(order => {
            if (this.currentFilter === 'completed') {
                return ['ready', 'completed'].includes(order.status);
            }
            return order.status.toLowerCase() === this.currentFilter;
        });
    }

    formatTime(timestamp) {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
        });
    }
    
    // Menghitung durasi memasak dalam format menit:detik
    calculateCookingTime(order) {
        if (!order.start_cooking_time || !order.finish_cooking_time) {
            return '-';
        }
        
        const startTime = new Date(order.start_cooking_time);
        const finishTime = new Date(order.finish_cooking_time);
        
        // Hitung selisih dalam milidetik
        const durationMs = finishTime - startTime;
        
        // Konversi ke menit dan detik
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        
        return `${minutes} menit ${seconds} detik`;
    }
    
    // Get current user ID from token
    getCurrentUserId() {
        // Gunakan getCurrentUser dari dashboardPage jika tersedia
        if (window.dashboardPage && typeof window.dashboardPage.getCurrentUserId === 'function') {
            return window.dashboardPage.getCurrentUserId();
        }
        
        // Fallback jika dashboardPage tidak tersedia
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            
            // Decode token untuk mendapatkan user ID
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            return payload.user_id || null;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    async render() {
        // Get target container
        const container = document.getElementById('content');
        if (!container) return;
        
        await this.fetchOrders();
        
        // Hitung total waktu memasak
        let totalCookingTime = 0;
        let orderCount = 0;
        
        this.orders.forEach(order => {
            if (order.start_cooking_time && order.finish_cooking_time) {
                const startTime = new Date(order.start_cooking_time);
                const finishTime = new Date(order.finish_cooking_time);
                const durationMs = finishTime - startTime;
                
                if (durationMs > 0) {
                    totalCookingTime += durationMs;
                    orderCount++;
                }
            }
        });
        
        // Hitung rata-rata waktu memasak
        let avgCookingTimeStr = '-';
        if (orderCount > 0) {
            const avgMs = totalCookingTime / orderCount;
            const avgMinutes = Math.floor(avgMs / 60000);
            const avgSeconds = Math.floor((avgMs % 60000) / 1000);
            avgCookingTimeStr = `${avgMinutes} menit ${avgSeconds} detik`;
        }

        container.innerHTML = `
            <div class="page-header">
                <h1>Riwayat Pesanan</h1>
                <p>Daftar pesanan yang telah selesai dimasak oleh Anda</p>
            </div>
            
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-icon completed">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-data">
                        <span class="stat-value">${this.orders.length}</span>
                        <span class="stat-label">Total Pesanan Selesai</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon time">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-data">
                        <span class="stat-value">${avgCookingTimeStr}</span>
                        <span class="stat-label">Rata-rata Waktu Memasak</span>
                    </div>
                </div>
            </div>
            
            <div class="filter-container">
                <div class="orders-filter">
                    <button class="filter-btn ${this.currentFilter === 'ready' ? 'active' : ''}"
                            onclick="ordersPage.setFilter('ready')">
                        Siap Disajikan
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'completed' ? 'active' : ''}"
                            onclick="ordersPage.setFilter('completed')">
                        Semua Selesai
                    </button>
                </div>
                
                <div class="date-filter">
                    <label>Filter Waktu:</label>
                    <select onchange="ordersPage.setDateFilter(this.value)" class="date-select">
                        <option value="all" ${this.dateFilter === 'all' ? 'selected' : ''}>Semua Waktu</option>
                        <option value="today" ${this.dateFilter === 'today' ? 'selected' : ''}>Hari Ini</option>
                        <option value="week" ${this.dateFilter === 'week' ? 'selected' : ''}>7 Hari Terakhir</option>
                        <option value="month" ${this.dateFilter === 'month' ? 'selected' : ''}>30 Hari Terakhir</option>
                    </select>
                </div>
            </div>

            <div class="completed-orders-table">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Meja</th>
                                <th>Waktu Pemesanan</th>
                                <th>Mulai Dimasak</th>
                                <th>Selesai Dimasak</th>
                                <th>Durasi Memasak</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getFilteredOrders().length > 0 ? this.getFilteredOrders().map(order => {
                                return `
                                    <tr class="order-row ${order.status.toLowerCase()}">
                                        <td>#${order.id}</td>
                                        <td>
                                            <div class="table-number">
                                                <i class="fas fa-table"></i>
                                                <span>Meja ${order.table && order.table.number ? order.table.number : order.table_id}</span>
                                            </div>
                                        </td>
                                        <td>${this.formatTime(order.created_at)}</td>
                                        <td>${this.formatTime(order.start_cooking_time)}</td>
                                        <td>${this.formatTime(order.finish_cooking_time)}</td>
                                        <td>${this.calculateCookingTime(order)}</td>
                                        <td>
                                            <span class="status-badge ${order.status.toLowerCase()}">
                                                ${order.status === 'ready' ? 'Siap' : 'Selesai'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn-view" onclick="ordersPage.viewOrderDetails(${order.id})">
                                                <i class="fas fa-eye"></i>
                                                <span>Detail</span>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('') : `
                                <tr>
                                    <td colspan="8" class="no-orders">
                                        <div class="no-data-message">
                                            <i class="fas fa-clipboard-list"></i>
                                            <h3>Belum ada riwayat pesanan</h3>
                                            <p>Pesanan yang sudah Anda selesaikan akan muncul di sini</p>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async setFilter(filter) {
        this.currentFilter = filter;
        await this.render();
    }
    
    async setDateFilter(filter) {
        this.dateFilter = filter;
        await this.render();
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detail Pesanan #${order.id}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="order-meta">
                        <div class="detail-group">
                            <label>Nomor Meja:</label>
                            <span>Meja ${order.table && order.table.number ? order.table.number : order.table_id}</span>
                        </div>
                        <div class="detail-group">
                            <label>Pelanggan:</label>
                            <span>${order.customer && order.customer.name ? order.customer.name : `Pelanggan #${order.customer_id}`}</span>
                        </div>
                        <div class="detail-group">
                            <label>Status:</label>
                            <span class="status-badge ${order.status.toLowerCase()}">${order.status === 'ready' ? 'Siap' : 'Selesai'}</span>
                        </div>
                        <div class="detail-group">
                            <label>Waktu Pemesanan:</label>
                            <span>${this.formatTime(order.created_at)}</span>
                        </div>
                        <div class="detail-group">
                            <label>Waktu Mulai Memasak:</label>
                            <span>${this.formatTime(order.start_cooking_time)}</span>
                        </div>
                        <div class="detail-group">
                            <label>Waktu Selesai Memasak:</label>
                            <span>${this.formatTime(order.finish_cooking_time)}</span>
                        </div>
                        <div class="detail-group">
                            <label>Durasi Memasak:</label>
                            <span>${this.calculateCookingTime(order)}</span>
                        </div>
                        <div class="detail-group">
                            <label>Total Harga:</label>
                            <span>Rp ${order.total_amount.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    
                    <h4>Daftar Menu</h4>
                    <div class="detail-items">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Menu</th>
                                    <th>Jumlah</th>
                                    <th>Harga</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.order_items && order.order_items.map(item => `
                                    <tr>
                                        <td>
                                            <div class="item-name">${item.menu ? item.menu.name : 'Menu tidak ditemukan'}</div>
                                            ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                                        </td>
                                        <td>${item.quantity}x</td>
                                        <td>Rp ${item.price.toLocaleString('id-ID')}</td>
                                        <td>Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="total-label">Total</td>
                                    <td class="total-value">Rp ${order.total_amount.toLocaleString('id-ID')}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    onMount() {
        // Render saat komponen dimount
        this.render();
        
        // Subscribe to WebSocket events
        if (window.wsClient) {
            window.addEventListener('orderUpdate', () => {
                this.render();
            });
        }
    }

    onUnmount() {
        // Cleanup WebSocket events
        window.removeEventListener('orderUpdate', this.handleOrderUpdate);
    }
}

// Initialize orders page
const ordersPage = new OrdersPage();
window.router.addRoute('orders', ordersPage); 