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
            document.getElementById('tables-content-container').innerHTML = content;
            
            await this.loadTables();
            this.setupWebSocketListeners();
            
            this.initialized = true;
            console.log('Tables page initialized successfully');
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

    /**
     * Mengatur listener untuk WebSocket events
     */
    setupWebSocketListeners() {
        // Listen for table updates
        window.addEventListener('tableUpdate', (event) => {
            // console.log('Table update received:', event.detail);
            
            // Perbaharui data
            this.handleTableUpdate(event.detail);
        });
        
        // Menyimak perubahan order yang juga dapat mempengaruhi keadaan meja
        window.addEventListener('orderUpdate', (event) => {
            // console.log('Order update affecting tables:', event.detail);
            
            // Jika order dibuat atau diupdate, mungkin memengaruhi meja
            if (event.detail.action === 'create' || 
                event.detail.action === 'update' ||
                event.detail.action === 'delete') {
                
                // Muat ulang data meja untuk memastikan konsistensi
                this.loadTables();
            }
        });
    }

    async updateTableStatus(tableId, status) {
        try {
            const token = localStorage.getItem('token');
            // console.log('Updating table status:', { tableId, status });

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
        notification.className = `notification notification-${type}`;
        
        // Tentukan icon berdasarkan jenis notifikasi
        let iconName = 'info';
        switch(type) {
            case 'success':
                iconName = 'check_circle';
                break;
            case 'error':
                iconName = 'error';
                break;
            case 'warning':
                iconName = 'warning';
                break;
        }
        
        // Tambahkan konten dengan icon
        notification.innerHTML = `
            <div class="notification-content">
                <span class="material-icons">${iconName}</span>
                <span>${message}</span>
            </div>
        `;
        
        // Tambahkan ke DOM
        document.body.appendChild(notification);
        
        // Hapus setelah 3 detik
        setTimeout(() => {
            notification.classList.add('notification-hide');
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

    /**
     * Menangani pembaruan status meja dari WebSocket
     * @param {Object} data
     */
    handleTableUpdate(data) {
        // Log hanya action dan ID meja untuk tracking event
        const action = data.action || 'unknown';
        const tableNumber = data.table?.table_number || data.table_number || data.table?.number || 'Unknown';
        console.log(`Table update: ${action} (Table: ${tableNumber})`);
        
        switch (action) {
            case 'create':
                this.showNotification(`Meja baru #${tableNumber} telah dibuat`, 'info');
                this.loadTables(); // Muat ulang data meja
                break;
                
            case 'update':
                // Status meja berubah
                if (data.table && data.table.id) {
                    const tableIndex = this.tables.findIndex(table => table.id === data.table.id);
                    
                    // Tentukan pesan berdasarkan status
                    let message = `Meja #${tableNumber}`;
                    let type = 'info';
                    
                    if (data.table.status === 'occupied') {
                        message += ' sekarang ditempati';
                        type = 'warning';
                    } else if (data.table.status === 'available') {
                        message += ' sekarang tersedia';
                        type = 'success';
                    } else if (data.table.status === 'reserved') {
                        message += ' telah direservasi';
                        type = 'info';
                    } else {
                        message += ` status: ${data.table.status}`;
                    }
                    
                    this.showNotification(message, type);
                    
                    if (tableIndex !== -1) {
                        // Update data meja
                        this.tables[tableIndex] = data.table;
                        this.updateTablesGrid();
                    } else {
                        this.loadTables(); // Meja tidak ditemukan, muat ulang
                    }
                }
                break;
                
            case 'delete':
                // Meja dihapus
                if (data.table_id) {
                    const tableIndex = this.tables.findIndex(table => table.id === data.table_id);
                    
                    this.showNotification(`Meja #${tableNumber} telah dihapus`, 'error');
                    
                    if (tableIndex !== -1) {
                        // Hapus dari array
                        this.tables.splice(tableIndex, 1);
                        // Perbarui tampilan
                        this.updateTablesGrid();
                    } else {
                        this.loadTables(); // Muat ulang jika meja tidak ditemukan
                    }
                }
                break;
                
            default:
                this.loadTables(); // Aksi tidak dikenali, muat ulang semua
                break;
        }
    }
}

// Initialize the tables page
window.tablesPage = new TablesPage();

// Register the tables page with the router
window.router.addRoute('tables', async () => {
    await window.tablesPage.initialize();
}); 