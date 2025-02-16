class OrdersManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.searchDebounceTimer = null;
        this.init();
        this.setupNavigation();
    }

    async init() {
        await this.fetchOrders();
        this.setupEventListeners();
        this.renderOrders(this.orders);
    }

    async fetchOrders() {
        // Simulasi data dari API
        this.orders = [
            {
                id: "ORD-001",
                tableNumber: "05",
                customerName: "John Doe",
                items: [
                    { 
                        name: "Nasi Goreng Spesial", 
                        quantity: 2, 
                        price: 25000,
                        notes: "Pedas, tidak pakai sayur"
                    },
                    { 
                        name: "Es Teh Manis", 
                        quantity: 2, 
                        price: 5000,
                        notes: "Less ice"
                    }
                ],
                orderTime: "2024-03-10T14:30:00",
                status: "pending",
                paymentStatus: "unpaid",
                paymentMethod: "cash",
                tableStatus: "occupied",
                totalAmount: 60000,
                waiterName: "Jane Smith"
            },
            {
                id: "ORD-002",
                tableNumber: "03",
                customerName: "Alice Brown",
                items: [
                    { 
                        name: "Ayam Goreng", 
                        quantity: 1, 
                        price: 30000,
                        notes: "Extra sambal"
                    },
                    { 
                        name: "Juice Alpukat", 
                        quantity: 1, 
                        price: 15000,
                        notes: ""
                    }
                ],
                orderTime: "2024-03-10T14:45:00",
                status: "in-progress",
                paymentStatus: "paid",
                paymentMethod: "qris",
                tableStatus: "occupied",
                totalAmount: 45000,
                waiterName: "Bob Wilson"
            }
        ];
        this.filteredOrders = [...this.orders];
    }

    setupEventListeners() {
        // Status Filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterOrders('status', e.target.value);
        });

        // Payment Filter
        document.getElementById('paymentFilter').addEventListener('change', (e) => {
            this.filterOrders('payment', e.target.value);
        });

        // Table Filter
        document.getElementById('tableFilter').addEventListener('change', (e) => {
            this.filterOrders('table', e.target.value);
        });

        // Search functionality with debounce
        const searchInput = document.querySelector('.search-bar input');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.handleFilter(e.target.dataset.filter);
            });
        });

        // View Details button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-view')) {
                const orderId = e.target.dataset.orderId;
                this.showOrderDetails(orderId);
            }
            if (e.target.classList.contains('btn-complete-payment')) {
                const orderId = e.target.dataset.orderId;
                this.handleCompletePayment(orderId);
            }
            if (e.target.classList.contains('btn-update-table')) {
                const orderId = e.target.dataset.orderId;
                const tableStatus = e.target.dataset.status;
                this.updateTableStatus(orderId, tableStatus);
            }
        });

        // Close modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || 
                e.target.classList.contains('close-modal')) {
                this.closeModal();
            }
        });

        // Add event delegation for view details button
        document.querySelector('.orders-container').addEventListener('click', (e) => {
            const viewDetailsBtn = e.target.closest('.btn-view-details');
            if (viewDetailsBtn) {
                const orderId = viewDetailsBtn.dataset.orderId;
                this.showOrderDetails(orderId);
            }

            const completePaymentBtn = e.target.closest('.btn-complete-payment');
            if (completePaymentBtn) {
                const orderId = completePaymentBtn.dataset.orderId;
                this.handleCompletePayment(orderId);
            }
        });
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredOrders = [...this.orders];
        } else {
            query = query.toLowerCase();
            this.filteredOrders = this.orders.filter(order => 
                order.id.toLowerCase().includes(query) ||
                order.customerName.toLowerCase().includes(query) ||
                order.items.some(item => item.name.toLowerCase().includes(query))
            );
        }
        this.renderOrders();
    }

    handleFilter(filter) {
        if (filter === 'all') {
            this.filteredOrders = [...this.orders];
        } else {
            this.filteredOrders = this.orders.filter(order => order.status === filter);
        }
        this.renderOrders();
    }

    renderOrders() {
        const container = document.querySelector('.orders-container');
        container.innerHTML = this.filteredOrders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">${order.id}</span>
                    <div class="order-meta">
                        <span class="order-time">${this.formatDate(order.orderTime)}</span>
                        <span class="table-status ${order.tableStatus}">Table ${order.tableNumber}</span>
                    </div>
                </div>
                
                <div class="order-details">
                    <div class="detail-group">
                        <span class="detail-label">Customer</span>
                        <span class="detail-value">${order.customerName}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Total Items</span>
                        <span class="detail-value">${this.calculateTotalItems(order.items)} items</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Total Amount</span>
                        <span class="detail-value">Rp ${this.formatPrice(order.totalAmount)}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Status</span>
                        <span class="status-badge status-${order.status}">${this.formatStatus(order.status)}</span>
                    </div>
                </div>

                <div class="order-items">
                    <div class="item-list">
                        ${order.items.map(item => `
                            <div class="item">
                                <span class="item-name">${item.name}</span>
                                <span class="item-quantity">x${item.quantity}</span>
                                <span class="item-price">Rp ${this.formatPrice(item.price * item.quantity)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="order-actions">
                    ${order.paymentStatus === 'unpaid' ? `
                        <button type="button" class="btn-action btn-complete-payment" data-order-id="${order.id}">
                            <i class="fas fa-check"></i>
                            Complete Payment
                        </button>
                    ` : ''}
                    <button type="button" class="btn-action btn-view-details" data-order-id="${order.id}">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    calculateTotalItems(items) {
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatPrice(price) {
        return price.toLocaleString('id-ID');
    }

    formatStatus(status) {
        return status.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    filterOrders(type, value) {
        if (value === 'all') {
            this.filteredOrders = [...this.orders];
        } else {
            this.filteredOrders = this.orders.filter(order => {
                switch(type) {
                    case 'status':
                        return order.status === value;
                    case 'payment':
                        return order.paymentStatus === value;
                    case 'table':
                        return order.tableStatus === value;
                    default:
                        return true;
                }
            });
        }
        this.renderOrders();
    }

    async handleCompletePayment(orderId) {
        try {
            await this.updateOrderPayment(orderId);
            const orderIndex = this.orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                this.orders[orderIndex].paymentStatus = 'paid';
                this.orders[orderIndex].status = 'completed';
                this.renderOrders();
            }
            window.showNotification('Payment completed successfully!');
        } catch (error) {
            window.showNotification('Failed to complete payment', 'error');
        }
    }

    async updateOrderPayment(orderId) {
        // Simulasi API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    setupNavigation() {
        // Add hover effect to sidebar items
        const navLinks = document.querySelectorAll('.nav-links li');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Add notifications functionality
        const notifications = document.querySelector('.notifications');
        if (notifications) {
            notifications.addEventListener('click', function() {
                console.log('Notifications clicked');
            });
        }
    }

    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const modalHTML = `
            <div class="modal active" id="orderDetailModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Order Details #${order.id}</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="order-detail-info">
                            <div class="detail-section">
                                <h3>Order Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">Order Time</span>
                                        <span class="value">${this.formatDate(order.orderTime)}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Table Number</span>
                                        <span class="value">Table ${order.tableNumber}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Table Status</span>
                                        <span class="table-status ${order.tableStatus}">${this.formatStatus(order.tableStatus)}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Waiter</span>
                                        <span class="value">${order.waiterName}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="detail-section">
                                <h3>Customer Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">Name</span>
                                        <span class="value">${order.customerName}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="detail-section">
                                <h3>Order Items</h3>
                                <div class="order-items-detail">
                                    ${order.items.map(item => `
                                        <div class="detail-item">
                                            <div class="item-info">
                                                <span class="item-name">${item.name}</span>
                                                <span class="item-notes">${item.notes || '-'}</span>
                                            </div>
                                            <div class="item-meta">
                                                <span class="item-quantity">x${item.quantity}</span>
                                                <span class="item-price">Rp ${this.formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="order-total">
                                    <span class="total-label">Total Amount</span>
                                    <span class="total-value">Rp ${this.formatPrice(order.totalAmount)}</span>
                                </div>
                            </div>

                            <div class="detail-section">
                                <h3>Payment Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">Payment Status</span>
                                        <span class="status-badge payment-${order.paymentStatus}">
                                            ${this.formatStatus(order.paymentStatus)}
                                        </span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Payment Method</span>
                                        <span class="value">${this.formatStatus(order.paymentMethod)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.querySelector('.modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup modal events
        const modal = document.getElementById('orderDetailModal');
        const closeBtn = modal.querySelector('.close-modal');

        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    async updateTableStatus(orderId, newStatus) {
        try {
            // Simulasi API call
            await this.updateTableStatusAPI(orderId, newStatus);
            
            // Update local data
            const orderIndex = this.orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                this.orders[orderIndex].tableStatus = newStatus;
                this.renderOrders();
            }

            this.showNotification(`Table status updated to ${newStatus}`);
        } catch (error) {
            this.showNotification('Failed to update table status', 'error');
        }
    }

    async updateTableStatusAPI(orderId, newStatus) {
        // Simulasi API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new OrdersManager();
}); 