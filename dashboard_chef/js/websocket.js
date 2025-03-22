class WebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.eventListeners = new Map();
        this.checkAuthAndConnect();
    }

    checkAuthAndConnect() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Token tidak ditemukan, redirecting ke halaman login...');
            window.location.href = '/Frontend/auth/login/index.html';
            return;
        }
        this.connect();
    }

    connect() {
        // Jika sudah ada koneksi aktif, jangan buat koneksi baru
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log('WebSocket sudah terhubung');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Token tidak ditemukan');
            return;
        }

        const wsUrl = `ws://localhost:8080/ws/chef?token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket terhubung');
            this.reconnectAttempts = 0;
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket terputus:', event.code, event.reason);
            if (!event.wasClean) {
                this.handleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Mencoba menghubungkan kembali... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), this.reconnectInterval);
        } else {
            console.error('Gagal menghubungkan kembali setelah beberapa percobaan');
            this.showNotification({
                title: 'Koneksi Terputus',
                message: 'Tidak dapat terhubung ke server. Silakan muat ulang halaman.',
                type: 'error'
            });
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('Received message:', message);
            
            // Dispatch event berdasarkan tipe pesan
            const event = new CustomEvent('orderUpdate', { 
                detail: message
            });
            window.dispatchEvent(event);

            // Show notification jika diperlukan
            if (message.event === 'order_update') {
                this.showNotification({
                    title: 'Update Pesanan',
                    message: `Pesanan #${message.data.id} telah diperbarui`,
                    type: 'info'
                });
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    addEventListener(event, callback) {
        window.addEventListener(event, callback);
    }

    removeEventListener(event, callback) {
        window.removeEventListener(event, callback);
    }

    dispatchEvent(event, data) {
        const customEvent = new CustomEvent(event, { detail: data });
        window.dispatchEvent(customEvent);
    }

    showNotification(notification) {
        // Dispatch notification event
        const event = new CustomEvent('notification', { 
            detail: notification 
        });
        document.dispatchEvent(event);

        // Show browser notification if permitted
        if (Notification.permission === "granted") {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/assets/icon.png'
            });
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket tidak terhubung');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Initialize WebSocket client
if (!window.wsClient) {
    window.wsClient = new WebSocketClient();
} 