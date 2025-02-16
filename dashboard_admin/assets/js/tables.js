class TableManager {
    constructor() {
        this.tables = [];
        this.filteredTables = [];
        this.init();
    }

    async init() {
        await this.fetchTables();
        this.setupEventListeners();
        this.renderTables();
        this.updateStatusCounts();
    }

    async fetchTables() {
        // Simulasi data dari API
        this.tables = [
            { id: 1, number: "T01", status: "available", capacity: 4, location: "Indoor" },
            { id: 2, number: "T02", status: "occupied", capacity: 2, location: "Indoor" },
            { id: 3, number: "T03", status: "dirty", capacity: 6, location: "Outdoor" },
            { id: 4, number: "T04", status: "available", capacity: 4, location: "Indoor" },
            { id: 5, number: "T05", status: "occupied", capacity: 8, location: "Outdoor" },
        ];
        this.filteredTables = [...this.tables];
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('tableSearch');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        statusFilter.addEventListener('change', (e) => this.handleStatusFilter(e.target.value));

        // Add table button
        const addTableBtn = document.getElementById('addTableBtn');
        addTableBtn.addEventListener('click', () => this.showAddTableModal());

        // Table card clicks
        const tablesGrid = document.getElementById('tablesGrid');
        tablesGrid.addEventListener('click', (e) => {
            const tableCard = e.target.closest('.table-card');
            if (!tableCard) return;

            const actionBtn = e.target.closest('.action-btn');
            if (actionBtn) {
                e.stopPropagation(); // Prevent table card click when clicking action buttons
                const tableId = parseInt(tableCard.dataset.id);
                
                if (actionBtn.classList.contains('edit-btn')) {
                    this.handleEditTable(tableId);
                } else if (actionBtn.classList.contains('delete-btn')) {
                    this.handleDeleteTable(tableId);
                }
            } else {
                // Show table details when clicking the card
                const tableId = parseInt(tableCard.dataset.id);
                this.showTableDetails(tableId);
            }
        });
    }

    renderTables() {
        const tablesGrid = document.getElementById('tablesGrid');
        tablesGrid.innerHTML = this.filteredTables.map(table => `
            <div class="table-card ${table.status}" data-id="${table.id}">
                <div class="table-actions">
                    <button class="action-btn edit-btn" title="Edit Table">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete Table">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <i class="fas fa-chair table-icon"></i>
                <div class="table-number">${table.number}</div>
                <div class="table-status">${this.formatStatus(table.status)}</div>
                <div class="table-capacity">${table.capacity} Seats</div>
            </div>
        `).join('');
    }

    updateStatusCounts() {
        const counts = {
            available: this.tables.filter(t => t.status === 'available').length,
            occupied: this.tables.filter(t => t.status === 'occupied').length,
            dirty: this.tables.filter(t => t.status === 'dirty').length
        };

        document.getElementById('availableCount').textContent = `${counts.available} Tables`;
        document.getElementById('occupiedCount').textContent = `${counts.occupied} Tables`;
        document.getElementById('dirtyCount').textContent = `${counts.dirty} Tables`;
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredTables = [...this.tables];
        } else {
            query = query.toLowerCase();
            this.filteredTables = this.tables.filter(table => 
                table.number.toLowerCase().includes(query) ||
                table.status.toLowerCase().includes(query)
            );
        }
        this.renderTables();
    }

    handleStatusFilter(status) {
        if (!status) {
            this.filteredTables = [...this.tables];
        } else {
            this.filteredTables = this.tables.filter(table => table.status === status);
        }
        this.renderTables();
    }

    showAddTableModal() {
        const modalHTML = `
            <div class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New Table</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addTableForm" class="table-form">
                            <div class="form-group">
                                <label for="tableNumber">Table Number</label>
                                <input type="text" id="tableNumber" required placeholder="e.g., T01">
                            </div>
                            <div class="form-group">
                                <label for="tableCapacity">Capacity</label>
                                <input type="number" id="tableCapacity" required min="1" placeholder="Number of seats">
                            </div>
                            <div class="form-group">
                                <label for="tableLocation">Location</label>
                                <select id="tableLocation" required>
                                    <option value="">Select location</option>
                                    <option value="Indoor">Indoor</option>
                                    <option value="Outdoor">Outdoor</option>
                                    <option value="Balcony">Balcony</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="tableStatus">Initial Status</label>
                                <select id="tableStatus" required>
                                    <option value="available">Available</option>
                                    <option value="occupied">Occupied</option>
                                    <option value="dirty">Dirty</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary close-modal">Cancel</button>
                                <button type="submit" class="btn-primary">Add Table</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalEventListeners();
    }

    showTableDetails(tableId) {
        const table = this.tables.find(t => t.id === tableId);
        if (!table) return;

        const modalHTML = `
            <div class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Table Details</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="table-details">
                            <div class="table-info">
                                <div class="info-item">
                                    <span class="label">Table Number:</span>
                                    <span class="value">${table.number}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Status:</span>
                                    <span class="value status-badge ${table.status}">${this.formatStatus(table.status)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Capacity:</span>
                                    <span class="value">${table.capacity} Seats</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Location:</span>
                                    <span class="value">${table.location}</span>
                                </div>
                            </div>
                            <div class="quick-actions">
                                <h3>Quick Actions</h3>
                                <div class="status-buttons">
                                    <button class="status-btn available ${table.status === 'available' ? 'active' : ''}"
                                            onclick="tableManager.updateTableStatus(${table.id}, 'available')">
                                        <i class="fas fa-check-circle"></i> Available
                                    </button>
                                    <button class="status-btn occupied ${table.status === 'occupied' ? 'active' : ''}"
                                            onclick="tableManager.updateTableStatus(${table.id}, 'occupied')">
                                        <i class="fas fa-users"></i> Occupied
                                    </button>
                                    <button class="status-btn dirty ${table.status === 'dirty' ? 'active' : ''}"
                                            onclick="tableManager.updateTableStatus(${table.id}, 'dirty')">
                                        <i class="fas fa-broom"></i> Dirty
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalEventListeners();
    }

    async updateTableStatus(tableId, newStatus) {
        try {
            // Simulate API call
            await this.updateTable(tableId, { status: newStatus });
            
            // Update local data
            const table = this.tables.find(t => t.id === tableId);
            if (table) {
                table.status = newStatus;
                this.renderTables();
                this.updateStatusCounts();
                this.showToast('Table status updated successfully', 'success');
            }
            
            // Close modal
            const modal = document.querySelector('.modal');
            if (modal) modal.remove();
        } catch (error) {
            this.showToast('Failed to update table status', 'error');
        }
    }

    setupModalEventListeners() {
        const modal = document.querySelector('.modal');
        if (!modal) return;

        // Close modal handlers
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Form submission handler
        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveTable(form);
            });
        }
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    // API simulation methods
    async updateTable(tableId, data) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async deleteTable(tableId) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    handleEditTable(tableId) {
        const table = this.tables.find(t => t.id === tableId);
        if (!table) return;

        const modalHTML = `
            <div class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Table</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editTableForm" class="table-form" data-id="${table.id}">
                            <div class="form-group">
                                <label for="tableNumber">Table Number</label>
                                <input type="text" id="tableNumber" required value="${table.number}">
                            </div>
                            <div class="form-group">
                                <label for="tableCapacity">Capacity</label>
                                <input type="number" id="tableCapacity" required min="1" value="${table.capacity}">
                            </div>
                            <div class="form-group">
                                <label for="tableLocation">Location</label>
                                <select id="tableLocation" required>
                                    <option value="Indoor" ${table.location === 'Indoor' ? 'selected' : ''}>Indoor</option>
                                    <option value="Outdoor" ${table.location === 'Outdoor' ? 'selected' : ''}>Outdoor</option>
                                    <option value="Balcony" ${table.location === 'Balcony' ? 'selected' : ''}>Balcony</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="tableStatus">Status</label>
                                <select id="tableStatus" required>
                                    <option value="available" ${table.status === 'available' ? 'selected' : ''}>Available</option>
                                    <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>Occupied</option>
                                    <option value="dirty" ${table.status === 'dirty' ? 'selected' : ''}>Dirty</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary close-modal">Cancel</button>
                                <button type="submit" class="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalEventListeners();
    }
}

// Initialize
let tableManager;
document.addEventListener('DOMContentLoaded', () => {
    tableManager = new TableManager();
}); 