class Router {
    constructor() {
        this.routes = new Map();
        this.contentContainer = document.getElementById('content');
        this.currentPage = null;

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.navigateTo(event.state.page, false);
            }
        });
    }

    initialize() {
        // Set default route
        const defaultRoute = 'dashboard';
        this.navigateTo(defaultRoute);
    }

    addRoute(page, component) {
        console.log('Adding route:', page);
        this.routes.set(page, component);
    }

    async navigateTo(page, updateHistory = true) {
        console.log('Navigating to:', page);
        
        const component = this.routes.get(page);
        if (!component) {
            console.error('Route not found:', page);
            return;
        }

        try {
            // Update active menu item
            this.updateActiveMenuItem(page);

            // Unmount current page if exists
            if (this.currentPage && typeof this.currentPage.onUnmount === 'function') {
                await this.currentPage.onUnmount();
            }

            // Show loading
            this.showLoading();

            // Clear current content
            if (this.contentContainer) {
                this.contentContainer.innerHTML = '';
            }

            // Render new page
            await component.render();

            // Mount new page
            if (typeof component.onMount === 'function') {
                await component.onMount();
            }

            // Update history if needed
            if (updateHistory) {
                window.history.pushState({ page }, '', `#${page}`);
            }

            this.currentPage = component;

        } catch (error) {
            console.error('Error navigating to page:', error);
            this.showError('Terjadi kesalahan saat memuat halaman');
        } finally {
            this.hideLoading();
        }
    }

    updateActiveMenuItem(page) {
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current page menu item
        const menuItem = document.querySelector(`.menu-item[data-page="${page}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }
    }

    showLoading() {
        // Create loading element if doesn't exist
        let loading = document.querySelector('.page-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.className = 'page-loading';
            loading.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Memuat...</p>
            `;
            document.body.appendChild(loading);
        }
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.querySelector('.page-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>Oops! Terjadi Kesalahan</h2>
                    <p>${message}</p>
                    <button onclick="window.location.reload()">Coba Lagi</button>
                </div>
            `;
        }
    }
}

// Initialize router
window.router = new Router(); 