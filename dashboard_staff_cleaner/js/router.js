/**
 * Simple Router for SPA
 */
class Router {
    constructor() {
        this.routes = {
            'orders': {
                title: 'Orders',
                load: () => this.loadOrdersPage()
            },
            'tables': {
                title: 'Tables',
                load: () => this.loadTablesPage()
            }
        };
        
        this.currentRoute = 'orders'; // Default route
        this.pageInstances = {}; // Store page instances
    }
    
    /**
     * Register a page instance
     * @param {string} pageName - Name of the page
     * @param {object} instance - The page instance
     */
    registerPageInstance(pageName, instance) {
        console.log(`Registering page instance: ${pageName}`);
        this.pageInstances[pageName] = instance;
    }
    
    /**
     * Add a route (for compatibility with older code)
     * @param {string} route - Route name
     * @param {function} loadFunction - Function to load the route
     */
    addRoute(route, loadFunction) {
        console.log(`Adding route: ${route}`);
        if (this.routes[route]) {
            // If route already exists, replace the load function
            this.routes[route].load = loadFunction;
        } else {
            // If route doesn't exist, add it
            this.routes[route] = {
                title: route.charAt(0).toUpperCase() + route.slice(1),
                load: loadFunction
            };
        }
    }
    
    /**
     * Initialize router
     */
    initialize() {
        console.log('Initializing router');
        
        // Check URL hash to determine initial route
        const hash = window.location.hash.substring(1);
        if (hash && this.routes[hash]) {
            this.currentRoute = hash;
        }
        
        // Navigate to initial route
        this.navigateTo(this.currentRoute);
        
        // Set up event listener for hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && this.routes[hash]) {
                this.navigateTo(hash);
            }
        });
        
        // Set up event listeners for menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const route = item.dataset.page;
                if (this.routes[route]) {
                    window.location.hash = route;
                    this.navigateTo(route);
                }
            });
        });
    }
    
    /**
     * Navigate to a specific page
     * @param {string} route - Page identifier
     */
    navigateTo(route) {
        if (!this.routes[route]) {
            console.error(`Route "${route}" not found`);
            return;
        }
        
        console.log(`Navigating to: ${route}`);
        
        // Update current route
        this.currentRoute = route;
        
        // Update page title
        document.getElementById('page-title').textContent = this.routes[route].title;
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item.dataset.page === route) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show current page
        const pageElement = document.getElementById(`${route}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        // Load page content
        this.routes[route].load();
    }
    
    /**
     * Load orders page specifically
     */
    async loadOrdersPage() {
        console.log('Loading orders page...');
        const pageElement = document.getElementById('orders-page');
        
        if (!pageElement) {
            console.error('Orders page element not found');
            return;
        }
        
        try {
            // Check if ordersPage instance exists
            if (window.ordersPage) {
                console.log('Using existing orders page instance');
                await window.ordersPage.initialize();
            } else {
                console.error('Orders page instance not found');
                const contentContainer = document.getElementById('orders-content-container');
                if (contentContainer) {
                    contentContainer.innerHTML = `
                        <div class="error-container">
                            <span class="material-icons error-icon">error</span>
                            <p>Failed to load Orders component.</p>
                            <button class="btn btn-primary retry-btn" onclick="window.location.reload()">Refresh Page</button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading orders page:', error);
            const contentContainer = document.getElementById('orders-content-container');
            if (contentContainer) {
                contentContainer.innerHTML = `
                    <div class="error-container">
                        <span class="material-icons error-icon">error</span>
                        <p>Failed to load Orders page: ${error.message}</p>
                        <button class="btn btn-primary retry-btn" onclick="window.location.reload()">Refresh Page</button>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Load tables page specifically
     */
    async loadTablesPage() {
        console.log('Loading tables page...');
        const pageElement = document.getElementById('tables-page');
        
        if (!pageElement) {
            console.error('Tables page element not found');
            return;
        }
        
        try {
            // Check if tablesPage instance exists
            if (window.tablesPage) {
                console.log('Using existing tables page instance');
                await window.tablesPage.initialize();
            } else {
                console.error('Tables page instance not found');
                const contentContainer = document.getElementById('tables-content-container');
                if (contentContainer) {
                    contentContainer.innerHTML = `
                        <div class="error-container">
                            <span class="material-icons error-icon">error</span>
                            <p>Failed to load Tables component.</p>
                            <button class="btn btn-primary retry-btn" onclick="window.location.reload()">Refresh Page</button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading tables page:', error);
            const contentContainer = document.getElementById('tables-content-container');
            if (contentContainer) {
                contentContainer.innerHTML = `
                    <div class="error-container">
                        <span class="material-icons error-icon">error</span>
                        <p>Failed to load Tables page: ${error.message}</p>
                        <button class="btn btn-primary retry-btn" onclick="window.location.reload()">Refresh Page</button>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Legacy methods for compatibility
     */
    async loadOrders() {
        return this.loadOrdersPage();
    }
    
    async loadTables() {
        return this.loadTablesPage();
    }
    
    /**
     * Load a page instance by name
     * @param {string} pageName - Name of the page to load
     */
    async loadPageInstance(pageName) {
        if (pageName === 'orders') {
            return this.loadOrdersPage();
        } else if (pageName === 'tables') {
            return this.loadTablesPage();
        } else {
            console.error(`Unknown page: ${pageName}`);
        }
    }
}

// Initialize router
const router = new Router();
window.router = router; 