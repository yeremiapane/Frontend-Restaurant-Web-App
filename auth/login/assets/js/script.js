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
            
            // Save token dan data user
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user_role', data.data.user_role);
            
            // Simpan data user lengkap untuk digunakan di dashboard
            const userData = {
                id: data.data.user_id || 1,
                name: data.data.user_name || 'User',
                role: data.data.user_role.toLowerCase(),
                email: email
            };
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Validasi token disimpan dengan benar
            const savedToken = localStorage.getItem('token');
            const savedRole = localStorage.getItem('user_role');
            console.log('Token tersimpan:', Boolean(savedToken));
            console.log('Role tersimpan:', savedRole);
            console.log('User data tersimpan:', localStorage.getItem('user'));
            
            // Show success message
            showAlert('Login berhasil!', 'success');
            
            // Redirect based on role
            const role = data.data.user_role.toLowerCase();
            console.log('User role untuk redirect:', role);
            
            setTimeout(() => {
                let redirectURL = '';
                
                switch (role) {
                    case 'chef':
                        redirectURL = '/Frontend/dashboard_chef/index.html';
                        break;
                    case 'admin':
                        redirectURL = '/Frontend/dashboard_admin/index.html';
                        break;
                    case 'waiter':
                        redirectURL = '/Frontend/dashboard_staff_cleaner/index.html';
                        break;
                    case 'staff':
                    case 'cleaner':
                        redirectURL = '/Frontend/dashboard_staff_cleaner/index.html';
                        break;
                    default:
                        showAlert('Role tidak valid', 'error');
                        return;
                }
                
                console.log('Redirecting ke:', redirectURL);
                
                // Gunakan cara alternatif untuk redirect jika perlu
                try {
                    window.location.replace(redirectURL);
                } catch (e) {
                    console.error('Error saat redirect:', e);
                    
                    // Fallback redirect method
                    setTimeout(() => {
                        document.location.href = redirectURL;
                    }, 100);
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