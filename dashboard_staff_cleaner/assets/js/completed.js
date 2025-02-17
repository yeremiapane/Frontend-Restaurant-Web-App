document.addEventListener('DOMContentLoaded', function() {
    // Initialize Completed Orders Page
    class CompletedOrdersPage {
        constructor() {
            this.currentPage = 1;
            this.itemsPerPage = 10;
            this.orderModal = null;
            this.init();
        }

        async init() {
            await this.initializeElements();
            this.initializeEventListeners();
            this.initializeDatePickers();
            this.initializeAnimations();
            this.loadInitialData();
            this.orderModal = new OrderDetailModal();
        }

        async initializeElements() {
            // Search and Filter Elements
            this.searchInput = document.querySelector('.search-box input');
            this.dateFilter = document.getElementById('dateFilter');
            this.dateInputs = {
                start: document.querySelector('.date-range input[type="date"]:first-child'),
                end: document.querySelector('.date-range input[type="date"]:last-child')
            };
            this.tableBody = document.querySelector('.orders-table tbody');
            this.paginationContainer = document.querySelector('.pagination');
            
            // Stats Elements
            this.statsContainer = document.querySelector('.completion-stats');
            this.loadingOverlay = this.createLoadingOverlay();
        }

        initializeEventListeners() {
            // Debounced search
            this.searchInput?.addEventListener('input', 
                this.debounce(e => this.handleSearch(e.target.value), 300)
            );

            // Date filter changes
            this.dateFilter?.addEventListener('change', 
                e => this.handleDateFilterChange(e.target.value)
            );

            // Date range inputs
            Object.values(this.dateInputs).forEach(input => {
                input?.addEventListener('change', () => this.handleDateRangeChange());
            });

            // Delegate table events
            this.tableBody?.addEventListener('click', e => {
                const target = e.target;
                
                if (target.closest('.btn-view-more')) {
                    this.handleViewMore(target.closest('.btn-view-more'));
                } else if (target.closest('.btn-view-details')) {
                    this.handleViewDetails(target.closest('tr'));
                }
            });

            // Window resize handler
            window.addEventListener('resize', 
                this.debounce(() => this.handleResize(), 250)
            );
        }

        initializeDatePickers() {
            const today = new Date().toISOString().split('T')[0];
            
            // Set max date to today for both inputs
            Object.values(this.dateInputs).forEach(input => {
                if (input) {
                    input.max = today;
                    input.value = today;
                }
            });

            // Set default date range (last 7 days)
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            if (this.dateInputs.start) {
                this.dateInputs.start.value = lastWeek.toISOString().split('T')[0];
            }
        }

        initializeAnimations() {
            // Initialize Intersection Observer for stats animation
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.animateStats(entry.target);
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.1 }
            );

            // Observe stats elements
            document.querySelectorAll('.stat-number').forEach(stat => {
                observer.observe(stat);
            });
        }

        async loadInitialData() {
            try {
                this.showLoading();
                const data = await this.fetchOrdersData();
                this.renderOrders(data);
                this.initializePagination(data.total);
                this.hideLoading();
            } catch (error) {
                console.error('Failed to load initial data:', error);
                this.showErrorMessage('Failed to load orders');
                this.hideLoading();
            }
        }

        async handleSearch(searchTerm) {
            try {
                this.showLoading();
                searchTerm = searchTerm.toLowerCase().trim();
                
                const rows = this.tableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    const match = text.includes(searchTerm);
                    row.style.display = match ? '' : 'none';
                    
                    // Add/remove highlight class
                    row.classList.toggle('highlight-match', match && searchTerm !== '');
                });
            } finally {
                this.hideLoading();
            }
        }

        async handleDateFilterChange(filter) {
            try {
                this.showLoading();
                const dateRange = document.querySelector('.date-range');
                
                // Toggle date range visibility
                if (dateRange) {
                    dateRange.style.display = filter === 'custom' ? 'flex' : 'none';
                }

                // Apply filter
                await this.applyDateFilter(filter);
            } finally {
                this.hideLoading();
            }
        }

        async handleDateRangeChange() {
            const startDate = this.dateInputs.start?.value;
            const endDate = this.dateInputs.end?.value;

            if (startDate && endDate) {
                try {
                    this.showLoading();
                    await this.fetchAndRenderOrdersByDateRange(startDate, endDate);
                } finally {
                    this.hideLoading();
                }
            }
        }

        handleViewMore(button) {
            const container = button.closest('.order-items');
            const hiddenItems = container.querySelectorAll('.hidden-item');
            
            if (button.classList.contains('expanded')) {
                // Collapse
                hiddenItems.forEach(item => item.style.display = 'none');
                button.textContent = `+${hiddenItems.length} more`;
                button.classList.remove('expanded');
            } else {
                // Expand
                hiddenItems.forEach(item => item.style.display = 'block');
                button.textContent = 'Show less';
                button.classList.add('expanded');
            }
        }

        handleViewDetails(row) {
            const orderId = row.getAttribute('data-order-id');
            if (orderId && this.orderModal) {
                this.orderModal.show(orderId);
            } else {
                console.error('Order modal not initialized');
            }
        }

        // Utility Methods
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        createLoadingOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="spinner">
                    <div class="bounce1"></div>
                    <div class="bounce2"></div>
                    <div class="bounce3"></div>
                </div>
            `;
            return overlay;
        }

        showLoading() {
            document.body.appendChild(this.loadingOverlay);
        }

        hideLoading() {
            this.loadingOverlay.remove();
        }

        showErrorMessage(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            
            // Remove existing error messages
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            
            // Show new error message
            this.tableBody.parentElement.insertBefore(errorDiv, this.tableBody);
            
            // Auto-hide after 5 seconds
            setTimeout(() => errorDiv.remove(), 5000);
        }

        animateStats(element) {
            const finalValue = parseInt(element.dataset.value || element.textContent);
            const duration = 2000;
            const steps = 60;
            const stepValue = finalValue / steps;
            let currentStep = 0;

            const animate = () => {
                currentStep++;
                const currentValue = Math.round(stepValue * currentStep);
                element.textContent = this.formatNumber(currentValue);

                if (currentStep < steps) {
                    requestAnimationFrame(animate);
                } else {
                    element.textContent = this.formatNumber(finalValue);
                }
            };

            requestAnimationFrame(animate);
        }

        formatNumber(number) {
            return new Intl.NumberFormat('id-ID').format(number);
        }

        handleResize() {
            // Adjust table layout for different screen sizes
            const table = document.querySelector('.orders-table');
            if (table) {
                const windowWidth = window.innerWidth;
                table.classList.toggle('compact-view', windowWidth < 768);
            }
        }

        renderOrders(data) {
            const tableBody = document.querySelector('.orders-table tbody');
            if (!tableBody) return;

            tableBody.innerHTML = data.orders.map(order => `
                <tr data-order-id="${order.id}">
                    <td>${order.id}</td>
                    <td>
                        <div class="order-datetime">
                            <span class="date">${order.date}</span>
                            <span class="time">${order.time}</span>
                        </div>
                    </td>
                    <td>Table ${order.tableNumber}</td>
                    <td>
                        <div class="order-items">
                            ${this.renderOrderItems(order.items)}
                        </div>
                    </td>
                    <td>Rp ${this.formatNumber(order.total)}</td>
                    <td>
                        <span class="payment-method ${order.paymentMethod.toLowerCase()}">
                            <i class="fas fa-${this.getPaymentIcon(order.paymentMethod)}"></i>
                            ${order.paymentMethod}
                        </span>
                    </td>
                    <td>
                        <button class="btn-view-details" type="button">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        getPaymentIcon(method) {
            const icons = {
                'QRIS': 'qrcode',
                'CASH': 'money-bill-wave',
                'CARD': 'credit-card',
                'TRANSFER': 'university'
            };
            return icons[method.toUpperCase()] || 'money-bill';
        }

        renderOrderItems(items) {
            const maxDisplay = 2;
            const displayItems = items.slice(0, maxDisplay);
            const remainingCount = items.length - maxDisplay;

            let html = displayItems.map(item => 
                `<span>${item.quantity}x ${item.name}</span>`
            ).join('');

            if (remainingCount > 0) {
                html += `<button class="btn-view-more" type="button">+${remainingCount} more</button>`;
            }

            return html;
        }
    }

    // Initialize the page
    let completedOrdersPage;
    document.addEventListener('DOMContentLoaded', () => {
        completedOrdersPage = new CompletedOrdersPage();
        window.completedOrdersPage = completedOrdersPage; // Make it globally accessible
    });
}); 