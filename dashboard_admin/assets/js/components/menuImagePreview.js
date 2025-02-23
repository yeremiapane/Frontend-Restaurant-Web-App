export class MenuImagePreview {
    constructor() {
        this.initializeImageUpload();
    }

    initializeImageUpload() {
        document.querySelectorAll('.image-upload input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files);
            });
        });

        // Handle remove image
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-image')) {
                e.target.closest('.image-preview').remove();
            }
        });
    }

    handleImageUpload(files) {
        const container = document.querySelector('.image-preview-container');
        const uploadLabel = container.querySelector('.image-upload');

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = this.createImagePreview(e.target.result);
                    container.insertBefore(preview, uploadLabel);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    createImagePreview(src) {
        const div = document.createElement('div');
        div.className = 'image-preview';
        div.innerHTML = `
            <img src="${src}" alt="Preview">
            <button type="button" class="remove-image">
                <i class="fas fa-times"></i>
            </button>
        `;
        return div;
    }
}