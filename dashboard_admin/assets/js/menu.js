class MenuManager {
    constructor() {
        this.menuItems = [];
        this.currentFilters = {
            category: 'all',
            status: 'all',
            search: ''
        };
        this.init();
    }

    async init() {
        await this.fetchMenuItems();
        this.setupEventListeners();
        this.applyFilters();
    }

    async fetchMenuItems() {
        // Simulasi data dari API
        this.menuItems = [
            {
                id: 1,
                name: "Nasi Goreng Spesial",
                category: "Main Course",
                price: 35000,
                status: "active",
                description: "Nasi goreng dengan telur, ayam, dan sayuran"
            },
            {
                id: 2,
                name: "Es Teh Manis",
                category: "Beverage",
                price: 8000,
                status: "active",
                description: "Teh manis dengan es"
            },
            {
                id: 3,
                name: "Sate Ayam",
                category: "Main Course",
                price: 25000,
                status: "active",
                description: "Sate ayam dengan bumbu kacang"
            },
            {
                id: 4,
                name: "Es Jeruk",
                category: "Beverage",
                price: 10000,
                status: "inactive",
                description: "Jeruk segar dengan es"
            },
            {
                id: 5,
                name: "Nasi Uduk",
                category: "Main Course",
                price: 15000,
                status: "active",
                description: "Nasi uduk dengan telur dan tempe"
            }
        ];
    }

    setupEventListeners() {
        // Category Filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        // Status Filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Search
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Add menu button
        document.getElementById('addMenuBtn')?.addEventListener('click', () => {
            this.showAddMenuModal();
        });

        // Action buttons delegation
        const menuTable = document.querySelector('.menu-table tbody');
        if (menuTable) {
            menuTable.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const row = target.closest('tr');
                const menuId = parseInt(row.dataset.id);

                if (target.classList.contains('btn-view')) {
                    this.handleViewMenu(menuId);
                } else if (target.classList.contains('btn-edit')) {
                    this.handleEditMenu(menuId);
                } else if (target.classList.contains('btn-delete')) {
                    this.handleDeleteMenu(menuId);
                }
            });
        }
    }

    applyFilters() {
        let filteredItems = [...this.menuItems];

        // Apply category filter
        if (this.currentFilters.category !== 'all') {
            filteredItems = filteredItems.filter(item => 
                item.category === this.currentFilters.category
            );
        }

        // Apply status filter
        if (this.currentFilters.status !== 'all') {
            filteredItems = filteredItems.filter(item => 
                item.status === this.currentFilters.status
            );
        }

        // Apply search filter
        if (this.currentFilters.search) {
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(this.currentFilters.search) ||
                item.category.toLowerCase().includes(this.currentFilters.search) ||
                item.description.toLowerCase().includes(this.currentFilters.search)
            );
        }

        this.renderMenuItems(filteredItems);
    }

    renderMenuItems(items) {
        const tbody = document.querySelector('.menu-table tbody');
        if (!tbody) {
            console.error('Table body not found'); // Debug log
            return;
        }

        console.log('Rendering items:', items.length); // Debug log

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-results">
                        <div class="no-results-message">
                            <i class="fas fa-search"></i>
                            <p>No menu items found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr data-id="${item.id}">
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>Rp ${this.formatPrice(item.price)}</td>
                <td><span class="status-badge ${item.status}">${this.formatStatus(item.status)}</span></td>
                <td>${item.description || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-edit" title="Edit Menu">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" title="Delete Menu">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Setup action buttons
        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.id);
                this.handleViewMenu(id);
            });
        });

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.id);
                this.handleEditMenu(id);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.id);
                this.handleDeleteMenu(id);
            });
        });
    }

    showAddMenuModal() {
        const modalHTML = `
            <div class="modal active" id="menuModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New Menu</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="menuForm">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="menuName">Menu Name</label>
                                    <input type="text" id="menuName" required>
                                </div>
                                <div class="form-group">
                                    <label for="menuCategory">Category</label>
                                    <select id="menuCategory" required>
                                        <option value="">Select Category</option>
                                        <option value="Main Course">Main Course</option>
                                        <option value="Appetizer">Appetizer</option>
                                        <option value="Dessert">Dessert</option>
                                        <option value="Beverage">Beverage</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="menuPrice">Price</label>
                                    <input type="number" id="menuPrice" required>
                                </div>
                                <div class="form-group">
                                    <label for="menuStatus">Status</label>
                                    <select id="menuStatus" required>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="menuDescription">Description</label>
                                <textarea id="menuDescription" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Menu Image</label>
                                <div class="image-upload-container">
                                    <div class="image-upload-box">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <p>Click to upload or drag and drop</p>
                                    </div>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary close-modal">Cancel</button>
                                <button type="submit" class="btn-primary">Save Menu</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const modal = document.querySelector('.modal');
        if (!modal) return;

        // Close button handler
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            });
        });

        // Click outside modal handler
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });

        // Form submit handler
        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (form.id === 'addMenuForm') {
                    this.handleAddMenu(form);
                } else if (form.id === 'editMenuForm') {
                    this.handleEditMenu(form);
                }
            });
        }
    }

    handleEditMenu(menuId) {
        const item = this.menuItems.find(item => item.id === parseInt(menuId));
        if (!item) return;

        const modalHTML = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Menu Item</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editMenuForm" data-id="${item.id}">
                            <div class="form-group">
                                <label for="menuName">Menu Name</label>
                                <input type="text" id="menuName" value="${item.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="menuCategory">Category</label>
                                <select id="menuCategory" required>
                                    <option value="Main Course" ${item.category === 'Main Course' ? 'selected' : ''}>Main Course</option>
                                    <option value="Appetizer" ${item.category === 'Appetizer' ? 'selected' : ''}>Appetizer</option>
                                    <option value="Dessert" ${item.category === 'Dessert' ? 'selected' : ''}>Dessert</option>
                                    <option value="Beverage" ${item.category === 'Beverage' ? 'selected' : ''}>Beverage</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="menuPrice">Price</label>
                                <input type="number" id="menuPrice" value="${item.price}" required>
                            </div>
                            <div class="form-group">
                                <label for="menuStatus">Status</label>
                                <select id="menuStatus" required>
                                    <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${item.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="menuDescription">Description</label>
                                <textarea id="menuDescription" required>${item.description || ''}</textarea>
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
        const modal = document.querySelector('.modal');
        setTimeout(() => modal.classList.add('active'), 10);
        this.setupModalEventListeners();
    }

    async handleAddMenu(form) {
        const newItem = {
            id: this.menuItems.length + 1,
            name: form.menuName.value,
            category: form.menuCategory.value,
            price: parseInt(form.menuPrice.value),
            status: form.menuStatus.value,
            description: form.menuDescription.value
        };

        // Simulate API call
        await this.saveMenu(newItem);
        
        this.menuItems.push(newItem);
        this.applyFilters();
        
        const modal = document.querySelector('.modal');
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }

    async handleEditMenuSubmit(form) {
        const itemId = parseInt(form.dataset.id);
        const itemIndex = this.menuItems.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) return;

        const updatedItem = {
            ...this.menuItems[itemIndex],
            name: form.menuName.value,
            category: form.menuCategory.value,
            price: parseInt(form.menuPrice.value),
            status: form.menuStatus.value,
            description: form.menuDescription.value
        };

        // Simulate API call
        await this.saveMenu(updatedItem);
        
        this.menuItems[itemIndex] = updatedItem;
        this.applyFilters();
        
        const modal = document.querySelector('.modal');
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }

    async handleViewMenu(menuId) {
        const menu = this.menuItems.find(item => item.id === parseInt(menuId));
        if (!menu) return;

        const modalHTML = `
            <div class="modal active" id="viewMenuModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Menu Details</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="menu-detail-content">
                            <div class="menu-detail-images">
                                <img src="${menu.image}" alt="${menu.name}">
                            </div>
                            <div class="menu-info">
                                <div class="menu-info-item">
                                    <span class="menu-info-label">Name</span>
                                    <span>${menu.name}</span>
                                </div>
                                <div class="menu-info-item">
                                    <span class="menu-info-label">Category</span>
                                    <span>${menu.category}</span>
                                </div>
                                <div class="menu-info-item">
                                    <span class="menu-info-label">Price</span>
                                    <span>Rp ${this.formatPrice(menu.price)}</span>
                                </div>
                                <div class="menu-info-item">
                                    <span class="menu-info-label">Status</span>
                                    <span class="menu-status status-${menu.status}">${this.formatStatus(menu.status)}</span>
                                </div>
                                <div class="menu-info-item">
                                    <span class="menu-info-label">Description</span>
                                    <span>${menu.description || '-'}</span>
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

    async handleDeleteMenu(menuId) {
        const item = this.menuItems.find(item => item.id === parseInt(menuId));
        if (!item) return;

        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            // Simulate API call
            await this.deleteMenu(menuId);
            
            const itemIndex = this.menuItems.findIndex(item => item.id === parseInt(menuId));
            this.menuItems.splice(itemIndex, 1);
            this.applyFilters();
        }
    }

    formatPrice(price) {
        return price.toLocaleString('id-ID');
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    // API simulation methods
    async saveMenu(menuData) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async deleteMenu(menuId) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.menuManager = new MenuManager();
}); 