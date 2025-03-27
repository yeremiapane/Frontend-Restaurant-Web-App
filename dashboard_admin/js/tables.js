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
        const tablesGrid = document.getElementById('tables-grid');
        if (!tablesGrid) {
            console.error('Tables grid element not found');
            return;
        }
        
        // Simpan ID tabel yang saat ini ditampilkan untuk deteksi perubahan
        const currentTableIds = Array.from(tablesGrid.querySelectorAll('.table-card'))
            .map(card => parseInt(card.dataset.tableId, 10));
        
        // Bersihkan grid dan render ulang semua tabel
        tablesGrid.innerHTML = '';
        
        if (this.tables.length === 0) {
            tablesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No tables found. Tables will appear here once they are created.</p>
                </div>
            `;
            return;
        }
        
        // Urutkan tabel berdasarkan nomor
        this.tables.sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true });
        });
        
        // Render semua tabel
        this.tables.forEach(table => {
            const tableCard = document.createElement('div');
            tableCard.className = `table-card status-${table.status}`;
            tableCard.dataset.tableId = table.id;
            
            // Tambahkan kelas animasi jika ini tabel baru
            if (!currentTableIds.includes(table.id)) {
                tableCard.classList.add('table-card-new');
                
                // Hapus kelas animasi setelah selesai
                setTimeout(() => {
                    tableCard.classList.remove('table-card-new');
                }, 1000);
            }
            
            tableCard.innerHTML = `
                <div class="table-header">
                    <div class="table-info">
                        <div class="table-number">Table ${table.number}</div>
                        <div class="table-capacity">Status: ${this.formatStatus(table.status)}</div>
                    </div>
                    <div class="table-status">
                        <i class="fas ${table.status === 'available' ? 'fa-check-circle' : 
                           table.status === 'occupied' ? 'fa-users' : 'fa-broom'}"></i>
                    </div>
                </div>
                <div class="table-body">
                    <div class="table-actions">
                        ${this.renderTableActions(table)}
                    </div>
                </div>
            `;
            
            tablesGrid.appendChild(tableCard);
        });
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
        try {
            if (!window.wsClient) {
                console.warn('WebSocket client not available');
                return;
            }
            
            console.log('Setting up WebSocket listeners for tables page');
            
            // Listener untuk pembaruan tabel yang sudah ada
            window.wsClient.addEventListener('table_update', (tableData) => {
                console.log('Table update received via WebSocket:', tableData);
                this.handleTableUpdate(tableData);
            });
            
            // Listener untuk tabel baru yang dibuat
            window.wsClient.addEventListener('table_create', (tableData) => {
                console.log('New table created:', tableData);
                this.handleTableCreate(tableData);
            });
            
            // Listener untuk tabel yang dihapus
            window.wsClient.addEventListener('table_delete', (tableData) => {
                console.log('Table deleted:', tableData);
                this.handleTableDelete(tableData);
            });
            
            console.log('WebSocket listeners setup complete for tables page');
        } catch (error) {
            console.error('Error setting up WebSocket listeners:', error);
        }
    }

    // Menangani pembaruan tabel yang sudah ada
    handleTableUpdate(tableData) {
        try {
            if (!tableData || !tableData.id) {
                console.error('Invalid table update data');
                return;
            }
            
            // Cari tabel yang akan diperbarui
            const tableIndex = this.tables.findIndex(table => table.id === tableData.id);
            
            if (tableIndex !== -1) {
                // Perbarui data tabel
                this.tables[tableIndex] = tableData;
                
                // Perbarui UI
                this.updateTablesGrid();
                
                // Tambahkan efek highlight pada tabel yang diperbarui
                const tableCard = document.querySelector(`.table-card[data-table-id="${tableData.id}"]`);
                if (tableCard) {
                    tableCard.classList.add('table-card-highlight');
                    
                    // Hapus kelas animasi setelah animasi selesai
                    setTimeout(() => {
                        tableCard.classList.remove('table-card-highlight');
                    }, 2000);
                }
                
                // Tampilkan notifikasi
                this.showNotification(`Table ${tableData.number || tableData.id} updated`, 'success');
            } else {
                // Jika tabel tidak ditemukan, muat ulang semua tabel
                console.log('Table not found in cache, reloading all tables');
                this.loadTables();
            }
        } catch (error) {
            console.error('Error handling table update:', error);
        }
    }

    // Menangani tabel baru yang dibuat
    handleTableCreate(tableData) {
        try {
            if (!tableData || !tableData.id) {
                console.error('Invalid table create data');
                return;
            }
            
            // Cek apakah tabel sudah ada dalam cache
            const existingTableIndex = this.tables.findIndex(table => table.id === tableData.id);
            
            if (existingTableIndex === -1) {
                // Tambahkan tabel baru ke array
                this.tables.push(tableData);
                
                // Perbarui UI
                this.updateTablesGrid();
                
                // Tampilkan notifikasi
                this.showNotification(`New table ${tableData.number || tableData.id} added`, 'success');
            } else {
                // Jika tabel sudah ada, perbarui saja
                this.tables[existingTableIndex] = tableData;
                this.updateTablesGrid();
            }
        } catch (error) {
            console.error('Error handling table create:', error);
        }
    }

    // Menangani tabel yang dihapus
    handleTableDelete(tableData) {
        try {
            if (!tableData || !tableData.id) {
                console.error('Invalid table delete data');
                return;
            }
            
            // Cari tabel yang akan dihapus
            const tableIndex = this.tables.findIndex(table => table.id === tableData.id);
            
            if (tableIndex !== -1) {
                // Tambahkan efek animasi fade-out sebelum menghapus
                const tableCard = document.querySelector(`.table-card[data-table-id="${tableData.id}"]`);
                if (tableCard) {
                    tableCard.classList.add('table-card-delete');
                    
                    // Hapus tabel dari DOM dan array setelah animasi selesai
                    setTimeout(() => {
                        // Hapus dari array
                        this.tables.splice(tableIndex, 1);
                        
                        // Perbarui UI
                        this.updateTablesGrid();
                    }, 500); // Sesuaikan dengan durasi animasi di CSS
                    
                    // Tampilkan notifikasi
                    this.showNotification(`Table ${tableData.number || tableData.id} removed`, 'info');
                    
                    return; // Keluar dari fungsi, karena pembaruan UI akan dilakukan setelah animasi selesai
                }
            }
            
            // Jika tidak ada animasi (atau elemen tidak ditemukan), hapus langsung
            if (tableIndex !== -1) {
                this.tables.splice(tableIndex, 1);
                this.updateTablesGrid();
                this.showNotification(`Table ${tableData.number || tableData.id} removed`, 'info');
            }
        } catch (error) {
            console.error('Error handling table delete:', error);
        }
    }

    async updateTableStatus(tableId, status) {
        try {
            const token = localStorage.getItem('token');

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