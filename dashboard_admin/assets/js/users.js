class UserManager {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.init();
    }

    async init() {
        await this.loadUsers();
        this.setupEventListeners();
    }

    async loadUsers() {
        try {
            const users = await this.fetchUsers();
            this.users = users;
            this.filteredUsers = [...this.users];
            this.updateUserCounts();
            this.renderUsers();
        } catch (error) {
            this.showToast('Failed to load users', 'error');
        }
    }

    async fetchUsers() {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
            {
                id: 1,
                fullName: 'John Doe',
                email: 'john@restopro.com',
                role: 'admin',
                status: 'active',
                lastActive: new Date(),
                avatar: 'assets/img/avatar.jpg'
            },
            {
                id: 2,
                fullName: 'Jane Smith',
                email: 'jane@restopro.com',
                role: 'manager',
                status: 'active',
                lastActive: new Date(Date.now() - 86400000),
                avatar: 'assets/img/avatar-2.jpg'
            },
            {
                id: 3,
                fullName: 'Mike Johnson',
                email: 'mike@restopro.com',
                role: 'staff',
                status: 'active',
                lastActive: new Date(Date.now() - 3600000),
                avatar: 'assets/img/avatar-3.jpg'
            },
            {
                id: 4,
                fullName: 'Sarah Wilson',
                email: 'sarah@restopro.com',
                role: 'cashier',
                status: 'active',
                lastActive: new Date(Date.now() - 7200000),
                avatar: 'assets/img/avatar-4.jpg'
            },
            {
                id: 5,
                fullName: 'David Brown',
                email: 'david@restopro.com',
                role: 'staff',
                status: 'inactive',
                lastActive: new Date(Date.now() - 604800000),
                avatar: 'assets/img/avatar-5.jpg'
            },
            {
                id: 6,
                fullName: 'Emily Davis',
                email: 'emily@restopro.com',
                role: 'cashier',
                status: 'active',
                lastActive: new Date(Date.now() - 1800000),
                avatar: 'assets/img/avatar-6.jpg'
            },
            {
                id: 7,
                fullName: 'Alex Turner',
                email: 'alex@restopro.com',
                role: 'manager',
                status: 'active',
                lastActive: new Date(Date.now() - 43200000),
                avatar: 'assets/img/avatar-7.jpg'
            },
            {
                id: 8,
                fullName: 'Lisa Anderson',
                email: 'lisa@restopro.com',
                role: 'staff',
                status: 'active',
                lastActive: new Date(Date.now() - 14400000),
                avatar: 'assets/img/avatar-8.jpg'
            },
            {
                id: 9,
                fullName: 'Robert Taylor',
                email: 'robert@restopro.com',
                role: 'cashier',
                status: 'inactive',
                lastActive: new Date(Date.now() - 172800000),
                avatar: 'assets/img/avatar-9.jpg'
            },
            {
                id: 10,
                fullName: 'Maria Garcia',
                email: 'maria@restopro.com',
                role: 'staff',
                status: 'active',
                lastActive: new Date(Date.now() - 28800000),
                avatar: 'assets/img/avatar-10.jpg'
            }
        ];
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        roleFilter.addEventListener('change', () => this.handleFilter());

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        statusFilter.addEventListener('change', () => this.handleFilter());

        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        addUserBtn.addEventListener('click', () => this.showAddUserModal());

        // Table action buttons
        document.querySelector('.users-table').addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (!actionBtn) return;

            const userId = parseInt(actionBtn.closest('tr').dataset.id);
            
            if (actionBtn.classList.contains('edit-btn')) {
                this.handleEditUser(userId);
            } else if (actionBtn.classList.contains('delete-btn')) {
                this.handleDeleteUser(userId);
            }
        });
    }

    renderUsers() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) {
            console.error('Table body not found');
            return;
        }
        
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const row = `
                <tr>
                    <td>
                        <div class="user-info">
                            <img src="${user.avatar}" alt="${user.fullName}" class="user-avatar">
                            <div class="user-details">
                                <span class="user-name">${user.fullName}</span>
                                <span class="user-username">${user.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>
                        <span class="role-badge ${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                    </td>
                    <td>
                        <span class="status-badge ${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                    </td>
                    <td>${this.formatDate(user.lastActive)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action edit" onclick="userManager.handleEditUser(${user.id})" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete" onclick="userManager.handleDeleteUser(${user.id})" title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Update role counts
        this.updateUserCounts();
    }

    updateUserCounts() {
        const counts = {
            admin: 0,
            manager: 0,
            staff: 0,
            cashier: 0
        };

        this.users.forEach(user => {
            if (counts.hasOwnProperty(user.role)) {
                counts[user.role]++;
            }
        });

        Object.keys(counts).forEach(role => {
            const element = document.getElementById(`${role}Count`);
            if (element) {
                element.textContent = counts[role];
            }
        });
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredUsers = [...this.users];
        } else {
            query = query.toLowerCase();
            this.filteredUsers = this.users.filter(user => 
                user.fullName.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query)
            );
        }
        this.renderUsers();
    }

    handleFilter() {
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const searchQuery = document.getElementById('userSearch').value.toLowerCase();

        let filteredUsers = this.users;

        // Apply role filter
        if (roleFilter) {
            filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }

        // Apply status filter
        if (statusFilter) {
            filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
        }

        // Apply search filter
        if (searchQuery) {
            filteredUsers = filteredUsers.filter(user => 
                user.fullName.toLowerCase().includes(searchQuery) ||
                user.email.toLowerCase().includes(searchQuery)
            );
        }

        this.renderFilteredUsers(filteredUsers);
        this.updateActiveFilters(roleFilter, statusFilter);
    }

    renderFilteredUsers(filteredUsers) {
        const tbody = document.querySelector('.data-table tbody');
        tbody.innerHTML = '';

        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-results">
                        <div class="no-results-message">
                            <i class="fas fa-search"></i>
                            <p>No users found matching your filters</p>
                            <button class="btn-secondary" onclick="userManager.clearFilters()">
                                Clear Filters
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        filteredUsers.forEach(user => {
            const row = `
                <tr>
                    <td>
                        <div class="user-info">
                            <img src="${user.avatar}" alt="${user.fullName}" class="user-avatar">
                            <div class="user-details">
                                <span class="user-name">${user.fullName}</span>
                                <span class="user-username">${user.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>
                        <span class="role-badge ${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                    </td>
                    <td>
                        <span class="status-badge ${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                    </td>
                    <td>${this.formatDate(user.lastActive)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action edit" onclick="userManager.handleEditUser(${user.id})" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete" onclick="userManager.handleDeleteUser(${user.id})" title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    clearFilters() {
        document.getElementById('roleFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('userSearch').value = '';
        this.handleFilter();
    }

    updateActiveFilters(roleFilter, statusFilter) {
        const activeFiltersDiv = document.querySelector('.active-filters');
        if (!activeFiltersDiv) return;

        activeFiltersDiv.innerHTML = '';

        if (roleFilter) {
            const roleTag = `
                <div class="filter-tag">
                    Role: ${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                    <i class="fas fa-times" onclick="userManager.clearRoleFilter()"></i>
                </div>
            `;
            activeFiltersDiv.insertAdjacentHTML('beforeend', roleTag);
        }

        if (statusFilter) {
            const statusTag = `
                <div class="filter-tag">
                    Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    <i class="fas fa-times" onclick="userManager.clearStatusFilter()"></i>
                </div>
            `;
            activeFiltersDiv.insertAdjacentHTML('beforeend', statusTag);
        }
    }

    clearRoleFilter() {
        document.getElementById('roleFilter').value = '';
        this.handleFilter();
    }

    clearStatusFilter() {
        document.getElementById('statusFilter').value = '';
        this.handleFilter();
    }

    showAddUserModal() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New User</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addUserForm" class="user-form">
                            <div class="form-group">
                                <label for="fullName">Full Name</label>
                                <input type="text" id="fullName" required placeholder="Enter full name">
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" required placeholder="Enter email address">
                            </div>
                            <div class="form-group">
                                <label for="role">Role</label>
                                <select id="role" required>
                                    <option value="">Select role</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff</option>
                                    <option value="cashier">Cashier</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input type="password" id="password" required placeholder="Enter password">
                            </div>
                            <div class="form-group">
                                <label for="confirmPassword">Confirm Password</label>
                                <input type="password" id="confirmPassword" required placeholder="Confirm password">
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary close-modal">Cancel</button>
                                <button type="submit" class="btn-primary">Add User</button>
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
        this.setupAddUserFormListener();
    }

    handleEditUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modalHTML = `
            <div class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit User</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="userForm" data-id="${user.id}">
                            <div class="form-group">
                                <label for="userName">Full Name</label>
                                <input type="text" id="userName" value="${user.fullName}" required>
                            </div>
                            <div class="form-group">
                                <label for="userEmail">Email</label>
                                <input type="email" id="userEmail" value="${user.email}" required>
                            </div>
                            <div class="form-group">
                                <label for="userRole">Role</label>
                                <select id="userRole" required>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                                    <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                                    <option value="cashier" ${user.role === 'cashier' ? 'selected' : ''}>Cashier</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="userStatus">Status</label>
                                <select id="userStatus" required>
                                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary close-modal">Cancel</button>
                                <button type="submit" class="btn-primary">Update User</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalEventListeners();
    }

    handleDeleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modalHTML = `
            <div class="modal delete-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Delete User</h2>
                        <button type="button" class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <i class="fas fa-exclamation-triangle warning-icon"></i>
                        <p>Are you sure you want to delete user</p>
                        <p class="user-to-delete">${user.fullName}</p>
                        <p>This action cannot be undone.</p>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary close-modal">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="button" class="btn-danger" onclick="userManager.deleteUser(${user.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.querySelector('.modal');
        setTimeout(() => modal.classList.add('active'), 10);
        
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const modal = document.querySelector('.modal');
        if (!modal) return;

        // Close modal handlers
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });

        // Form submission handler
        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveUser(form);
            });
        }
    }

    setupAddUserFormListener() {
        const form = document.getElementById('addUserForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                fullName: form.fullName.value,
                email: form.email.value,
                role: form.role.value,
                password: form.password.value,
                confirmPassword: form.confirmPassword.value
            };

            if (formData.password !== formData.confirmPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }

            try {
                await this.addUser(formData);
                this.showToast('User added successfully', 'success');
                document.querySelector('.modal').remove();
                await this.loadUsers();
            } catch (error) {
                this.showToast('Failed to add user', 'error');
            }
        });
    }

    async handleSaveUser(form) {
        const userId = form.dataset.id;
        const formData = {
            fullName: form.userName.value,
            email: form.userEmail.value,
            role: form.userRole.value
        };

        try {
            if (userId) {
                // Update existing user
                formData.status = form.userStatus.value;
                await this.updateUser(parseInt(userId), formData);
                const userIndex = this.users.findIndex(u => u.id === parseInt(userId));
                if (userIndex !== -1) {
                    this.users[userIndex] = { ...this.users[userIndex], ...formData };
                }
                this.showToast('User updated successfully', 'success');
            } else {
                // Add new user
                formData.status = 'active';
                formData.id = this.users.length + 1;
                formData.lastActive = new Date().toISOString();
                formData.avatar = 'assets/img/avatars/default.jpg';
                await this.addUser(formData);
                this.users.push(formData);
                this.showToast('User added successfully', 'success');
            }

            this.filteredUsers = [...this.users];
            this.renderUsers();
            this.updateUserCounts();
            document.querySelector('.modal').remove();
        } catch (error) {
            this.showToast('Failed to save user', 'error');
        }
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const modalHTML = `
                <div class="modal active">
                    <div class="modal-content confirm-dialog">
                        <div class="modal-header">
                            <h2>${title}</h2>
                            <button type="button" class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
                                <button type="button" class="btn-danger" data-action="confirm">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = document.querySelector('.modal');

            modal.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('modal') || 
                    target.classList.contains('close-modal') || 
                    target.classList.contains('btn-secondary')) {
                    modal.remove();
                    resolve(false);
                } else if (target.classList.contains('btn-danger')) {
                    modal.remove();
                    resolve(true);
                }
            });
        });
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

    formatRole(role) {
        return role.charAt(0).toUpperCase() + role.slice(1);
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // API simulation methods
    async createUser(userData) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async updateUser(userId, userData) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async deleteUser(userId) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async addUser(userData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { ...userData, id: this.users.length + 1 };
    }
}

// Initialize
let userManager;
document.addEventListener('DOMContentLoaded', () => {
    userManager = new UserManager();
}); 