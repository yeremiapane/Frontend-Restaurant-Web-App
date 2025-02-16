class SettingsManager {
    constructor() {
        this.currentSection = 'general';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Navigation buttons
        const navButtons = document.querySelectorAll('.nav-item');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Form submissions
        const forms = document.querySelectorAll('.settings-form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings(e.target);
            });
        });

        // Logo upload
        const uploadBtn = document.querySelector('.btn-upload');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.handleLogoUpload());
        }

        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    switchSection(section) {
        // Update navigation buttons
        document.querySelectorAll('.nav-item').forEach(button => {
            button.classList.toggle('active', button.dataset.section === section);
        });

        // Update content sections
        document.querySelectorAll('.settings-section').forEach(content => {
            content.classList.toggle('active', content.id === section);
        });

        this.currentSection = section;
    }

    async loadSettings() {
        try {
            const settings = await this.fetchSettings();
            this.populateSettings(settings);
        } catch (error) {
            this.showToast('Failed to load settings', 'error');
        }
    }

    populateSettings(settings) {
        // General Settings
        const generalForm = document.querySelector('#general form');
        if (generalForm) {
            generalForm.querySelector('select[name="language"]').value = settings.general.language;
            generalForm.querySelector('select[name="timezone"]').value = settings.general.timezone;
            generalForm.querySelector('select[name="dateFormat"]').value = settings.general.dateFormat;
            generalForm.querySelector('select[name="currency"]').value = settings.general.currency;
        }

        // Restaurant Info
        const restaurantForm = document.querySelector('#restaurant form');
        if (restaurantForm) {
            restaurantForm.querySelector('input[name="restaurantName"]').value = settings.restaurant.name;
            restaurantForm.querySelector('textarea[name="address"]').value = settings.restaurant.address;
            restaurantForm.querySelector('input[name="phone"]').value = settings.restaurant.phone;
            restaurantForm.querySelector('input[name="email"]').value = settings.restaurant.email;
            restaurantForm.querySelector('input[name="taxRate"]').value = settings.restaurant.taxRate;
            restaurantForm.querySelector('input[name="serviceCharge"]').value = settings.restaurant.serviceCharge;
        }
    }

    async saveSettings(form) {
        const formData = new FormData(form);
        const settings = {};

        formData.forEach((value, key) => {
            settings[key] = value;
        });

        try {
            await this.updateSettings(settings);
            this.showToast('Settings saved successfully', 'success');
        } catch (error) {
            this.showToast('Failed to save settings', 'error');
        }
    }

    handleLogoUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.uploadLogo(file);
                    const logoImg = document.querySelector('.logo-upload img');
                    logoImg.src = URL.createObjectURL(file);
                    this.showToast('Logo updated successfully', 'success');
                } catch (error) {
                    this.showToast('Failed to upload logo', 'error');
                }
            }
        };

        input.click();
    }

    handleSearch(query) {
        const navItems = document.querySelectorAll('.nav-item');
        query = query.toLowerCase();

        navItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    // API simulation methods
    async fetchSettings() {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            general: {
                language: 'en',
                timezone: 'asia/jakarta',
                dateFormat: 'dd/mm/yyyy',
                currency: 'idr'
            },
            restaurant: {
                name: 'RestoPro',
                address: 'Jl. Sudirman No. 123, Jakarta',
                phone: '+62 21 1234567',
                email: 'contact@restopro.com',
                taxRate: 10,
                serviceCharge: 5
            }
        };
    }

    async updateSettings(settings) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return settings;
    }

    async uploadLogo(file) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { url: URL.createObjectURL(file) };
    }
}

// Initialize
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
    settingsManager = new SettingsManager();
}); 