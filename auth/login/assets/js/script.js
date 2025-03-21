document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const button = e.target.querySelector('button');
    
    try {
        // Show loading state
        button.classList.add('loading');
        
        const response = await fetch('http://localhost:8080/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        // Log response untuk debug
        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        // Parse response text ke JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            throw new Error('Invalid response format from server');
        }
        
        if (response.ok) {
            console.log('Login response data:', data);
            
            // Periksa format response
            if (!data.data || !data.data.token || !data.data.user_role) {
                throw new Error('Invalid response format from server');
            }
            
            // Save token dan role
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user_role', data.data.user_role);
            
            // Show success message
            showAlert('Login berhasil!', 'success');
            
            // Redirect based on role
            const role = data.data.user_role.toLowerCase();
            console.log('User role:', role);
            
            setTimeout(() => {
                switch (role) {
                    case 'chef':
                        window.location.href = '/Frontend/dashboard_chef/index.html';
                        break;
                    case 'admin':
                        window.location.href = '/Frontend/dashboard_admin/index.html';
                        break;
                    case 'waiter':
                        window.location.href = '/Frontend/dashboard_waiter/index.html';
                        break;
                    default:
                        showAlert('Role tidak valid', 'error');
                }
            }, 1000); // Delay 1 detik untuk memastikan alert terlihat
        } else {
            throw new Error(data.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Terjadi kesalahan saat login', 'error');
    } finally {
        // Hide loading state
        button.classList.remove('loading');
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