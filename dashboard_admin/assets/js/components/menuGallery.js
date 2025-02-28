import { api } from '../utils/api.js';

export class MenuGallery {
    constructor() {
        this.menuContainer = document.getElementById('menuGallery');
        if (this.menuContainer) {
            this.loadMenus();
        }
    }

    async loadMenus() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await fetch('http://localhost:8080/menus', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.menuContainer) {
                this.menuContainer.innerHTML = this.renderMenus(data.data || data);
            }
        } catch (error) {
            console.error('Error loading menus:', error);
            if (this.menuContainer) {
                this.menuContainer.innerHTML = `
                    <div class="error-message">
                        Failed to load menus. ${error.message}
                    </div>
                `;
            }
        }
    }

    renderMenus(menus) {
        const menuGallery = document.getElementById('menuGallery');
        if (!menuGallery) return;

        menuGallery.innerHTML = menus.map(menu => `
            <div class="menu-item">
                <div class="menu-image">
                    <img src="${menu.image_url || 'assets/img/default-menu.jpg'}" alt="${menu.name}">
                </div>
                <div class="menu-details">
                    <h3>${menu.name}</h3>
                    <p>${menu.description || ''}</p>
                    <div class="menu-price">
                        Rp ${(menu.price || 0).toLocaleString()}
                    </div>
                </div>
            </div>
        `).join('');
    }

    initializeGallery() {
        document.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.thumbnail');
            if (thumbnail) {
                this.updateMainImage(thumbnail);
            }
        });
    }

    updateMainImage(thumbnail) {
        // Remove active class from all thumbnails
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });

        // Add active class to clicked thumbnail
        thumbnail.classList.add('active');

        // Update main image
        const mainImage = document.getElementById('mainImage');
        const newSrc = thumbnail.querySelector('img').src;
        mainImage.src = newSrc;

        // Add smooth transition
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.style.opacity = '1';
        }, 50);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new MenuGallery();
}); 