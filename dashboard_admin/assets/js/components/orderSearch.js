import { api } from '../utils/api.js';

export class OrderSearch {
    constructor() {
        this.searchInput = document.getElementById('orderSearch');
        this.orders = [];
        this.searchIndex = new Map();
        this.debounceTimeout = null;
        
        this.initializeSearch();
        this.loadOrders();
    }

    async loadOrders() {
        try {
            const response = await api.getOrders();
            this.orders = response.data;
            this.buildSearchIndex(this.orders);
            this.displayOrders(this.orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    initializeSearch() {
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300); // Debounce for better performance
        });
    }

    buildSearchIndex(orders) {
        this.searchIndex.clear();
        orders.forEach(order => {
            // Create searchable string from order data
            const searchString = `
                ${order.id.toLowerCase()}
                ${order.table.toLowerCase()}
                ${order.items.map(item => item.name.toLowerCase()).join(' ')}
                ${order.status.toLowerCase()}
            `;
            
            // Store in Map for O(1) lookup
            this.searchIndex.set(order.id, {
                searchString,
                order
            });
        });
    }

    performSearch(query) {
        if (!query) {
            this.displayOrders(this.orders);
            return;
        }

        query = query.toLowerCase();
        const results = [];

        // Use Map for faster lookup
        this.searchIndex.forEach(({searchString, order}) => {
            if (searchString.includes(query)) {
                results.push(order);
            }
        });

        this.displayOrders(results);
    }

    displayOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(order => this.createOrderRow(order)).join('');
    }

    createOrderRow(order) {
        return `
            <tr>
                <td data-label="Order ID">#${order.id}</td>
                <td data-label="Customer">
                    <div class="customer-info">
                        <span>${order.customer_name}</span>
                        <small>${order.customer_email}</small>
                    </div>
                </td>
                <td data-label="Table">${order.table_number}</td>
                <td data-label="Items">${order.items.length} items</td>
                <td data-label="Total">Rp ${order.total.toLocaleString()}</td>
                <td data-label="Status">
                    <span class="status-badge status-${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </td>
                <td data-label="Time">${new Date(order.created_at).toLocaleString()}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button onclick="viewOrder(${order.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="updateOrder(${order.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
} 