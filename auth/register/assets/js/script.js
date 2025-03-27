document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const button = e.target.querySelector('button[type="submit"]');
    
    if (password !== confirmPassword) {
        showAlert('Password tidak cocok!', 'error');
        return;
    }
    
    // Show loading state
    button.classList.add('loading');
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, role, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Pendaftaran berhasil!', 'success');
            setTimeout(() => {
                window.location.href = '../login/index.html';
            }, 1500);
        } else {
            throw new Error(data.message || 'Pendaftaran gagal');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(error.message || 'Terjadi kesalahan saat mendaftar', 'error');
    } finally {
        // Hide loading state
        button.classList.remove('loading');
    }
});

function showAlert(message, type = 'info') {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    alertElement.textContent = message;
    
    // Add to page
    document.body.appendChild(alertElement);
    
    // Show
    setTimeout(() => {
        alertElement.classList.add('show');
    }, 10);
    
    // Auto-hide
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }, 3000);
}
