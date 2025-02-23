export class MenuGallery {
    constructor() {
        this.initializeGallery();
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