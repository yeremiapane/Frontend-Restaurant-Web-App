class TablesPage {
    constructor() {
        this.tables = [];
        this.initialized = false;
        window.router.registerPageInstance('tables', this);
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const content = await this.render();
            document.getElementById('content-container').innerHTML = content;
            
            await this.loadTables();
            this.setupWebSocketListeners();
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing tables page:', error);
        }
    }

    async render() {
        return `
            <div class="tables-page">
                <div class="page-header">
                    <h2>Tables Management</h2>
                    <div class="table-status-legend">
                        <div class="legend-item">
                            <span class="status-dot available"></span>
                            <span>Available</span>
                        </div>
                        <div class="legend-item">
                            <span class="status-dot occupied"></span>
                            <span>Occupied</span>
                        </div>
                        <div class="legend-item">
                            <span class="status-dot dirty"></span>
                            <span>Dirty</span>
                        </div>
                    </div>
                </div>
                
                <div class="tables-grid" id="tables-grid">
                    <!-- Tables will be loaded here -->
                </div>
            </div>
        `;
    }

    async loadTables() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/admin/tables', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load tables');

            const result = await response.json();
            if (result.status && result.data) {
                this.tables = result.data;
                this.updateTablesGrid();
            }
        } catch (error) {
            console.error('Error loading tables:', error);
        }
    }

    updateTablesGrid() {
        const grid = document.getElementById('tables-grid');
        if (!grid) return;

        grid.innerHTML = this.tables.map(table => `
            <div class="table-card ${table.status.toLowerCase()}" data-table-id="${table.id}">
                <div class="table-number">Table ${table.number}</div>
                <div class="table-capacity">
                    <i class="fas fa-users"></i> ${table.capacity || 4}
                </div>
                <div class="table-status">${this.formatStatus(table.status)}</div>
                ${this.renderTableActions(table)}
            </div>
        `).join('');
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    renderTableActions(table) {
        const status = table.status.toLowerCase();
        switch (status) {
            case 'available':
                return `
                    <button class="table-action-btn occupy-btn" onclick="tablesPage.occupyTable(${table.id})">
                        <i class="fas fa-chair"></i> Occupy
                    </button>
                `;
            case 'occupied':
                return `
                    <button class="table-action-btn mark-dirty-btn" onclick="tablesPage.markTableDirty(${table.id})">
                        <i class="fas fa-broom"></i> Mark Dirty
                    </button>
                `;
            case 'dirty':
                return `
                    <button class="table-action-btn clean-btn" onclick="tablesPage.cleanTable(${table.id})">
                        <i class="fas fa-check"></i> Mark Clean
                    </button>
                `;
            default:
                return '';
        }
    }

    setupWebSocketListeners() {
        window.addEventListener('tableUpdate', async (event) => {
            console.log('Received table update:', event.detail);
            await this.loadTables();
        });
    }

    async updateTableStatus(tableId, status) {
        try {
            const token = localStorage.getItem('token');
            console.log('Updating table status:', { tableId, status });

            const response = await fetch(`http://localhost:8080/admin/tables/${tableId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status.toLowerCase()
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update table status');
            }

            const data = await response.json();
            
            if (data.status) {
                this.showNotification(`Table status updated to ${status}`, 'success');
                await this.loadTables();
            } else {
                throw new Error(data.message || 'Failed to update table status');
            }
        } catch (error) {
            console.error('Error updating table status:', error);
            this.showNotification(error.message || 'Failed to update table status', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    async occupyTable(tableId) {
        try {
            await this.updateTableStatus(tableId, 'occupied');
        } catch (error) {
            console.error('Error occupying table:', error);
        }
    }

    async markTableDirty(tableId) {
        try {
            await this.updateTableStatus(tableId, 'dirty');
        } catch (error) {
            console.error('Error marking table as dirty:', error);
        }
    }

    async cleanTable(tableId) {
        try {
            await this.updateTableStatus(tableId, 'available');
        } catch (error) {
            console.error('Error marking table as clean:', error);
        }
    }
}

// Initialize the tables page
window.tablesPage = new TablesPage();

// Register the tables page with the router
window.router.addRoute('tables', async () => {
    await window.tablesPage.initialize();
}); 