document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const button = e.target.querySelector('button');
    const buttonText = button.querySelector('span');
    const loader = button.querySelector('.loader');
    
    // Tampilkan loading
    buttonText.style.opacity = '0';
    loader.style.display = 'block';
    
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const response = await fetch('http://localhost:8080/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email,
                password 
            })
        });

        const data = await response.json();
        
        // Debug log
        console.log('Full login response:', data);
        
        if (response.ok) {
            if (!data.data || !data.data.token || !data.data.user_role) {
                console.error('Invalid response structure:', data);
                throw new Error('Invalid response format from server');
            }
            
            // Simpan token dan role
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('user_role', data.data.user_role);
            
            // Debug log
            console.log('Stored auth data:', {
                token: localStorage.getItem('auth_token'),
                role: localStorage.getItem('user_role')
            });
            
            showAlert('Login berhasil!', 'success');
            
            // Redirect berdasarkan role
            setTimeout(() => {
                const userRole = data.data.user_role.toLowerCase();
                switch(userRole) {
                    case 'admin':
                        window.location.href = '/Frontend/dashboard_admin/index.html';
                        break;
                    default:
                        console.error('Unknown role:', userRole);
                        window.location.href = '/Frontend/auth/login/index.html';
                }
            }, 1000);
        } else {
            throw new Error(data.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Terjadi kesalahan!', 'error');
    } finally {
        buttonText.style.opacity = '1';
        loader.style.display = 'none';
    }
});

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    // Tampilkan alert
    setTimeout(() => alert.classList.add('show'), 100);
    
    // Hapus alert setelah 3 detik
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}