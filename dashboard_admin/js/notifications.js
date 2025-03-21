class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.dropdown = document.querySelector('.notifications-dropdown');
        this.badge = document.querySelector('.notifications .badge');
        this.notificationsList = document.querySelector('.notifications-list');
        this.markAllReadBtn = document.querySelector('.mark-all-read');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle dropdown
        document.querySelector('.notifications').addEventListener('click', (e) => {
            e.stopPropagation();
            this.dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notifications')) {
                this.dropdown.classList.remove('active');
            }
        });

        // Mark all as read
        this.markAllReadBtn.addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Listen for WebSocket notifications
        window.addEventListener('notification', (e) => {
            this.addNotification(e.detail);
        });
    }

    addNotification(notification) {
        // Add to beginning of array
        this.notifications.unshift({
            ...notification,
            id: Date.now(),
            read: false,
            timestamp: new Date()
        });

        this.unreadCount++;
        this.updateBadge();
        this.renderNotifications();
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.unreadCount = 0;
        this.updateBadge();
        this.renderNotifications();
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount--;
            this.updateBadge();
            this.renderNotifications();
        }
    }

    updateBadge() {
        this.badge.textContent = this.unreadCount;
        this.badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        
        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        
        // Less than 1 day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Less than 1 week
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
        
        // More than 1 week
        return timestamp.toLocaleDateString();
    }

    renderNotifications() {
        if (!this.notificationsList) return;

        if (this.notifications.length === 0) {
            this.notificationsList.innerHTML = `
                <div class="notification-item">
                    <div class="notification-content">
                        <p class="notification-text">No notifications</p>
                    </div>
                </div>
            `;
            return;
        }

        this.notificationsList.innerHTML = this.notifications
            .map(notification => `
                <div class="notification-item ${notification.read ? '' : 'unread'}" 
                     data-id="${notification.id}">
                    <div class="notification-icon">
                        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-text">${notification.message}</div>
                        <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                    </div>
                </div>
            `)
            .join('');

        // Add click handlers for notifications
        this.notificationsList.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.markAsRead(id);
                if (notification.action) {
                    notification.action();
                }
            });
        });
    }

    getNotificationIcon(type) {
        const icons = {
            order: 'fa-shopping-cart',
            table: 'fa-table',
            menu: 'fa-utensils',
            payment: 'fa-money-bill-wave',
            system: 'fa-cog',
            default: 'fa-bell'
        };
        return icons[type] || icons.default;
    }
}

// Initialize notification manager
window.notificationManager = new NotificationManager(); 