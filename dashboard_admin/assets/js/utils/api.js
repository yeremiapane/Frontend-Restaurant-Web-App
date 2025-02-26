export const api = {
    baseURL: 'http://localhost:8080', // sesuaikan dengan URL backend Anda

    async get(endpoint) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
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

    // Fungsi helper untuk melakukan fetch dengan token
    async fetchWithAuth(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = '/Frontend/auth/login/index.html';
            throw new Error('No token found');
        }

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, defaultOptions);
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                window.location.href = '/Frontend/auth/login/index.html';
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Endpoints sesuai dengan router.go
    async getDashboardStats() {
        const response = await this.fetchWithAuth('/admin/dashboard/stats');
        return response.json();
    },

    async getOrderFlow() {
        const response = await this.fetchWithAuth('/admin/orders/flow');
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
        const ws = new WebSocket(`ws://localhost:8080/ws/${role}`);
        
        ws.onopen = () => {
            console.log('Connected to KDS WebSocket');
        };
        
        return ws;
    },

    // Tambahkan endpoint lainnya sesuai kebutuhan
}; 