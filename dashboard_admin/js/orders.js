class OrdersPage {
    constructor() {
        this.orders = [];
        this.tables = [];
        this.menus = [];
        this.customers = [];
        this.initialized = false;
        // Register this instance with the router
        window.router.registerPageInstance('orders', this);
    }

    async initialize() {
        console.log('Initializing orders page');
        if (this.initialized) {
            console.log('Orders already initialized');
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
            console.log('Orders initialization complete');
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
    }

    async handleOrderUpdate(data) {
        try {
            const existingOrderIndex = this.orders.findIndex(order => order.id === data.id);
            
            if (data.action === 'create') {
                await this.loadOrders();
                this.showNotification('Pesanan baru diterima!');
            } else if (data.action === 'update' && existingOrderIndex !== -1) {
                // Refresh specific order data
                await this.refreshOrderData(data.id);
                this.showNotification('Pesanan diperbarui');
            } else if (data.action === 'delete' && existingOrderIndex !== -1) {
                this.orders.splice(existingOrderIndex, 1);
                this.updateOrdersTable();
                
                // Close modal if open
                const openModal = document.querySelector(`.order-detail-modal[data-order-id="${data.id}"]`);
                if (openModal) {
                    document.body.removeChild(openModal);
                }
                
                this.showNotification('Pesanan dihapus');
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
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load orders');
            
            const result = await response.json();
            if (result.status && result.data) {
                this.orders = result.data;
                this.updateOrdersTable();
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showNotification('Gagal memuat daftar order', 'error');
        }
    }

    async loadTables() {
        try {
            const token = localStorage.getItem('auth_token');
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
            const token = localStorage.getItem('auth_token');
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
            const token = localStorage.getItem('auth_token');
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
                console.log('Loaded customers:', this.customers);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    updateOrdersTable() {
        const tableBody = document.getElementById('orders-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = this.orders.map(order => `
            <tr class="order-row" data-order-id="${order.id}">
                <td>Order #${order.id}</td>
                <td>Table ${order.table ? order.table.number : 'N/A'}</td>
                <td>
                    <div class="order-items-list">
                        ${order.order_items.map(item => `
                            <div class="order-item-row">
                                <span class="item-name">${item.menu.name} x${item.quantity}</span>
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td>
                    <div class="order-notes-list">
                        ${order.order_items.map(item => `
                            <div class="order-note-row">
                                ${item.notes ? `<span class="item-notes">${item.notes}</span>` : '-'}
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td>${this.formatCurrency(order.total_amount)}</td>
                <td>
                    <span class="status-badge status-${order.status.toLowerCase()}">
                        ${this.formatStatus(order.status)}
                    </span>
                </td>
                <td>${this.formatDate(order.created_at)}</td>
                <td>
                    <div class="order-actions">
                        <button class="btn-view" onclick="ordersPage.viewOrderDetails(${order.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${this.renderActionButtons(order)}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderActionButtons(order) {
        let buttons = '';
        
        switch (order.status.toLowerCase()) {
            case 'pending_payment':
                buttons += `
                    <button class="btn-process" onclick="ordersPage.processPayment(${order.id})">
                        <i class="fas fa-credit-card"></i>
                    </button>`;
                break;
            case 'paid':
                buttons += `
                    <button class="btn-start" onclick="ordersPage.startCooking(${order.id})">
                        <i class="fas fa-utensils"></i>
                    </button>`;
                break;
            case 'in_progress':
                buttons += `
                    <button class="btn-finish" onclick="ordersPage.finishCooking(${order.id})">
                        <i class="fas fa-check"></i>
                    </button>`;
                break;
            case 'ready':
                buttons += `
                    <button class="btn-complete" onclick="ordersPage.completeOrder(${order.id})">
                        <i class="fas fa-flag-checkered"></i>
                    </button>`;
                break;
        }
        
        return buttons;
    }

    async updateOrderStatus(orderId, status) {
        try {
            const token = localStorage.getItem('auth_token');
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
            const token = localStorage.getItem('auth_token');
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
            const token = localStorage.getItem('auth_token');
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
                    this.updateOrdersTable();
                }

                // Update modal if open
                const openModal = document.querySelector(`.order-detail-modal[data-order-id="${orderId}"]`);
                if (openModal) {
                    this.updateOrderDetailsModal(result.data);
                }
            }
        } catch (error) {
            console.error('Error refreshing order data:', error);
        }
    }

    async viewOrderDetails(orderId) {
        try {
            const token = localStorage.getItem('auth_token');
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
                            <h3>Item Pesanan</h3>
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
        switch (order.status.toLowerCase()) {
            case 'pending_payment':
                button = `<button class="btn-primary" onclick="ordersPage.processPayment(${order.id})">
                    <i class="fas fa-credit-card"></i> Proses Pembayaran
                </button>`;
                break;
            case 'paid':
                button = `<button class="btn-primary" onclick="ordersPage.startCooking(${order.id})">
                    <i class="fas fa-utensils"></i> Mulai Masak
                </button>`;
                break;
            case 'in_progress':
                button = `<button class="btn-primary" onclick="ordersPage.finishCooking(${order.id})">
                    <i class="fas fa-check"></i> Selesai Masak
                </button>`;
                break;
            case 'ready':
                button = `<button class="btn-primary" onclick="ordersPage.completeOrder(${order.id})">
                    <i class="fas fa-flag-checkered"></i> Selesai
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
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async render() {
        return `
            <div class="orders-page">
                <div class="page-header">
                    <h2>Orders Management</h2>
                    <button id="new-order-btn" class="btn-primary">
                        <i class="fas fa-plus"></i> New Order
                    </button>
                </div>
                <div class="orders-table-container">
                    <div class="orders-table-wrapper">
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
        console.log('Rendering menu options with menus:', this.menus);
        return `
            <div class="order-item-input" data-index="${index}">
                <div class="form-row">
                    <div class="form-group menu-select-group">
                        <label>Menu *</label>
                        <select class="menu-select" required onchange="ordersPage.updateItemPrice(this)">
                            <option value="">Pilih menu</option>
                            ${this.menus.map(menu => {
                                console.log('Mapping menu:', menu);
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
        console.log('Found item inputs:', itemInputs.length);
        
        // Dapatkan menu price untuk setiap item
        const items = Array.from(itemInputs).map(item => {
            const menuSelect = item.querySelector('.menu-select');
            const menuId = parseInt(menuSelect.value, 10);
            const quantity = parseInt(item.querySelector('.quantity-input').value, 10);
            const notes = item.querySelector('.notes-input').value;
            
            console.log('Processing item:', { menuId, quantity, notes });
            console.log('Available menus:', this.menus);

            // Dapatkan harga menu dari this.menus
            const selectedMenu = this.menus.find(menu => menu.ID === menuId);
            console.log('Selected menu:', selectedMenu);

            if (!menuId || isNaN(menuId) || !selectedMenu) {
                console.log('Invalid menu selection. Menu ID:', menuId);
                return null;
            }

            if (!quantity || isNaN(quantity) || quantity <= 0) {
                console.log('Invalid quantity:', quantity);
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

        console.log('Processed items:', items);

        if (items.length === 0) {
            this.showNotification('Mohon pilih menu dan jumlah yang valid', 'error');
            return;
        }

        // Hitung total amount
        const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
        console.log('Total amount:', totalAmount);

        try {
            const token = localStorage.getItem('auth_token');
            
            // Buat customer baru dengan table_id dan session_key
            const sessionKey = Math.random().toString(36).substring(2, 15);
            const customerData = {
                table_id: parseInt(tableId, 10),
                session_key: sessionKey
            };
            console.log('Sending customer data:', customerData);

            const customerResponse = await fetch('http://localhost:8080/admin/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            const customerResponseData = await customerResponse.json();
            console.log('Customer response data:', JSON.stringify(customerResponseData, null, 2));

            if (!customerResponse.ok) {
                throw new Error(customerResponseData.message || 'Failed to create customer');
            }

            // Validasi struktur response customer
            if (!customerResponseData.status || !customerResponseData.data || !customerResponseData.data.ID) {
                console.error('Invalid customer response structure:', customerResponseData);
                throw new Error('Invalid customer response structure');
            }

            const customerId = customerResponseData.data.ID;
            console.log('Created customer with ID:', customerId);

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

            console.log('Sending order data:', JSON.stringify(orderData, null, 2));

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
            console.log('Order response:', JSON.stringify(orderResponseData, null, 2));

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
}

// Initialize the orders page
window.ordersPage = new OrdersPage();

// Register the orders page with the router
window.router.addRoute('orders', async () => {
    await window.ordersPage.initialize();
}); 