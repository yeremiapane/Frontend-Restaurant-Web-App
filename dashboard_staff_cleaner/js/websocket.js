class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 seconds
        this.lastMessageTimestamp = 0;
        this.pingInterval = null;
        this.connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected'
    }

    connect() {
        if (this.connectionStatus === 'connecting') {
            console.log('Already trying to connect...');
            return;
        }
        
        this.connectionStatus = 'connecting';
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            this.connectionStatus = 'disconnected';
            window.dispatchEvent(new CustomEvent('websocketError', {
                detail: { error: 'No authentication token available' }
            }));
            return;
        }

        // URL WebSocket untuk staff
        const url = `ws://localhost:8080/ws/staff?token=${token}`;
        // console.log('Connecting to WebSocket:', url);

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('WebSocket Connected');
                this.reconnectAttempts = 0;
                this.connectionStatus = 'connected';
                this.lastMessageTimestamp = Date.now();
                
                // Subscribe to updates yang relevan untuk staff
                this.send({
                    type: 'subscribe',
                    channels: ['orders', 'tables', 'menu_updates', 'notifications']
                });

                // Start ping interval to keep connection alive
                this.startPingInterval();

                // Dispatch connected event for UI update
                window.dispatchEvent(new CustomEvent('websocketConnected', {
                    detail: { timestamp: this.lastMessageTimestamp }
                }));
                
                // Show connection toast
                this.showToast('Terhubung ke server', 'success');
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket Disconnected, code: ${event.code}, reason: ${event.reason}`);
                this.connectionStatus = 'disconnected';
                
                // Clear ping interval
                this.clearPingInterval();
                
                // Dispatch disconnected event for UI update
                window.dispatchEvent(new CustomEvent('websocketDisconnected', {
                    detail: { code: event.code, reason: event.reason }
                }));
                
                // Show disconnection toast if not attempting to reconnect
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.showToast('Terputus dari server', 'error');
                }
                
                this.reconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                this.connectionStatus = 'disconnected';
                
                window.dispatchEvent(new CustomEvent('websocketError', {
                    detail: { error }
                }));
            };

            this.ws.onmessage = (event) => {
                this.lastMessageTimestamp = Date.now();
                
                try {
                    const data = JSON.parse(event.data);
                    // console.log('Received WebSocket message:', data);
                    
                    // Handle ping/pong messages
                    if (data.type === 'pong') {
                        // console.log('Received pong from server');
                        return;
                    }
                    
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.connectionStatus = 'disconnected';
            
            window.dispatchEvent(new CustomEvent('websocketError', {
                detail: { error }
            }));
        }
    }

    handleMessage(data) {
        // console.log('Processing WebSocket message:', data);
        
        // Handle different event types
        switch (data.event) {
            // Table events
            case 'table_create':
            case 'table_update':
            case 'table_delete':
                this.handleTableEvent(data);
                break;

            // Order events
            case 'order_create':
            case 'order_update':
            case 'order_delete':
            case 'order_status_update':
            case 'order_payment_update':
            case 'order_served':
                this.handleOrderEvent(data);
                break;

            // Menu events
            case 'menu_update':
            case 'menu_create':
            case 'menu_delete':
                this.handleMenuEvent(data);
                break;

            // Notification events
            case 'staff_notification':
            case 'kitchen_notification':
            case 'system_notification':
                this.handleNotificationEvent(data);
                break;

            // Generic updates
            case 'stats_update':
                this.handleStatsUpdate(data);
                break;

            default:
                console.log('Unhandled event type:', data.event);
        }
    }

    /**
     * Menangani event terkait meja
     * @param {Object} event Data event dari WebSocket
     */
    handleTableEvent(event) {
        const type = event.type;
        const data = event.data;
        let actionType = 'unknown';
        
        // Log hanya type event untuk debugging
        // console.log(`Table event received [${type}]`);

        // Tentukan jenis action berdasarkan tipe event
        switch (type) {
            case 'table_created':
                actionType = 'create';
                break;
                
            case 'table_updated':
                actionType = 'update';
                break;
                
            case 'table_deleted':
                actionType = 'delete';
                break;
                
            case 'table_status_changed':
                actionType = 'update'; // Status update masih masuk kategori update
                break;
        }
        
        // Persiapkan data untuk dikirimkan ke listener
        let eventDetail = {
            action: actionType,
            timestamp: new Date().toISOString()
        };
        
        // Tambahkan data sesuai jenis event
        if (type === 'table_deleted') {
            eventDetail.table_id = data.id;
            eventDetail.table_number = data.table_number || data.number;
        } else {
            eventDetail.table = data;
        }
        
        // Dispatch event tableUpdate 
        const updateEvent = new CustomEvent('tableUpdate', {
            detail: eventDetail
        });
        
        window.dispatchEvent(updateEvent);
        
        // Jika meja dihapus, mungkin order terkait juga berubah
        if (type === 'table_deleted') {
            // Dispatch juga event untuk meminta reload data order
            const reloadOrdersEvent = new CustomEvent('reloadOrders', {
                detail: {
                    reason: 'table_deleted',
                    table_id: data.id
                }
            });
            window.dispatchEvent(reloadOrdersEvent);
        }
    }

    /**
     * Menangani event terkait pesanan
     * @param {Object} event Data event dari WebSocket
     */
    handleOrderEvent(event) {
        const type = event.type;
        const data = event.data;
        let actionType = 'unknown';
        
        // Log hanya type event untuk debugging
        // console.log(`Order event received [${type}]`);
        
        // Tentukan jenis action berdasarkan tipe event
        switch (type) {
            case 'order_created':
                actionType = 'create';
                break;
                
            case 'order_updated':
                actionType = 'update';
                break;
                
            case 'order_deleted':
                actionType = 'delete';
                break;
                
            case 'order_status_changed':
                actionType = 'status_update';
                break;
                
            case 'order_payment_updated':
                actionType = 'payment_update';
                break;
                
            case 'order_served':
                actionType = 'served';
                break;
        }
        
        // Persiapkan data untuk dikirimkan ke listener
        let eventDetail = {
            action: actionType,
            timestamp: new Date().toISOString()
        };
        
        // Tambahkan data sesuai jenis event
        if (type === 'order_deleted' || type === 'order_served') {
            eventDetail.order_id = data.id;
            
            // Tambahkan table_id jika tersedia untuk keperluan update status meja
            if (data.table_id) {
                eventDetail.table_id = data.table_id;
            }
        } else {
            eventDetail.order = data;
        }
        
        // Dispatch event orderUpdate 
        const updateEvent = new CustomEvent('orderUpdate', {
            detail: eventDetail
        });
        
        window.dispatchEvent(updateEvent);
    }

    /**
     * Menangani event terkait menu
     * @param {Object} event Data event dari WebSocket
     */
    handleMenuEvent(event) {
        const type = event.type;
        const data = event.data;
        let actionType = 'unknown';
        
        // Log hanya type event untuk debugging
        // console.log(`Menu event received [${type}]`);
        
        // Tentukan jenis action berdasarkan tipe event
        switch (type) {
            case 'menu_created':
                actionType = 'create';
                break;
                
            case 'menu_updated':
                actionType = 'update';
                break;
                
            case 'menu_deleted':
                actionType = 'delete';
                break;
                
            case 'menu_availability_changed':
                actionType = 'availability_update';
                break;
        }
        
        // Persiapkan data untuk dikirimkan ke listener
        let eventDetail = {
            action: actionType,
            timestamp: new Date().toISOString()
        };
        
        // Tambahkan data sesuai jenis event
        if (type === 'menu_deleted') {
            eventDetail.menu_id = data.id;
            eventDetail.menu_name = data.name;
        } else {
            eventDetail.menu = data;
        }
        
        // Dispatch event menuUpdate 
        const updateEvent = new CustomEvent('menuUpdate', {
            detail: eventDetail
        });
        
        window.dispatchEvent(updateEvent);
    }

    handleNotificationEvent(data) {
        // console.log('Handling notification event:', data);
        
        // Show direct notification for staff
        const message = data.data.message || 'Notifikasi baru';
        const type = data.data.type || 'info';
        
        this.showToast(message, type);
        
        window.dispatchEvent(new CustomEvent('staffNotification', {
            detail: {
                type: data.event.split('_')[0], // staff, kitchen, system
                data: data.data,
                timestamp: Date.now()
            }
        }));
    }

    handleStatsUpdate(data) {
        // console.log('Handling stats update:', data);
        window.dispatchEvent(new CustomEvent('statsUpdate', {
            detail: {
                stats: data.data,
                timestamp: Date.now()
            }
        }));
    }

    startPingInterval() {
        // Clear any existing interval
        this.clearPingInterval();
        
        // Send ping every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'ping', timestamp: Date.now() });
            }
        }, 30000);
    }

    clearPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay/1000} seconds...`);
            
            setTimeout(() => this.connect(), delay);
            
            // Show reconnecting toast
            this.showToast(`Mencoba terhubung kembali (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'warning');
        } else {
            console.error('Max reconnect attempts reached. Please refresh the page.');
            window.dispatchEvent(new CustomEvent('websocketReconnectFailed'));
            
            // Show final failure toast
            this.showToast('Gagal terhubung kembali. Silakan refresh halaman.', 'error');
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // console.log('Sending message:', message);
            this.ws.send(JSON.stringify(message));
            return true;
        } else {
            console.error('WebSocket is not connected');
            return false;
        }
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    showToast(message, type = 'info') {
        // Only dispatch the event if the showToast function is available in the global scope
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Dispatch an event for the app to handle
            window.dispatchEvent(new CustomEvent('showToast', {
                detail: { message, type }
            }));
        }
    }
}

// Make showToast globally available
window.showToast = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="material-icons">${getIconForType(type)}</span>
            <span>${message}</span>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('notification-hide');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

function getIconForType(type) {
    switch (type) {
        case 'success':
            return 'check_circle';
        case 'error':
            return 'error';
        case 'warning':
            return 'warning';
        case 'info':
        default:
            return 'info';
    }
}

// Initialize WebSocket client
window.wsClient = new WebSocketClient(); 