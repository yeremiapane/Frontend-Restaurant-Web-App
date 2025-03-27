class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        this.pageInstances = {};
        this.onBeforeNavigate = null; // Callback function to be called before navigation
    }

    addRoute(page, handler) {
        this.routes[page] = handler;
    }

    async navigateTo(page) {
        // Prevent navigation to the same page
        if (this.currentPage === page) {
            return;
        }
        
        // Call onBeforeNavigate if defined
        if (typeof this.onBeforeNavigate === 'function') {
            console.log(`Calling onBeforeNavigate from ${this.currentPage} to ${page}`);
            this.onBeforeNavigate(this.currentPage, page);
        }

        // Update page title with proper capitalization
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            const title = page === 'reports' ? 'Reports & Analytics' : page.charAt(0).toUpperCase() + page.slice(1);
            pageTitle.textContent = title;
        }

        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current menu item
        const currentMenuItem = document.querySelector(`.menu-item[data-page="${page}"]`);
        if (currentMenuItem) {
            currentMenuItem.classList.add('active');
        }

        // Reset the current page instance if it exists
        if (this.pageInstances[this.currentPage]) {
            this.pageInstances[this.currentPage].initialized = false;
        }

        // Clear content container and show loading
        const contentContainer = document.getElementById('content-container');
        if (contentContainer) {
            contentContainer.innerHTML = '<div class="loading">Loading...</div>';
        }

        // Coba beberapa kali untuk menangani route yang belum siap
        const maxRetries = 3;
        let retryCount = 0;
        
        const tryExecuteRoute = async () => {
            if (this.routes[page]) {
                try {
                    await this.routes[page]();
                    this.currentPage = page;
                    history.pushState({ page }, '', `#${page}`);
                    return true;
                } catch (error) {
                    console.error('Error loading page:', error);
                    if (contentContainer) {
                        contentContainer.innerHTML = '<div class="error">Error loading page: ' + error.message + '</div>';
                    }
                    return false;
                }
            } else {
                console.log(`Route "${page}" not yet registered (attempt ${retryCount + 1}/${maxRetries + 1})`);
                return false;
            }
        };
        
        // Try immediately first
        if (await tryExecuteRoute()) return;
        
        // If route not available, retry a few times with delays
        const executeWithRetry = async () => {
            if (retryCount >= maxRetries) {
                console.error(`Route "${page}" still not found after ${maxRetries} retries`);
                if (contentContainer) {
                    contentContainer.innerHTML = `<div class="error">Page "${page}" not found</div>`;
                }
                return;
            }
            
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Increase delay with each retry
            
            if (await tryExecuteRoute()) return;
            
            // Try again if didn't succeed
            executeWithRetry();
        };
        
        executeWithRetry();
    }

    registerPageInstance(pageName, instance) {
        this.pageInstances[pageName] = instance;
    }

    initialize() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const page = e.state ? e.state.page : 'dashboard';
            this.navigateTo(page);
        });

        // Get initial page from hash or default to dashboard
        const initialPage = window.location.hash.slice(1) || 'dashboard';
        this.navigateTo(initialPage);
    }
}

// Initialize router
window.router = new Router(); 