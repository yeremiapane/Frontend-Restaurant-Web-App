class OrdersPage {
    constructor() {
        this.orders = [];
        this.currentFilter = 'all';
    }

    async fetchOrders() {
        try {
            const response = await fetch('http://localhost:8080/chef/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch orders');
            
            const data = await response.json();
            if (data.status) {
                this.orders = data.data;
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    getFilteredOrders() {
        if (this.currentFilter === 'all') return this.orders;
        return this.orders.filter(order => order.status.toLowerCase() === this.currentFilter);
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
        });
    }

    async render(container) {
        await this.fetchOrders();

        container.innerHTML = `
            <div class="orders-filter">
                <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" 
                        onclick="ordersPage.setFilter('all')">
                    All Orders
                </button>
                <button class="filter-btn ${this.currentFilter === 'pending' ? 'active' : ''}"
                        onclick="ordersPage.setFilter('pending')">
                    Pending
                </button>
                <button class="filter-btn ${this.currentFilter === 'preparing' ? 'active' : ''}"
                        onclick="ordersPage.setFilter('preparing')">
                    Preparing
                </button>
                <button class="filter-btn ${this.currentFilter === 'ready' ? 'active' : ''}"
                        onclick="ordersPage.setFilter('ready')">
                    Ready
                </button>
            </div>

            <div class="orders-container">
                ${this.getFilteredOrders().map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <span class="order-id">#${order.id}</span>
                            <span class="order-time">${this.formatTime(order.created_at)}</span>
                        </div>
                        <div class="order-content">
                            <div class="order-items">
                                ${order.items.map(item => `
                                    <div class="order-item">
                                        <div class="item-details">
                                            <span class="item-quantity">${item.quantity}x</span>
                                            <div>
                                                <div class="item-name">${item.menu_name}</div>
                                                ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="order-footer">
                            <div class="table-info">
                                <i class="fas fa-table table-icon"></i>
                                <span class="table-number">Table ${order.table_number}</span>
                            </div>
                            <div class="order-actions">
                                ${order.status === 'pending' ? `
                                    <button class="action-btn btn-prepare" onclick="ordersPage.startPreparing(${order.id})">
                                        <i class="fas fa-fire"></i>
                                        <span>Start Preparing</span>
                                    </button>
                                ` : ''}
                                ${order.status === 'preparing' ? `
                                    <button class="action-btn btn-ready" onclick="ordersPage.markAsReady(${order.id})">
                                        <i class="fas fa-check"></i>
                                        <span>Mark as Ready</span>
                                    </button>
                                ` : ''}
                                <button class="action-btn btn-view" onclick="ordersPage.viewOrderDetails(${order.id})">
                                    <i class="fas fa-eye"></i>
                                    <span>View Details</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add CSS class if no orders
        if (this.getFilteredOrders().length === 0) {
            const noOrders = document.createElement('div');
            noOrders.className = 'no-orders';
            noOrders.innerHTML = `
                <i class="fas fa-clipboard-list"></i>
                <h3>No Orders Found</h3>
                <p>There are no orders matching the selected filter</p>
            `;
            container.querySelector('.orders-container').appendChild(noOrders);
        }
    }

    async setFilter(filter) {
        this.currentFilter = filter;
        await this.render(document.getElementById('content-container'));
    }

    async startPreparing(orderId) {
        try {
            const response = await fetch(`http://localhost:8080/chef/orders/${orderId}/prepare`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to update order status');

            // Refresh the page
            this.render(document.getElementById('content-container'));
        } catch (error) {
            console.error('Error updating order:', error);
        }
    }

    async markAsReady(orderId) {
        try {
            const response = await fetch(`http://localhost:8080/chef/orders/${orderId}/ready`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to update order status');

            // Refresh the page
            this.render(document.getElementById('content-container'));
        } catch (error) {
            console.error('Error updating order:', error);
        }
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Order Details #${order.id}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="detail-group">
                        <label>Table Number:</label>
                        <span>Table ${order.table_number}</span>
                    </div>
                    <div class="detail-group">
                        <label>Status:</label>
                        <span class="order-status ${this.getStatusClass(order.status)}">${order.status}</span>
                    </div>
                    <div class="detail-group">
                        <label>Order Time:</label>
                        <span>${this.formatTime(order.created_at)}</span>
                    </div>
                    <div class="detail-group">
                        <label>Items:</label>
                        <div class="detail-items">
                            ${order.items.map(item => `
                                <div class="detail-item">
                                    <div class="item-quantity">${item.quantity}x</div>
                                    <div class="item-info">
                                        <div class="item-name">${item.menu_name}</div>
                                        ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
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

    getStatusClass(status) {
        const statusClasses = {
            'pending': 'status-pending',
            'preparing': 'status-preparing',
            'ready': 'status-ready'
        };
        return statusClasses[status.toLowerCase()] || '';
    }

    onMount() {
        // Subscribe to WebSocket events
        if (window.wsClient) {
            window.addEventListener('orderUpdate', () => {
                this.render(document.getElementById('content-container'));
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