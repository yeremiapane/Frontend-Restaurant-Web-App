class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 seconds
    }

    connect() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // Perbaikan format URL WebSocket
        const url = `ws://localhost:8080/ws/admin?token=${token}`;
        console.log('Connecting to WebSocket:', url);

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('WebSocket Connected');
                this.reconnectAttempts = 0;
                
                // Subscribe to updates
                this.send({
                    type: 'subscribe',
                    channels: ['orders', 'tables', 'stats']
                });
            };

            this.ws.onclose = () => {
                console.log('WebSocket Disconnected');
                this.reconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }

    handleMessage(data) {
        console.log('Processing WebSocket message:', data);
        
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
                window.dispatchEvent(new CustomEvent('orderUpdate', {
                    detail: {
                        action: data.event.split('_')[1],
                        id: data.data.id,
                        order: data.data
                    }
                }));
                break;

            // Payment events
            case 'payment_create':
            case 'payment_update':
            case 'payment_status_update':
                this.handlePaymentEvent(data);
                break;

            // Menu events
            case 'menu_create':
            case 'menu_update':
            case 'menu_delete':
                window.dispatchEvent(new CustomEvent('menuUpdate', {
                    detail: data.data
                }));
                break;

            // Stats update
            case 'stats_update':
                window.dispatchEvent(new CustomEvent('statsUpdate', { 
                    detail: data.data 
                }));
                break;

            default:
                console.log('Unhandled event type:', data.event);
        }
    }

    handleTableEvent(data) {
        console.log('Handling table event:', data);
        window.dispatchEvent(new CustomEvent('tableUpdate', {
            detail: data.data
        }));
        this.fetchUpdatedStats();
    }

    handleOrderEvent(data) {
        console.log('Handling order event:', data);
        window.dispatchEvent(new CustomEvent('orderUpdate', { detail: data }));
        this.fetchUpdatedStats();
    }

    handlePaymentEvent(data) {
        console.log('Handling payment event:', data);
        window.dispatchEvent(new CustomEvent('paymentUpdate', { detail: data }));
        this.fetchUpdatedStats();
    }

    handleMenuEvent(data) {
        console.log('Handling menu event:', data);
        window.dispatchEvent(new CustomEvent('menuUpdate', { detail: data }));
    }

    async fetchUpdatedStats() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:8080/admin/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch updated stats');
            }

            const result = await response.json();
            if (result.status && result.data.data) {
                window.dispatchEvent(new CustomEvent('statsUpdate', { 
                    detail: result.data.data 
                }));
            }
        } catch (error) {
            console.error('Error fetching updated stats:', error);
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), this.reconnectInterval);
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending message:', message);
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }
}

// Initialize WebSocket client
window.wsClient = new WebSocketClient(); 