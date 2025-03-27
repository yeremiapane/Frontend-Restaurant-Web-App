// Define utility functions for logging if not present
if (!window.utils) {
    window.utils = {
        logger: {
            info: function() {
                console.info.apply(console, arguments);
            },
            debug: function() {
                console.debug.apply(console, arguments);
            },
            error: function() {
                console.error.apply(console, arguments);
            },
            warn: function() {
                console.warn.apply(console, arguments);
            }
        }
    };
}

// Register the orders page with the router
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
                return window.ordersPage.render();
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
        this.baseUrl = window.API_BASE_URL;
        this.orders = [];
        this.tables = [];
        this.customers = [];
        this.menus = [];
        this.dateFilter = {
            startDate: null,
            endDate: null
        };
        this.statusFilter = 'all';
        this.currentOrder = null;
        this.paymentPollingInterval = null; // Initialize payment polling interval
        this.qrCodeContainer = null; // Container for QR code display
        this.initialized = false;
        // Tambahkan AbortController untuk membatalkan fetch request
        this.abortController = null;
        this.setupEventListeners();
        this.setupWebSocketListeners();
    }

    registerRoute() {
        // Register this instance with the router
        if (window.router) {
            window.router.registerPageInstance('orders', this);
            
            // Tambahkan event listener ke router untuk reset halaman saat pindah
            window.router.onBeforeNavigate = (fromPage, toPage) => {
                if (fromPage === 'orders') {
                    console.log('Navigating away from orders page, resetting state');
                    this.reset();
                }
            };
        }
    }

    async initialize() {
        try {
            // Render content first
            const content = await this.render();
            const contentContainer = document.getElementById('content-container');
            if (contentContainer) {
                contentContainer.innerHTML = content;
                
                // Tambahkan loading indicator di dalam tabel
                const tableBody = document.getElementById('orders-table-body');
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center">
                                <div class="loading-indicator">
                                    <i class="fas fa-spinner fa-spin"></i> Loading orders...
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }

            // Reset data jika ini adalah navigasi berulang ke halaman orders
            if (this.initialized) {
                console.log('Re-initializing orders page with fresh data');
                this.orders = [];
                this.filteredOrders = [];
            }

            // Load initial data
            await Promise.all([
                this.loadOrders(),
                this.loadTables(),
                this.loadMenus(),
                this.loadCustomers()
            ]);

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing orders:', error);
            
            // Tampilkan pesan error jika gagal memuat data
            const tableBody = document.getElementById('orders-table-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i> 
                                Failed to load orders: ${error.message}
                                <button onclick="window.ordersPage.initialize()" class="retry-btn">
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            this.initialized = false;
        }
    }

    setupEventListeners() {
        // Listen for DOM updates for dynamic elements
        document.addEventListener('click', (e) => {
            // Handle new order button click
            if (e.target.id === 'new-order-btn' || 
                (e.target.parentElement && e.target.parentElement.id === 'new-order-btn')) {
                this.showNewOrderModal();
            }
        });

        // Setup date filter events
        document.addEventListener('change', (e) => {
            // Handle period filter
            if (e.target.id === 'period-filter') {
                const period = e.target.value;
                this.dateFilter.period = period;
                
                const customDateRange = document.getElementById('custom-date-range');
                if (customDateRange) {
                if (period === 'custom') {
                    customDateRange.style.display = 'flex';
                } else {
                    customDateRange.style.display = 'none';
                    this.applyDateFilter(period);
                }
                }
        }

            // Handle status filter
            if (e.target.id === 'status-filter') {
                this.applyStatusFilter(e.target.value);
            }
        });

        // Handle apply filter button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'apply-date-filter') {
                const startDateInput = document.getElementById('start-date');
                const endDateInput = document.getElementById('end-date');
                
                if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
                    this.dateFilter.startDate = new Date(startDateInput.value);
                    this.dateFilter.endDate = new Date(endDateInput.value);
                    this.applyDateFilter('custom');
                } else {
                    this.showNotification('Please select both start and end dates', 'error');
                }
            }
        });

        // Set window.ordersPage reference for global access
        window.ordersPage = this;
        
        // Tambahkan event listener untuk event kustom dari PaymentsManager
        window.addEventListener('paymentUpdated', (event) => {
            console.log('[OrdersPage] Payment updated event received:', event.detail);
            const { orderId } = event.detail;
            if (orderId) {
                this.refreshOrderData(orderId);
            }
        });
        
        window.addEventListener('paymentSuccess', (event) => {
            console.log('[OrdersPage] Payment success event received:', event.detail);
            const { orderId } = event.detail;
            if (orderId) {
                this.refreshOrderData(orderId);
                this.showNotification(`Pembayaran untuk Order #${orderId} berhasil`, 'success');
            }
        });
        
        window.addEventListener('paymentFailed', (event) => {
            console.log('[OrdersPage] Payment failed event received:', event.detail);
            const { orderId } = event.detail;
            if (orderId) {
                this.refreshOrderData(orderId);
            }
        });
        
        window.addEventListener('paymentExpired', (event) => {
            console.log('[OrdersPage] Payment expired event received:', event.detail);
            const { orderId } = event.detail;
            if (orderId) {
                this.refreshOrderData(orderId);
            }
        });
        
        window.addEventListener('printReceipt', (event) => {
            console.log('[OrdersPage] Print receipt event received:', event.detail);
            const { orderId } = event.detail;
            if (orderId) {
                this.printReceipt(orderId);
            }
        });
        
        window.addEventListener('retryPayment', (event) => {
            console.log('[OrdersPage] Retry payment event received:', event.detail);
            const { orderId } = event.detail;
            if (orderId) {
                const order = this.getOrderById(orderId);
                if (order) {
                    this.showPaymentModal(order);
                }
            }
        });
    }

    setupWebSocketListeners() {
        try {
            if (!window.wsClient) {
                console.warn('WebSocket client not available for orders page');
                return;
            }
            
            console.log('Setting up WebSocket listeners for orders page');
            
            // Listener untuk updatean order
            window.wsClient.addEventListener('order_update', (orderData) => {
                console.log('[OrdersPage] Order update received via WebSocket:', orderData);
                this.handleOrderUpdate(orderData);
            });
            
            // Listener untuk pembayaran
            window.wsClient.addEventListener('payment_update', (paymentData) => {
                console.log('[OrdersPage] Payment update received via WebSocket:', paymentData);
                this.handlePaymentUpdate(paymentData);
            });
            
            // Listener untuk updatean meja
            window.wsClient.addEventListener('table_update', (tableData) => {
                console.log('[OrdersPage] Table update received via WebSocket:', tableData);
                this.loadTables(); // Reload all tables when any table is updated
            });
            
            // Listener untuk meja baru
            window.wsClient.addEventListener('table_create', (tableData) => {
                console.log('[OrdersPage] New table created via WebSocket:', tableData);
                this.loadTables(); // Reload all tables when new table is created
            });
            
            // Listener untuk meja yang dihapus
            window.wsClient.addEventListener('table_delete', (tableData) => {
                console.log('[OrdersPage] Table deleted via WebSocket:', tableData);
                this.loadTables(); // Reload all tables when a table is deleted
            });
            
            // Status koneksi
            window.wsClient.addEventListener('connection_change', (statusData) => {
                console.log('[OrdersPage] WebSocket connection status changed:', statusData);
            });
            
            console.log('WebSocket listeners setup complete for orders page');
        } catch (error) {
            console.error('Error setting up WebSocket listeners for orders page:', error);
        }
    }

    async handleOrderUpdate(data) {
        try {
            console.log('Handling order update:', data);
            
            // Pastikan data memiliki ID untuk identifikasi order
            if (!data || !data.id) {
                console.error('Invalid order update data: Missing ID');
                return;
            }
            
            const action = data.action || 'update'; // Default action adalah update
            const orderId = data.id;
            
            const existingOrderIndex = this.orders.findIndex(order => order.id === orderId);
            console.log(`Order dengan ID ${orderId} ${existingOrderIndex !== -1 ? 'ditemukan' : 'tidak ditemukan'} di cache`);
            
            if (action === 'create') {
                console.log('Menerima order baru, memuat ulang daftar order');
                await this.loadOrders(); // Memuat ulang dan mengurutkan
                
                // Reapply current filters
                const periodFilter = document.getElementById('period-filter');
                const statusFilter = document.getElementById('status-filter');
                if (periodFilter && statusFilter) {
                    this.applyDateFilter(periodFilter.value);
                    this.applyStatusFilter(statusFilter.value);
                }
                
                this.showNotification('Pesanan baru diterima!');
            } else if (action === 'update' && existingOrderIndex !== -1) {
                console.log(`Memperbarui order yang sudah ada: ID=${orderId}`);
                // Refresh specific order data dari server untuk mendapatkan data lengkap terbaru
                await this.refreshOrderData(orderId);
                
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
                
                // Jika modal detail order sedang terbuka, perbarui juga
                const openModal = document.querySelector(`.order-detail-modal[data-order-id="${orderId}"]`);
                if (openModal) {
                    const order = this.getOrderById(orderId);
                    if (order) {
                        this.updateOrderDetailsModal(order, openModal);
                    }
                }
                
                this.showNotification('Pesanan diperbarui');
            } else if (action === 'delete' && existingOrderIndex !== -1) {
                console.log(`Menghapus order: ID=${orderId}`);
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
                const openModal = document.querySelector(`.order-detail-modal[data-order-id="${orderId}"]`);
                if (openModal) {
                    document.body.removeChild(openModal);
                }
                
                this.showNotification('Pesanan dihapus');
            } else {
                console.log('Kondisi tidak terpenuhi atau data order tidak ditemukan, memuat ulang semua data');
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

    // Tambahkan method untuk membatalkan request yang sedang berjalan
    cancelPendingRequests() {
        if (this.abortController) {
            console.log('Cancelling pending fetch requests');
            this.abortController.abort();
            this.abortController = null;
        }
    }

    async loadOrders() {
        // Batalkan request sebelumnya jika ada
        this.cancelPendingRequests();
        
        // Buat controller baru untuk request ini
        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        
        try {
            console.log('Loading orders from:', `${this.baseUrl}/admin/orders`);
            const token = window.authManager.getToken();
            console.log('Using token:', token ? 'Valid token exists' : 'No token found');
            
            if (!token) {
                throw new Error('Authentication token not found');
            }
            
            let maxRetries = 3;
            let retryCount = 0;
            let success = false;
            
            while (!success && retryCount < maxRetries && !signal.aborted) {
                try {
                    retryCount > 0 && console.log(`Retry attempt ${retryCount} loading orders...`);
                    
                    const response = await fetch(`${this.baseUrl}/admin/orders`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        signal: signal // Tambahkan signal untuk pembatalan
                    });
                    
                    console.log('Orders API response status:', response.status);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Error response from server:', errorText);
                        throw new Error(`Failed to load orders: ${response.status} ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    console.log('Orders data received:', data);
                    
                    if (!data) {
                        console.error('Invalid response format from orders API: null');
                        throw new Error('Orders data is null');
                    }
                    
                    if (!data.data && data.status === true) {
                        console.log('Empty orders array received but status is OK');
                        this.orders = [];
                    } else if (!data.data) {
                        console.error('Invalid response format from orders API:', data);
                        throw new Error('Orders data format is invalid');
                    } else {
                        // Simpan orders dan sortir berdasarkan created_at terbaru
                        this.orders = data.data.sort((a, b) => 
                            new Date(b.created_at) - new Date(a.created_at)
                        );
                    }
                    
                    this.filteredOrders = [...this.orders]; // Inisialisasi filteredOrders
                    console.log('Orders loaded successfully, count:', this.orders.length);
                    
                    // Pastikan tableBody masih ada sebelum update
                    const tableBody = document.getElementById('orders-table-body');
                    if (tableBody) {
                        this.updateOrdersTable();
                    } else {
                        console.warn('Orders table body not found in DOM, skipping render');
                    }
                    
                    success = true;
                } catch (retryError) {
                    // Jangan retry jika request dibatalkan
                    if (signal.aborted) {
                        console.log('Orders fetch aborted');
                        break;
                    }
                    
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw retryError;
                    }
                    console.warn(`Error loading orders (attempt ${retryCount}):`, retryError);
                    // Tunggu 1 detik sebelum mencoba lagi
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            // Jangan tampilkan error jika request dibatalkan
            if (error.name === 'AbortError') {
                console.log('Orders fetch was aborted');
                return;
            }
            
            console.error('Error loading orders after retries:', error);
            this.showNotification('Failed to load orders: ' + error.message, 'error');
            
            // Tetap tampilkan tabel meskipun kosong
            this.orders = [];
            this.filteredOrders = [];
            
            // Pastikan tableBody masih ada sebelum update
            const tableBody = document.getElementById('orders-table-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i> 
                                ${error.message}
                                <button onclick="window.ordersPage.loadOrders()" class="retry-btn">
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } finally {
            // Reset abortController setelah request selesai
            this.abortController = null;
        }
    }

    async loadTables() {
        try {
            // Gunakan AbortController yang sama dengan loadOrders
            const signal = this.abortController ? this.abortController.signal : null;
            
            console.log('Loading tables from:', `${this.baseUrl}/admin/tables`);
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseUrl}/admin/tables`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: signal
            });

            if (!response.ok) {
                console.error('Failed to load tables. Status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                return;
            }

            const result = await response.json();
            console.log('Tables data received:', result);
            if (result.status && result.data) {
                this.tables = result.data;
                console.log('Tables loaded successfully, count:', this.tables.length);
            }
        } catch (error) {
            // Ignore AbortError
            if (error.name === 'AbortError') {
                console.log('Tables fetch was aborted');
                return;
            }
            console.error('Error loading tables:', error);
        }
    }

    async loadMenus() {
        try {
            // Gunakan AbortController yang sama dengan loadOrders
            const signal = this.abortController ? this.abortController.signal : null;
            
            console.log('Loading menus from:', `${this.baseUrl}/admin/menus`);
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseUrl}/admin/menus`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: signal
            });

            if (!response.ok) {
                console.error('Failed to load menus. Status:', response.status);
                return;
            }

            const result = await response.json();
            console.log('Menus data received:', result);
            if (result.status && result.data) {
                this.menus = result.data;
                console.log('Menus loaded successfully, count:', this.menus.length);
            }
        } catch (error) {
            // Ignore AbortError
            if (error.name === 'AbortError') {
                console.log('Menus fetch was aborted');
                return;
            }
            console.error('Error loading menus:', error);
        }
    }

    async loadCustomers() {
        try {
            // Gunakan AbortController yang sama dengan loadOrders
            const signal = this.abortController ? this.abortController.signal : null;
            
            console.log('Loading customers from:', `${this.baseUrl}/admin/customers`);
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseUrl}/admin/customers`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: signal
            });

            if (!response.ok) {
                console.error('Failed to load customers. Status:', response.status);
                return;
            }

            const result = await response.json();
            console.log('Customers data received:', result);
            if (result.status && result.data) {
                this.customers = result.data;
                console.log('Customers loaded successfully, count:', this.customers.length);
            }
        } catch (error) {
            // Ignore AbortError
            if (error.name === 'AbortError') {
                console.log('Customers fetch was aborted');
                return;
            }
            console.error('Error loading customers:', error);
        }
    }

    updateOrdersTable() {
        const tableBody = document.getElementById('orders-table-body');
        if (!tableBody) {
            console.error('Orders table body element not found');
            return;
        }

        console.log('Updating orders table with', this.filteredOrders.length, 'orders');
        
        // Jika tidak ada data yang difilter, gunakan semua orders
        const ordersToDisplay = this.filteredOrders.length > 0 ? this.filteredOrders : this.orders;
        
        if (ordersToDisplay.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="no-data">No orders found</td></tr>`;
            return;
        }

        // Use filtered orders instead of all orders
        tableBody.innerHTML = ordersToDisplay.map(order => {
            // Format the order items - limit to 3 items
            const maxItemsToShow = 3;
            const totalItems = order.order_items ? order.order_items.length : 0;
            const visibleItems = order.order_items ? order.order_items.slice(0, maxItemsToShow) : [];
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
                    <td title="${this.formatOrderDate(order.created_at)}">${this.formatOrderDate(order.created_at)}</td>
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
            const response = await fetch(`${this.baseUrl}/admin/orders/${orderId}`, {
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
        console.log(`Processing payment for order #${orderId}`);
        try {
            const order = await this.refreshOrderData(orderId);
            if (order) {
            this.showPaymentModal(order);
            } else {
                console.error(`Failed to load order #${orderId} for payment`);
                this.showNotification('Failed to load order details', 'error');
            }
        } catch (error) {
            console.error(`Error processing payment:`, error);
            this.showNotification('Error processing payment', 'error');
        }
    }

    showPaymentModal(order) {
        console.log('Showing payment modal for order:', order);
        
        // Cek jika modal sudah ada, hapus terlebih dahulu
        const existingModal = document.getElementById('payment-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // Buat modal baru
        const modalElement = document.createElement('div');
        modalElement.id = 'payment-modal';
        modalElement.className = 'modal payment-modal';
        
        // Set modal content
        modalElement.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Proses Pembayaran</h2>
                    <button class="close-btn" id="close-payment-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="payment-info-summary">
                        <h3>Ringkasan Pesanan #${order.id}</h3>
                        <div class="summary-row">
                            <span class="summary-label">Pelanggan:</span>
                            <span class="summary-value">${order.customer ? order.customer.Name || 'Guest' : 'Guest'}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Meja:</span>
                            <span class="summary-value">${order.table ? order.table.number : 'N/A'}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Total:</span>
                            <span class="summary-value">${this.formatCurrency(order.total_amount)}</span>
                        </div>
                    </div>
                    
                    <h3 class="payment-method-title">Pilih Metode Pembayaran</h3>
                    <div class="payment-options">
                        <div class="payment-method-option" data-method="cash">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>Tunai</span>
                        </div>
                        <div class="payment-method-option" data-method="qris">
                            <i class="fas fa-qrcode"></i>
                            <span>QRIS</span>
                        </div>
                    </div>
                    
                    <div class="payment-details-container">
                        <div class="method-prompt">
                            <p>Silakan pilih metode pembayaran di atas</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="confirm-payment-btn" disabled>Konfirmasi Pembayaran</button>
                    <button class="btn-secondary" id="cancel-payment-btn">Batal</button>
                </div>
            </div>
        `;
        
        // Tambahkan modal ke body
        document.body.appendChild(modalElement);
        console.log('Payment modal added to DOM and activated');
        
        // Tampilkan modal
        setTimeout(() => {
            modalElement.classList.add('show');
        }, 50);
        
        // Event listener untuk close button
        const closeBtn = document.getElementById('close-payment-btn');
        closeBtn.onclick = () => this.closeModal();
        
        // Event listener untuk cancel button
        const cancelBtn = document.getElementById('cancel-payment-btn');
        cancelBtn.onclick = () => this.closeModal();
        
        // Event listener untuk payment method selection
        const paymentOptions = document.querySelectorAll('.payment-method-option');
        paymentOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                paymentOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to selected option
                option.classList.add('active');
                
                // Get selected payment method
                const method = option.dataset.method;
                console.log('Payment method selected:', method);
                
                // Show payment details for selected method
                this.showPaymentDetails(method, order);
            });
        });
        
        // Function to close the modal with a delay
        const closeModal = () => {
            if (modalElement) {
                modalElement.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(modalElement)) {
                        document.body.removeChild(modalElement);
                    }
                }, 300);
            }
        };
    }
    
    // Helper method to get an order by ID from the loaded orders
    getOrderById(orderId) {
        if (!this.orders || !this.orders.length) {
            console.warn('No orders loaded, cannot find order #' + orderId);
            return null;
        }
        
        const order = this.orders.find(o => o.id === parseInt(orderId));
        if (!order) {
            console.warn('Order #' + orderId + ' not found in loaded orders');
        }
        return order;
    }
    
    // showPaymentDetails menampilkan detail pembayaran untuk metode pembayaran tertentu
    async showPaymentDetails(method, order) {
        console.log(`Showing payment details for method: ${method}, order:`, order);
        
        try {
            const modalElement = document.getElementById('payment-modal');
            if (!modalElement) {
                console.error('Payment modal not found in DOM');
                return;
            }
            
            // Clear previous payment method classes
            modalElement.classList.remove('qris-active', 'cash-active', 'payment-success');
            
            // Add specific payment method class
            modalElement.classList.add(`${method}-active`);
            
            // Set payment success to false (in case was previously set)
            this.paymentSuccess = false;
            
            // Get payment container
            const paymentContainer = document.querySelector('.payment-details-container');
            if (!paymentContainer) {
                console.error('Payment details container not found');
                return;
            }
            
            // Show loading spinner
            paymentContainer.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>Memuat detail pembayaran...</p>
                </div>
            `;
            
            // Disable confirm button
            const confirmBtn = document.getElementById('confirm-payment-btn');
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
            
            if (method === 'qris') {
                // Untuk QRIS, buat pembayaran dan tampilkan QR code
                try {
                    // Create payment using PaymentsManager
                    const paymentData = {
                        id: order.id,
                        total_amount: order.total_amount,
                        payment_method: 'qris'
                    };
                    
                    console.log('Creating QRIS payment with data:', paymentData);
                    
                    try {
                        // Try to create payment through API first
                        const result = await window.paymentsManager.createPayment(paymentData);
                        console.log('Payment created:', result);
                        
                        // Find QR image URL using different possible paths
                        let qrImageUrl = null;
                        
                        // Case 1: Direct property in result
                        if (result && result.qr_image_url) {
                            qrImageUrl = result.qr_image_url;
                            console.log('Found QR image URL directly in result');
                        } 
                        // Case 2: In payment property
                        else if (result && result.payment && result.payment.qr_image_url) {
                            qrImageUrl = result.payment.qr_image_url;
                            console.log('Found QR image URL in payment property');
                        }
                        // Case 3: In order property 
                        else if (result && result.order && result.order.qr_image_url) {
                            qrImageUrl = result.order.qr_image_url;
                            console.log('Found QR image URL in order property');
                        }
                        
                        if (qrImageUrl) {
                            // Dapatkan transaction ID dari hasil response
                            let transactionId = null;
                            if (result && result.payment && result.payment.reference_id) {
                                transactionId = result.payment.reference_id;
                            }
                            
                            // Bersihkan URL QR code
                            const cleanedQrUrl = this.cleanQRISUrl(qrImageUrl, transactionId);
                            
                            // Coba gunakan proxy untuk URL gambar jika tersedia
                            const proxyQrUrl = this.getProxyImageUrl(cleanedQrUrl);
                            console.log('Original QR URL:', qrImageUrl);
                            console.log('Cleaned QR URL:', cleanedQrUrl);
                            console.log('Proxy QR URL:', proxyQrUrl);
                            
                            paymentContainer.innerHTML = `
                                <div class="qris-container">
                                    <h3>Scan QR Code untuk Membayar</h3>
                                    <div class="qris-code-container">
                                        <img src="${proxyQrUrl}" alt="QRIS Payment QR Code" crossorigin="anonymous" onerror="console.error('QR image failed to load:', this.src)" />
                                    </div>
                                    <div id="qr-debug" style="font-size: 11px; color: #666; margin-top: 5px; margin-bottom: 5px;">QR URL: ${qrImageUrl.substring(0, 50)}...</div>
                                    <div id="qris-payment-status" class="pending">Menunggu Pembayaran</div>
                                    <div class="qris-instructions">
                                        <p>1. Buka aplikasi e-wallet atau mobile banking Anda</p>
                                        <p>2. Pilih menu Scan QR atau QRIS</p>
                                        <p>3. Scan QR code diatas</p>
                                        <p>4. Periksa detail transaksi dan konfirmasi pembayaran</p>
                                        <p>5. Pembayaran akan diproses secara otomatis</p>
                                    </div>
                                </div>
                            `;
                            
                            // Debug QR image loading
                            console.log('Setting up QR image with URL:', qrImageUrl);
                            
                            // Find payment ID
                            let paymentId = null;
                            if (result && result.payment && result.payment.id) {
                                paymentId = result.payment.id;
                                console.log('Found payment ID:', paymentId);
                                
                                // Simpan payment ID untuk digunakan nanti
                                this.currentPaymentId = paymentId;
                                
                                // Tambahkan tombol refresh status setelah QR ditampilkan
                                setTimeout(() => {
                                    const statusElem = document.getElementById('qris-payment-status');
                                    if (statusElem) {
                                        // Buat container untuk status dan tombol
                                        const statusContainer = document.createElement('div');
                                        statusContainer.style.display = 'flex';
                                        statusContainer.style.alignItems = 'center';
                                        statusContainer.style.justifyContent = 'center';
                                        statusContainer.style.marginTop = '10px';
                                        
                                        // Pindahkan konten text dari status ke container
                                        statusContainer.innerHTML = `<span>${statusElem.textContent}</span>`;
                                        
                                        // Tambahkan tombol refresh
                                        const refreshBtn = document.createElement('button');
                                        refreshBtn.textContent = 'Periksa Status';
                                        refreshBtn.className = 'refresh-status-btn';
                                        refreshBtn.style.marginLeft = '10px';
                                        refreshBtn.style.padding = '5px 10px';
                                        refreshBtn.style.border = 'none';
                                        refreshBtn.style.borderRadius = '4px';
                                        refreshBtn.style.backgroundColor = '#4a6cf7';
                                        refreshBtn.style.color = 'white';
                                        refreshBtn.style.cursor = 'pointer';
                                        
                                        // Tambahkan event listener
                                        refreshBtn.addEventListener('click', async () => {
                                            refreshBtn.disabled = true;
                                            refreshBtn.textContent = 'Memeriksa...';
                                            await this.checkPaymentStatus(paymentId);
                                            refreshBtn.disabled = false;
                                            refreshBtn.textContent = 'Periksa Status';
                                        });
                                        
                                        // Tambahkan tombol ke container
                                        statusContainer.appendChild(refreshBtn);
                                        
                                        // Ganti elemen status dengan container baru
                                        statusElem.innerHTML = '';
                                        statusElem.appendChild(statusContainer);
                                    }
                                }, 2000);
                            }
                            
                            // Start polling for payment status
                            this.startPaymentStatusPolling(order.id);
                            
                            // Coba alternatif cara memuat QR code jika di atas gagal
                            setTimeout(() => {
                                const qrContainer = document.querySelector('.qris-code-container');
                                const qrImage = qrContainer ? qrContainer.querySelector('img') : null;
                                
                                if (qrImage && (!qrImage.complete || qrImage.naturalHeight === 0)) {
                                    console.log('QR image failed to load, trying alternative approach');
                                    
                                    // Dapatkan reference_id dari payment jika tersedia
                                    let transactionId = null;
                                    if (result && result.payment && result.payment.reference_id) {
                                        transactionId = result.payment.reference_id;
                                    }
                                    
                                    // Bersihkan URL QR code
                                    const cleanedQrUrl = this.cleanQRISUrl(qrImageUrl, transactionId);
                                    console.log('Using cleaned QR URL:', cleanedQrUrl);
                                    
                                    // Buat QR code image baru
                                    const newImg = document.createElement('img');
                                    newImg.src = this.getProxyImageUrl(cleanedQrUrl);
                                    newImg.alt = "QRIS Payment QR Code";
                                    newImg.crossOrigin = "anonymous";
                                    newImg.style.maxWidth = "100%";
                                    
                                    // Tambahkan header untuk mengatasi masalah CORS
                                    newImg.setAttribute('referrerpolicy', 'no-referrer');
                                    
                                    // Ganti image lama
                                    if (qrContainer) {
                                        qrContainer.innerHTML = '';
                                        qrContainer.appendChild(newImg);
                                        
                                        // Tambahkan event handler jika image tetap gagal dimuat
                                        newImg.onerror = () => {
                                            console.log('Alternative QR image also failed, generating local QR code');
                                            // Coba dapatkan QR string dari result.payment
                                            let qrData = null;
                                            if (result && result.payment && result.payment.qr_code) {
                                                qrData = result.payment.qr_code;
                                                console.log('Using QR code data from payment:', qrData.substring(0, 50) + '...');
                                            } else {
                                                qrData = order.id.toString();
                                                console.log('No QR code data found, using order ID:', qrData);
                                            }
                                            this.generateLocalQRCode(qrContainer, qrData);
                                        };
                                    }
                                } else {
                                    console.log('QR image loaded successfully');
                                }
                            }, 2000);
                        } else {
                            throw new Error('No QR image URL found in API response');
                        }
                    } catch (apiError) {
                        console.error('API error when creating QRIS, using fallback:', apiError);
                        
                        // Fallback to direct Midtrans QRIS
                        // Ekstrak order ID untuk QR code
                        const orderId = order.id;
                        const timestamp = new Date().getTime();
                        const fallbackErrorMessage = document.createElement('div');
                        fallbackErrorMessage.className = 'error-note';
                        fallbackErrorMessage.textContent = `Error: ${apiError.message || 'Unknown error'}. Menggunakan QR sementara.`;
                        fallbackErrorMessage.style.color = '#ff6b6b';
                        fallbackErrorMessage.style.fontSize = '12px';
                        fallbackErrorMessage.style.marginBottom = '10px';
                        
                        // Gunakan API Midtrans sandbox sebagai fallback
                        // Ini hanya solusi sementara, gunakan API yang sebenarnya pada produksi
                        const fallbackQRUrl = `https://api.sandbox.midtrans.com/v2/qris/qr-code/example-qr?order_id=ORDER-${orderId}-${timestamp}`;
                        const proxyFallbackQRUrl = this.getProxyImageUrl(fallbackQRUrl);
                        
                        console.log('Using fallback QR URL:', fallbackQRUrl);
                        console.log('Using proxy fallback QR URL:', proxyFallbackQRUrl);
                        
                        paymentContainer.innerHTML = `
                            <div class="qris-container">
                                <h3>Scan QR Code untuk Membayar</h3>
                                <div class="qris-code-container">
                                    <img src="${proxyFallbackQRUrl}" alt="QRIS Payment QR Code" crossorigin="anonymous" />
                                </div>
                                <div class="error-note" style="color: #ff6b6b; font-size: 12px; margin-bottom: 10px;">
                                    Gagal mendapatkan QR code dari server. Menggunakan QR sementara.
                                </div>
                                <div id="qris-payment-status" class="pending">Menunggu Pembayaran</div>
                                <div class="qris-instructions">
                                    <p>1. Buka aplikasi e-wallet atau mobile banking Anda</p>
                                    <p>2. Pilih menu Scan QR atau QRIS</p>
                                    <p>3. Scan QR code diatas</p>
                                    <p>4. Periksa detail transaksi dan konfirmasi pembayaran</p>
                                    <p>5. Pembayaran akan diproses secara otomatis</p>
                                    <p style="margin-top: 15px; color: #ff6b6b; font-weight: bold;">Catatan: QR code ini hanya untuk pengujian. Server mengalami masalah saat membuat QRIS.</p>
                                </div>
                            </div>
                        `;
                        
                        // Coba generate QR code lokal jika gambar gagal dimuat
                        setTimeout(() => {
                            const qrContainer = document.querySelector('.qris-code-container');
                            const qrImage = qrContainer ? qrContainer.querySelector('img') : null;
                            
                            if (qrImage && (!qrImage.complete || qrImage.naturalHeight === 0)) {
                                console.log('Fallback QR image failed to load, generating local QR code');
                                this.generateLocalQRCode(qrContainer, `ORDER-${orderId}-${timestamp}`);
                            }
                        }, 2000);
                        
                        // Tambahkan elemen error message untuk debugging
                        const qrisContainer = paymentContainer.querySelector('.qris-container');
                        if (qrisContainer) {
                            const errorDetails = document.createElement('div');
                            errorDetails.className = 'error-details';
                            errorDetails.style.fontSize = '11px';
                            errorDetails.style.color = '#666';
                            errorDetails.style.marginTop = '15px';
                            errorDetails.style.padding = '8px';
                            errorDetails.style.backgroundColor = '#f8f8f8';
                            errorDetails.style.borderRadius = '4px';
                            errorDetails.style.maxHeight = '100px';
                            errorDetails.style.overflow = 'auto';
                            errorDetails.innerHTML = `
                                <p><strong>Debug info:</strong> ${apiError.message || 'Unknown error'}</p>
                                <p>Order ID: ${order.id}</p>
                                <p>Timestamp: ${new Date().toISOString()}</p>
                            `;
                            qrisContainer.appendChild(errorDetails);
                        }
                        
                        // Poll order status instead of payment ID
                        this.startPaymentStatusPolling(order.id);
                    }
                } catch (error) {
                    console.error('Error creating QRIS payment:', error);
                    paymentContainer.innerHTML = `
                        <div class="qris-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <h3>Gagal Membuat QR Code</h3>
                            <p>${error.message || 'Terjadi kesalahan saat membuat pembayaran QRIS'}</p>
                            <div class="error-details" style="font-size: 12px; margin-top: 10px; color: #666; max-width: 100%; overflow-wrap: break-word;">
                                <p>Detail teknis: ${error.toString()}</p>
                            </div>
                            <button id="retry-qris-btn" class="btn-primary">Coba Lagi</button>
                        </div>
                    `;
                    
                    const retryBtn = document.getElementById('retry-qris-btn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => this.showPaymentDetails('qris', order));
                    }
                }
            } else if (method === 'cash') {
                // Cash payment form
                paymentContainer.innerHTML = `
                    <div class="cash-payment-form">
                        <div class="form-group">
                            <label for="cash-amount">Jumlah Dibayar (Rp)</label>
                            <input type="text" id="cash-amount" class="cash-amount-input" value="${this.formatCurrencyForInput(order.total_amount)}" placeholder="Masukkan jumlah uang">
                        </div>
                        <div class="payment-summary">
                            <div class="summary-row">
                                <span class="summary-label">Total Tagihan:</span>
                                <span class="summary-value">${this.formatCurrency(order.total_amount)}</span>
                            </div>
                            <div class="summary-row" id="change-row" style="display:none;">
                                <span class="summary-label">Kembalian:</span>
                                <span class="summary-value" id="change-amount">-</span>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add event listener to calculate change
                const cashAmountInput = document.getElementById('cash-amount');
                if (cashAmountInput) {
                    // Handle input with proper formatting to avoid adding extra zeros
                    cashAmountInput.addEventListener('input', (e) => {
                        // Store cursor position
                        const cursorPos = e.target.selectionStart;
                        
                        // Get raw value without formatting
                        let rawValue = e.target.value.replace(/[^\d]/g, '');
                        
                        // Prevent continuous zeros at the start
                        if (rawValue.length > 1 && rawValue.startsWith('0')) {
                            rawValue = rawValue.replace(/^0+/, '');
                        }
                        
                        // Prevent empty value
                        if (rawValue === '') {
                            rawValue = '0';
                        }
                        
                        // Convert to number
                        const numericValue = parseInt(rawValue);
                        
                        // Format for display
                        const formattedValue = this.formatCurrencyForInput(numericValue);
                        
                        // Calculate potential cursor position change
                        const lenDiff = formattedValue.length - e.target.value.length;
                        
                        // Update input value
                        e.target.value = formattedValue;
                        
                        // Try to keep cursor in the correct position
                        const newCursorPos = cursorPos + lenDiff;
                        e.target.setSelectionRange(newCursorPos, newCursorPos);
                        
                        // Calculate change
                        if (numericValue >= order.total_amount) {
                            const change = numericValue - order.total_amount;
                            document.getElementById('change-amount').textContent = this.formatCurrency(change);
                            document.getElementById('change-row').style.display = 'flex';
                        } else {
                            document.getElementById('change-row').style.display = 'none';
                        }
                    });
                    
                    // Limit input to prevent too many digits
                    cashAmountInput.addEventListener('keydown', (e) => {
                        // Allow: backspace, delete, tab, escape, enter, and numeric keys
                        if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
                            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                            (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) ||
                            (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) ||
                            (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) ||
                            (e.keyCode === 88 && (e.ctrlKey || e.metaKey)) ||
                            // Allow: home, end, left, right
                            (e.keyCode >= 35 && e.keyCode <= 39)) {
                            // Let it happen, don't do anything
                            return;
                        }
                        
                        // Block non-numeric keys
                        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
                            (e.keyCode < 96 || e.keyCode > 105)) {
                            e.preventDefault();
                        }
                        
                        // Limit to max 9 digits (hundreds of millions in rupiah)
                        const currentValue = e.target.value.replace(/[^\d]/g, '');
                        if (currentValue.length >= 9 && 
                            ![46, 8, 37, 38, 39, 40].includes(e.keyCode)) {
                            e.preventDefault();
                        }
                    });
                    
                    // Trigger the input event to initialize the change calculation
                    cashAmountInput.dispatchEvent(new Event('input'));
                }
                
                // Enable the confirm payment button
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Konfirmasi Pembayaran';
                    
                    // Add event listener for payment confirmation
                    confirmBtn.onclick = () => {
                        const cashAmount = document.getElementById('cash-amount');
                        const amount = parseInt(cashAmount.value.replace(/[^\d]/g, '')) || 0;
                        
                        if (amount < order.total_amount) {
                            alert('Jumlah pembayaran kurang dari total tagihan!');
                            return;
                        }
                        
                        this.processPaymentConfirmation(order.id, 'cash', amount);
                    };
                }
            }
        } catch (error) {
            console.error('Error showing payment details:', error);
            const paymentContainer = document.querySelector('.payment-details-container');
            if (paymentContainer) {
                paymentContainer.innerHTML = `
                    <div class="error-message">
                        <p>Terjadi kesalahan saat memuat detail pembayaran.</p>
                        <p>${error.message || 'Silakan coba lagi.'}</p>
                    </div>
                `;
            }
        }
    }
    
    // Helper function for formatting currency in input field
    formatCurrencyForInput(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '';
        }
        
        // Format number with thousand separators
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    showClosePaymentModalConfirmation() {
        const logger = window.utils && window.utils.logger ? window.utils.logger : console;
        logger.debug('Showing close payment modal confirmation');
        
        // Create confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal confirmation-modal';
        confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Confirm Close</h2>
                    <button class="close-btn" id="close-confirm-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to close the payment process? Any pending payment will be lost.</p>
                    <div class="d-flex justify-content-center mt-3">
                        <button id="cancel-close-btn" class="btn btn-primary me-2">Continue Payment</button>
                        <button id="confirm-close-btn" class="btn btn-outline-danger">Close Payment</button>
                </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        
        // Show modal
        setTimeout(() => {
            confirmModal.classList.add('show');
        }, 10);
        
        // Close button event
        const closeBtn = confirmModal.querySelector('#close-confirm-modal');
        const cancelBtn = confirmModal.querySelector('#cancel-close-btn');
        const confirmBtn = confirmModal.querySelector('#confirm-close-btn');
        
        const closeConfirmationModal = () => {
            confirmModal.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(confirmModal)) {
                    document.body.removeChild(confirmModal);
                }
            }, 300);
        };
        
        if (closeBtn) {
        closeBtn.addEventListener('click', closeConfirmationModal);
        }
        
        if (cancelBtn) {
        cancelBtn.addEventListener('click', closeConfirmationModal);
        }
        
        if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
                // Close confirmation modal first
            closeConfirmationModal();
            
                // Then close payment modal
                const paymentModal = document.getElementById('payment-modal');
            if (paymentModal) {
                    paymentModal.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(paymentModal)) {
                        document.body.removeChild(paymentModal);
                    }
                }, 300);
            }
                
                // Clear any polling intervals
                if (this.paymentStatusInterval) {
                    clearInterval(this.paymentStatusInterval);
                    this.paymentStatusInterval = null;
                }
            });
        }
    }

    async processPaymentConfirmation(orderId, paymentMethod, amount) {
        try {
            console.log(`Processing payment confirmation for order #${orderId} with method ${paymentMethod} and amount ${amount}`);
            
            // Gunakan payments manager jika tersedia
            if (window.paymentsManager) {
                const paymentData = {
                    id: orderId,
                    total_amount: paymentMethod === 'cash' ? this.getOrderById(orderId).total_amount : amount,
                    payment_method: paymentMethod
                };
                
                // Add cash received amount for cash payments
                if (paymentMethod === 'cash') {
                    paymentData.cash_received = amount;
                }
                
                console.log('Sending payment data to payment manager:', paymentData);
                const result = await window.paymentsManager.createPayment(paymentData);
                
                // Check if payment was successful
                if (result && (result.payment.status === 'success' || result.payment.status === 'pending')) {
                    // For cash payments, update UI immediately
                    if (paymentMethod === 'cash' && result.payment.status === 'success') {
                        this.updatePaymentStatus(orderId, 'success', result.payment);
                        // Close payment modal
                        const paymentModal = document.getElementById('payment-modal');
                        if (paymentModal) {
                            paymentModal.classList.remove('show');
                            setTimeout(() => {
                                if (document.body.contains(paymentModal)) {
                                    document.body.removeChild(paymentModal);
                                }
                            }, 300);
                        }
                        this.showNotification('Pembayaran berhasil diproses', 'success');
                    }
                }
                
                return result;
            }
            
            // Fallback if no paymentsManager (should not happen)
            console.warn('Payment manager not available, using fallback method');
            
            // Prepare payment data
            const paymentData = {
                order_id: orderId,
                amount: amount,
                payment_method: paymentMethod,
                reference_id: `REF-${orderId}-${Date.now()}`
            };
            
            console.log('Processing payment with data:', paymentData);
            
            // Call API to confirm payment
            const response = await fetch(`${window.API_BASE_URL}/admin/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = errorData.message || `Error ${response.status}: Failed to process payment`;
                console.error('Payment confirmation failed:', errorMsg);
                
                // Show error notification if available
                if (this.showNotification) {
                    this.showNotification(errorMsg, 'error');
                }
                
                // Throw error to be caught by caller
                throw new Error(errorMsg);
            }
            
            const result = await response.json();
            console.log('Payment processed successfully:', result);
            
            // Show success notification if available
            if (this.showNotification) {
                this.showNotification('Payment processed successfully', 'success');
            }

            return result;
        } catch (error) {
            // Log and rethrow error for caller to handle
            console.error('Error processing payment confirmation:', error);
            
            // Show error notification if available
            if (this.showNotification) {
                this.showNotification(error.message || 'Failed to process payment. Please try again.', 'error');
            }
            
            throw error;
        }
    }

    // Refresh data order dari server
    async refreshOrderData(orderId) {
        try {
            console.log(`Refreshing order data for order #${orderId}`);
            
            // Jika QRIS payment, cek status di Midtrans
            try {
                console.log(`Checking payment status from Midtrans for order ${orderId}`);
                const paymentResponse = await fetch(`${window.API_BASE_URL}/admin/orders/${orderId}/check-payment`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (paymentResponse.ok) {
                    const paymentResult = await paymentResponse.json();
                    console.log('Order payment check response:', paymentResult);
                    
                    if (paymentResult.was_updated) {
                        console.log(`Payment status updated from Midtrans to: ${paymentResult.status}`);
                        this.showNotification(`Status pembayaran diperbarui: ${paymentResult.status}`, 'success');
                        
                        // Jika status berhasil, tidak perlu refresh data order lagi
                        if (paymentResult.status === 'success') {
                            // Ambil data order dari server
                            const orderResponse = await fetch(`${window.API_BASE_URL}/admin/orders/${orderId}`, {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                }
                            });
                            
                            if (orderResponse.ok) {
                                const orderResult = await orderResponse.json();
                                console.log('Order refresh response:', orderResult);
                                
                                // Perbarui UI dengan data pembayaran dari Midtrans
                                this.updatePaymentStatus(orderId, paymentResult.status, { id: paymentResult.payment_id });
                                this.updateOrdersTable();
                                
                                return orderResult.data;
                            }
                        }
                    }
                }
            } catch (paymentError) {
                console.error('Error checking payment status from Midtrans:', paymentError);
            }
            
            // Ambil data order dari server
            const response = await fetch(`${window.API_BASE_URL}/admin/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to refresh order: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Order refresh response:', result);
            
            if (result.status && result.data) {
                // Update local data
                const orderIndex = this.orders.findIndex(o => o.id === orderId);
                if (orderIndex !== -1) {
                    this.orders[orderIndex] = result.data;
                }
                
                // Update UI jika perlu
                this.updateOrdersTable();
                
                return result.data;
            }
            
            return null;
        } catch (error) {
            console.error(`Error refreshing order data:`, error);
            this.showNotification('Failed to refresh order data', 'error');
            return null;
        }
    }

    async viewOrderDetails(orderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseUrl}/admin/orders/${orderId}`, {
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
                                    <span>${this.formatOrderDate(order.created_at)}</span>
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
        modal.id = 'new-order-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>New Order</h2>
                    <button type="button" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="new-order-form">
                        <div class="form-group">
                            <label for="table-select">Table</label>
                            <select id="table-select" required>
                                <option value="">Select Table</option>
                                ${this.tables.filter(table => table.status === 'available').map(table => 
                                    `<option value="${table.id}">${table.number} (${table.capacity} seats)</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="order-items-container">
                            <h3>Order Items</h3>
                            <div id="order-items-list">
                                <!-- Item inputs will be added here -->
                            </div>
                            <button type="button" class="btn-add-item" id="add-item-btn">
                                <i class="fas fa-plus"></i> Add Item
                            </button>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px; text-align: right;">
                            <h3>Total: <span id="order-total">Rp 0</span></h3>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" id="close-modal-btn">Cancel</button>
                            <button type="submit" class="btn-primary">Create Order</button>
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

        // Setup add item button
        const addItemBtn = modal.querySelector('#add-item-btn');
        addItemBtn.addEventListener('click', () => this.addOrderItemInput());

        // Setup close buttons
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('#close-modal-btn');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        // Prevent closing when clicking inside modal content
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Show the modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 50);
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
        console.log('Adding new order item input');
        const container = document.getElementById('order-items-list');
        if (!container) {
            console.error('Could not find order-items-list container');
            return;
        }
        const index = container.children.length;
        const div = document.createElement('div');
        div.innerHTML = this.renderOrderItemInput(index);
        container.appendChild(div.firstElementChild);
        this.updateOrderTotal();
    }

    removeOrderItemInput(index) {
        console.log('Removing order item input at index:', index);
        const item = document.querySelector(`.order-item-input[data-index="${index}"]`);
        if (item) {
            item.remove();
            this.updateOrderTotal();
        } else {
            console.error('Could not find order item input at index:', index);
        }
    }

    async handleNewOrderSubmit(e) {
        e.preventDefault();
        
        const tableId = document.getElementById('table-select').value;

        if (!tableId) {
            this.showNotification('Mohon pilih meja terlebih dahulu', 'error');
            return;
        }

        // Validasi status meja terlebih dahulu menggunakan data yang sudah di-load
        try {
            console.log('Checking table availability before creating order');
            
            // Cari meja dengan id yang dipilih dari data tables yang sudah di-load
            const selectedTable = this.tables.find(table => table.id == tableId);
            
            if (!selectedTable) {
                throw new Error('Meja tidak ditemukan');
            }
            
            console.log('Table data:', selectedTable);

            if (selectedTable.status !== 'available') {
                this.showNotification(`Meja ${selectedTable.number} tidak tersedia. Status: ${selectedTable.status}`, 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking table availability:', error);
            this.showNotification('Gagal memeriksa ketersediaan meja', 'error');
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

            console.log('Creating customer with data:', customerData);
            const customerResponse = await fetch(`${this.baseUrl}/admin/customers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            if (customerResponse.status === 409) {
                const errorData = await customerResponse.json();
                console.error('Table is already occupied:', errorData);
                this.showNotification('Meja sedang digunakan, silakan pilih meja lain', 'error');
                return;
            }

            if (!customerResponse.ok) {
                const errorData = await customerResponse.json();
                throw new Error(errorData.message || 'Failed to create customer');
            }

            const customerResponseData = await customerResponse.json();

            // Validasi struktur response customer
            if (!customerResponseData.status || !customerResponseData.data || !customerResponseData.data.ID) {
                console.error('Invalid customer response structure:', customerResponseData);
                throw new Error('Invalid customer response structure');
            }

            const customerId = customerResponseData.data.ID;
            console.log('Customer created with ID:', customerId);

            // Buat order baru dengan customer_id
            console.log('Creating order for customer:', customerId);
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

            // Coba kirim request dengan format data yang sudah diverifikasi
            const orderResponse = await fetch(`${this.baseUrl}/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!orderResponse.ok) {
                console.error('Order creation failed. Response status:', orderResponse.status);
                const errorData = await orderResponse.json();
                throw new Error(errorData.message || 'Failed to create order');
            }

            const orderResponseData = await orderResponse.json();
            console.log('Order created successfully:', orderResponseData);

            if (orderResponseData.status) {
                // Tutup modal sebelum reload data
                this.closeModal();
                
                // Reload data orders
                await this.loadOrders();
                
                // Pastikan orders terurut berdasarkan created_at terbaru
                this.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                this.filteredOrders = [...this.orders];
                
                // Update tampilan
                this.updateOrdersTable();
                
                this.showNotification('Order berhasil dibuat!');
                
                // Refresh tables data in case their status has changed
                if (window.tablesPage) {
                    window.tablesPage.loadTables();
                }
            }
        } catch (error) {
            console.error('Error creating order:', error);
            this.showNotification(error.message || 'Gagal membuat order', 'error');
        }
    }

    updateItemPrice(element) {
        console.log('Updating item price for element:', element);
        if (!element) {
            console.error('No element provided to updateItemPrice');
            return;
        }
        
        const row = element.closest('.order-item-input');
        if (!row) {
            console.error('Could not find parent order-item-input');
            return;
        }
        
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
        const logger = window.utils && window.utils.logger ? window.utils.logger : console;
        logger.debug('Closing modal');
        
        // Handle active payment modal
        const paymentModal = document.getElementById('payment-modal');
        if (paymentModal && paymentModal.classList.contains('show')) {
            // If there is ongoing QRIS payment process, show confirmation before close
            if (paymentModal.classList.contains('qris-active') && 
                !this.paymentSuccess && 
                !paymentModal.classList.contains('payment-success')) {
                this.showClosePaymentModalConfirmation();
                return;
            }
            
            // Otherwise close the payment modal directly
            paymentModal.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(paymentModal)) {
                    document.body.removeChild(paymentModal);
                }
            }, 300);
            
            // Clear any polling intervals
            if (this.paymentStatusInterval) {
                clearInterval(this.paymentStatusInterval);
                this.paymentStatusInterval = null;
            }
            
            return;
        }
        
        // Close any other active modal including new order modal
        const activeModals = document.querySelectorAll('.modal');
        activeModals.forEach(modal => {
            modal.classList.add('modal-closing');
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        });
    }

    formatOrderDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return new Date().toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) + ', ' + new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) + ', ' + date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return new Date().toLocaleDateString('id-ID');
        }
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
            const response = await fetch(`${this.baseUrl}/admin/orders/${orderId}`, {
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
            
            // Fetch payment information if available
            if (order.status === 'paid' || order.status === 'completed') {
                try {
                    // Gunakan fungsi getPaymentByOrderId yang sudah ada
                    const payment = await this.getPaymentByOrderId(orderId);
                    if (payment) {
                        order.payment = payment;
                        console.log('Payment data for receipt:', payment);
                    } else {
                        console.warn('Payment data not found for order:', orderId);
                        // Buat payment default untuk struk
                        order.payment = {
                            payment_method: 'cash',
                            amount: order.total_amount,
                            status: 'success'
                        };
                    }
                } catch (paymentError) {
                    console.error('Error fetching payment details:', paymentError);
                    // Continue with default payment data
                    order.payment = {
                        payment_method: 'cash',
                        amount: order.total_amount,
                        status: 'success'
                    };
                }
            } else {
                // Order belum dibayar, gunakan nilai default
                order.payment = {
                    payment_method: 'cash',
                    amount: order.total_amount,
                    status: 'pending'
                };
            }
            
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
            }, 1000);
            
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
        
        // Get payment details if available
        const paymentMethod = order.payment?.payment_method || 'N/A';
        const paymentAmount = order.payment?.amount || total;
        const cashReceived = order.payment?.cash_received || paymentAmount;
        const change = order.payment?.cash_change || Math.max(0, cashReceived - total);
        const referenceId = order.payment?.reference_id || '-';
        const paymentStatus = order.payment?.status || 'pending';
        const transactionDetail = order.payment?.transaction_detail || '';
        
        // Format payment method untuk tampilan
        let formattedPaymentMethod = "Tunai";
        let paymentMethodBadge = "cash";
        if (paymentMethod === 'qris') {
            formattedPaymentMethod = "QRIS";
            paymentMethodBadge = "qris";
        }
        
        // Format payment status
        let formattedPaymentStatus = "Belum dibayar";
        let paymentStatusClass = "pending";
        if (paymentStatus === 'success') {
            formattedPaymentStatus = "Lunas";
            paymentStatusClass = "success";
        } else if (paymentStatus === 'pending') {
            formattedPaymentStatus = "Menunggu Pembayaran";
            paymentStatusClass = "pending";
        }
        
        // Generate payment time info
        let paymentTimeInfo = "";
        if (order.payment && order.payment.payment_time) {
            const paymentDate = new Date(order.payment.payment_time);
            const paymentFormattedDate = paymentDate.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            const paymentFormattedTime = paymentDate.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            paymentTimeInfo = `<div class="summary-row">
                <span class="summary-label">WAKTU PEMBAYARAN</span>
                <span class="summary-value">${paymentFormattedDate}, ${paymentFormattedTime}</span>
            </div>`;
        }
        
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
        
        // Generate payment details section based on payment method
        let paymentDetailsHTML = '';
        
        if (paymentMethod === 'cash') {
            paymentDetailsHTML = `
            <div class="payment-info">
                <div class="summary-row">
                    <span class="summary-label">METODE PEMBAYARAN</span>
                    <span class="summary-value">${formattedPaymentMethod} <span class="payment-method-badge ${paymentMethodBadge}">Cash</span></span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">STATUS</span>
                    <span class="summary-value ${paymentStatusClass}">${formattedPaymentStatus}</span>
                </div>
                ${paymentTimeInfo}
                <div class="summary-row">
                    <span class="summary-label">TOTAL TAGIHAN</span>
                    <span class="summary-value">${this.formatCurrency(total)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">DIBAYAR</span>
                    <span class="summary-value">${this.formatCurrency(cashReceived)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">KEMBALI</span>
                    <span class="summary-value">${this.formatCurrency(change)}</span>
                </div>
            </div>`;
        } else if (paymentMethod === 'qris') {
            paymentDetailsHTML = `
            <div class="payment-info">
                <div class="summary-row">
                    <span class="summary-label">METODE PEMBAYARAN</span>
                    <span class="summary-value">${formattedPaymentMethod} <span class="payment-method-badge ${paymentMethodBadge}">QRIS</span></span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">STATUS</span>
                    <span class="summary-value ${paymentStatusClass}">${formattedPaymentStatus}</span>
                </div>
                ${paymentTimeInfo}
                <div class="summary-row">
                    <span class="summary-label">REFERENCE ID</span>
                    <span class="summary-value small-text">${referenceId}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">JUMLAH</span>
                    <span class="summary-value">${this.formatCurrency(paymentAmount)}</span>
                </div>
            </div>`;
        } else {
            // Default payment info
            paymentDetailsHTML = `
            <div class="payment-info">
                <div class="summary-row">
                    <span class="summary-label">METODE PEMBAYARAN</span>
                    <span class="summary-value">-</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">STATUS</span>
                    <span class="summary-value pending">Belum Dibayar</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">TOTAL</span>
                    <span class="summary-value">${this.formatCurrency(total)}</span>
                </div>
            </div>`;
        }
        
        // Return full receipt HTML with styling
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt - Order #${order.id}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
            <style>
                @page {
                    size: 80mm 297mm;
                    margin: 0;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .receipt-container {
                    width: 80mm;
                    margin: 0 auto;
                    background: white;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                
                .receipt {
                    padding: 8px;
                    width: 100%;
                    box-sizing: border-box;
                    font-size: 10px;
                    line-height: 1.4;
                }
                
                .receipt-header {
                    text-align: center;
                    margin-bottom: 10px;
                    border-bottom: 1px dashed #ccc;
                    padding-bottom: 10px;
                    position: relative;
                }
                
                .header-line {
                    height: 4px;
                    background: linear-gradient(to right, #6366f1, #8b5cf6, #ec4899);
                    margin-bottom: 8px;
                    border-radius: 2px;
                }
                
                .restaurant-logo {
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 5px;
                    background-color: #8b5cf6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 18px;
                }
                
                .restaurant-name {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 8px 0 5px 0;
                }
                
                .restaurant-info {
                    font-size: 9px;
                    margin: 2px 0;
                    color: #555;
                }
                
                .receipt-info {
                    margin-bottom: 12px;
                    background-color: #f8fafc;
                    border-radius: 6px;
                    padding: 8px;
                    border-left: 3px solid #8b5cf6;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    font-size: 9px;
                }
                
                .info-label {
                    color: #64748b;
                    font-weight: 500;
                }
                
                .order-items {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 10px;
                    font-size: 9px;
                }
                
                .order-items th {
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                    padding: 4px 2px;
                    font-size: 9px;
                    color: #64748b;
                    background-color: #f8fafc;
                }
                
                .order-items td {
                    padding: 4px 2px;
                    font-size: 9px;
                    vertical-align: top;
                    border-bottom: 1px dotted #eee;
                }
                
                .item-name {
                    max-width: 100px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: 500;
                }
                
                .item-notes {
                    font-size: 8px;
                    font-style: italic;
                    color: #666;
                    padding-left: 8px;
                }
                
                .qty {
                    text-align: center;
                }
                
                .price, .subtotal {
                    text-align: right;
                }
                
                .divider {
                    border-top: 1px dashed #ccc;
                    margin: 8px 0;
                }
                
                .summary {
                    margin-bottom: 12px;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 9px;
                }
                
                .total {
                    font-weight: bold;
                    font-size: 12px;
                    text-align: right;
                    margin-top: 8px;
                    border-top: 1px solid #000;
                    padding-top: 6px;
                }
                
                .payment-info {
                    margin: 12px 0;
                    padding: 8px;
                    background-color: #f9f9f9;
                    border-radius: 6px;
                    border-left: 3px solid #8b5cf6;
                }
                
                .payment-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                    padding-bottom: 4px;
                    border-bottom: 1px dotted #ddd;
                    font-size: 9px;
                    font-weight: 500;
                }
                
                .payment-info .summary-row {
                    font-size: 9px;
                }
                
                .change-row {
                    font-weight: bold;
                    font-size: 10px;
                    margin-top: 4px;
                    padding-top: 4px;
                    border-top: 1px dotted #ccc;
                }
                
                .qrcode {
                    text-align: center;
                    margin: 10px 0;
                }
                
                .qrcode-container {
                    background-color: white;
                    padding: 8px;
                    display: inline-block;
                    margin-bottom: 4px;
                    border: 1px solid #eee;
                    border-radius: 6px;
                }
                
                .qrcode-data {
                    font-size: 8px;
                    color: #666;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 12px;
                    font-size: 9px;
                    border-top: 1px dashed #ccc;
                    padding-top: 8px;
                }
                
                .footer p {
                    margin: 2px 0;
                }
                
                .footer-graphic {
                    margin: 6px auto;
                    width: 60%;
                    height: 3px;
                    background: linear-gradient(to right, transparent, #8b5cf6, transparent);
                    border-radius: 3px;
                }
                
                .payment-method-badge {
                    font-size: 8px;
                    padding: 1px 4px;
                    border-radius: 3px;
                    background-color: #e9d5ff;
                    color: #7e22ce;
                    display: inline-block;
                    vertical-align: middle;
                    font-weight: bold;
                }
                
                .payment-method-badge.qris {
                    background-color: #dbeafe;
                    color: #2563eb;
                }
                
                .small-text {
                    font-size: 8px;
                    word-break: break-all;
                }
                
                .pending {
                    color: #ea580c;
                }
                
                .success {
                    color: #16a34a;
                }
                
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: none;
                    }
                    
                    .receipt-container {
                        box-shadow: none;
                        margin: 0;
                        width: 100%;
                    }
                    
                    .header-line {
                        background: #000;
                        height: 2px;
                    }
                    
                    .restaurant-logo {
                        background-color: #333;
                    }
                    
                    .payment-info, .receipt-info {
                        border-left-color: #333;
                        background-color: #f9f9f9;
                    }
                    
                    .footer-graphic {
                        background: #333;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="receipt">
                    <div class="receipt-header">
                        <div class="header-line"></div>
                        <div class="restaurant-logo">R</div>
                        <h1 class="restaurant-name">RESTO APP</h1>
                        <p class="restaurant-info">Jl. Contoh No. 123, Jakarta</p>
                        <p class="restaurant-info">Telp: (021) 123456789</p>
                        <p class="restaurant-info">${formattedDate}, ${formattedTime}</p>
                    </div>
                    
                    <div class="receipt-info">
                        <div class="info-row">
                            <span class="info-label">ORDER ID:</span>
                            <span>#${order.id}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">TANGGAL:</span>
                            <span>${this.formatOrderDate(order.created_at)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">MEJA:</span>
                            <span>${order.table ? 'No. ' + order.table.number : 'Take Away'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">KASIR:</span>
                            <span>${this.getCurrentAdminName()}</span>
                        </div>
                    </div>
                    
                    <div class="order-details">
                        <table class="order-items">
                            <thead>
                                <tr>
                                    <th style="width: 50%;">Item</th>
                                    <th style="width: 10%;">Qty</th>
                                    <th style="width: 20%;">Harga</th>
                                    <th style="width: 20%;">Subtotal</th>
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
                        
                        ${paymentDetailsHTML}
                        
                        <div class="qrcode">
                            <div class="qrcode-container" id="qrcode"></div>
                            <div class="qrcode-data">${Code}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-graphic"></div>
                        <p>Terima kasih atas kunjungan Anda!</p>
                        <p>Silakan datang kembali</p>
                        <p style="font-size: 8px; margin-top: 8px;">Dokumen ini merupakan bukti pembayaran yang sah</p>
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
                            qrImg.style.maxWidth = '80px';
                            qrImg.style.display = 'block';
                            qrImg.style.margin = '0 auto';
                        }
                        
                        // Auto print after 500ms
                        setTimeout(() => {
                            window.print();
                        }, 500);
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

    // Mendapatkan payment berdasarkan order ID
    async getPaymentByOrderId(orderId) {
        try {
            console.log(`Fetching payment data for order ${orderId}`);
            const response = await fetch(`${window.API_BASE_URL}/admin/payments?order_id=${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch payment: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Payment API response:', result);
            
            if (result.status && result.data && result.data.length > 0) {
                // Ambil pembayaran terakhir (terbaru) jika ada beberapa
                const latestPayment = result.data.sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                )[0];
                
                return latestPayment;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching payment data:', error);
            return null;
        }
    }
    
    async getPaymentById(paymentId) {
        // Implementasi untuk mendapatkan data pembayaran berdasarkan ID
        // Misalnya, gunakan API lain untuk mendapatkan detail pembayaran
        // Contoh: fetch(`${window.API_BASE_URL}/admin/payments/${paymentId}`);
        console.log(`Fetching payment data for payment ID: ${paymentId}`);
        try {
            const response = await fetch(`${window.API_BASE_URL}/admin/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch payment: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Payment API response:', result);
            
            return result;
        } catch (error) {
            console.error('Error fetching payment data:', error);
            return null;
        }
    }

    // Metode untuk memulai polling status pembayaran
    startPaymentStatusPolling(orderId) {
        console.log(`Starting payment status polling for order ${orderId}`);
        
        // Gunakan interval polling lebih agresif: 2 detik
        const pollingInterval = 2000; // 2 detik
        let attempts = 0;
        const maxAttempts = 60; // Batasi polling ke 60 kali (2 menit dengan interval 2 detik)
        
        // Menampilkan indikator loading di status
        const statusElem = document.getElementById('qris-payment-status');
        if (statusElem) {
            statusElem.innerHTML = `
                <div class="payment-status-loading">
                    <span class="loading-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid #f3f3f3;border-top:2px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;margin-right:8px;"></span>
                    <span>Menunggu pembayaran...</span>
                </div>
            `;
        }
        
        const checkStatus = async () => {
            try {
                attempts++;
                console.log(`[Payment Poll] Check #${attempts} for order ${orderId}`);
                
                // Dapatkan data pembayaran dari server untuk order ini
                const paymentData = await this.getPaymentByOrderId(orderId);
                
                if (paymentData) {
                    console.log(`[Payment Poll] Payment data:`, paymentData);
                    
                    // Jika status sudah berhasil, update UI
                    if (paymentData.status === 'success') {
                        console.log('[Payment Poll] Payment success detected, updating UI');
                        clearInterval(this.paymentPollingInterval);
                        this.updatePaymentStatus(orderId, 'success', paymentData);
                        this.handlePaymentUpdate({ payment: paymentData });
                        return;
                    } 
                    // Jika status failed atau expired, update UI
                    else if (paymentData.status === 'failed' || paymentData.status === 'expired') {
                        console.log(`[Payment Poll] Payment ${paymentData.status} detected, updating UI`);
                        clearInterval(this.paymentPollingInterval);
                        this.updatePaymentStatus(orderId, paymentData.status, paymentData);
                        this.handlePaymentUpdate({ payment: paymentData });
                        return;
                    }
                    
                    // Jika masih pending, cek secara aktif melalui endpoint check-payment
                    try {
                        console.log('[Payment Poll] Actively checking payment status via API');
                        const checkResponse = await fetch(`${window.API_BASE_URL}/admin/orders/${orderId}/check-payment`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        
                        if (checkResponse.ok) {
                            const checkResult = await checkResponse.json();
                            console.log('[Payment Poll] Payment check result:', checkResult);
                            
                            // Jika status berhasil diupdate, refresh data
                            if (checkResult.data && checkResult.data.was_updated) {
                                console.log('[Payment Poll] Status was updated, refreshing payment data');
                                const refreshedPayment = await this.getPaymentByOrderId(orderId);
                                
                                if (refreshedPayment && refreshedPayment.status !== 'pending') {
                                    console.log(`[Payment Poll] Refreshed payment status: ${refreshedPayment.status}`);
                                    clearInterval(this.paymentPollingInterval);
                                    this.updatePaymentStatus(orderId, refreshedPayment.status, refreshedPayment);
                                    this.handlePaymentUpdate({ payment: refreshedPayment });
                                    return;
                                }
                            }
                        }
                    } catch (checkError) {
                        console.error('[Payment Poll] Error checking payment status via API:', checkError);
                    }
                    
                    // Jika batas polling tercapai
                    if (attempts >= maxAttempts) {
                        console.log('[Payment Poll] Max polling attempts reached, stopping');
                        clearInterval(this.paymentPollingInterval);
                        
                        // Tampilkan tombol refresh manual
                        if (statusElem) {
                            statusElem.innerHTML = `
                                <div class="payment-status-pending">
                                    Menunggu pembayaran... 
                                    <button onclick="window.ordersPage.checkPaymentStatus(${paymentData.id})" 
                                        style="background-color: #4a6cf7; color: white; border: none; 
                                        padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px; font-size: 12px;">
                                        <i class="fas fa-sync-alt" style="margin-right: 4px;"></i> Periksa Status
                                    </button>
                                </div>
                            `;
                        }
                    }
                } else {
                    console.log('[Payment Poll] No payment data found');
                }
            } catch (error) {
                console.error('[Payment Poll] Error checking payment status:', error);
                
                // Jika batas polling tercapai
                if (attempts >= maxAttempts) {
                    console.log('[Payment Poll] Max polling attempts reached after error, stopping');
                    clearInterval(this.paymentPollingInterval);
                    
                    if (statusElem) {
                        statusElem.innerHTML = `
                            <div class="payment-status-error">
                                Terjadi kesalahan saat memeriksa status pembayaran.
                                <button onclick="window.ordersPage.startPaymentStatusPolling(${orderId})" 
                                    style="background-color: #4a6cf7; color: white; border: none; 
                                    padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px; font-size: 12px;">
                                    <i class="fas fa-redo" style="margin-right: 4px;"></i> Coba Lagi
                                </button>
                            </div>
                        `;
                    }
                }
            }
        };
        
        // Periksa segera
        checkStatus();
        
        // Bersihkan interval sebelumnya jika ada
        if (this.paymentPollingInterval) {
            clearInterval(this.paymentPollingInterval);
        }
        
        // Mulai interval baru
        this.paymentPollingInterval = setInterval(checkStatus, pollingInterval);
        
        return this.paymentPollingInterval;
    }

    handlePaymentUpdate(data) {
        // Gunakan console sebagai logger jika utils belum tersedia
        const logger = window.utils && window.utils.logger ? window.utils.logger : console;
        
        logger.debug('Handling payment update:', data);

        try {
            // Validasi data yang diterima
            if (!data || (!data.payment && !data.data)) {
                logger.error('Invalid payment update data received');
            return;
        }
        
            // Ambil data payment dan order dari struktur yang diterima
            let payment, order;
            
            // Format 1: { payment: {...}, order: {...} }
            if (data.payment && data.order) {
                payment = data.payment;
                order = data.order;
            } 
            // Format 2: { data: { payment: {...}, order: {...} } }
            else if (data.data && data.data.payment && data.data.order) {
                payment = data.data.payment;
                order = data.data.order;
            }
            // Format 3: payment object saja tanpa order
            else if (data.id || (data.data && data.data.id)) {
                payment = data.id ? data : data.data;
                // Perlu mengambil order secara terpisah
            }
            
            // Jika tidak ada payment atau order, keluar
            if (!payment || !payment.id) {
                logger.error('Payment ID not found in update data');
                return;
            }
            
            const orderId = payment.order_id || (order ? order.id : null);
            if (!orderId) {
                logger.error('Order ID not found in payment update data');
                return;
            }

            logger.info(`Processing payment update for order #${orderId}, status: ${payment.status}`);
            
            // Update UI berdasarkan status pembayaran
            this.updatePaymentStatus(orderId, payment.status, payment);
            
            // Berikan notifikasi ke pengguna
            if (payment.status === 'success') {
                this.showNotification(`Payment for order #${orderId} successful!`, 'success');
                // Refresh order data
                this.refreshOrderData(orderId);
            } else if (payment.status === 'failed') {
                this.showNotification(`Payment for order #${orderId} failed.`, 'error');
            } else if (payment.status === 'expired') {
                this.showNotification(`Payment for order #${orderId} expired.`, 'warning');
            } else if (payment.status === 'pending') {
                this.showNotification(`Waiting for payment for order #${orderId}...`, 'info');
            }
            
        } catch (error) {
            logger.error('Error handling payment update:', error);
        }
    }
    
    // Membantu memperbarui UI dengan status pembayaran baru
    updatePaymentStatus(orderId, status, paymentData = null) {
        console.log(`Updating payment status UI for order ${orderId} to ${status}`);
        
        // Find payment modal elements
        const modal = document.getElementById('payment-modal');
        if (!modal) {
            console.warn('Payment modal not found');
            return;
        }

        // Get status element
        const statusElement = document.getElementById('qris-payment-status');
        if (!statusElement) {
            console.warn('Payment status element not found');
            return;
        }

        // Update status class and text
        statusElement.className = status;
        
        // Pembaruan UI berdasarkan status
                    if (status === 'success') {
            // Perbarui kelas modal
            modal.classList.add('payment-success');
            
            // Tampilkan pesan sukses
            const qrisContainer = document.querySelector('.qris-container');
            if (qrisContainer) {
                qrisContainer.innerHTML = `
                    <div class="payment-success-container">
                        <div class="success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>Pembayaran Berhasil</h3>
                        <div class="payment-summary">
                            <div class="summary-row">
                                <span class="summary-label">Nomor Order:</span>
                                <span class="summary-value">#${orderId}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Total:</span>
                                <span class="summary-value">${paymentData ? this.formatCurrency(paymentData.amount) : 'N/A'}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Metode:</span>
                                <span class="summary-value">QRIS</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Waktu:</span>
                                <span class="summary-value">${paymentData && paymentData.payment_time ? 
                                    new Date(paymentData.payment_time).toLocaleString() : 
                                    new Date().toLocaleString()}</span>
                            </div>
                        </div>
                        <button id="print-receipt-btn" class="btn-primary">
                            <i class="fas fa-print"></i> Cetak Struk
                        </button>
                    </div>
                `;
                
                // Add event listener for print receipt button
                const printBtn = document.getElementById('print-receipt-btn');
                if (printBtn) {
                    printBtn.addEventListener('click', () => this.printReceipt(orderId));
                }
            }
            
            // Tampilkan notifikasi
            this.showNotification('Pembayaran berhasil', 'success');
            
            // Refresh order list atau data jika diperlukan
            setTimeout(() => this.loadOrders(), 1000);
        } 
                else if (status === 'failed' || status === 'expired') {
            // Update UI untuk pembayaran gagal
            statusElement.innerHTML = status === 'failed' ? 
                'Pembayaran Gagal <i class="fas fa-times-circle"></i>' : 
                'Pembayaran Kadaluarsa <i class="fas fa-clock"></i>';
            
            statusElement.style.color = '#e74c3c';
            
            // Tambahkan tombol coba lagi jika diperlukan
            const retryContainer = document.createElement('div');
            retryContainer.style.marginTop = '15px';
            retryContainer.innerHTML = `
                <button id="retry-payment-btn" class="btn-primary" style="margin-right: 10px;">
                    Coba Lagi
                </button>
                <button id="cancel-payment-btn" class="btn-secondary">
                    Batalkan
                </button>
            `;
            
            const qrisContainer = document.querySelector('.qris-container');
            if (qrisContainer) {
                qrisContainer.appendChild(retryContainer);
                
                // Add event listeners
                const retryBtn = document.getElementById('retry-payment-btn');
                const cancelBtn = document.getElementById('cancel-payment-btn');
                        
                        if (retryBtn) {
                            retryBtn.addEventListener('click', () => {
                        // Tutup modal saat ini
                        this.closeModal();
                        // Buka modal pembayaran baru
                        setTimeout(() => this.showPaymentDetails('qris', { id: orderId }), 500);
                    });
                }
                
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => this.closeModal());
                }
            }
            
            // Tampilkan notifikasi
            this.showNotification(
                status === 'failed' ? 'Pembayaran gagal' : 'Pembayaran kadaluarsa', 
                'error'
            );
        } 
        else {
            // Status pending, cukup perbarui teks
            statusElement.textContent = 'Menunggu Pembayaran';
        }
    }

    showSpinner() {
        // Tambahkan spinner ke body
        if (!document.getElementById('global-spinner')) {
            const spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            spinner.className = 'global-spinner';
            spinner.innerHTML = '<div class="spinner-content"><div class="spinner"></div><p>Memproses...</p></div>';
            document.body.appendChild(spinner);
        }
    }
    
    hideSpinner() {
        // Hapus spinner dari body
        const spinner = document.getElementById('global-spinner');
        if (spinner) {
            document.body.removeChild(spinner);
        }
    }

    // Fungsi untuk membuat QR code lokal menggunakan QRCode.js
    generateLocalQRCode(container, data) {
        console.log('Generating local QR code for:', data);
        
        // Bersihkan container
        if (container) {
            container.innerHTML = '';
        }
        
        try {
            // Periksa library mana yang tersedia
            const qrcodeAvailable = typeof QRCode !== 'undefined';
            
            if (qrcodeAvailable) {
                // Buat div untuk container QR code
                const qrElement = document.createElement('div');
                qrElement.style.padding = '10px';
                qrElement.style.background = '#fff';
                qrElement.style.borderRadius = '8px';
                qrElement.style.margin = '0 auto';
                qrElement.style.width = '200px';
                qrElement.style.height = '200px';
                
                // Tambahkan ke DOM
                container.appendChild(qrElement);
                
                // Deteksi versi library yang tersedia dan gunakan dengan benar
                try {
                    // Pendekatan 1: qrcodejs (davidshimjs)
                    if (typeof QRCode === 'function' && QRCode.toString().includes('QRCode')) {
                        console.log('Menggunakan library QRCodeJS dari davidshimjs');
                        new QRCode(qrElement, {
                            text: data,
                            width: 200,
                            height: 200
                        });
                    } 
                    // Pendekatan 2: qrcode (node-qrcode)
                    else {
                        console.log('Menggunakan library qrcode dari node-qrcode');
                        QRCode.toCanvas(qrElement, data, {
                            width: 200,
                            margin: 1,
                            color: {
                                dark: '#000000',
                                light: '#ffffff'
                            }
                        }, function(error) {
                            if (error) {
                                console.error('Error generating QR code with node-qrcode:', error);
                                throw error;
                            }
                        });
                    }
                } catch (qrError) {
                    console.error('Error with detected QR library, trying direct approach:', qrError);
                    // Pendekatan paling sederhana
                    try {
                        new QRCode(qrElement, data);
                    } catch (finalError) {
                        console.error('Final QR generation error:', finalError);
                        throw finalError;
                    }
                }
                
                console.log('Local QR code successfully generated');
                
                // Tambahkan pesan di bawah QR code
                const noteElement = document.createElement('div');
                noteElement.style.fontSize = '11px';
                noteElement.style.color = '#666';
                noteElement.style.marginTop = '10px';
                noteElement.style.textAlign = 'center';
                noteElement.textContent = 'QR code generated locally';
                container.appendChild(noteElement);
            } else {
                // Jika tidak ada library yang tersedia
                throw new Error('QRCode library not available');
            }
        } catch (error) {
            console.error('Error generating local QR code:', error);
            
            // Menampilkan data QR sebagai teks jika pendek, atau format pendeknya jika panjang
            let displayData = data;
            if (data && data.length > 60) {
                displayData = data.substring(0, 30) + '...' + data.substring(data.length - 30);
            }
            
            container.innerHTML = `
                <div style="color: #ff6b6b; text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px;"></i>
                    <p style="margin-top: 10px;">Tidak dapat menampilkan QR code</p>
                    <p style="font-size: 12px; margin-top: 5px;">${error.message || 'Error tidak diketahui'}</p>
                    <p style="font-size: 12px; margin-top: 5px;">Detail: ${error.toString()}</p>
                    
                    <div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                        <p style="font-size: 13px; font-weight: bold; margin-bottom: 5px;">Data QR Code:</p>
                        <textarea readonly style="width: 100%; height: 60px; font-size: 10px; background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 5px;">${data}</textarea>
                        <button onclick="navigator.clipboard.writeText('${data.replace(/'/g, "\\'")}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy Data', 2000);" style="margin-top: 5px; padding: 3px 8px; font-size: 11px; background-color: #4a6cf7; color: white; border: none; border-radius: 3px; cursor: pointer;">Copy Data</button>
                    </div>
                </div>
            `;
        }
    }
    
    // Method untuk membersihkan URL QRIS agar sesuai dengan format Midtrans
    cleanQRISUrl(url, transactionId) {
        if (!url) return null;
        
        // Jika URL sudah sesuai format yang diinginkan ({transaction_id}/qr-code), kembalikan langsung
        if (url.match(/\/v2\/qris\/[^/]+\/qr-code$/)) {
            console.log('QR URL already in correct format');
            return url;
        }
        
        // Jika URL dalam format /v2/qris/qr-code?data=, koreksi ke format yang diharapkan
        if (url.includes('/v2/qris/qr-code?data=') && transactionId) {
            const baseUrl = url.includes('sandbox') 
                ? 'https://api.sandbox.midtrans.com' 
                : 'https://api.midtrans.com';
            
            const newUrl = `${baseUrl}/v2/qris/${transactionId}/qr-code`;
            console.log('Corrected QR URL format:', newUrl);
            return newUrl;
        }
        
        // Kembalikan URL asli jika tidak memenuhi kondisi di atas
        return url;
    }
    
    getProxyImageUrl(originalUrl) {
        // Coba beberapa layanan proxy CORS
        // 1. cors-anywhere
        // return `https://cors-anywhere.herokuapp.com/${originalUrl}`;
        
        // 2. allOrigins
        return `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
        
        // 3. Jika tidak ada yang berhasil, gunakan originalUrl
        // return originalUrl;
    }

    // Fungsi untuk memeriksa status pembayaran secara manual
    async checkPaymentStatus(paymentId) {
        try {
            console.log(`Manually checking payment status for payment ID: ${paymentId}`);
            
            // Tampilkan status "sedang memeriksa"
            const statusElem = document.getElementById('qris-payment-status');
            if (statusElem) {
                statusElem.innerHTML = `
                    <div class="payment-status-checking">
                        <span class="loading-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid #f3f3f3;border-top:2px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;margin-right:8px;"></span>
                        <span>Memeriksa status pembayaran...</span>
                    </div>
                `;
            }
            
            // Periksa status pembayaran menggunakan API
            const response = await fetch(`${window.API_BASE_URL}/admin/payments/${paymentId}/check`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to check payment status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Payment status check result:', result);
            
            // Dapatkan data pembayaran terbaru
            const paymentData = await this.getPaymentById(paymentId);
            
            if (paymentData) {
                // Update UI berdasarkan status
                this.updatePaymentStatus(paymentData.order_id, paymentData.status, paymentData);
                
                // Tampilkan notifikasi hasil pemeriksaan
                let notifType = 'info';
                let notifMessage = 'Status pembayaran: Menunggu pembayaran';
                
                if (paymentData.status === 'success') {
                    notifType = 'success';
                    notifMessage = 'Pembayaran berhasil diverifikasi';
                } else if (paymentData.status === 'failed') {
                    notifType = 'error';
                    notifMessage = 'Pembayaran gagal';
                } else if (paymentData.status === 'expired') {
                    notifType = 'warning';
                    notifMessage = 'Pembayaran telah kedaluwarsa';
                }
                
                this.showNotification(notifMessage, notifType);
                
                // Refresh data order jika pembayaran berhasil
                if (paymentData.status === 'success') {
                    await this.refreshOrderData(paymentData.order_id);
                }
            } else {
                throw new Error('Failed to get updated payment data');
            }
            
            return result;
        } catch (error) {
            console.error('Error checking payment status:', error);
            
            // Update UI jika terjadi error
            const statusElem = document.getElementById('qris-payment-status');
            if (statusElem) {
                statusElem.innerHTML = `
                    <div class="payment-status-error">
                        Gagal memeriksa status pembayaran.
                        <button onclick="window.ordersPage.checkPaymentStatus(${paymentId})" 
                            style="background-color: #4a6cf7; color: white; border: none; 
                            padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px; font-size: 12px;">
                            <i class="fas fa-redo" style="margin-right: 4px;"></i> Coba Lagi
                        </button>
                    </div>
                `;
            }
            
            this.showNotification('Gagal memeriksa status pembayaran', 'error');
            return null;
        }
    }
    
    // Tambahkan tombol refresh status pembayaran
    addPaymentStatusRefreshButton(container, paymentId, orderId) {
        // Implementasi untuk menambahkan tombol refresh status pembayaran
        // Misalnya, gunakan API lain untuk mendapatkan detail pembayaran
        // Contoh: fetch(`${window.API_BASE_URL}/admin/payments/${paymentId}`);
        console.log(`Adding refresh button for payment ID: ${paymentId}`);
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh Status';
        refreshBtn.style.marginLeft = '5px';
        refreshBtn.style.padding = '5px 10px';
        refreshBtn.style.border = 'none';
        refreshBtn.style.borderRadius = '4px';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.addEventListener('click', () => this.checkPaymentStatus(paymentId));
        container.appendChild(refreshBtn);
    }

    // Tambahkan metode reset untuk lebih eksplisit me-reset OrdersPage
    reset() {
        console.log('Resetting OrdersPage state');
        
        // Batalkan semua request yang sedang berjalan
        this.cancelPendingRequests();
        
        // Hentikan interval polling jika ada
        if (this.paymentPollingInterval) {
            clearInterval(this.paymentPollingInterval);
            this.paymentPollingInterval = null;
        }
        
        // Reset data
        this.orders = [];
        this.filteredOrders = [];
        this.initialized = false;
        
        // Bersihkan status filter
        this.dateFilter = {
            startDate: null,
            endDate: null
        };
        this.statusFilter = 'all';
        
        // Reset UI jika page masih aktif
        if (document.getElementById('orders-table-body')) {
            this.initialize();
        }
    }

    getCurrentAdminName() {
        try {
            const userData = localStorage.getItem('user_data');
            if (userData) {
                const user = JSON.parse(userData);
                return user.name || user.username || 'Admin';
            }
        } catch (e) {
            console.error('Error getting admin name:', e);
        }
        return 'Admin';
    }
}

// Initialize the orders page - diletakkan di akhir file
document.addEventListener('DOMContentLoaded', () => {
    // Pastikan instance dari ordersPage tersedia untuk event listener
    if (!window.ordersPage) {
        window.ordersPage = new OrdersPage();
    }
}); 

// Export OrdersPage class
window.OrdersPage = OrdersPage;
window.ordersPage = new OrdersPage();