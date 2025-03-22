class DashboardPage {
    constructor() {
        this.popularItems = [];
        this.recentOrders = [];
        this.currentFilter = 'all';

        // Bind methods
        this.loadData = this.loadData.bind(this);
        this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
        this.startPreparingItem = this.startPreparingItem.bind(this);
        this.markItemAsReady = this.markItemAsReady.bind(this);
        this.showOrderDetails = this.showOrderDetails.bind(this);
        this.render = this.render.bind(this);
    }

    async loadData() {
        try {
            // Fetch kitchen display data
            const response = await fetch('http://localhost:8080/admin/kitchen/display', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.status && data.data && Array.isArray(data.data)) {
                // Transform data to ensure order_items is always an array
                this.recentOrders = data.data.map(order => ({
                    ...order,
                    order_items: Array.isArray(order.order_items) ? order.order_items : []
                }));
                
                // Analyze popular items
                this.analyzePopularItems();
                
                // Update ready filter count
                this.updateReadyFilterCount();
                
                // Render the updated data
                this.render();
            } else {
                console.error('Invalid data format from API:', data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    analyzePopularItems() {
        // Group by menu items
        const menuCounts = {};
        
        if (!this.recentOrders || !Array.isArray(this.recentOrders) || this.recentOrders.length === 0) {
            console.log('No orders to analyze');
            this.popularItems = [];
            return;
        }
        
        // Periksa status keseluruhan pesanan untuk setiap meja
        const tableOrderStatuses = {};
        this.recentOrders.forEach(order => {
            const tableKey = order.table?.number || order.table_id;
            if (!tableKey) return;
            
            if (!tableOrderStatuses[tableKey]) {
                tableOrderStatuses[tableKey] = {
                    allCompleted: true,
                    orderIds: []
                };
            }
            
            // Jika ada pesanan yang belum ready, tandai meja ini sebagai belum selesai
            if (order.status !== 'ready' || !order.order_items.every(item => item.status === 'ready')) {
                tableOrderStatuses[tableKey].allCompleted = false;
            }
            
            tableOrderStatuses[tableKey].orderIds.push(order.id);
        });
        
        // Get only orders that are pending or in progress
        const activeOrders = this.recentOrders.filter(order => 
            order && ['paid', 'pending', 'pending_payment', 'in_progress'].includes(order.status));
            
        activeOrders.forEach(order => {
            // Make sure order_items exists and is an array
            if (!order.order_items || !Array.isArray(order.order_items)) {
                console.log('Order has no items:', order);
                return;
            }
            
            // Skip if all orders for this table are completed
            const tableKey = order.table?.number || order.table_id;
            if (tableKey && tableOrderStatuses[tableKey]?.allCompleted) {
                return;
            }
            
            order.order_items.forEach(item => {
                // Validate item and Menu
                if (!item || !item.menu) {
                    console.log('Invalid item:', item);
                    return;
                }
                
                const menuId = item.menu.ID || item.menu.id; // Handle both cases
                
                if (!menuCounts[menuId]) {
                    menuCounts[menuId] = {
                        id: menuId,
                        name: item.menu.name,
                        count: 0,
                        orders: []
                    };
                }
                
                menuCounts[menuId].count += item.quantity;
                menuCounts[menuId].orders.push({
                    orderId: order.id,
                    table: order.table && order.table.number ? order.table.number : `${order.table_id || 'Unknown'}`,
                    tableNumeric: parseInt(order.table && order.table.number ? order.table.number : order.table_id) || 999,
                    itemId: item.id,
                    quantity: item.quantity,
                    status: item.status === 'in_progress' ? 'preparing' : item.status,
                    notes: item.notes,
                    created_at: order.created_at,
                    allItemsReady: order.order_items.every(i => i.status === 'ready'),
                    tableAllCompleted: tableOrderStatuses[tableKey]?.allCompleted || false
                });
            });
        });
        
        // Juga sertakan pesanan yang ready, tapi hanya tampilkan di bagian bawah
        // dan jangan tampilkan jika semua pesanan meja tersebut sudah selesai
        const readyOrders = this.recentOrders.filter(order => 
            order && order.status === 'ready' && !order.order_items.every(i => i.status === 'ready'));
            
        readyOrders.forEach(order => {
            if (!order.order_items || !Array.isArray(order.order_items)) {
                return;
            }
            
            // Skip if all orders for this table are completed
            const tableKey = order.table?.number || order.table_id;
            if (tableKey && tableOrderStatuses[tableKey]?.allCompleted) {
                return;
            }
            
            order.order_items.forEach(item => {
                if (!item || !item.menu) {
                    return;
                }
                
                const menuId = item.menu.ID || item.menu.id;
                
                if (!menuCounts[menuId]) {
                    menuCounts[menuId] = {
                        id: menuId,
                        name: item.menu.name,
                        count: 0,
                        orders: []
                    };
                }
                
                // Hanya tambahkan item yang belum ready
                if (item.status !== 'ready') {
                    menuCounts[menuId].count += item.quantity;
                    menuCounts[menuId].orders.push({
                        orderId: order.id,
                        table: order.table && order.table.number ? order.table.number : `${order.table_id || 'Unknown'}`,
                        tableNumeric: parseInt(order.table && order.table.number ? order.table.number : order.table_id) || 999,
                        itemId: item.id,
                        quantity: item.quantity,
                        status: item.status === 'in_progress' ? 'preparing' : item.status,
                        notes: item.notes,
                        created_at: order.created_at,
                        allItemsReady: false,
                        tableAllCompleted: tableOrderStatuses[tableKey]?.allCompleted || false
                    });
                }
            });
        });
        
        // Sort each menu's orders by:
        // 1. Status (pending/preparing first, ready last)
        // 2. Table number (ascending)
        // 3. Creation time (earliest first)
        Object.values(menuCounts).forEach(menu => {
            // Filter out items from tables where everything is completed
            menu.orders = menu.orders.filter(order => !order.tableAllCompleted);
            
            menu.orders.sort((a, b) => {
                // Jika salah satu pesanan memiliki allItemsReady true, pindahkan ke bawah
                if (a.allItemsReady && !b.allItemsReady) return 1;
                if (!a.allItemsReady && b.allItemsReady) return -1;
                
                // First sort by status
                const statusPriority = { 'pending': 0, 'preparing': 1, 'ready': 2 };
                const statusCompare = statusPriority[a.status] - statusPriority[b.status];
                
                if (statusCompare !== 0) return statusCompare;
                
                // Then by table number (numeric)
                const tableCompare = a.tableNumeric - b.tableNumeric;
                if (tableCompare !== 0) return tableCompare;
                
                // Then by creation time (earliest first)
                return new Date(a.created_at) - new Date(b.created_at);
            });
        });
        
        // Convert to array and sort by most ordered items
        this.popularItems = Object.values(menuCounts)
            .filter(item => item.orders.length > 0) // Hanya tampilkan menu yang masih memiliki pesanan
            .sort((a, b) => b.count - a.count);
    }
    
    handleWebSocketMessage(event) {
        try {
            const message = event.detail;
            console.log('WebSocket message:', message);
            
            if (message && message.event === 'order_update' && message.data) {
                // Refresh data instead of trying to update local state
                this.loadData();
                
                // Show notification
                if (window.notificationManager) {
                    const status = this.translateStatus(message.data.status);
                    let notifMessage = '';
                    
                    if (message.data.table && message.data.table.number) {
                        notifMessage = `Pesanan Meja ${message.data.table.number} ${status}`;
                    } else if (message.data.table_id) {
                        notifMessage = `Pesanan Meja ${message.data.table_id} ${status}`;
                    } else {
                        notifMessage = `Pesanan #${message.data.id} ${status}`;
                    }
                    
                    window.notificationManager.addNotification({
                        title: 'Update Pesanan',
                        message: notifMessage,
                        type: 'order'
                    });
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            // Don't rethrow the error, just log it
        }
    }
    
    getFilteredOrders() {
        if (!this.recentOrders || !Array.isArray(this.recentOrders)) {
            return [];
        }

        // Filter out completed orders dan proses sesuai tab aktif
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik
        
        // Base filter - selalu filter pesanan 'completed'
        let filteredOrders = this.recentOrders.filter(order => order && order.status !== 'completed');
        
        // Filter khusus sesuai tab yang aktif
        if (this.currentFilter !== 'all') {
            const statusMap = {
                'pending': ['paid', 'pending_payment', 'pending'],
                'preparing': ['in_progress'],
                'ready': ['ready']
            };
            
            filteredOrders = filteredOrders.filter(order => {
                // Untuk tab "Siap", pastikan pesanan ready tampil dan tetap ada selama 24 jam
                if (this.currentFilter === 'ready') {
                    // Periksa jika pesanan ready dan masih dalam rentang 24 jam
                    if (order.status === 'ready') {
                        const orderDate = new Date(order.updated_at || order.created_at);
                        return (now - orderDate) < oneDay;
                    }
                    return false;
                }
                
                // Untuk tab lain, filter berdasarkan statusMap
                return statusMap[this.currentFilter]?.includes(order.status);
            });
        }

        // Sorting berdasarkan prioritas:
        // 1. Status (pending > in_progress > ready)
        // 2. Nomor meja (ascending)
        // 3. Waktu pemesanan (earliest first)
        return filteredOrders.sort((a, b) => {
            // Sort by status priority
            const statusPriority = {
                'paid': 0,
                'pending': 0,
                'pending_payment': 0,
                'in_progress': 1,
                'ready': 2
            };
            
            const statusCompare = (statusPriority[a.status] || 0) - (statusPriority[b.status] || 0);
            if (statusCompare !== 0) return statusCompare;
            
            // Then by table number (numeric)
            const tableANum = parseInt(a.table?.number || a.table_id) || 0;
            const tableBNum = parseInt(b.table?.number || b.table_id) || 0;
            const tableCompare = tableANum - tableBNum;
            if (tableCompare !== 0) return tableCompare;
            
            // Then by created_at (earliest first)
            return new Date(a.created_at) - new Date(b.created_at);
        });
    }
    
    async startPreparingItem(itemId, orderId, event) {
        // Hentikan event propagation untuk mencegah event bubbling
        if (event) {
            event.stopPropagation();
        }
        
        try {
            // Disable tombol sementara untuk mencegah double-click
            const targetBtn = event?.target.closest('button');
            if (targetBtn) {
                targetBtn.disabled = true;
                targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            const response = await fetch(`http://localhost:8080/admin/order-items/${itemId}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to update item status');
            }
            
            // Refresh data
            this.loadData();
        } catch (error) {
            console.error('Error updating item:', error);
            // Re-enable button jika terjadi error
            if (targetBtn) {
                targetBtn.disabled = false;
                targetBtn.innerHTML = '<i class="fas fa-fire"></i>';
            }
        }
    }
    
    async markItemAsReady(itemId, orderId, event) {
        // Hentikan event propagation untuk mencegah event bubbling
        if (event) {
            event.stopPropagation();
        }
        
        try {
            // Disable tombol sementara untuk mencegah double-click
            const targetBtn = event?.target.closest('button');
            if (targetBtn) {
                targetBtn.disabled = true;
                targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            // Animasi elemen sebelum dihapus
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (itemElement) {
                itemElement.classList.add('item-complete-animation');
                await this.delay(300); // Tunggu animasi selesai
            }
            
            // Cek order saat ini untuk menentukan apakah ini item terakhir dari order
            const currentOrder = this.recentOrders.find(order => order.id === orderId);
            const isLastItemInOrder = currentOrder && 
                currentOrder.order_items.filter(item => item.status !== 'ready').length === 1 && 
                currentOrder.order_items.find(item => item.id === itemId);
            
            // Cek jumlah pesanan aktif pada meja ini
            const tableId = currentOrder?.table?.number || currentOrder?.table_id;
            const activeOrdersForTable = tableId ? this.recentOrders.filter(order => 
                (order.table?.number || order.table_id) === tableId && 
                (order.status !== 'ready' || !order.order_items.every(item => item.status === 'ready'))
            ) : [];
            
            // Jika ini item terakhir dari pesanan dan tidak ada pesanan lain di meja ini, refresh semua data
            const isLastItemForTable = isLastItemInOrder && activeOrdersForTable.length === 1;
            
            const response = await fetch(`http://localhost:8080/admin/order-items/${itemId}/finish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to update item status');
            }
            
            // Jika ini item terakhir dari meja, lewati delay untuk refresh data
            if (isLastItemForTable) {
                const tableElements = document.querySelectorAll(`[data-table-id="${tableId}"]`);
                tableElements.forEach(el => {
                    el.classList.add('order-complete-animation');
                });
                await this.delay(500);
            }
            
            // Refresh data
            this.loadData();
        } catch (error) {
            console.error('Error updating item:', error);
            // Re-enable button jika terjadi error
            if (targetBtn) {
                targetBtn.disabled = false;
                targetBtn.innerHTML = '<i class="fas fa-check"></i>';
            }
        }
    }
    
    async startPreparingAll(orderId, event) {
        // Hentikan event propagation untuk mencegah event bubbling
        if (event) {
            event.stopPropagation();
        }
        
        try {
            // Disable tombol sementara
            const targetBtn = event?.target.closest('button');
            if (targetBtn) {
                targetBtn.disabled = true;
                targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}/start-cooking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to update order status');
            }
            
            // Refresh data
            this.loadData();
        } catch (error) {
            console.error('Error updating order:', error);
            // Re-enable button jika terjadi error
            if (targetBtn) {
                targetBtn.disabled = false;
                targetBtn.innerHTML = '<i class="fas fa-fire"></i>';
            }
        }
    }
    
    async markAllAsReady(orderId, event) {
        // Hentikan event propagation untuk mencegah event bubbling
        if (event) {
            event.stopPropagation();
        }
        
        try {
            // Disable tombol sementara
            const targetBtn = event?.target.closest('button');
            if (targetBtn) {
                targetBtn.disabled = true;
                targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            // Simpan filter saat ini
            const currentFilter = this.currentFilter;
            
            // Cek order saat ini untuk menentukan apakah ini order terakhir dari meja
            const currentOrder = this.recentOrders.find(order => order.id === orderId);
            const tableId = currentOrder?.table?.number || currentOrder?.table_id;
            
            // Jika ada order lain di meja yang sama, cek apakah ini yang terakhir
            const activeOrdersForTable = tableId ? this.recentOrders.filter(order => 
                (order.table?.number || order.table_id) === tableId && 
                (order.id !== orderId && (order.status !== 'ready' || !order.order_items.every(item => item.status === 'ready')))
            ) : [];
            
            const isLastOrderForTable = activeOrdersForTable.length === 0;
            
            // Jika kita berada di tab selain "Siap", simpan orderId untuk peralihan
            if (currentFilter !== 'ready') {
                // Tambahkan class pada order row untuk highlight saja
                const orderRow = document.querySelector(`tr[data-order-id="${orderId}"]`);
                if (orderRow) {
                    orderRow.classList.add('new-completed');
                    await this.delay(500);
                }
            } else {
                // Jika kita berada di tab "Siap" langsung, pindah ke tab "Semua" agar pesanan tidak hilang
                this.setFilter('all');
                
                // Tunggu tampilan di-render ulang
                await this.delay(100);
                
                // Temukan dan highlight row
                const orderRow = document.querySelector(`tr[data-order-id="${orderId}"]`);
                if (orderRow) {
                    orderRow.classList.add('new-completed');
                    await this.delay(500);
                }
            }
            
            // Jika ini order terakhir dari meja, berikan animasi pada semua elemen terkait
            if (isLastOrderForTable) {
                const tableElements = document.querySelectorAll(`[data-table-id="${tableId}"]`);
                tableElements.forEach(el => {
                    el.classList.add('order-complete-animation');
                });
                await this.delay(500);
            }
            
            const response = await fetch(`http://localhost:8080/admin/orders/${orderId}/finish-cooking`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to update order status');
            }
            
            // Refresh data
            await this.loadData();
        } catch (error) {
            console.error('Error updating order:', error);
            // Re-enable button jika terjadi error
            if (targetBtn) {
                targetBtn.disabled = false;
                targetBtn.innerHTML = '<i class="fas fa-check"></i>';
            }
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.render();
        
        // Simpan filter yang dipilih di localStorage
        localStorage.setItem('chef_dashboard_filter', filter);
    }
    
    updateReadyFilterCount() {
        // Menghitung jumlah pesanan siap dalam 24 jam
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik
        
        const readyCount = this.recentOrders.filter(order => {
            if (!order || order.status !== 'ready') return false;
            
            // Cek apakah order kurang dari 24 jam
            const orderDate = new Date(order.updated_at || order.created_at);
            return (now - orderDate) < oneDay;
        }).length;
        
        // Update atribut pada tombol filter
        const readyFilterBtn = document.querySelector('.filter-btn[onclick*="\'ready\'"]');
        if (readyFilterBtn) {
            readyFilterBtn.setAttribute('data-count', readyCount);
            readyFilterBtn.style.display = readyCount > 0 ? 'block' : 'block';
        }
    }
    
    showOrderDetails(orderId, event) {
        // Hentikan event propagation untuk mencegah event bubbling
        if (event) {
            event.stopPropagation();
        }
        
        // Cari order berdasarkan ID
        const order = this.recentOrders.find(o => o.id === orderId);
        if (!order) {
            console.error('Order not found:', orderId);
            return;
        }
        
        // Dapatkan informasi chef
        const currentUserId = this.getCurrentUserId();
        const chefId = order.chef_id;
        const isHandledByCurrentChef = chefId === currentUserId;
        const isHandledByOtherChef = chefId && chefId !== currentUserId;
        const chefName = this.getChefName(order);
        
        // Get customer name or fallback
        const customerName = order.customer && order.customer.name ? order.customer.name : `Pelanggan #${order.customer_id}`;
        
        // Make sure Table exists and has a number
        const tableNumber = order.table && order.table.number ? order.table.number : order.table_id;
        
        // Group similar items
        const groupedItems = this.groupSimilarItems(order.order_items);
        
        // Calculate order progress
        const progress = this.calculateOrderProgress(order);
        
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content details-modal">
                <div class="modal-header">
                    <h3>Detail Pesanan #${order.id} - Meja ${tableNumber}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="order-summary">
                        <div class="order-meta">
                            <div class="meta-item">
                                <i class="fas fa-table"></i>
                                <span>Meja ${tableNumber}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-user"></i>
                                <span>${customerName}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${this.formatTime(order.created_at)}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-info-circle"></i>
                                <span class="status status-${order.status === 'in_progress' ? 'preparing' : order.status}">
                                    ${this.translateStatus(order.status)}
                                </span>
                            </div>
                            ${chefName !== '-' ? `
                            <div class="meta-item">
                                <i class="fas fa-utensils"></i>
                                <span class="chef-name ${isHandledByCurrentChef ? 'my-chef' : isHandledByOtherChef ? 'other-chef' : ''}">
                                    ${chefName}
                                </span>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="order-progress">
                            <div class="progress-text">Progress: ${progress}%</div>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <h4>Menu Pesanan</h4>
                    <div class="items-grid">
                        ${groupedItems.map(item => `
                            <div class="item-card ${item.allReady ? 'ready' : item.anyInProgress ? 'preparing' : 'pending'}">
                                <div class="item-header">
                                    <div>
                                        <span class="item-name">${item.menu_name}</span>
                                        <span class="item-quantity">${item.quantity}x</span>
                                    </div>
                                    ${item.allReady ? 
                                        `<div class="item-completed"><i class="fas fa-check-circle"></i> Selesai</div>` : 
                                        item.anyInProgress ? 
                                        `<div class="item-status">Sedang dimasak</div>` : 
                                        `<div class="item-status">Menunggu</div>`
                                    }
                                </div>
                                ${item.notes ? `
                                    <div class="item-notes">
                                        <i class="fas fa-sticky-note"></i>
                                        <span>${item.notes}</span>
                                    </div>
                                ` : ''}
                                ${!item.allReady ? `
                                    <div class="item-status-row">
                                        <div class="item-status-text">
                                            ${item.anyInProgress ? 'Sedang dimasak' : 'Menunggu dimasak'}
                                        </div>
                                        <div class="item-actions">
                                            ${!isHandledByOtherChef && (item.status === 'pending' || item.status === 'paid') ? `
                                                <button class="btn btn-sm btn-primary" onclick="window.dashboardPage.startPreparingItem('${item.id}', ${order.id}, event)">
                                                    <i class="fas fa-fire"></i> Mulai
                                                </button>
                                            ` : item.status === 'in_progress' && !isHandledByOtherChef ? `
                                                <button class="btn btn-sm btn-success" onclick="window.dashboardPage.markItemAsReady('${item.id}', ${order.id}, event)">
                                                    <i class="fas fa-check"></i> Selesai
                                                </button>
                                            ` : isHandledByOtherChef ? `
                                                <span class="order-locked-badge">
                                                    <i class="fas fa-lock"></i> Ditangani chef lain
                                                </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Tutup
                    </button>
                    ${!isHandledByOtherChef && order.status === 'paid' ? `
                        <button class="btn btn-primary" onclick="window.dashboardPage.startPreparingAll(${order.id}, event)">
                            <i class="fas fa-fire"></i> Mulai Semua
                        </button>
                    ` : order.status === 'in_progress' && !isHandledByOtherChef ? `
                        <button class="btn btn-success" onclick="window.dashboardPage.markAllAsReady(${order.id}, event)">
                            <i class="fas fa-check"></i> Selesai Semua
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
        });
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) {
            return 'Baru saja';
        } else if (diff < 3600) {
            const minutes = Math.floor(diff / 60);
            return `${minutes} menit yang lalu`;
        } else if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            return `${hours} jam yang lalu`;
        } else {
            const days = Math.floor(diff / 86400);
            return `${days} hari yang lalu`;
        }
    }
    
    getStatusClass(status) {
        const statusMap = {
            'pending': 'status-pending',
            'paid': 'status-pending',
            'preparing': 'status-preparing',
            'in_progress': 'status-preparing',
            'ready': 'status-ready',
            'completed': 'status-ready'
        };
        
        return statusMap[status] || '';
    }
    
    translateStatus(status) {
        const statusMap = {
            'pending': 'Menunggu',
            'paid': 'Menunggu',
            'preparing': 'Diproses',
            'in_progress': 'Diproses',
            'ready': 'Siap',
            'completed': 'Selesai'
        };
        
        return statusMap[status] || status;
    }
    
    calculateOrderProgress(order) {
        if (!order || !order.order_items) {
            return 0;
        }
        const totalItems = order.order_items.length;
        const completedItems = order.order_items.filter(item => item.status === 'ready').length;
        return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    }
    
    groupSimilarItems(items) {
        if (!items || !Array.isArray(items)) return [];
        
        const groups = {};
        
        // Group items by menu
        items.forEach(item => {
            if (!item || !item.menu) return;
            
            const menuId = item.menu.ID || item.menu.id;
            const menuName = item.menu.name;
            
            if (!groups[menuId]) {
                groups[menuId] = {
                    id: item.id, // Use first item's ID
                    menu_id: menuId,
                    menu_name: menuName,
                    quantity: 0,
                    status: 'pending',
                    items: [],
                    notes: null,
                    hasNotes: false,
                    allReady: true,
                    anyInProgress: false
                };
            }
            
            // Track if all items are ready
            if (item.status !== 'ready') {
                groups[menuId].allReady = false;
            }
            
            // Track if any items are in progress
            if (item.status === 'in_progress') {
                groups[menuId].anyInProgress = true;
                groups[menuId].status = 'in_progress';
            }
            
            // If first item was pending but this is in_progress, update group status
            if (groups[menuId].status === 'pending' && item.status === 'in_progress') {
                groups[menuId].status = 'in_progress';
            }
            
            // Keep track of notes
            if (item.notes && item.notes.trim() !== '') {
                groups[menuId].hasNotes = true;
                if (!groups[menuId].notes) {
                    groups[menuId].notes = item.notes;
                }
            }
            
            groups[menuId].quantity += item.quantity;
            groups[menuId].items.push(item);
        });
        
        return Object.values(groups);
    }
    
    showOrderItemNotes(orderId, event) {
        // Hentikan event propagation jika ada
        if (event) {
            event.stopPropagation();
        }
        
        const order = this.recentOrders.find(o => o.id === orderId);
        if (!order || !order.order_items) {
            console.error('Order not found or has no items:', orderId);
            return;
        }

        // Collect all notes from items
        const notesItems = order.order_items.filter(item => item.notes && item.notes.trim() !== '');
        
        if (notesItems.length === 0) {
            console.log('No notes found for order:', orderId);
            return;
        }

        // Get table number safely
        const tableNumber = order.table && order.table.number ? order.table.number : order.table_id;

        const notesHtml = notesItems.map(item => `
            <div class="note-item">
                <div class="note-item-header">
                    <strong>${item.menu.name}</strong> <span class="quantity-badge">x${item.quantity}</span>
                </div>
                <p class="note-content">${item.notes}</p>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.className = 'notes-modal';
        modal.innerHTML = `
            <div class="notes-modal-content">
                <div class="notes-modal-header">
                    <h4>Catatan Pesanan Meja ${tableNumber} #${order.id}</h4>
                    <button class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notes-modal-body">
                    <div class="notes-collection">
                        ${notesHtml}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close modal
        const closeModal = (e) => {
            if (e) e.stopPropagation();
            modal.classList.add('fade-out');
            setTimeout(() => {
            modal.remove();
            }, 300);
        };

        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(e);
        });

        // Add fade-in animation and then show
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    render() {
        // Get target container
        const container = document.getElementById('content');
        if (!container) return;
        
        // Debug log untuk melihat data orders
        console.log('Rendering orders:', this.recentOrders);
        
        // Hitung jumlah pesanan ready
        const readyCount = this.getFilteredOrders().filter(order => 
            order && order.status === 'ready').length;
        
        container.innerHTML = `
                <div class="dashboard">
                <div class="popular-items-container">
                    <div class="section-header">
                        <div>
                            <h2>List Order By Menu</h2>
                            <div class="section-subtitle">Daftar Menu Pesanan (diurutkan berdasarkan waktu dan nomor meja)</div>
                        </div>
                    </div>
                    
                    <div class="popular-items-grid">
                        ${this.popularItems.map((item, index) => {
                            // Pisahkan pesanan menjadi dua grup: yang masih aktif dan yang semua item sudah ready
                            const activeOrders = item.orders.filter(order => !order.allItemsReady);
                            const completedOrders = item.orders.filter(order => order.allItemsReady);
                            
                            return `
                            <div class="popular-item-card animate-in" style="animation-delay: ${index * 0.05}s">
                                <div class="popular-item-header">
                                    <h3>${item.name}</h3>
                                    <span class="popular-item-count">${item.count}x</span>
                                </div>
                                <div class="orders-for-item">
                                    ${activeOrders.map((order, orderIndex) => `
                                        <div class="order-for-item ${order.status} animate-fade-in" 
                                             data-item-id="${order.itemId}"
                                             data-order-id="${order.orderId}"
                                             data-table-id="${order.table}"
                                             style="animation-delay: ${(index * 0.05) + (orderIndex * 0.02)}s">
                                            <div class="order-item-info">
                                                <span class="table-tag">Meja ${order.table}</span>
                                                <span class="order-id-tag">#${order.orderId}</span>
                                                ${order.notes ? `<span class="notes-tag" onclick="window.dashboardPage.showOrderItemNotes(${order.orderId}, event)" title="Klik untuk lihat catatan"><i class="fas fa-sticky-note"></i></span>` : ''}
                        </div>
                                            <div class="order-item-actions">
                                                <span class="quantity-tag">${order.quantity}x</span>
                                                ${order.status === 'pending' ? `
                                                    <button class="mini-btn prepare" onclick="window.dashboardPage.startPreparingItem('${order.itemId}', ${order.orderId}, event)">
                            <i class="fas fa-fire"></i>
                                                    </button>
                                                ` : order.status === 'preparing' ? `
                                                    <button class="mini-btn ready" onclick="window.dashboardPage.markItemAsReady('${order.itemId}', ${order.orderId}, event)">
                                                        <i class="fas fa-check"></i>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `).join('')}
                                    
                                    ${completedOrders.length > 0 ? `
                                        <div class="completed-orders-divider">
                                            <span>Pesanan yang sudah siap</span>
                                        </div>
                                        ${completedOrders.map((order, orderIndex) => `
                                            <div class="order-for-item ready animate-fade-in dimmed" 
                                                 data-item-id="${order.itemId}"
                                                 data-order-id="${order.orderId}"
                                                 data-table-id="${order.table}">
                                                <div class="order-item-info">
                                                    <span class="table-tag">Meja ${order.table}</span>
                                                    <span class="order-id-tag">#${order.orderId}</span>
                                                    ${order.notes ? `<span class="notes-tag" onclick="window.dashboardPage.showOrderItemNotes(${order.orderId}, event)" title="Klik untuk lihat catatan"><i class="fas fa-sticky-note"></i></span>` : ''}
                                                </div>
                                                <div class="order-item-actions">
                                                    <span class="quantity-tag">${order.quantity}x</span>
                                                    <span class="completed-badge"><i class="fas fa-check-circle"></i></span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    ` : ''}
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>
                
                <div class="recent-orders">
                    <div class="section-header">
                        <div>
                            <h2>Daftar Pesanan Meja</h2>
                            <div class="section-subtitle">
                                ${this.currentFilter === 'ready' 
                                    ? 'Daftar pesanan yang sudah siap disajikan (24 jam terakhir)' 
                                    : 'Daftar pesanan terbaru yang perlu disiapkan (diurutkan berdasarkan waktu dan nomor meja)'}
                            </div>
                        </div>
                        
                        <div class="filter-buttons">
                            <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="window.dashboardPage.setFilter('all')">
                                Semua
                            </button>
                            <button class="filter-btn ${this.currentFilter === 'pending' ? 'active' : ''}" onclick="window.dashboardPage.setFilter('pending')">
                                Menunggu
                            </button>
                            <button class="filter-btn ${this.currentFilter === 'preparing' ? 'active' : ''}" onclick="window.dashboardPage.setFilter('preparing')">
                                Diproses
                            </button>
                            <button class="filter-btn ${this.currentFilter === 'ready' ? 'active' : ''}" 
                                    onclick="window.dashboardPage.setFilter('ready')"
                                    data-count="${readyCount}">
                                Siap
                            </button>
                        </div>
                    </div>

                    <div class="orders-table">
                                <table>
                                    <thead>
                                        <tr>
                                    <th>ID</th>
                                    <th>Meja</th>
                                            <th>Waktu</th>
                                            <th>Status</th>
                                    <th>Items</th>
                                    <th>Chef</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                ${this.getFilteredOrders().length > 0 ? this.getFilteredOrders().map((order, index) => {
                                    if (!order.order_items) {
                                        console.log('Order without items:', order);
                                        return '';
                                    }
                                    const progress = this.calculateOrderProgress(order);
                                    const isReady = order.status === 'ready';
                                    
                                    // Group items dengan nama yang sama
                                    const groupedItems = this.groupSimilarItems(order.order_items);
                                    
                                    // Cek status semua item
                                    const allItemsReady = order.order_items.every(item => item.status === 'ready');
                                    
                                    // Determine chef status
                                    const chefId = order.chef_id;
                                    const isHandledByCurrentChef = chefId === this.getCurrentUserId();
                                    const isHandledByOtherChef = chefId && chefId !== this.getCurrentUserId();
                                    const chefName = this.getChefName(order);
                                    
                                    return `
                                        <tr class="order-row ${order.status === 'in_progress' ? 'preparing' : order.status} animate-in" 
                                            data-order-id="${order.id}"
                                            data-table-id="${order.table && order.table.number ? order.table.number : order.table_id}"
                                            style="animation-delay: ${index * 0.05}s">
                                            <td>#${order.id}</td>
                                            <td>
                                                <div class="table-number">
                                                    <i class="fas fa-table"></i>
                                                    <span>Meja ${order.table && order.table.number ? order.table.number : order.table_id}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="order-time">
                                                    <span class="time">${this.formatTime(order.created_at)}</span>
                                                    <span class="time-ago">${this.getTimeAgo(isReady ? (order.updated_at || order.created_at) : order.created_at)}</span>
                                                </div>
                                                </td>
                                                <td>
                                                <span class="status status-${order.status === 'in_progress' ? 'preparing' : order.status}">
                                                    ${this.translateStatus(order.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                <div class="order-menu-list">
                                                    ${groupedItems.map(item => `
                                                        <div class="menu-group ${item.allReady ? 'ready' : ''}">
                                                            <span class="menu-count">${item.quantity}x</span>
                                                            <span class="menu-name">${item.menu_name}</span>
                                                            ${item.allReady ? '<span class="menu-ready-badge"><i class="fas fa-check"></i></span>' : ''}
                                                            ${item.hasNotes ? '<span class="notes-tag small" onclick="window.dashboardPage.showOrderItemNotes(' + order.id + ', event)" title="Klik untuk lihat catatan"><i class="fas fa-sticky-note"></i></span>' : ''}
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="chef-status-badge ${isHandledByOtherChef ? 'other-chef' : isHandledByCurrentChef ? 'my-chef' : ''}">
                                                    ${chefName !== '-' ? `<i class="fas fa-utensils"></i> ${chefName}` : '-'}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="table-actions">
                                                    ${order.status === 'paid' || order.status === 'pending' || order.status === 'pending_payment' ? `
                                                        ${isHandledByOtherChef ? `
                                                            <span class="order-locked-badge" title="Pesanan sedang ditangani chef lain">
                                                                <i class="fas fa-lock"></i> Ditangani chef lain
                                                            </span>
                                                        ` : `
                                                            <button class="btn-action prepare" onclick="window.dashboardPage.startPreparingAll(${order.id}, event)" title="Mulai masak semua">
                                                                <i class="fas fa-fire"></i>
                                                        </button>
                                                        `}
                                                    ` : order.status === 'in_progress' && !allItemsReady ? `
                                                        ${isHandledByCurrentChef || !isHandledByOtherChef ? `
                                                            <button class="btn-action ready" onclick="window.dashboardPage.markAllAsReady(${order.id}, event)" title="Tandai semua siap">
                                                                <i class="fas fa-check"></i>
                                                        </button>
                                                        ` : `
                                                            <span class="order-locked-badge" title="Pesanan sedang ditangani chef lain">
                                                                <i class="fas fa-lock"></i> Ditangani chef lain
                                                            </span>
                                                        `}
                                                    ` : ''}
                                                    <button class="btn-view" onclick="window.dashboardPage.showOrderDetails(${order.id}, event)">
                                                        <i class="fas fa-eye"></i>
                                                        <span>Detail</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="7" class="no-orders">
                                            <div class="no-data-message">
                                                <i class="fas fa-utensils"></i>
                                                <h3>Belum ada pesanan</h3>
                                                <p>Pesanan yang diterima akan muncul di sini</p>
                                            </div>
                                                </td>
                                            </tr>
                                `}
                                    </tbody>
                                </table>
                    </div>
                </div>
                </div>
            `;
        
        // Update filter counter setelah render
        this.updateReadyFilterCount();
    }
    
    async onMount() {
        // Load initial data
        await this.loadData();
        
        // Connect to WebSocket and bind the event handler
        this.boundHandleWebSocketMessage = this.handleWebSocketMessage.bind(this);
        window.addEventListener('orderUpdate', this.boundHandleWebSocketMessage);
        
        // Dapatkan filter yang tersimpan atau gunakan default
        const savedFilter = localStorage.getItem('chef_dashboard_filter') || 'all';
        this.currentFilter = savedFilter;
        this.render();
        
        // Setup auto refresh setiap 30 detik
        this.refreshInterval = setInterval(() => {
            this.loadData();
        }, 30000);
        
        // Update filter count secara berkala
        this.updateFilterInterval = setInterval(() => {
            this.updateReadyFilterCount();
        }, 10000);
    }
    
    onUnmount() {
        // Cleanup event listeners
        if (this.boundHandleWebSocketMessage) {
            window.removeEventListener('orderUpdate', this.boundHandleWebSocketMessage);
        }
        
        // Clear intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.updateFilterInterval) {
            clearInterval(this.updateFilterInterval);
        }
    }
    
    // Utility function untuk delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fungsi untuk mendapatkan data user dari token JWT
    getCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            
            // Decode token untuk mendapatkan payload
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            return {
                id: payload.user_id || null,
                name: payload.name || null,
                role: payload.role || null
            };
        } catch (error) {
            console.error('Error decoding token:', error);
            return {
                id: null,
                name: null,
                role: null
            };
        }
    }

    // Helper method untuk mendapatkan hanya user ID
    getCurrentUserId() {
        const user = this.getCurrentUser();
        return user ? user.id : null;
    }

    // Fungsi untuk mendapatkan nama chef
    getChefName(order) {
        const currentUserId = this.getCurrentUserId();
        const chefId = order.chef_id;
        
        // Jika tidak ada chef_id, tampilkan "-"
        if (!chefId) return '-';
        
        // Jika ada chef dan ada namanya, tampilkan nama chef
        if (order.chef && order.chef.name) {
            return order.chef.name;
        }
        
        // Jika tidak ada info chef tapi ada chef_id
        if (chefId === currentUserId) {
            return 'Saya';
        } else {
            return `Chef #${chefId}`;
        }
    }
}

// Initialize dashboard page
window.dashboardPage = new DashboardPage();
window.router.addRoute('dashboard', window.dashboardPage); 