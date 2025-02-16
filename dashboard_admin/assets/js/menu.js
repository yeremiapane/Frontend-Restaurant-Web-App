class MenuManager {
    constructor() {
        this.menuItems = [];
        this.filteredItems = [];
        this.init();
    }

    async init() {
        await this.fetchMenuItems();
        this.setupEventListeners();
        this.renderMenuItems();
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
                image: "assets/img/menu/nasi-goreng.jpg",
                description: "Nasi goreng dengan telur, ayam, dan sayuran"
            },
            {
                id: 2,
                name: "Es Teh Manis",
                category: "Beverage",
                price: 8000,
                status: "active",
                image: "assets/img/menu/es-teh.jpg",
                description: "Teh manis dengan es"
            },
            // Tambahkan menu item lainnya di sini
        ];
        this.filteredItems = [...this.menuItems];
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-container input');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Category filter
        const categoryFilter = document.querySelector('.category-filter select');
        categoryFilter.addEventListener('change', (e) => this.handleCategoryFilter(e.target.value));

        // Add menu button
        const addMenuBtn = document.getElementById('addMenuBtn');
        addMenuBtn.addEventListener('click', () => this.showAddMenuModal());

        // Action buttons delegation
        document.querySelector('.menu-table tbody').addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const row = target.closest('tr');
            const menuId = row.dataset.id;

            if (target.classList.contains('btn-view')) {
                this.handleViewMenu(menuId);
            } else if (target.classList.contains('btn-edit')) {
                this.handleEditMenu(menuId);
            } else if (target.classList.contains('btn-delete')) {
                this.handleDeleteMenu(menuId);
            }
        });
    }

    renderMenuItems() {
        const tbody = document.querySelector('.menu-table tbody');
        tbody.innerHTML = this.filteredItems.map(item => `
            <tr data-id="${item.id}">
                <td><img src="${item.image}" alt="${item.name}" class="menu-image"></td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>Rp ${this.formatPrice(item.price)}</td>
                <td><span class="menu-status status-${item.status}">${this.formatStatus(item.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="btn-edit" title="Edit Menu"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" title="Delete Menu"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredItems = [...this.menuItems];
        } else {
            query = query.toLowerCase();
            this.filteredItems = this.menuItems.filter(item => 
                item.name.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
            );
        }
        this.renderMenuItems();
    }

    handleCategoryFilter(category) {
        if (!category) {
            this.filteredItems = [...this.menuItems];
        } else {
            this.filteredItems = this.menuItems.filter(item => 
                item.category === category
            );
        }
        this.renderMenuItems();
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
        const modal = document.getElementById('menuModal');
        const closeButtons = modal.querySelectorAll('.close-modal');
        const form = modal.querySelector('#menuForm');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.remove();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveMenu(form);
        });
    }

    async handleSaveMenu(form) {
        // Get form data
        const formData = {
            name: form.menuName.value,
            category: form.menuCategory.value,
            price: parseInt(form.menuPrice.value),
            status: form.menuStatus.value,
            description: form.menuDescription.value
        };

        // Simulate API call
        await this.saveMenu(formData);
        
        // Close modal and refresh list
        document.getElementById('menuModal').remove();
        this.fetchMenuItems();
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

    handleEditMenu(menuId) {
        // Implementasi edit menu
        console.log('Edit menu:', menuId);
    }

    async handleDeleteMenu(menuId) {
        if (confirm('Are you sure you want to delete this menu item?')) {
            // Simulate API call
            await this.deleteMenu(menuId);
            this.fetchMenuItems();
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
    new MenuManager();
}); 