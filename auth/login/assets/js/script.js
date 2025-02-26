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
        
        if (response.ok) {
            // Debug: Periksa data yang diterima dari server
            console.log('Response data:', data);
            
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('userRole', data.data.user_role);
            
            // Debug: Periksa data yang tersimpan di localStorage
            console.log('Stored data:', {
                token: localStorage.getItem('token'),
                userRole: localStorage.getItem('userRole')
            });
            
            showAlert('Login berhasil!', 'success');
            
            // Perbaiki path redirect relatif
            const userRole = data.data.user_role.toLowerCase();
            console.log('User role:', userRole); // Debug
            
            // Gunakan path relatif
            setTimeout(() => {
                if (userRole === 'admin') {
                    window.location.href = '../../dashboard_admin/index.html';
                } else if (userRole === 'staff') {
                    window.location.href = '../../dashboard_staff/index.html';
                } else if (userRole === 'chef') {
                    window.location.href = '../../kitchen_display/index.html';
                } else {
                    window.location.href = '../login/index.html';
                }
            }, 1000);
        } else {
            throw new Error(data.error || 'Login gagal');
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