export class ModalHandler {
    constructor() {
        this.initializeModals();
    }

    initializeModals() {
        // Open modals
        document.querySelectorAll('[data-modal-target]').forEach(button => {
            button.addEventListener('click', () => {
                const modalId = button.dataset.modalTarget;
                this.openModal(modalId);
            });
        });

        // Close modals
        document.querySelectorAll('[data-modal-close]').forEach(button => {
            button.addEventListener('click', () => {
                const modalId = button.dataset.modalClose;
                this.closeModal(modalId);
            });
        });

        // Close on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Handle payment calculations
        const amountInput = document.querySelector('.payment-input input');
        if (amountInput) {
            amountInput.addEventListener('input', this.calculateChange);
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    calculateChange(e) {
        const received = parseFloat(e.target.value) || 0;
        const total = 165000; // This should be dynamic
        const change = received - total;
        const changeElement = document.querySelector('.change-amount .amount');
        changeElement.textContent = `Rp ${change >= 0 ? change.toLocaleString() : 0}`;
    }
} 