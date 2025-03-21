class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.maxNotifications = 50;

        // Elements
        this.dropdown = document.querySelector('.notifications-dropdown');
        this.badge = document.querySelector('.notifications .badge');
        this.notificationsList = document.querySelector('.notifications-list');
        this.markAllReadBtn = document.querySelector('.mark-all-read');

        // Bind methods
        this.handleNotificationClick = this.handleNotificationClick.bind(this);
        this.handleMarkAllRead = this.handleMarkAllRead.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle dropdown
        document.querySelector('.notifications').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
            this.requestNotificationPermission();
        });

        // Mark all as read
        this.markAllReadBtn.addEventListener('click', this.handleMarkAllRead);

        // Close dropdown when clicking outside
        document.addEventListener('click', this.handleOutsideClick);

        // Listen for notification events
        document.addEventListener('notification', (e) => {
            this.addNotification(e.detail);
        });

        // Handle notification item clicks
        this.notificationsList.addEventListener('click', this.handleNotificationClick);
    }

    async requestNotificationPermission() {
        if ("Notification" in window) {
            if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                try {
                    await Notification.requestPermission();
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                }
            }
        }
    }

    toggleDropdown() {
        const isActive = this.dropdown.classList.contains('active');
        this.dropdown.classList.toggle('active');
        
        if (!isActive) {
            this.renderNotifications();
        }
    }

    handleOutsideClick(e) {
        if (!e.target.closest('.notifications')) {
            this.dropdown.classList.remove('active');
        }
    }

    handleMarkAllRead() {
        this.notifications.forEach(notif => {
            notif.read = true;
        });
        this.unreadCount = 0;
        this.updateBadge();
        this.renderNotifications();
    }

    handleNotificationClick(e) {
        const item = e.target.closest('.notification-item');
        if (!item) return;

        const id = item.dataset.id;
        const notification = this.notifications.find(n => n.id === id);
        
        if (notification) {
            if (!notification.read) {
                notification.read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateBadge();
            }
            
            // Handle notification action based on type
            if (notification.data) {
                switch (notification.data.type) {
                    case 'order':
                        window.router.navigateTo('orders');
                        break;
                }
            }
            
            this.renderNotifications();
        }
    }

    addNotification(notification) {
        const id = Date.now().toString();
        const newNotification = {
            id,
            ...notification,
            read: false,
            timestamp: new Date().toISOString()
        };

        this.notifications.unshift(newNotification);

        // Limit the number of stored notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.unreadCount++;
        this.updateBadge();
        this.renderNotifications();
    }

    updateBadge() {
        this.badge.textContent = this.unreadCount;
        this.badge.classList.toggle('hidden', this.unreadCount === 0);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Kurang dari 1 menit
        if (diff < 60000) {
            return 'Baru saja';
        }
        // Kurang dari 1 jam
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} menit yang lalu`;
        }
        // Kurang dari 24 jam
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} jam yang lalu`;
        }
        // Lebih dari 24 jam
        const days = Math.floor(diff / 86400000);
        return `${days} hari yang lalu`;
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'order':
                return 'fa-utensils';
            case 'alert':
                return 'fa-exclamation-circle';
            case 'info':
                return 'fa-info-circle';
            default:
                return 'fa-bell';
        }
    }

    renderNotifications() {
        if (!this.notificationsList) return;

        this.notificationsList.innerHTML = this.notifications.length ? 
            this.notifications.map(notification => `
                <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                     data-id="${notification.id}">
                    <div class="notification-icon">
                        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-header">
                            <h4>${notification.title}</h4>
                            <span class="time">${this.formatTime(notification.timestamp)}</span>
                        </div>
                        <p>${notification.message}</p>
                    </div>
                </div>
            `).join('') :
            '<div class="no-notifications">Tidak ada notifikasi</div>';
    }
}

// Initialize notification manager
window.notificationManager = new NotificationManager(); 