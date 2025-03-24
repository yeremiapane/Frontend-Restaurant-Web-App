// Register the orders page with the router - dipindahkan ke atas
(function() {
    // Mencoba mendaftarkan setiap 100ms sampai router siap
    const registerRoute = function() {
        if (window.router) {
            console.log('Registering orders route...');
            window.router.addRoute('orders', async () => {
                if (!window.ordersPage) {
                    console.log('Creating OrdersPage instance');
                    window.ordersPage = new OrdersPage();
                }
                await window.ordersPage.initialize();
            });
        } else {
            console.log('Router not ready yet, retrying...');
            setTimeout(registerRoute, 100);
        }
    };
    
    // Mulai proses pendaftaran
    registerRoute();
})();

class OrdersPage {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.tables = [];
        this.menus = [];
        this.customers = [];
        this.initialized = false;
        this.dateFilter = {
            startDate: null,
            endDate: null,
            period: 'all' // 'all', 'today', 'week', 'month', 'custom'
        };
        // Register this instance with the router
        if (window.router) {
            window.router.registerPageInstance('orders', this);
        }
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Render content first
            const content = await this.render();
            const contentContainer = document.getElementById('content-container');
            if (contentContainer) {
                contentContainer.innerHTML = content;
            }

            // Load initial data
            await Promise.all([
                this.loadOrders(),
                this.loadTables(),
                this.loadMenus(),
                this.loadCustomers()
            ]);

            // Setup event listeners
            this.setupEventListeners();
            this.setupWebSocketListeners();

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing orders:', error);
            this.initialized = false;
        }
    }

    setupEventListeners() {
        const newOrderBtn = document.getElementById('new-order-btn');
        if (newOrderBtn) {
            newOrderBtn.addEventListener('click', () => this.showNewOrderModal());
        }

        // Setup date filter events
        const periodFilter = document.getElementById('period-filter');
        const statusFilter = document.getElementById('status-filter');
        const customDateRange = document.getElementById('custom-date-range');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const applyDateFilterBtn = document.getElementById('apply-date-filter');

        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                const period = e.target.value;
                this.dateFilter.period = period;
                
                if (period === 'custom') {
                    customDateRange.style.display = 'flex';
                } else {
                    customDateRange.style.display = 'none';
                    this.applyDateFilter(period);
                }
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.applyStatusFilter(e.target.value);
            });
        }

        if (applyDateFilterBtn) {
            applyDateFilterBtn.addEventListener('click', () => {
                if (startDateInput.value && endDateInput.value) {
                    this.dateFilter.startDate = new Date(startDateInput.value);
                    this.dateFilter.endDate = new Date(endDateInput.value);
                    this.applyDateFilter('custom');
                } else {
                    this.showNotification('Please select both start and end dates', 'error');
                }
            });
        }

        // Initialize date inputs with today's date
        if (startDateInput && endDateInput) {
            const today = new Date();
            const formattedDate = this.formatDateForInput(today);
            startDateInput.value = formattedDate;
            endDateInput.value = formattedDate;
        }
    }

    setupWebSocketListeners() {
        // Listen for order updates
        window.addEventListener('orderUpdate', async (event) => {
            console.log('Received order update:', event.detail);
            await this.handleOrderUpdate(event.detail);
        });

        // Listen for table updates
        window.addEventListener('tableUpdate', async (event) => {
            console.log('Received table update:', event.detail);
            await this.loadTables(); // Reload available tables
        });

        // Listen for menu updates
        window.addEventListener('menuUpdate', async (event) => {
            console.log('Received menu update:', event.detail);
            await this.loadMenus(); // Reload menu items
        });

        // Listen for payment updates - mereka mungkin memengaruhi status pesanan
        window.addEventListener('paymentUpdate', async (event) => {
            console.log('Received payment update:', event.detail);
            // Memuat ulang semua pesanan untuk memastikan konsistensi data
            await this.loadOrders();
        });

        // Listen for stats updates - dapat menjadi sinyal untuk memperbarui data
        window.addEventListener('statsUpdate', async (event) => {
            console.log('Received stats update that may affect orders:', event.detail);
            // Periksa jika perlu menyegarkan data order
            if (event.detail.order_stats) {
                await this.loadOrders();
            }
        });
    }

    async handleOrderUpdate(data) {
        try {
            const existingOrderIndex = this.orders.findIndex(order => order.id === data.id);
            
            if (data.action === 'create') {
                await this.loadOrders(); // Memuat ulang dan mengurutkan
                
                // Reapply current filters
                const periodFilter = document.getElementById('period-filter');
                const statusFilter = document.getElementById('status-filter');
                if (periodFilter && statusFilter) {
                    this.applyDateFilter(periodFilter.value);
                    this.applyStatusFilter(statusFilter.value);
                }
                
                this.showNotification('Pesanan baru diterima!');
            } else if (data.action === 'update' && existingOrderIndex !== -1) {
                // Refresh specific order data
                await this.refreshOrderData(data.id);
                // Re-sort orders to maintain ordering
                this.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                // Reapply current filters
                const periodFilter = document.getElementById('period-filter');
                const statusFilter = document.getElementById('status-filter');
                if (periodFilter && statusFilter) {
                    this.applyDateFilter(periodFilter.value);
                    this.applyStatusFilter(statusFilter.value);
                } else {
                    this.updateOrdersTable();
                }
                
                this.showNotification('Pesanan diperbarui');
            } else if (data.action === 'delete' && existingOrderIndex !== -1) {
                this.orders.splice(existingOrderIndex, 1);
                
                // Reapply current filters
                const periodFilter = document.getElementById('period-filter');
                const statusFilter = document.getElementById('status-filter');
                if (periodFilter && statusFilter) {
                    this.applyDateFilter(periodFilter.value);
                    this.applyStatusFilter(statusFilter.value);
                } else {
                    this.updateOrdersTable();
                }
                
                // Close modal if open
                const openModal = document.querySelector(`.order-detail-modal[data-order-id="${data.id}"]`);
                if (openModal) {
                    document.body.removeChild(openModal);
                }
                
                this.showNotification('Pesanan dihapus');
            } else {
                // Jika tidak ada kondisi yang terpenuhi, muat ulang semua data untuk memastikan sinkronisasi
                await this.loadOrders();
                
                // Reapply current filters
                const periodFilter = document.getElementById('period-filter');
                const statusFilter = document.getElementById('status-filter');
                if (periodFilter && statusFilter) {
                    this.applyDateFilter(periodFilter.value);
                    this.applyStatusFilter(statusFilter.value);
                }
            }
        } catch (error) {
            console.error('Error handling order update:', error);
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    async loadOrders() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/admin/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load orders');
            
            const result = await response.json();
            if (result.status && result.data) {
                // Sort orders by created_at date (newest first)
                this.orders = result.data.sort((a, b) => {
                    return new Date(b.created_at) - new Date(a.created_at);
                });
                
                // Initialize filtered orders with all orders
                this.filteredOrders = [...this.orders];
                
                this.updateOrdersTable();
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showNotification('Gagal memuat daftar order', 'error');
        }
    }

    async loadTables() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/admin/tables', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load tables');
            
            const result = await response.json();
            if (result.status && result.data) {
                this.tables = result.data.filter(table => table.status === 'available');
            }
        } catch (error) {
            console.error('Error loading tables:', error);
        }
    }

    async loadMenus() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/menus', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load menus');
            
            const result = await response.json();
            if (result.status && result.data) {
                this.menus = result.data;
                console.log('Loaded menus:', this.menus);
            }
        } catch (error) {
            console.error('Error loading menus:', error);
        }
    }

    async loadCustomers() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/admin/customers', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load customers');
            
            const result = await response.json();
            if (result.status && result.data) {
                this.customers = result.data;
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    updateOrdersTable() {
        const tableBody = document.getElementById('orders-table-body');
        if (!tableBody) return;

        // Use filtered orders instead of all orders
        tableBody.innerHTML = this.filteredOrders.map(order => {
            // Format the order items - limit to 3 items
            const maxItemsToShow = 3;
            const totalItems = order.order_items.length;
            const visibleItems = order.order_items.slice(0, maxItemsToShow);
            const hiddenItems = totalItems > maxItemsToShow ? totalItems - maxItemsToShow : 0;
            
            const itemsHtml = visibleItems.map(item => `
                <div class="order-item-row">
                    <span class="item-name" title="${item.menu.name} x${item.quantity}">${item.menu.name} x${item.quantity}</span>
                </div>
            `).join('');
            
            // Add "+X more" indicator if there are hidden items
            const moreItemsHtml = hiddenItems > 0 ? 
                `<div class="order-item-row more-items">
                    <span class="more-indicator" title="${hiddenItems} more items">+${hiddenItems} more</span>
                </div>` : '';
            
            // Format the notes - limit to 3 notes
            const visibleNotes = order.order_items.slice(0, maxItemsToShow);
            const hiddenNotes = totalItems > maxItemsToShow ? totalItems - maxItemsToShow : 0;
            
            const notesHtml = visibleNotes.map(item => `
                <div class="order-note-row">
                    ${item.notes ? `<span class="item-notes" title="${item.notes}">${item.notes}</span>` : '-'}
                </div>
            `).join('');
            
            // Add "+X more" indicator for notes if there are hidden notes
            const moreNotesHtml = hiddenNotes > 0 ? 
                `<div class="order-note-row more-notes">
                    <span class="more-indicator" title="${hiddenNotes} more notes">+${hiddenNotes} more</span>
                </div>` : '';
            
            return `
                <tr class="order-row" data-order-id="${order.id}">
                    <td title="Order #${order.id}">Order #${order.id}</td>
                    <td title="Table ${order.table ? order.table.number : 'N/A'}">Table ${order.table ? order.table.number : 'N/A'}</td>
                    <td>
                        <div class="order-items-list fixed-height">
                            ${itemsHtml}
                            ${moreItemsHtml}
                        </div>
                    </td>
                    <td>
                        <div class="order-notes-list fixed-height">
                            ${notesHtml}
                            ${moreNotesHtml}
                        </div>
                    </td>
                    <td title="${this.formatCurrency(order.total_amount)}">${this.formatCurrency(order.total_amount)}</td>
                    <td>
                        <span class="status-badge status-${order.status.toLowerCase()}" title="${this.formatStatus(order.status)}">
                            ${this.formatStatusShort(order.status)}
                        </span>
                    </td>
                    <td title="${this.formatDate(order.created_at)}">${this.formatDate(order.created_at)}</td>
                    <td>
                        <div class="order-actions">
                            ${this.renderActionButtons(order)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderActionButtons(order) {
        let buttons = '';
        
        // Tambahkan tombol lihat detail di awal
        buttons += `<button class="btn-view" title="Lihat Detail" onclick="ordersPage.viewOrderDetails(${order.id})">
            <i class="fas fa-eye"></i>
        </button>`;
        
        switch(order.status.toLowerCase()) {
            case 'pending_payment':
                buttons += `<button class="btn-process" title="Proses Pembayaran" onclick="ordersPage.processPayment(${order.id})">
                    <i class="fas fa-money-bill-wave"></i>
                </button>`;
                break;
            case 'paid':
                buttons += `
                    <button class="btn-start" title="Mulai Memasak" onclick="ordersPage.startCooking(${order.id})">
                        <i class="fas fa-utensils"></i>
                    </button>
                    <button class="btn-receipt" title="Cetak Struk" onclick="ordersPage.printReceipt(${order.id})">
                        <i class="fas fa-receipt"></i>
                    </button>
                `;
                break;
            case 'in_progress':
                buttons += `<button class="btn-finish" title="Selesai Memasak" onclick="ordersPage.finishCooking(${order.id})">
                    <i class="fas fa-check-circle"></i>
                </button>`;
                break;
            case 'ready':
                buttons += `<button class="btn-complete" title="Pesanan Selesai" onclick="ordersPage.completeOrder(${order.id})">
                    <i class="fas fa-check-double"></i>
                </button>`;
                break;
            case 'completed':
                buttons += `<button class="btn-receipt" title="Cetak Struk" onclick="ordersPage.printReceipt(${order.id})">
                    <i class="fas fa-receipt"></i>
                </button>`;
                break;
        }
        
        return buttons;
    }

    async updateOrderStatus(orderId, status) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }

            // Server will broadcast update via WebSocket
            // No need to manually reload as WebSocket listener will handle it
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update order status');
        }
    }

    // Action methods
    async startCooking(orderId) {
        await this.updateOrderStatus(orderId, 'in_progress');
        await this.refreshOrderData(orderId);
    }

    async finishCooking(orderId) {
        await this.updateOrderStatus(orderId, 'ready');
        await this.refreshOrderData(orderId);
    }

    async completeOrder(orderId) {
        await this.updateOrderStatus(orderId, 'completed');
        await this.refreshOrderData(orderId);
    }

    async processPayment(orderId) {
        try {
            const token = localStorage.getItem('token');
            const updateResponse = await fetch(`http://localhost:8080/admin/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'paid'
                })
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update order status');
            }

            this.showNotification('Pembayaran berhasil diverifikasi');
            await this.refreshOrderData(orderId);
        } catch (error) {
            console.error('Error processing payment:', error);
            this.showNotification(error.message || 'Gagal memproses pembayaran', 'error');
        }
    }

    async refreshOrderData(orderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to refresh order data');
            }

            const result = await response.json();
            if (result.status && result.data) {
                // Update order in the orders array
                const orderIndex = this.orders.findIndex(order => order.id === orderId);
                if (orderIndex !== -1) {
                    this.orders[orderIndex] = result.data;
                    // Re-sort orders to maintain newest first order
                    this.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    this.updateOrdersTable();
                } else {
                    // If order not found in the array, add it and re-sort
                    this.orders.push(result.data);
                    this.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    this.updateOrdersTable();
                }

                // Update modal if open
                const openModal = document.querySelector(`.order-detail-modal[data-order-id="${orderId}"]`);
                if (openModal) {
                    this.updateOrderDetailsModal(result.data);
                }
                
                // Return the order data for functions that need it
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Error refreshing order data:', error);
            return null;
        }
    }

    async viewOrderDetails(orderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load order details');
            }

            const result = await response.json();
            if (result.status && result.data) {
                this.showOrderDetailsModal(result.data);
            } else {
                throw new Error(result.message || 'Failed to load order details');
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showNotification('Gagal memuat detail pesanan', 'error');
        }
    }

    showOrderDetailsModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal order-detail-modal';
        modal.setAttribute('data-order-id', order.id);
        this.updateOrderDetailsModal(order, modal);
        document.body.appendChild(modal);

        // Close button functionality
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const closeModal = () => {
            modal.classList.add('modal-closing');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        };

        closeBtn.onclick = closeModal;
        closeModalBtn.onclick = closeModal;

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // Prevent closing when clicking inside modal content
        modal.querySelector('.modal-content').onclick = (e) => {
            e.stopPropagation();
        };
    }

    updateOrderDetailsModal(order, modalElement = null) {
        const modal = modalElement || document.querySelector(`.order-detail-modal[data-order-id="${order.id}"]`);
        if (!modal) return;

        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Detail Pesanan #${order.id}</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-detail-grid">
                        <div class="order-info-section">
                            <h3>Informasi Pesanan</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Status</label>
                                    <span class="status-badge status-${order.status.toLowerCase()}">${this.formatStatus(order.status)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Meja</label>
                                    <span>${order.table ? `Meja ${order.table.number}` : 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Waktu Pesan</label>
                                    <span>${this.formatDate(order.created_at)}</span>
                                </div>
                                ${order.start_cooking_time ? `
                                <div class="info-item">
                                    <label>Mulai Dimasak</label>
                                    <span>${this.formatDate(order.start_cooking_time)}</span>
                                </div>` : ''}
                                ${order.finish_cooking_time ? `
                                <div class="info-item">
                                    <label>Selesai Dimasak</label>
                                    <span>${this.formatDate(order.finish_cooking_time)}</span>
                                </div>` : ''}
                            </div>
                        </div>

                        <div class="order-items-section">
                            <h3>Item Pesanan <span class="item-count">(${order.order_items.length} items)</span></h3>
                            <div class="items-table-container">
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Jumlah</th>
                                            <th>Harga</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.order_items ? order.order_items.map(item => `
                                            <tr>
                                                <td>${item.menu ? item.menu.name : 'Unknown'}</td>
                                                <td class="text-center">${item.quantity}</td>
                                                <td class="text-right">${this.formatCurrency(item.price)}</td>
                                                <td class="text-right">${this.formatCurrency(item.price * item.quantity)}</td>
                                                <td><span class="status-badge status-${item.status.toLowerCase()}">${this.formatStatus(item.status)}</span></td>
                                                <td>${item.notes || '-'}</td>
                                            </tr>
                                        `).join('') : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="order-summary-section">
                            <div class="total-amount">
                                <h3>Total Pembayaran</h3>
                                <span class="amount">${this.formatCurrency(order.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">Tutup</button>
                    ${this.renderDetailActionButton(order)}
                </div>
            </div>
        `;

        modal.innerHTML = modalContent;

        // Reattach event listeners
        const closeBtn = modal.querySelector('.close-btn');
        const closeModalBtn = modal.querySelector('.close-modal');
        const closeModal = () => {
            modal.classList.add('modal-closing');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        };

        closeBtn.onclick = closeModal;
        closeModalBtn.onclick = closeModal;

        // Reattach action button event listeners
        const actionButton = modal.querySelector('.btn-primary');
        if (actionButton) {
            const orderId = order.id;
            switch (order.status.toLowerCase()) {
                case 'pending_payment':
                    actionButton.onclick = () => this.processPayment(orderId);
                    break;
                case 'paid':
                    actionButton.onclick = () => this.startCooking(orderId);
                    break;
                case 'in_progress':
                    actionButton.onclick = () => this.finishCooking(orderId);
                    break;
                case 'ready':
                    actionButton.onclick = () => this.completeOrder(orderId);
                    break;
            }
        }
    }

    renderDetailActionButton(order) {
        let button = '';
        
        switch(order.status.toLowerCase()) {
            case 'pending_payment':
                button = `<button class="btn-primary" onclick="ordersPage.processPayment(${order.id})">
                    <i class="fas fa-money-bill-wave"></i> Proses Pembayaran
                </button>`;
                break;
            case 'paid':
                button = `
                    <button class="btn-primary" onclick="ordersPage.startCooking(${order.id})">
                        <i class="fas fa-utensils"></i> Mulai Memasak
                    </button>
                    <button class="btn-receipt" onclick="ordersPage.printReceipt(${order.id})">
                        <i class="fas fa-receipt"></i> Cetak Struk
                    </button>
                `;
                break;
            case 'in_progress':
                button = `<button class="btn-primary" onclick="ordersPage.finishCooking(${order.id})">
                    <i class="fas fa-check-circle"></i> Selesai Memasak
                </button>`;
                break;
            case 'ready':
                button = `<button class="btn-primary" onclick="ordersPage.completeOrder(${order.id})">
                    <i class="fas fa-check-double"></i> Pesanan Selesai
                </button>`;
                break;
            case 'completed':
                button = `<button class="btn-receipt" onclick="ordersPage.printReceipt(${order.id})">
                    <i class="fas fa-receipt"></i> Cetak Struk
                </button>`;
                break;
        }
        
        return button;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatStatus(status) {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatStatusShort(status) {
        // Create shorter versions of status for badges
        switch(status.toLowerCase()) {
            case 'pending_payment':
                return 'Pending';
            case 'in_progress':
                return 'Processing';
            default:
                return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    async render() {
        return `
            <div class="orders-page">
                <div class="page-header">
                    <h2>Orders Management</h2>
                    <div class="filter-container">
                        <div class="date-filter">
                            <select id="period-filter" class="filter-select">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">This Month</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            <div id="custom-date-range" class="custom-date-range" style="display: none;">
                                <input type="date" id="start-date" class="date-input">
                                <span>to</span>
                                <input type="date" id="end-date" class="date-input">
                                <button id="apply-date-filter" class="filter-btn">Apply</button>
                            </div>
                        </div>
                        <div class="status-filter">
                            <select id="status-filter" class="filter-select">
                                <option value="all">All Status</option>
                                <option value="pending_payment">Pending Payment</option>
                                <option value="paid">Paid</option>
                                <option value="in_progress">In Progress</option>
                                <option value="ready">Ready</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>
                    <button id="new-order-btn" class="btn-primary">
                        <i class="fas fa-plus"></i> New Order
                    </button>
                </div>
                <div class="orders-container">
                    <div class="orders-table-container">
                        <div class="orders-table-scroll">
                            <table class="orders-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Table</th>
                                        <th>Items</th>
                                        <th>Notes</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Created At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="orders-table-body">
                                    <!-- Orders will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showNewOrderModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Pesanan Baru</h2>
                    <button class="close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="new-order-form" class="responsive-form">
                        <div class="form-group">
                            <label for="table-select">Meja *</label>
                            <select id="table-select" required>
                                <option value="">Pilih meja</option>
                                ${this.tables.map(table => 
                                    `<option value="${table.id}">Meja ${table.number}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="order-items-container">
                            <h3>Item Pesanan</h3>
                            <div id="order-items-list" class="responsive-items-list">
                                <!-- Initial item input will be added here -->
                            </div>
                            <button type="button" class="btn-add-item" onclick="ordersPage.addOrderItemInput()">
                                <i class="fas fa-plus"></i> Tambah Item
                            </button>
                        </div>

                        <div class="form-summary">
                            <div class="total-amount">Total: <span id="order-total">Rp 0</span></div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="ordersPage.closeModal()">Batal</button>
                            <button type="submit" class="btn-primary">Buat Pesanan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add initial item input
        const itemsList = modal.querySelector('#order-items-list');
        itemsList.innerHTML = this.renderOrderItemInput(0);

        // Setup form submission
        const form = modal.querySelector('#new-order-form');
        form.addEventListener('submit', (e) => this.handleNewOrderSubmit(e));

        // Setup close button
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => this.closeModal();

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
    }

    renderOrderItemInput(index) {
        return `
            <div class="order-item-input" data-index="${index}">
                <div class="form-row">
                    <div class="form-group menu-select-group">
                        <label>Menu *</label>
                        <select class="menu-select" required onchange="ordersPage.updateItemPrice(this)">
                            <option value="">Pilih menu</option>
                            ${this.menus.map(menu => {
                                return `<option value="${menu.ID}" data-price="${menu.price}">${menu.name} - ${this.formatCurrency(menu.price)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="form-group quantity-group">
                        <label>Jumlah *</label>
                        <input type="number" class="quantity-input" min="1" value="1" required 
                               onchange="ordersPage.updateItemPrice(this.parentElement.parentElement)">
                    </div>
                    <div class="form-group notes-group">
                        <label>Catatan</label>
                        <input type="text" class="notes-input" placeholder="Catatan tambahan">
                    </div>
                    <div class="form-group price-group">
                        <label>Total</label>
                        <span class="item-total">Rp 0</span>
                    </div>
                    ${index > 0 ? `
                        <button type="button" class="btn-remove-item" onclick="ordersPage.removeOrderItemInput(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    addOrderItemInput() {
        const container = document.getElementById('order-items-list');
        const index = container.children.length;
        const div = document.createElement('div');
        div.innerHTML = this.renderOrderItemInput(index);
        container.appendChild(div.firstElementChild);
    }

    removeOrderItemInput(index) {
        const item = document.querySelector(`.order-item-input[data-index="${index}"]`);
        if (item) item.remove();
    }

    async handleNewOrderSubmit(e) {
        e.preventDefault();
        
        const tableId = document.getElementById('table-select').value;

        if (!tableId) {
            this.showNotification('Mohon pilih meja terlebih dahulu', 'error');
            return;
        }

        const itemInputs = document.querySelectorAll('.order-item-input');
        
        // Dapatkan menu price untuk setiap item
        const items = Array.from(itemInputs).map(item => {
            const menuSelect = item.querySelector('.menu-select');
            const menuId = parseInt(menuSelect.value, 10);
            const quantity = parseInt(item.querySelector('.quantity-input').value, 10);
            const notes = item.querySelector('.notes-input').value;
            
            // Dapatkan harga menu dari this.menus
            const selectedMenu = this.menus.find(menu => menu.ID === menuId);

            if (!menuId || isNaN(menuId) || !selectedMenu) {
                return null;
            }

            if (!quantity || isNaN(quantity) || quantity <= 0) {
                return null;
            }

            return {
                menu_id: menuId,
                quantity: quantity,
                price: selectedMenu.price,
                notes: notes || "",
                status: "pending"
            };
        }).filter(item => item !== null);

        if (items.length === 0) {
            this.showNotification('Mohon pilih menu dan jumlah yang valid', 'error');
            return;
        }

        // Hitung total amount
        const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

        try {
            const token = localStorage.getItem('token');
            
            // Buat customer baru dengan table_id dan session_key
            const sessionKey = Math.random().toString(36).substring(2, 15);
            const customerData = {
                table_id: parseInt(tableId, 10),
                session_key: sessionKey
            };

            const customerResponse = await fetch('http://localhost:8080/admin/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            const customerResponseData = await customerResponse.json();

            if (!customerResponse.ok) {
                throw new Error(customerResponseData.message || 'Failed to create customer');
            }

            // Validasi struktur response customer
            if (!customerResponseData.status || !customerResponseData.data || !customerResponseData.data.ID) {
                console.error('Invalid customer response structure:', customerResponseData);
                throw new Error('Invalid customer response structure');
            }

            const customerId = customerResponseData.data.ID;

            const orderData = {
                table_id: parseInt(tableId, 10),
                customer_id: parseInt(customerId, 10),
                session_key: sessionKey,
                status: "pending_payment",
                total_amount: totalAmount,
                Items: items.map(item => ({
                    menu_id: parseInt(item.menu_id, 10),
                    quantity: parseInt(item.quantity, 10),
                    price: parseFloat(item.price),
                    notes: item.notes,
                    status: item.status
                }))
            };

            // Coba kirim request dengan format data yang berbeda
            const orderResponse = await fetch('http://localhost:8080/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: parseInt(customerId, 10),
                    table_id: parseInt(tableId, 10),
                    session_key: sessionKey,
                    status: "pending_payment",
                    total_amount: totalAmount,
                    Items: items.map(item => ({
                        menu_id: parseInt(item.menu_id, 10),
                        quantity: parseInt(item.quantity, 10),
                        price: parseFloat(item.price),
                        notes: item.notes,
                        status: item.status
                    }))
                })
            });

            const orderResponseData = await orderResponse.json();

            if (!orderResponse.ok) {
                console.error('Order creation failed. Request details:', {
                    customer_id: customerId,
                    table_id: tableId,
                    session_key: sessionKey,
                    total_amount: totalAmount,
                    items_count: items.length
                });
                throw new Error(orderResponseData.message || 'Failed to create order');
            }

            if (orderResponseData.status) {
                this.closeModal();
                await this.loadOrders();
                this.showNotification('Order berhasil dibuat!');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            this.showNotification(error.message || 'Gagal membuat order', 'error');
        }
    }

    updateItemPrice(element) {
        const row = element.closest('.order-item-input');
        const select = row.querySelector('.menu-select');
        const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const price = parseFloat(selectedOption.dataset.price) || 0;
            const total = price * quantity;
            row.querySelector('.item-total').textContent = this.formatCurrency(total);
            this.updateOrderTotal();
        } else {
            row.querySelector('.item-total').textContent = this.formatCurrency(0);
        }
    }

    updateOrderTotal() {
        const itemTotals = document.querySelectorAll('.item-total');
        const total = Array.from(itemTotals).reduce((sum, element) => {
            const amount = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
            return sum + amount;
        }, 0);
        
        const orderTotalElement = document.getElementById('order-total');
        if (orderTotalElement) {
            orderTotalElement.textContent = this.formatCurrency(total);
        }
    }

    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    applyDateFilter(period) {
        let startDate = null;
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of today

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        switch (period) {
            case 'today':
                startDate = today;
                break;
            case 'week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6); // Last 7 days including today
                break;
            case 'month':
                startDate = new Date(today);
                startDate.setDate(1); // First day of current month
                break;
            case 'custom':
                startDate = this.dateFilter.startDate;
                endDate = this.dateFilter.endDate;
                endDate.setHours(23, 59, 59, 999); // End of the selected day
                break;
            default: // 'all'
                startDate = null;
                endDate = null;
        }

        this.filterOrders(startDate, endDate);
    }

    applyStatusFilter(status) {
        // Get current date filter
        const { startDate, endDate } = this.dateFilter;
        
        // Apply both date and status filters
        this.filterOrders(startDate, endDate, status);
    }

    filterOrders(startDate, endDate, status = 'all') {
        // Start with all orders
        let filtered = [...this.orders];

        // Apply date filter if dates are provided
        if (startDate && endDate) {
            filtered = filtered.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate >= startDate && orderDate <= endDate;
            });
        }

        // Apply status filter if not 'all'
        if (status !== 'all') {
            filtered = filtered.filter(order => order.status.toLowerCase() === status);
        }

        // Update filtered orders and refresh table
        this.filteredOrders = filtered;
        this.updateOrdersTable();

        // Show feedback if no results
        if (filtered.length === 0) {
            this.showNotification('No orders match the selected filters', 'info');
        }
    }

    async printReceipt(orderId) {
        try {
            // Show loading notification
            this.showNotification('Menyiapkan struk pembayaran...', 'info');
            
            // Fetch the most up-to-date order data
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data pesanan');
            }

            const result = await response.json();
            if (!result.status || !result.data) {
                throw new Error('Format data pesanan tidak valid');
            }

            const order = result.data;
            
            // Create receipt HTML
            const receiptHTML = this.generateReceiptHTML(order);
            
            // Create print window
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            if (!printWindow) {
                throw new Error('Popup blocker mungkin mencegah pencetakan struk. Mohon izinkan popup untuk situs ini.');
            }
            
            printWindow.document.write(receiptHTML);
            printWindow.document.close();
            
            // Wait for resources to load then print
            setTimeout(() => {
                printWindow.print();
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            }, 500);
            
            this.showNotification('Struk berhasil dicetak', 'success');
        } catch (error) {
            console.error('Error printing receipt:', error);
            this.showNotification('Gagal mencetak struk: ' + error.message, 'error');
        }
    }
    
    generateReceiptHTML(order) {
        // Calculate today's date with proper formatting
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const formattedTime = today.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format tanggal asli pesanan
        const orderDate = new Date(order.created_at);
        const orderFormattedDate = orderDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const orderFormattedTime = orderDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Calculate subtotal, tax, and final total
        let subtotal = 0;
        order.order_items.forEach(item => {
            subtotal += (item.price * item.quantity);
        });
        
        const total = subtotal;
        
        // Prepare QR code data
        const tableNum = order.table ? order.table.number : 'TO';
        const orderId = order.id;
        const totalPayment = total;
        const qrData = `TABLE:${tableNum}-ORDER:${orderId}-TOTAL:${totalPayment}`;
        const Code = `${tableNum}${orderId}${totalPayment}`;
        
        // Generate receipt items HTML
        const itemsHTML = order.order_items.map(item => {
            const itemTotal = item.price * item.quantity;
            return `
            <tr>
                <td class="item-name">${item.menu ? item.menu.name : 'Unknown'}</td>
                <td class="qty">${item.quantity}x</td>
                <td class="price">${this.formatCurrency(item.price)}</td>
                <td class="subtotal">${this.formatCurrency(itemTotal)}</td>
            </tr>
            ${item.notes ? `<tr class="notes-row"><td colspan="4" class="item-notes">* ${item.notes}</td></tr>` : ''}
        `}).join('');
        
        // Return full receipt HTML with styling
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Struk Pembayaran #${order.id}</title>
            <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Roboto+Mono&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
            <style>
                @page {
                    size: 80mm 297mm;
                    margin: 0;
                }
                
                :root {
                    --primary-color: #7c3aed;
                    --accent-color: #a78bfa;
                    --text-color: #374151;
                    --text-light: #6b7280;
                    --bg-color: #ffffff;
                    --border-color: #e5e7eb;
                    --highlight-bg: #f5f3ff;
                }
                
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                
                body {
                    font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f9fafb;
                    color: var(--text-color);
                    line-height: 1.4;
                    -webkit-font-smoothing: antialiased;
                }
                
                .print-container {
                    background-color: #f9fafb;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    padding: 20px 0;
                }
                
                .receipt {
                    width: 80mm;
                    background-color: var(--bg-color);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                }
                
                .receipt::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 6px;
                    height: 100%;
                    background: linear-gradient(to bottom, var(--primary-color), var(--accent-color));
                }
                
                .header {
                    text-align: center;
                    padding: 16px 14px;
                    background-color: var(--primary-color);
                    color: white;
                    position: relative;
                }
                
                .header::after {
                    content: "";
                    position: absolute;
                    bottom: -10px;
                    left: 0;
                    width: 100%;
                    height: 20px;
                    background-color: var(--primary-color);
                    clip-path: polygon(0 0, 100% 0, 50% 100%);
                }
                
                .restaurant-name {
                    font-size: 22px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }
                
                .restaurant-address {
                    font-size: 10px;
                    opacity: 0.9;
                    margin-bottom: 2px;
                }
                
                .body-content {
                    padding: 20px 14px;
                }
                
                .receipt-details {
                    margin-bottom: 16px;
                }
                
                .order-type {
                    display: inline-block;
                    background-color: var(--highlight-bg);
                    color: var(--primary-color);
                    font-weight: 700;
                    font-size: 11px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    margin-bottom: 8px;
                    border: 1px solid var(--accent-color);
                }
                
                .section-title {
                    font-weight: 700;
                    margin-bottom: 4px;
                    font-size: 16px;
                    color: var(--primary-color);
                    display: flex;
                    align-items: center;
                }
                
                .section-title::after {
                    content: "";
                    flex-grow: 1;
                    height: 1px;
                    background-color: var(--accent-color);
                    margin-left: 10px;
                    opacity: 0.5;
                }
                
                .order-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                    font-size: 11px;
                    margin-top: 8px;
                }
                
                .order-info div {
                    display: flex;
                    flex-direction: column;
                }
                
                .order-info .label {
                    color: var(--text-light);
                    font-size: 9px;
                    margin-bottom: 2px;
                }
                
                .order-info .value {
                    font-weight: 600;
                }
                
                .divider {
                    width: 100%;
                    height: 1px;
                    background: repeating-linear-gradient(
                        to right,
                        var(--accent-color),
                        var(--accent-color) 4px,
                        transparent 4px,
                        transparent 8px
                    );
                    margin: 12px 0;
                }
                
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .items-table th {
                    font-size: 10px;
                    text-align: left;
                    color: var(--text-light);
                    padding: 6px 4px;
                    border-bottom: 1px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                }
                
                .items-table td {
                    padding: 6px 4px;
                    font-size: 11px;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .items-table .item-name {
                    font-weight: 600;
                }
                
                .items-table .qty {
                    text-align: center;
                    width: 15%;
                }
                
                .items-table .price,
                .items-table .subtotal {
                    text-align: right;
                    width: 25%;
                }
                
                .item-notes {
                    font-size: 9px;
                    font-style: italic;
                    color: var(--text-light);
                    padding: 0 4px 4px;
                }
                
                .notes-row {
                    background-color: var(--highlight-bg);
                    opacity: 0.8;
                }
                
                .summary {
                    margin-top: 10px;
                    margin-bottom: 10px;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    margin-bottom: 4px;
                }
                
                .summary-label {
                    color: var(--text-light);
                }
                
                .summary-value {
                    font-weight: 600;
                }
                
                .total {
                    font-weight: 700;
                    font-size: 16px;
                    margin-top: 4px;
                    padding: 8px 0;
                    border-radius: 4px;
                    background-color: var(--highlight-bg);
                    text-align: center;
                    color: var(--primary-color);
                }
                
                .payment-info {
                    background-color: var(--highlight-bg);
                    border-radius: 8px;
                    padding: 10px;
                    margin: 12px 0;
                }
                
                .payment-info .summary-row {
                    font-size: 12px;
                }
                
                .qrcode {
                    text-align: center;
                    margin: 10px 0;
                    font-family: 'Roboto Mono', monospace;
                }
                
                .qrcode-container {
                    margin: 0 auto 8px;
                    max-width: 100px;
                    padding: 8px;
                    background: white;
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .qrcode-data {
                    font-size: 8px;
                    color: var(--text-light);
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                    margin-top: 5px;
                }
                
                .order-id {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--primary-color);
                    background-color: var(--highlight-bg);
                    border-radius: 4px;
                    padding: 2px 8px;
                    display: inline-block;
                }
                
                .footer {
                    text-align: center;
                    padding: 20px 10px;
                    position: relative;
                    border-top: 1px dashed var(--accent-color);
                    background-color: var(--highlight-bg);
                }
                
                .footer p {
                    font-size: 12px;
                    margin: 4px 0;
                }
                
                .footer p:first-child {
                    font-weight: 700;
                    color: var(--primary-color);
                }
                
                .footer::before,
                .footer::after {
                    content: "";
                    position: absolute;
                    top: -10px;
                    width: 20px;
                    height: 20px;
                    background-color: #f9fafb;
                    border-radius: 50%;
                }
                
                .footer::before {
                    left: -10px;
                }
                
                .footer::after {
                    right: -10px;
                }
                
                @media print {
                    .print-container {
                        padding: 0;
                        display: block;
                        background-color: white;
                    }
                    
                    .receipt {
                        width: 100%;
                        box-shadow: none;
                        border-radius: 0;
                    }
                    
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    
                    body {
                        width: 80mm;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="receipt">
                    <div class="header">
                        <div class="restaurant-name">RESTO APP</div>
                        <div class="restaurant-address">Jl. Maju Terus No.123, Jakarta</div>
                        <div class="restaurant-address">Telp: (021) 1234 5678</div>
                    </div>
                    
                    <div class="body-content">
                        <div class="receipt-details">
                            <div class="order-type">${order.table ? `DINE IN - MEJA ${order.table.number}` : 'TAKEAWAY'}</div>
                            
                            <div class="section-title">STRUK PEMBAYARAN</div>
                            
                            <div class="order-info">
                                <div>
                                    <span class="label">No. Pesanan</span>
                                    <span class="value order-id">#${order.id}</span>
                                </div>
                                <div>
                                    <span class="label">Tanggal</span>
                                    <span class="value">${orderFormattedDate}</span>
                                </div>
                                <div>
                                    <span class="label">Waktu Pesan</span>
                                    <span class="value">${orderFormattedTime}</span>
                                </div>
                                <div>
                                    <span class="label">Kasir</span>
                                    <span class="value">Admin</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="qty">Qty</th>
                                    <th class="price">Harga</th>
                                    <th class="subtotal">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHTML}
                            </tbody>
                        </table>
                        
                        <div class="divider"></div>
                        
                        <div class="summary">
                            <div class="summary-row">
                                <span class="summary-label">Subtotal</span>
                                <span class="summary-value">${this.formatCurrency(subtotal)}</span>
                            </div>
                                                       
                            <div class="total">
                                TOTAL: ${this.formatCurrency(total)}
                            </div>
                        </div>
                        
                        <div class="payment-info">
                            <div class="summary-row">
                                <span class="summary-label">DIBAYAR</span>
                                <span class="summary-value">${this.formatCurrency(total)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">KEMBALI</span>
                                <span class="summary-value">Rp 0</span>
                            </div>
                        </div>
                        
                        <div class="qrcode">
                            <div class="qrcode-container" id="qrcode"></div>
                            <div class="qrcode-data">${Code}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Terima kasih atas kunjungan Anda!</p>
                        <p>Silakan datang kembali</p>
                    </div>
                </div>
            </div>
            
            <script>
                // Generate QR Code using qrcode-generator library
                window.onload = function() {
                    try {
                        // Setup QR code
                        const qrData = '${qrData}';
                        const typeNumber = 4;
                        const errorCorrectionLevel = 'L';
                        const qr = qrcode(typeNumber, errorCorrectionLevel);
                        qr.addData(qrData);
                        qr.make();
                        
                        // Display QR code
                        document.getElementById('qrcode').innerHTML = qr.createImgTag(3, 0);
                        
                        // Style the QR code image
                        const qrImg = document.querySelector('#qrcode img');
                        if (qrImg) {
                            qrImg.style.width = '100%';
                            qrImg.style.height = 'auto';
                            qrImg.style.maxWidth = '100px';
                            qrImg.style.display = 'block';
                            qrImg.style.margin = '0 auto';
                        }
                    } catch (error) {
                        console.error('Error generating QR code:', error);
                        document.getElementById('qrcode').innerHTML = 'QR Code Error';
                    }
                };
            </script>
        </body>
        </html>
        `;
    }
}

// Initialize the orders page - diletakkan di akhir file
document.addEventListener('DOMContentLoaded', () => {
    // Pastikan instance dari ordersPage tersedia untuk event listener
    if (!window.ordersPage) {
        window.ordersPage = new OrdersPage();
    }
}); 