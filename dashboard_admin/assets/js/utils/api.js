const BASE_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080';

export const api = {
    async get(endpoint) {
        try {
            const token = localStorage.getItem('auth_token');
            
            console.log('Making API request:', {
                endpoint,
                token: token ? token.substring(0, 20) + '...' : 'missing'
            });
            
            if (!token) {
                console.log('No token found, redirecting to login...');
                window.location.href = '/Frontend/auth/login/index.html';
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log(`Response from ${endpoint}:`, {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers])
            });

            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_role');
                window.location.href = '/Frontend/auth/login/index.html';
                throw new Error('Session expired or invalid token');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            // Debug log untuk melihat struktur response
            console.log(`Data from ${endpoint}:`, data);

            // Periksa struktur response dan return data yang sesuai
            if (data.status === false) {
                throw new Error(data.message || 'Server returned error status');
            }

            return data.data; // Mengembalikan data dari response
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Endpoints sesuai dengan router.go
    async getDashboardStats() {
        const response = await this.fetchWithAuth('/dashboard/stats');
        return response.json();
    },

    async getOrderFlow() {
        const response = await this.fetchWithAuth('/orders/flow');
        return response.json();
    },

    async getOrderAnalytics() {
        const response = await this.fetchWithAuth('/orders/analytics');
        return response.json();
    },

    async getMenus() {
        const response = await this.fetchWithAuth('/menus');
        return response.json();
    },

    async getCategories() {
        const response = await this.fetchWithAuth('/categories');
        return response.json();
    },

    async getTables() {
        const response = await this.fetchWithAuth('/tables');
        return response.json();
    },

    async getProfile() {
        const response = await this.fetchWithAuth('/admin/profile');
        return response.json();
    },

    async updateOrder(orderId, data) {
        const response = await this.fetchWithAuth(`/admin/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async getCleaningLogs() {
        const response = await this.fetchWithAuth('/admin/cleaning-logs');
        return response.json();
    },

    async getNotifications() {
        const response = await this.fetchWithAuth('/admin/notifications');
        return response.json();
    },

    async getKitchenDisplay() {
        const response = await this.fetchWithAuth('/admin/kitchen/display');
        return response.json();
    },

    // Method untuk WebSocket
    connectToKDS(role) {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const ws = new WebSocket(`${WS_URL}/ws/${role}?token=${token}`);
        
        ws.onopen = () => {
            console.log(`Connected to KDS WebSocket as ${role}`);
        };

        ws.onerror = (error) => {
            console.error('WebSocket connection error:', error);
            if (error.target && error.target.readyState !== WebSocket.OPEN) {
                console.error('WebSocket connection failed. State:', error.target.readyState);
            }
        };

        return ws;
    },

    // Tambahkan endpoint lainnya sesuai kebutuhan
}; 