class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Logout button event listener
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.showLogoutConfirmation());
        }

        // Check authentication on page load
        this.checkAuth();
    }

    showLogoutConfirmation() {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'logout-modal';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <div class="logout-modal-header">
                    <i class="fas fa-sign-out-alt"></i>
                    <h3>Konfirmasi Logout</h3>
                </div>
                <div class="logout-modal-body">
                    <p>Apakah Anda yakin ingin keluar dari aplikasi?</p>
                </div>
                <div class="logout-modal-footer">
                    <button class="cancel-btn">Batal</button>
                    <button class="confirm-btn">Ya, Logout</button>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.appendChild(modal);

        // Add event listeners
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        confirmBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async checkAuth() {
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL}/admin/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Unauthorized');
            }

            const result = await response.json();
            if (!result.status) {
                throw new Error('Invalid response');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.handleLogout();
        }
    }

    async handleLogout() {
        try {
            // Close WebSocket connection if exists
            if (window.wsClient && window.wsClient.ws) {
                window.wsClient.ws.close();
            }

            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');

            // Redirect to login page
            this.redirectToLogin();
        } catch (error) {
            console.error('Logout error:', error);
            // Still redirect even if there's an error
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = '/Frontend/auth/login/index.html';
    }

    getToken() {
        return localStorage.getItem('token');
    }

    isAuthenticated() {
        return !!this.token;
    }
}

// Initialize auth manager
window.authManager = new AuthManager(); 