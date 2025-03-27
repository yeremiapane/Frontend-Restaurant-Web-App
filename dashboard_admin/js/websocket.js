/**
 * WebSocket client for real-time communication
 */
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.token = localStorage.getItem('token');
        this.role = localStorage.getItem('user_role') || 'admin';
        this.baseWSUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'ws://localhost:8080'
            : `ws${window.location.protocol === 'https:' ? 's' : ''}://${window.location.host}`;
        this.reconnectInterval = 5000; // 5 seconds
        this.eventListeners = {
            'order_update': [],
            'kitchen_update': [],
            'staff_notification': [],
            'payment_update': [],
            'payment_success': [],
            'payment_failed': [],
            'payment_expired': [],
            'table_update': [],
            'table_create': [],
            'table_delete': [],
            'dashboard_update': [],
            'connection_established': [],
            'heartbeat': [],
            'heartbeat_response': [],
            'connection_change': []
        };
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10; // Ditingkatkan dari 5 ke 10
        this.heartbeatInterval = null; // Untuk melacak interval heartbeat
        this.missedHeartbeats = 0;
        this.maxMissedHeartbeats = 3; // Setelah 3 heartbeat terlewati, koneksi dianggap terputus
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket already connected or connecting');
            return;
        }

        if (!this.token) {
            console.error('No token found, cannot connect to WebSocket');
            return;
        }

        const wsUrl = `${this.baseWSUrl}/ws/${this.role}?token=${this.token}`;
        console.log(`Connecting to WebSocket at ${wsUrl}`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connection established');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.missedHeartbeats = 0;
                this.dispatchEvent('connection_change', { status: 'connected' });
                
                // Mulai interval heartbeat
                this.startHeartbeat();
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket closed with code ${event.code}`, event.reason);
                this.connected = false;
                this.stopHeartbeat();
                this.dispatchEvent('connection_change', { status: 'disconnected', reason: event.reason });
                
                // Coba reconnect secara otomatis kecuali koneksi ditutup secara normal
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    
                    // Gunakan backoff eksponensial untuk interval reconnect
                    const backoffTime = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1));
                    
                    console.log(`Will try reconnect in ${backoffTime/1000} seconds`);
                    setTimeout(() => this.connect(), backoffTime);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.log('Max reconnection attempts reached. Stopping reconnection attempts.');
                    // Tampilkan pesan ke pengguna bahwa koneksi terputus dan perlu refresh halaman
                    this.dispatchEvent('connection_change', { 
                        status: 'failed',
                        message: 'Connection lost. Please refresh the page to reconnect.'
                    });
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.dispatchEvent('connection_change', { status: 'error', error });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('WebSocket message received:', message);
                    
                    // Tangani pesan khusus heartbeat
                    if (message.event === 'heartbeat') {
                        // Balas heartbeat dari server untuk menjaga koneksi tetap aktif
                        this.send('heartbeat', { timestamp: Date.now() });
                        this.dispatchEvent('heartbeat', message.data);
                        return;
                    }
                    
                    // Tangani respon heartbeat
                    if (message.event === 'heartbeat_response') {
                        this.missedHeartbeats = 0; // Reset counter
                        this.dispatchEvent('heartbeat_response', message.data);
                        return;
                    }
                    
                    // Tangani pesan konfirmasi koneksi
                    if (message.event === 'connection_established') {
                        console.log('Connection confirmed by server:', message.data);
                        this.dispatchEvent('connection_established', message.data);
                        return;
                    }
                    
                    // Validate message format
                    if (!message || !message.event) {
                        console.warn('Invalid WebSocket message format:', message);
                        return;
                    }
                    
                    // Special handling for dashboard updates
                    if (message.event === 'dashboard_update') {
                        console.log('Dashboard update received via WebSocket');
                        if (message.data) {
                            // Normalize data format
                            let dashboardData = message.data;
                            
                            // If data is stringified JSON, parse it
                            if (typeof dashboardData === 'string') {
                                try {
                                    dashboardData = JSON.parse(dashboardData);
                                } catch (err) {
                                    console.error('Error parsing dashboard data JSON string:', err);
                                }
                            }
                            
                            // Dispatch to listeners
                            this.dispatchEvent('dashboard_update', dashboardData);
                            
                            // Also dispatch as window event for compatibility
                            window.dispatchEvent(new CustomEvent('dashboard_update', {
                                detail: dashboardData
                            }));
                        }
                        return;
                    }
                    
                    // Special handling for payment events to ensure consistent format
                    if (message.event.startsWith('payment_')) {
                        // Ensure data has the right format for payment events
                        if (!message.data) {
                            console.warn('Payment event missing data:', message);
                            return;
                        }
                        
                        // Generate standardized message for all payment events
                        let paymentData = {};
                        
                        // If data already has payment and order keys, use as is
                        if (message.data.payment && message.data.order) {
                            paymentData = message.data;
                        } 
                        // If data is just a payment object
                        else if (message.data.id && message.data.order_id) {
                            // Create proper structure with payment and order
                            paymentData = {
                                payment: message.data,
                                order: message.data.order || { id: message.data.order_id }
                            };
                        }
                        
                        // Use standardized payment update event
                        this.dispatchEvent('payment_update', paymentData);
                        
                        // Also dispatch specific event type if registered
                        this.dispatchEvent(message.event, paymentData);
                    } else {
                        // For all other events, pass as is
                        this.dispatchEvent(message.event, message.data);
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error, event.data);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            this.dispatchEvent('connection_change', { status: 'error', error });
            
            // Try to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        }
    }

    startHeartbeat() {
        this.stopHeartbeat(); // Pastikan interval sebelumnya sudah berhenti
        
        // Kirim heartbeat setiap 30 detik
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                // Kirim pesan heartbeat ke server
                this.send('heartbeat', { timestamp: Date.now() });
                
                // Tambah counter untuk heartbeat yang tidak dijawab
                this.missedHeartbeats++;
                
                // Jika terlalu banyak heartbeat tidak dijawab, tutup koneksi untuk memicu reconnect
                if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
                    console.warn(`Missed ${this.missedHeartbeats} heartbeats. Closing connection.`);
                    this.disconnect();
                    this.connect(); // Coba koneksi ulang langsung
                }
            } else {
                // Jika koneksi sudah terputus, hentikan heartbeat
                this.stopHeartbeat();
            }
        }, 30000); // 30 detik interval
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close(1000, 'Disconnected by user');
            this.ws = null;
            this.connected = false;
        }
    }

    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    send(eventType, data) {
        if (!this.isConnected()) {
            console.error('Cannot send message, WebSocket not connected');
            return false;
        }
        
        try {
            const message = JSON.stringify({
                event: eventType,
                data: data
            });
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return false;
        }
    }

    addEventListener(eventType, callback) {
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        this.eventListeners[eventType].push(callback);
    }

    removeEventListener(eventType, callback) {
        if (!this.eventListeners[eventType]) return;
        this.eventListeners[eventType] = this.eventListeners[eventType].filter(cb => cb !== callback);
    }

    dispatchEvent(eventType, data) {
        if (!this.eventListeners[eventType]) return;
        this.eventListeners[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${eventType} event listener:`, error);
            }
        });
    }
}

// Create singleton instance
window.wsClient = new WebSocketClient(); 