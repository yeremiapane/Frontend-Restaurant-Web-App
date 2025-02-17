class OrderDetailModal {
    constructor() {
        this.modal = document.getElementById('orderDetailModal');
        this.bindEvents();
    }

    bindEvents() {
        const closeBtn = this.modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    async show(orderId) {
        console.log('Showing details for order:', orderId); // Debug log
        this.modal.classList.add('active');
        // Fetch and populate order details here
        // For now, we will just simulate it
        this.populateOrderDetails(orderId);
    }

    hide() {
        this.modal.classList.remove('active');
    }

    populateOrderDetails(orderId) {
        // Simulate populating order details
        this.modal.querySelector('.order-id').textContent = orderId;
        // Populate other details as needed
    }
}

// Initialize modal handler
document.addEventListener('DOMContentLoaded', () => {
    window.orderDetailModal = new OrderDetailModal();
});

// Usage example:
// orderDetailModal.show('ORD001'); 