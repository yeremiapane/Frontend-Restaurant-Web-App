class MenuPage {
    constructor() {
        this.menus = [];
        this.categories = [];
        this.initialized = false;
        window.router.registerPageInstance('menu', this);
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const content = await this.render();
            document.getElementById('content-container').innerHTML = content;
            
            await Promise.all([
                this.loadCategories(),
                this.loadMenus()
            ]);
            
            this.setupEventListeners();
            this.initializeImageSliders();
            this.setupWebSocket();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing menu page:', error);
        }
    }

    async render() {
        return `
            <div class="menu-page">
                <div class="page-header">
                    <div class="header-actions">
                        <button id="add-category-btn" class="btn-secondary">
                            <i class="fas fa-plus"></i> Add Category
                        </button>
                        <button id="add-menu-btn" class="btn-primary">
                            <i class="fas fa-plus"></i> Add New Menu
                        </button>
                    </div>
                </div>

                <div class="categories-tabs" id="categories-tabs">
                    <button class="category-tab active" data-category="all">All</button>
                    <!-- Categories will be loaded here -->
                </div>

                <div class="menu-grid" id="menu-grid">
                    <!-- Menus will be loaded here -->
                </div>
            </div>
        `;
    }

    async loadCategories() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load categories');

            const result = await response.json();
            console.log('Categories response:', result); // Untuk debugging

            if (result.status && result.data) {
                // Sesuaikan dengan format response yang menggunakan ID dan Name
                this.categories = result.data.map(category => ({
                    id: category.ID,
                    name: category.Name
                }));
                this.updateCategoryTabs();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadMenus() {
        try {
            console.log("Loading menus...");
            const response = await fetch('http://localhost:8080/menus', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Menu response:", result);

            if (result.status) {
                const menuGrid = document.getElementById('menu-grid');
                if (!menuGrid) {
                    console.error('Menu grid element not found');
                    return;
                }

                if (!result.data || result.data.length === 0) {
                    menuGrid.innerHTML = '<p class="no-menu">No menus found</p>';
                    return;
                }

                // Pastikan kategori sudah dimuat sebelum menampilkan menu
                if (this.categories.length === 0) {
                    await this.loadCategories();
                }

                menuGrid.innerHTML = result.data
                    .map(menu => this.createMenuCard(menu))
                    .join('');
            } else {
                console.error("Failed to load menus:", result.message);
            }
        } catch (error) {
            console.error("Error loading menus:", error);
        }
    }

    createMenuCard(menu) {
        const menuId = menu.id || menu.ID;
        let imageUrls = [];
        try {
            imageUrls = typeof menu.image_urls === 'string' ? JSON.parse(menu.image_urls) : menu.image_urls;
        } catch (e) {
            console.error('Error parsing image URLs:', e);
            imageUrls = [];
        }

        // Format harga dengan pemisah ribuan
        const formattedPrice = menu.price.toLocaleString('id-ID');

        // Cari kategori yang sesuai
        let categoryName = 'Uncategorized';
        if (menu.category && menu.category.name) {
            categoryName = menu.category.name;
        } else if (menu.category_id) {
            const category = this.categories.find(c => c.id === menu.category_id);
            if (category) {
                categoryName = category.name;
            }
        }

        return `
            <div class="menu-card" data-menu-id="${menuId}">
                <div class="menu-image-container">
                    ${imageUrls.length > 0 ? `
                        <div class="image-slider">
                            ${imageUrls.map((url, index) => `
                                <img src="${url}" alt="${menu.name}" class="menu-image">
                            `).join('')}
                        </div>
                        ${imageUrls.length > 1 ? `
                            <button type="button" class="slider-nav prev-btn" onclick="menuPage.slideImage('prev', ${menuId})">❮</button>
                            <button type="button" class="slider-nav next-btn" onclick="menuPage.slideImage('next', ${menuId})">❯</button>
                        ` : ''}
                    ` : '<div class="no-image">No Image</div>'}
                </div>
                <div class="menu-content">
                    <h3 class="menu-title">${menu.name}</h3>
                    <p class="menu-category">${categoryName}</p>
                    <p class="menu-price">Rp ${formattedPrice}</p>
                    <p class="menu-stock">Stock: ${menu.stock}</p>
                    <p class="menu-description">${menu.description || 'No description available'}</p>
                    <div class="menu-actions">
                        <button type="button" class="btn btn-edit" onclick="menuPage.showEditModal(${menuId})">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </button>
                        <button type="button" class="btn btn-delete" onclick="menuPage.deleteMenu(${menuId})">
                            <i class="fas fa-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    updateCategoryTabs() {
        const tabsContainer = document.getElementById('categories-tabs');
        if (!tabsContainer) return;

        console.log('Categories data:', this.categories); // Debug log

        const categoryTabs = this.categories.map(category => `
            <button class="category-tab" data-category="${category.id}">
                ${category.name}
            </button>
        `).join('');

        tabsContainer.innerHTML = `
            <button class="category-tab active" data-category="all">All</button>
            ${categoryTabs}
        `;

        // Tambahkan event listener untuk tab kategori
        const tabs = tabsContainer.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Filter menu
                const categoryId = tab.dataset.category;
                this.filterMenusByCategory(categoryId);
            });
        });
    }

    updateMenuList() {
        const menuList = document.getElementById('menu-list');
        if (!menuList) return;

        menuList.innerHTML = this.menus.map(menu => `
            <div class="menu-card">
                <div class="menu-images">
                    ${menu.images && menu.images.length > 0 ? `
                        <div class="image-slider">
                            ${menu.images.map(url => `
                                <img src="${url}" alt="${menu.name}" class="menu-image">
                            `).join('')}
                        </div>
                    ` : '<div class="no-image">No Image</div>'}
                </div>
                <div class="menu-info">
                    <h3>${menu.name}</h3>
                    <p class="category">${this.getCategoryName(menu.category_id)}</p>
                    <p class="price">Rp ${menu.price.toLocaleString('id-ID')}</p>
                    <p class="stock">Stock: ${menu.stock}</p>
                    <p class="description">${menu.description || '-'}</p>
                </div>
                <div class="menu-actions">
                    <button onclick="menuPage.showEditModal(${menu.id})" class="btn-edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="menuPage.deleteMenu(${menu.id})" class="btn-delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Inisialisasi image slider jika diperlukan
        this.initializeImageSliders();
    }

    initializeImageSliders() {
        document.querySelectorAll('.image-slider').forEach(slider => {
            let startX;
            let scrollLeft;

            slider.addEventListener('touchstart', (e) => {
                startX = e.touches[0].pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
            });

            slider.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const x = e.touches[0].pageX - slider.offsetLeft;
                const walk = (x - startX);
                slider.scrollLeft = scrollLeft - walk;
            });
        });
    }

    setupEventListeners() {
        document.getElementById('add-menu-btn').addEventListener('click', () => {
            this.showAddModal();
        });

        document.getElementById('add-category-btn').addEventListener('click', () => {
            this.showAddCategoryModal();
        });

        const categoriesTabsContainer = document.getElementById('categories-tabs');
        if (categoriesTabsContainer) {
            categoriesTabsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('category-tab')) {
                    const categoryId = e.target.dataset.category;
                    console.log('Category tab clicked:', categoryId);
                    
                    document.querySelectorAll('.category-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    e.target.classList.add('active');

                    this.filterMenusByCategory(categoryId);
                }
            });
        }
    }

    async showAddModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Menu</h2>
                    <button type="button" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-menu-form">
                        <div class="form-group">
                            <label for="menu-name">Name *</label>
                            <input type="text" id="menu-name" required>
                        </div>
                        <div class="form-group">
                            <label for="menu-category">Category *</label>
                            <select id="menu-category" required>
                                <option value="">Select Category</option>
                                ${this.categories.map(category => 
                                    `<option value="${category.id}">${category.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="menu-price">Price (Rp) *</label>
                            <input type="text" 
                                   id="menu-price" 
                                   required>
                        </div>
                        <div class="form-group">
                            <label for="menu-stock">Stock *</label>
                            <input type="text" 
                                   id="menu-stock" 
                                   required 
                                   pattern="[0-9]*"
                                   inputmode="numeric"
                                   onkeypress="return /[0-9]/.test(event.key)"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </div>
                        <div class="form-group">
                            <label for="menu-description">Description</label>
                            <textarea id="menu-description"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Images *</label>
                            <div class="image-upload-container">
                                <div class="image-preview-container" id="new-image-preview"></div>
                                <input type="file" id="menu-images" multiple accept="image/*" class="image-input" required>
                                <label for="menu-images" class="image-upload-label">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <span>Drop images here or click to upload</span>
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="menuPage.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Add Menu</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupModalEventListeners(modal, 'add');
        this.setupImageUpload(modal);
    }

    setupImageUpload(modal) {
        const imageInput = modal.querySelector('#menu-images');
        const previewContainer = modal.querySelector('#new-image-preview');
        const uploadLabel = modal.querySelector('.image-upload-label');

        if (!imageInput || !previewContainer || !uploadLabel) {
            console.error('Required elements not found:', {
                imageInput: !!imageInput,
                previewContainer: !!previewContainer,
                uploadLabel: !!uploadLabel
            });
            return;
        }

        // Drag and drop functionality
        uploadLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadLabel.classList.add('dragover');
        });

        uploadLabel.addEventListener('dragleave', () => {
            uploadLabel.classList.remove('dragover');
        });

        uploadLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadLabel.classList.remove('dragover');
            const files = e.dataTransfer.files;
            handleFiles(files);
        });

        imageInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        const handleFiles = (files) => {
            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) {
                    this.showNotification('Hanya file gambar yang diperbolehkan', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewWrapper = document.createElement('div');
                    previewWrapper.className = 'image-preview-wrapper';
                    previewWrapper.innerHTML = `
                        <div class="preview-image-container">
                            <img src="${e.target.result}" alt="Preview" class="preview-image">
                            <button type="button" class="remove-preview-image">×</button>
                        </div>
                    `;
                    previewContainer.appendChild(previewWrapper);

                    // Remove image functionality
                    previewWrapper.querySelector('.remove-preview-image').addEventListener('click', () => {
                        previewWrapper.remove();
                    });
                };
                reader.readAsDataURL(file);
            });
        };

        // Tambahkan style untuk preview
        const style = document.createElement('style');
        style.textContent = `
            .image-preview-wrapper {
                display: inline-block;
                margin: 5px;
                position: relative;
                width: 120px;
                height: 120px;
            }
            .preview-image-container {
                position: relative;
                width: 100%;
                height: 100%;
            }
            .preview-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            }
            .remove-preview-image {
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(255, 0, 0, 0.8);
                color: white;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.2s;
            }
            .remove-preview-image:hover {
                background: rgba(255, 0, 0, 1);
                transform: scale(1.1);
            }
            .image-upload-container {
                margin-top: 10px;
                border: 2px dashed #ccc;
                border-radius: 8px;
                padding: 10px;
            }
            #new-image-preview {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 15px;
                max-height: 260px;
                overflow-y: auto;
                padding: 5px;
                border-bottom: 1px solid #eee;
            }
            .image-upload-label {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #f8f9fa;
                border-radius: 8px;
                min-height: 120px;
            }
            .image-upload-label.dragover {
                background-color: rgba(0, 123, 255, 0.1);
                border-color: #007bff;
            }
            .image-upload-label i {
                font-size: 32px;
                margin-bottom: 10px;
                color: #666;
            }
            .image-upload-label span {
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .image-input {
                display: none;
            }

            /* Scrollbar styling untuk preview container */
            #new-image-preview::-webkit-scrollbar {
                width: 6px;
            }
            #new-image-preview::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            #new-image-preview::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 3px;
            }
            #new-image-preview::-webkit-scrollbar-thumb:hover {
                background: #555;
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .image-upload-label {
                    background: #2d3748;
                }
                .image-upload-label span,
                .image-upload-label i {
                    color: #a0aec0;
                }
                #new-image-preview {
                    border-bottom-color: #4a5568;
                }
                #new-image-preview::-webkit-scrollbar-track {
                    background: #2d3748;
                }
                #new-image-preview::-webkit-scrollbar-thumb {
                    background: #4a5568;
                }
                #new-image-preview::-webkit-scrollbar-thumb:hover {
                    background: #718096;
                }
            }
        `;
        document.head.appendChild(style);
    }

    async showEditModal(menuId) {
        try {
            if (!menuId || menuId === 'undefined') {
                throw new Error('Invalid menu ID');
            }

            console.log("Fetching menu with ID:", menuId);

            const response = await fetch(`http://localhost:8080/admin/menus/${menuId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch menu data: ${errorData.message || response.status}`);
            }
            
            const result = await response.json();
            console.log("Menu detail response:", result);
            
            if (!result.data) {
                throw new Error('Menu data not found');
            }

            const menu = result.data;
            const editMenuId = menu.ID || menu.id;

            // Parse image URLs
            let imageUrls = [];
            try {
                imageUrls = typeof menu.image_urls === 'string' ? JSON.parse(menu.image_urls) : menu.image_urls;
            } catch (e) {
                console.error('Error parsing image URLs:', e);
                imageUrls = [];
            }

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Menu</h2>
                        <button type="button" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-menu-form">
                            <div class="form-group">
                                <label for="menu-name">Name *</label>
                                <input type="text" id="menu-name" value="${menu.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="menu-category">Category *</label>
                                <select id="menu-category" required>
                                    <option value="">Select Category</option>
                                    ${this.categories.map(category => 
                                        `<option value="${category.id}" ${category.id === menu.category_id ? 'selected' : ''}>
                                            ${category.name}
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="menu-price">Price (Rp) *</label>
                                <input type="text" 
                                       id="menu-price" 
                                       value="${menu.price.toLocaleString('id-ID')}"
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="menu-stock">Stock *</label>
                                <input type="text" 
                                       id="menu-stock" 
                                       value="${menu.stock}"
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="menu-description">Description</label>
                                <textarea id="menu-description">${menu.description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Current Images</label>
                                <div class="current-images-container">
                                    <div class="image-slider" id="edit-image-slider">
                                        ${imageUrls.map((url, index) => `
                                            <div class="image-slide">
                                                <img src="${url}" alt="Menu image ${index + 1}">
                                                <button type="button" class="remove-image" data-url="${url}">×</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    ${imageUrls.length > 1 ? `
                                        <button type="button" class="slider-nav prev-btn">❮</button>
                                        <button type="button" class="slider-nav next-btn">❯</button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Add New Images</label>
                                <div class="image-upload-container">
                                    <div class="image-preview-container" id="new-image-preview"></div>
                                    <input type="file" id="menu-images" multiple accept="image/*" class="image-input">
                                    <label for="menu-images" class="image-upload-label">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <span>Drop new images here or click to upload</span>
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="menuPage.closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Update Menu</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Setup image slider controls
            const slider = modal.querySelector('#edit-image-slider');
            const prevBtn = modal.querySelector('.prev-btn');
            const nextBtn = modal.querySelector('.next-btn');

            if (prevBtn && nextBtn) {
                prevBtn.addEventListener('click', () => this.slideEditImage('prev', slider));
                nextBtn.addEventListener('click', () => this.slideEditImage('next', slider));
            }

            // Setup remove image buttons
            modal.querySelectorAll('.remove-image').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const url = e.target.dataset.url;
                    const slide = e.target.closest('.image-slide');
                    if (slide) {
                        slide.remove();
                        this.removedImageUrls = this.removedImageUrls || [];
                        this.removedImageUrls.push(url);
                    }
                });
            });

            this.setupModalEventListeners(modal, 'edit', editMenuId);
            this.setupImageUpload(modal);

            // Add custom styles for the image slider
            const style = document.createElement('style');
            style.textContent = `
                .current-images-container {
                    position: relative;
                    margin: 10px 0;
                    overflow: hidden;
                }
                .image-slider {
                    display: flex;
                    overflow-x: hidden;
                    scroll-behavior: smooth;
                    gap: 10px;
                }
                .image-slide {
                    flex: 0 0 auto;
                    position: relative;
                    width: 200px;
                }
                .image-slide img {
                    width: 100%;
                    height: 150px;
                    object-fit: cover;
                    border-radius: 4px;
                }
                .slider-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    border: none;
                    padding: 10px;
                    cursor: pointer;
                    z-index: 1;
                }
                .prev-btn {
                    left: 0;
                }
                .next-btn {
                    right: 0;
                }
                .remove-image {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(255, 0, 0, 0.7);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);

        } catch (error) {
            console.error('Error showing edit modal:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    slideEditImage(direction, slider) {
        const scrollAmount = direction === 'next' ? 200 : -200;
        slider.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    setupModalEventListeners(modal, mode, menuId = null) {
        const form = modal.querySelector('form');
        const closeBtn = modal.querySelector('.close-btn');
        this.removedImageUrls = []; // Reset removed images array

        // Setup remove image buttons untuk gambar yang sudah ada
        modal.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.url;
                const slide = e.target.closest('.image-slide');
                if (slide) {
                    slide.remove();
                    this.removedImageUrls = this.removedImageUrls || [];
                    this.removedImageUrls.push(url);
                    console.log('Image marked for removal:', url); // Debug log
                }
            });
        });

        closeBtn.addEventListener('click', () => this.closeModal());

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Ambil dan validasi data
                const name = form.querySelector('#menu-name').value.trim();
                const categoryId = parseInt(form.querySelector('#menu-category').value);
                
                // Ambil nilai harga dan bersihkan formatnya
                let priceValue = form.querySelector('#menu-price').value;
                priceValue = priceValue.replace(/\D/g, ''); // Hapus semua karakter non-digit
                
                // Ambil nilai stock
                let stockValue = form.querySelector('#menu-stock').value;
                stockValue = stockValue.replace(/\D/g, '');
                
                const description = form.querySelector('#menu-description').value.trim();

                // Debug log
                console.log('Submitting values:', {
                    name,
                    categoryId,
                    price: priceValue,
                    stock: stockValue,
                    description,
                    removedImages: this.removedImageUrls
                });

                // Validasi data
                if (!name || !categoryId || !priceValue || !stockValue) {
                    throw new Error('Mohon isi semua field yang wajib dengan nilai yang valid');
                }

                // Buat FormData untuk mengirim data termasuk gambar
                const formData = new FormData();
                formData.append('name', name);
                formData.append('category_id', categoryId.toString());
                formData.append('price', priceValue);
                formData.append('stock', stockValue);
                formData.append('description', description);

                // Tambahkan daftar gambar yang dihapus jika ada
                if (this.removedImageUrls && this.removedImageUrls.length > 0) {
                    formData.append('removed_images', JSON.stringify(this.removedImageUrls));
                    console.log('Sending removed images:', JSON.stringify(this.removedImageUrls)); // Debug log
                }

                // Tambahkan file gambar baru jika ada
                const imageInput = form.querySelector('#menu-images');
                if (imageInput && imageInput.files.length > 0) {
                    Array.from(imageInput.files).forEach(file => {
                        formData.append('images', file);
                    });
                    console.log('Adding new images:', imageInput.files.length, 'files'); // Debug log
                }

                let endpoint = mode === 'add' ? 
                    'http://localhost:8080/admin/menus' : 
                    `http://localhost:8080/admin/menus/${menuId}`;

                let method = mode === 'add' ? 'POST' : 'PATCH';

                // Debug: Log FormData contents
                for (let pair of formData.entries()) {
                    console.log('FormData:', pair[0], pair[1]);
                }

                const response = await fetch(endpoint, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to ${mode} menu`);
                }

                const result = await response.json();
                console.log(`${mode.charAt(0).toUpperCase() + mode.slice(1)} success:`, result);

                // Reset removedImageUrls setelah berhasil update
                this.removedImageUrls = [];
                
                this.closeModal();
                await this.loadMenus();
                this.showNotification(`Menu berhasil ${mode === 'add' ? 'ditambahkan' : 'diperbarui'}`, 'success');
                
            } catch (error) {
                console.error(`Error ${mode}ing menu:`, error);
                this.showNotification(`Gagal ${mode === 'add' ? 'menambahkan' : 'memperbarui'} menu: ${error.message}`, 'error');
            }
        });

        // Format harga saat input
        const priceInput = form.querySelector('#menu-price');
        priceInput.addEventListener('input', function(e) {
            // Hapus karakter non-digit
            let value = this.value.replace(/\D/g, '');
            
            // Jika kosong, set nilai kosong
            if (value === '') {
                this.value = '';
                return;
            }
            
            // Konversi ke number untuk format
            const number = parseInt(value);
            
            // Format dengan pemisah ribuan
            this.value = number.toLocaleString('id-ID');
        });

        // Format stock saat input (hanya terima angka)
        const stockInput = form.querySelector('#menu-stock');
        stockInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        this.removedImageUrls = [];
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    filterMenusByCategory(categoryId) {
        console.log('Filtering by category:', categoryId); // Debug log

        if (categoryId === 'all') {
            // Load semua menu
            this.loadMenus();
        } else {
            // Load menu berdasarkan kategori dan pastikan categoryId adalah number
            const numericCategoryId = parseInt(categoryId);
            if (isNaN(numericCategoryId)) {
                console.error('Invalid category ID:', categoryId);
                return;
            }
            this.loadMenusByCategory(numericCategoryId);
        }
    }

    async loadMenusByCategory(categoryId) {
        try {
            const response = await fetch(`http://localhost:8080/menus/by-category?category=${categoryId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch menus (Status: ${response.status})`);
            }

            const result = await response.json();
            console.log('Menus by category response:', result);

            // Update tampilan menu grid
            const menuGrid = document.getElementById('menu-grid');
            if (!menuGrid) {
                console.error('Menu grid element not found');
                return;
            }

            // Jika tidak ada menu dalam kategori ini
            if (!result.data || result.data.length === 0) {
                menuGrid.innerHTML = '<div class="no-menu">Tidak ada menu dalam kategori ini</div>';
                return;
            }

            // Tampilkan menu yang ditemukan
            menuGrid.innerHTML = result.data
                .map(menu => this.createMenuCard(menu))
                .join('');

            // Initialize image sliders untuk menu yang baru ditampilkan
            this.initializeImageSliders();

        } catch (error) {
            console.error('Error loading menus by category:', error);
            const menuGrid = document.getElementById('menu-grid');
            if (menuGrid) {
                menuGrid.innerHTML = `<div class="error-message">Gagal memuat menu: ${error.message}</div>`;
            }
        }
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : 'Uncategorized';
    }

    setupWebSocket() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const ws = new WebSocket(`ws://localhost:8080/ws/admin?token=${token}`);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Reconnect after 5 seconds
            setTimeout(() => this.setupWebSocket(), 5000);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'menu_updated') {
                    console.log('Menu updated, reloading...');
                    this.loadMenus();
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }

    slideImage(direction, menuId) {
        const menuCard = document.querySelector(`.menu-card[data-menu-id="${menuId}"]`);
        const slider = menuCard.querySelector('.image-slider');
        
        if (!slider) return;

        const scrollAmount = direction === 'next' ? slider.offsetWidth : -slider.offsetWidth;
        slider.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    showAddCategoryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Category</h2>
                    <button type="button" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-category-form">
                        <div class="form-group">
                            <label for="category-name">Category Name *</label>
                            <input type="text" id="category-name" required>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="menuPage.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Add Category</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupCategoryModalEventListeners(modal);
    }

    setupCategoryModalEventListeners(modal) {
        const form = modal.querySelector('#add-category-form');
        const closeBtn = modal.querySelector('.close-btn');

        closeBtn.addEventListener('click', () => this.closeModal());

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const name = form.querySelector('#category-name').value.trim();

                if (!name) {
                    throw new Error('Category name is required');
                }

                const response = await fetch('http://localhost:8080/admin/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ name })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to create category');
                }

                const result = await response.json();
                console.log('Category created:', result);

                this.closeModal();
                await this.loadCategories();
                this.showNotification('Category added successfully', 'success');
                
            } catch (error) {
                console.error('Error creating category:', error);
                this.showNotification(`Failed to create category: ${error.message}`, 'error');
            }
        });
    }
}

// Initialize the menu page
window.menuPage = new MenuPage();

// Register the menu page with the router
window.router.addRoute('menu', async () => {
    await window.menuPage.initialize();
});

// Tambahkan CSS untuk pesan error dan no menu
const style = document.createElement('style');
style.textContent = `
    .error-message {
        color: #dc2626;
        padding: 1rem;
        text-align: center;
        background: #fee2e2;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }
    
    .no-menu {
        color: #6b7280;
        padding: 2rem;
        text-align: center;
        background: #f3f4f6;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }

    .header-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
    }

    .btn-secondary {
        background-color: #4b5563;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: background-color 0.2s;
    }

    .btn-secondary:hover {
        background-color: #374151;
    }

    .btn-secondary i {
        font-size: 0.875rem;
    }
`;
document.head.appendChild(style); 