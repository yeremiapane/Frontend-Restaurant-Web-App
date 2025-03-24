/**
 * Authentication Manager
 * Handles user authentication, session management, and API requests
 */
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userData = null;
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for auth-related UI
     */
    setupEventListeners() {
        // Logout button event listener
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.showLogoutConfirmation());
        }

        // Logout confirmation
        const confirmLogoutBtn = document.getElementById('confirm-logout');
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Cancel logout
        const cancelLogoutBtn = document.getElementById('cancel-logout');
        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => {
                const logoutModal = document.getElementById('logout-modal');
                if (logoutModal) {
                    logoutModal.classList.remove('active');
                }
            });
        }

        // Check authentication on page load
        this.checkAuth();
    }

    /**
     * Show logout confirmation modal
     */
    showLogoutConfirmation() {
        // Use existing modal in the HTML
        const logoutModal = document.getElementById('logout-modal');
        if (logoutModal) {
            logoutModal.classList.add('active');
        }
    }

    /**
     * Check if user is authenticated and has appropriate role
     */
    async checkAuth() {
        if (!this.token) {
            this.redirectToLogin();
            return false;
        }

        try {
            const userData = await this.fetchUserProfile();
            if (!userData) {
                throw new Error('Failed to load user profile');
            }

            // Validate user role for staff dashboard
            if (userData.role) {
                const allowedRoles = ['staff', 'chef', 'head_chef', 'cleaner'];
                if (!allowedRoles.includes(userData.role)) {
                    throw new Error('Unauthorized role');
                }
            }

            // Store user data
            this.userData = userData;
            
            // Update user profile in UI
            this.updateUserProfile(userData);

            // Dispatch auth ready event
            window.dispatchEvent(new CustomEvent('authReady', {
                detail: { user: userData }
            }));

            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.handleLogout();
            return false;
        }
    }

    /**
     * Fetch user profile from API
     * @returns {Promise<Object>} User data
     */
    async fetchUserProfile() {
        try {
            const response = await this.authenticatedFetch('http://localhost:8080/admin/profile');
            
            if (!response.ok) {
                throw new Error('Unauthorized');
            }

            const result = await response.json();
            if (!result.status) {
                throw new Error('Invalid response');
            }

            return result.data;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            return null;
        }
    }

    /**
     * Perform authenticated API request
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async authenticatedFetch(url, options = {}) {
        if (!this.token) {
            throw new Error('No authentication token');
        }

        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const fetchOptions = {
            ...options,
            headers
        };

        return fetch(url, fetchOptions);
    }

    /**
     * Update user profile in the UI
     * @param {Object} userData - User data
     */
    updateUserProfile(userData) {
        // Update DOM elements with user data
        const userNameElement = document.querySelector('.user-name');
        const userRoleElement = document.querySelector('.user-role');
        const userAvatarElement = document.querySelector('.user-avatar img');
        
        if (userNameElement && userData.name) {
            userNameElement.textContent = userData.name;
        }
        
        if (userRoleElement && userData.role) {
            userRoleElement.textContent = this.formatRole(userData.role);
        }
        
        if (userAvatarElement && userData.avatar) {
            userAvatarElement.src = userData.avatar;
        }
    }

    /**
     * Format role for display
     * @param {string} role - User role
     * @returns {string} Formatted role text
     */
    formatRole(role) {
        switch (role) {
            case 'chef':
                return 'Chef Dapur';
            case 'head_chef':
                return 'Kepala Chef';
            case 'staff':
                return 'Staff Dapur';
            case 'cleaner':
                return 'Staff Kebersihan';
            default:
                return 'Staff';
        }
    }

    /**
     * Handle user logout
     */
    async handleLogout() {
        try {
            // Close modal
            const logoutModal = document.getElementById('logout-modal');
            if (logoutModal) {
                logoutModal.classList.remove('active');
            }
            
            // Close WebSocket connection if exists
            if (window.wsClient && window.wsClient.ws) {
                window.wsClient.ws.close();
            }

            // Attempt to notify server about logout
            if (this.token) {
                try {
                    await fetch('http://localhost:8080/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json'
                        }
                    }).catch(() => {
                        // Ignore errors during logout - continue with local cleanup
                        console.log('Failed to notify server about logout');
                    });
                } catch (error) {
                    // Ignore server errors during logout
                }
            }

            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            
            // Clear user data
            this.token = null;
            this.userData = null;

            // Dispatch event
            window.dispatchEvent(new CustomEvent('userLoggedOut'));

            // Redirect to login page
            this.redirectToLogin();
        } catch (error) {
            console.error('Logout error:', error);
            // Still redirect even if there's an error
            this.redirectToLogin();
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.href = '/Frontend/auth/login/index.html';
    }

    /**
     * Get the authentication token
     * @returns {string|null} Auth token
     */
    getToken() {
        return this.token;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get user data
     * @returns {Object|null} User data
     */
    getUserData() {
        return this.userData;
    }

    /**
     * Check if user has specific role
     * @param {string|Array} role - Role or roles to check
     * @returns {boolean} Whether user has role
     */
    hasRole(role) {
        if (!this.userData || !this.userData.role) {
            return false;
        }

        if (Array.isArray(role)) {
            return role.includes(this.userData.role);
        }

        return this.userData.role === role;
    }
}

// Initialize auth manager
window.authManager = new AuthManager(); 