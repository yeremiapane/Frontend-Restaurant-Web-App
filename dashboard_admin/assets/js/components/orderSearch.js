export class OrderSearch {
    constructor() {
        this.searchInput = document.getElementById('orderSearch');
        this.orders = []; // Will be populated with order data
        this.searchIndex = new Map(); // For faster search
        this.debounceTimeout = null;
        
        this.initializeSearch();
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
        // Create HTML for order row
        return `
            <tr>
                <td data-label="Order ID">
                    <span class="order-id">${order.id}</span>
                </td>
                <!-- ... other cells ... -->
            </tr>
        `;
    }
} 