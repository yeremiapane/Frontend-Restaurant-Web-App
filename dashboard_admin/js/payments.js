/**
 * Payment module for admin dashboard
 */
class PaymentsManager {
    constructor() {
        this.paymentData = {};
        this.midtransConfig = {};
        this.init();
    }

    async init() {
        // Initialize payment settings
        await this.fetchMidtransConfig();
        this.setupEventListeners();
    }

    async fetchMidtransConfig() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/admin/payments/config`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch Midtrans configuration');
            }
            const data = await response.json();
            this.midtransConfig = data.data;
            console.log('Midtrans config loaded:', this.midtransConfig);
        } catch (error) {
            console.error('Error fetching Midtrans config:', error);
            this.showNotification('Failed to load payment configuration', 'error');
        }
    }

    setupEventListeners() {
        // Listen for payment events from WebSocket
        if (window.wsClient) {
            console.log('[PaymentsManager] Setting up WebSocket listeners');
            
            window.wsClient.addEventListener('payment_update', (data) => {
                console.log('[PaymentsManager] Payment update received:', data);
                this.handlePaymentUpdate(data);
            });
            
            window.wsClient.addEventListener('payment_success', (data) => {
                console.log('[PaymentsManager] Payment success received:', data);
                this.handlePaymentSuccess(data);
            });
            
            window.wsClient.addEventListener('payment_failed', (data) => {
                console.log('[PaymentsManager] Payment failed received:', data);
                this.handlePaymentFailed(data);
            });
            
            window.wsClient.addEventListener('payment_expired', (data) => {
                console.log('[PaymentsManager] Payment expired received:', data);
                this.handlePaymentExpired(data);
            });
            
            // Status koneksi untuk debugging
            window.wsClient.addEventListener('connection_change', (status) => {
                console.log('[PaymentsManager] WebSocket connection status changed:', status);
            });
            
            console.log('[PaymentsManager] WebSocket listeners setup complete');
        } else {
            console.warn('[PaymentsManager] WebSocket client not available');
        }
    }

    showSpinner() {
        // Tambahkan spinner ke body
        if (!document.getElementById('global-spinner')) {
            const spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            spinner.className = 'global-spinner';
            spinner.innerHTML = '<div class="spinner-content"><div class="spinner"></div><p>Memproses...</p></div>';
            document.body.appendChild(spinner);
        }
    }
    
    hideSpinner() {
        // Hapus spinner dari body
        const spinner = document.getElementById('global-spinner');
        if (spinner) {
            document.body.removeChild(spinner);
        }
    }

    async createPayment(orderData) {
        try {
            // Tampilkan loading spinner
            this.showSpinner();
            
            // Generate a reference ID
            const referenceId = `REF-${orderData.id}-${Date.now()}`;
            
            // First attempt: without expired_at to avoid database issues
            let payload = {
                order_id: orderData.id,
                amount: orderData.total_amount,
                payment_method: orderData.payment_method || 'cash',
                reference_id: referenceId
            };
            
            // Add cash_received for cash payments if available
            if (orderData.payment_method === 'cash' && orderData.cash_received) {
                payload.cash_received = orderData.cash_received;
            }
            
            console.log('Payment API request payload (first attempt):', payload);
            
            try {
                const response = await fetch(`${window.API_BASE_URL}/admin/payments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                // Read raw response before processing
                const responseText = await response.text();
                console.log('Raw API response:', responseText);
                
                // Parse response if it's JSON
                let result;
                try {
                    result = JSON.parse(responseText);
                    console.log('Parsed API response:', result);
                    
                    // Debug struktur respons
                    if (result.data) {
                        console.log('Payment response structure:', {
                            directQRImage: result.data.qr_image_url ? 'exists' : 'missing',
                            paymentExists: result.data.payment ? 'exists' : 'missing',
                            qrImageInPayment: result.data.payment && result.data.payment.qr_image_url ? 'exists' : 'missing',
                            responseKeys: Object.keys(result.data),
                            paymentKeys: result.data.payment ? Object.keys(result.data.payment) : 'N/A',
                            orderExists: result.data.order ? 'exists' : 'missing'
                        });
                        
                        // Log full response with sensitive data redacted
                        const safeResult = { ...result };
                        if (safeResult.data && safeResult.data.payment) {
                            safeResult.data.payment = { 
                                ...safeResult.data.payment,
                                qr_code: safeResult.data.payment.qr_code ? '[REDACTED]' : null 
                            };
                        }
                        console.log('Full payment response (safe):', safeResult);
                    }
                } catch (e) {
                    console.error('Error parsing response as JSON:', e);
                    throw new Error('Invalid response format from server');
                }
                
                if (response.ok) {
                    console.log('Payment API succeeded on first attempt');
                    this.hideSpinner();
                    return result.data;
                }
                
                // Response not OK, but we've processed it already - will throw below
                console.error('API error response:', result);
                throw new Error(result.message || `Error ${response.status}: Failed to create payment`);
                
            } catch (firstAttemptError) {
                console.warn('First payment attempt failed:', firstAttemptError.message);
                console.warn('Trying second attempt with different payload');
                
                // Hide any loading spinners from the first attempt
                this.hideSpinner();
                
                // Return null to signal to the caller that they should use the fallback method
                return null;
            }
            
        } catch (error) {
            // Sembunyikan loading spinner jika terjadi error
            this.hideSpinner();
            
            console.error('Error creating payment:', error);
            this.showNotification(error.message || 'Failed to create payment', 'error');
            throw error;
        }
    }

    async verifyPayment(paymentId) {
        try {
            const response = await fetch(`${window.API_BASE_URL}/admin/payments/${paymentId}/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to verify payment');
            }

            const result = await response.json();
            this.showNotification('Payment verified successfully', 'success');
            return result.data;
        } catch (error) {
            console.error('Error verifying payment:', error);
            this.showNotification(error.message || 'Failed to verify payment', 'error');
            throw error;
        }
    }

    async getPayments(orderId = null) {
        try {
            const url = orderId ? 
                `${window.API_BASE_URL}/admin/payments?order_id=${orderId}` : 
                `${window.API_BASE_URL}/admin/payments`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payments');
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching payments:', error);
            this.showNotification('Failed to fetch payments', 'error');
            return [];
        }
    }

    async startPaymentStatusPolling(paymentId, intervalSeconds = 5, maxAttempts = 60) {
        let attempts = 0;
        const checkInterval = intervalSeconds * 1000;
        
        const checkPaymentStatus = async () => {
            try {
                attempts++;
                if (attempts > maxAttempts) {
                    clearInterval(intervalId);
                    this.showNotification('Payment verification timeout', 'warning');
                    return;
                }

                const payment = await this.getPaymentById(paymentId);
                
                if (payment.status === 'success') {
                    clearInterval(intervalId);
                    this.handlePaymentSuccess({payment});
                } else if (payment.status === 'failed' || payment.status === 'cancelled') {
                    clearInterval(intervalId);
                    this.handlePaymentFailed({payment});
                } else if (payment.status === 'expired') {
                    clearInterval(intervalId);
                    this.handlePaymentExpired({payment});
                }
                // For pending, continue polling
            } catch (error) {
                console.error('Error polling payment status:', error);
            }
        };

        const intervalId = setInterval(checkPaymentStatus, checkInterval);
        // Return the interval ID so it can be cleared externally if needed
        return intervalId;
    }

    async getPaymentById(paymentId) {
        try {
            const response = await fetch(`${window.API_BASE_URL}/admin/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment');
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error(`Error fetching payment ${paymentId}:`, error);
            throw error;
        }
    }

    handlePaymentUpdate(data) {
        console.log('[PaymentsManager] Processing payment update:', data);
        // Extract payment data from standardized format
        const payment = data.payment || data;
        const orderId = payment.order_id;
        
        // Trigger an event that other components can listen to
        const event = new CustomEvent('paymentUpdated', { detail: { payment, orderId } });
        window.dispatchEvent(event);
        
        // Show notification
        this.showNotification(`Payment for Order #${orderId} updated`, 'info');
    }

    handlePaymentSuccess(data) {
        console.log('[PaymentsManager] Processing payment success:', data);
        // Extract payment data from standardized format
        const payment = data.payment || data;
        const orderId = payment.order_id;
        
        // Create success notification
        this.showNotification(`Payment for Order #${orderId} successful`, 'success');
        
        // Trigger a custom event for other components
        const event = new CustomEvent('paymentSuccess', { detail: { payment, orderId } });
        window.dispatchEvent(event);
        
        // Update UI if payment modal is open
        this.updatePaymentUI(payment, 'success');
    }

    handlePaymentFailed(data) {
        console.log('[PaymentsManager] Processing payment failure:', data);
        // Extract payment data from standardized format
        const payment = data.payment || data;
        const orderId = payment.order_id;
        
        // Create error notification
        this.showNotification(`Payment for Order #${orderId} failed`, 'error');
        
        // Trigger a custom event for other components
        const event = new CustomEvent('paymentFailed', { detail: { payment, orderId } });
        window.dispatchEvent(event);
        
        // Update UI if payment modal is open
        this.updatePaymentUI(payment, 'failed');
    }

    handlePaymentExpired(data) {
        console.log('[PaymentsManager] Processing payment expiration:', data);
        // Extract payment data from standardized format
        const payment = data.payment || data;
        const orderId = payment.order_id;
        
        // Create warning notification
        this.showNotification(`Payment for Order #${orderId} expired`, 'warning');
        
        // Trigger a custom event for other components
        const event = new CustomEvent('paymentExpired', { detail: { payment, orderId } });
        window.dispatchEvent(event);
        
        // Update UI if payment modal is open
        this.updatePaymentUI(payment, 'expired');
    }

    // Helper function to update payment UI when payment status changes
    updatePaymentUI(payment, status) {
        // Cek apakah ada modal pembayaran yang terbuka untuk order ini
        const paymentModal = document.querySelector(`.payment-modal[data-order-id="${payment.order_id}"]`);
        if (!paymentModal) return;
        
        // Update UI berdasarkan status
        if (status === 'success') {
            // Tampilkan pesan sukses
            const modalContent = paymentModal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <div class="payment-success-container">
                    <div class="success-icon"><i class="fas fa-check-circle"></i></div>
                    <h3>Pembayaran Berhasil</h3>
                    <div class="payment-summary">
                        <div class="summary-row">
                            <div class="summary-label">Order ID:</div>
                            <div class="summary-value">#${payment.order_id}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">Metode Pembayaran:</div>
                            <div class="summary-value">${payment.payment_method === 'qris' ? 'QRIS' : 'Cash'}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">Jumlah:</div>
                            <div class="summary-value">${this.formatCurrency(payment.amount)}</div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-label">Status:</div>
                            <div class="summary-value">Sukses</div>
                        </div>
                    </div>
                    <button id="print-receipt-btn" class="btn-primary">
                        <i class="fas fa-print"></i> Cetak Struk
                    </button>
                </div>
            `;
            
            // Add event listener for print button
            const printBtn = modalContent.querySelector('#print-receipt-btn');
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    // Trigger print receipt event
                    const event = new CustomEvent('printReceipt', { detail: { orderId: payment.order_id } });
                    window.dispatchEvent(event);
                });
            }
            
            // Add success class to modal
            paymentModal.classList.add('payment-success');
        } else if (status === 'failed' || status === 'expired') {
            // Tampilkan pesan error/expired
            const modalContent = paymentModal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <div class="payment-error">
                    <div class="error-icon">
                        <i class="fas ${status === 'failed' ? 'fa-times-circle' : 'fa-clock'}"></i>
                    </div>
                    <h3>Pembayaran ${status === 'failed' ? 'Gagal' : 'Kedaluwarsa'}</h3>
                    <p>${status === 'failed' ? 'Terjadi kesalahan dalam proses pembayaran.' : 'Waktu pembayaran telah berakhir.'}</p>
                    <div class="error-actions">
                        <button class="btn-primary try-again-btn">Coba Lagi</button>
                        <button class="btn-secondary close-modal-btn">Tutup</button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const tryAgainBtn = modalContent.querySelector('.try-again-btn');
            const closeBtn = modalContent.querySelector('.close-modal-btn');
            
            if (tryAgainBtn) {
                tryAgainBtn.addEventListener('click', () => {
                    // Trigger event to retry payment
                    const event = new CustomEvent('retryPayment', { detail: { orderId: payment.order_id } });
                    window.dispatchEvent(event);
                });
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    // Close modal
                    document.body.removeChild(paymentModal);
                });
            }
        }
    }

    showNotification(message, type = 'info') {
        // Use the global notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback to console
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Create a simple notification if no global system exists
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="material-icons">${this.getIconForType(type)}</i>
                    <span>${message}</span>
                    <button class="close-btn"><i class="material-icons">close</i></button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Remove notification after 5 seconds
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 5000);
            
            // Add close button handler
            const closeBtn = notification.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    notification.classList.add('fade-out');
                    setTimeout(() => notification.remove(), 500);
                });
            }
        }
    }
    
    getIconForType(type) {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }
}

// Initialize payments manager
window.paymentsManager = new PaymentsManager(); 