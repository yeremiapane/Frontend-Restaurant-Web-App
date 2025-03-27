document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const button = e.target.querySelector('button[type="submit"]');
    
    // Show loading state
    button.classList.add('loading');
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
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
            
            // Tunggu sesaat sebelum redirect
            setTimeout(() => {
                try {
                    // Get current URL and path
                    const currentURL = window.location.href;
                    const currentPath = window.location.pathname;
                    console.log('Current URL:', currentURL);
                    console.log('Current path:', currentPath);
                    
                    // Determine if we're using Live Server
                    const isLiveServer = currentURL.includes('5500');
                    console.log('Using Live Server:', isLiveServer);
                    
                    // Determine the correct path
                    let redirectPath = '';
                    switch (role) {
                        case 'chef':
                            redirectPath = '/Frontend/dashboard_chef/index.html';
                            break;
                        case 'admin':
                            redirectPath = '/Frontend/dashboard_admin/index.html';
                            break;
                        case 'waiter':
                        case 'staff':
                        case 'cleaner':
                            redirectPath = '/Frontend/dashboard_staff_cleaner/index.html';
                            break;
                        default:
                            console.error('Invalid role:', role);
                            showAlert('Role tidak valid', 'error');
                            return;
                    }
                    
                    // Construct redirect URL
                    const redirectURL = `${window.location.origin}${redirectPath}`;
                    console.log('Full redirect URL:', redirectURL);
                    
                    // Tambahkan logging untuk diagnosa
                    console.log('Mulai proses redirect ke: ' + redirectURL);
                    
                    // Lakukan redirect dengan hard reload
                    window.location.replace(redirectURL);
                    
                    // Backup redirect jika replace tidak berhasil
                    setTimeout(() => {
                        console.log('Mencoba cara redirect alternatif');
                        window.location.href = redirectURL;
                        
                        // Jika masih tidak berhasil, coba cara lain
                        setTimeout(() => {
                            console.log('Mencoba redirect dengan window.open');
                            const newWindow = window.open(redirectURL, '_self');
                            if (!newWindow) {
                                console.error('Popup blocker mungkin mencegah redirect');
                                showAlert('Tidak dapat melakukan redirect. Silakan klik <a href="' + redirectURL + '">di sini</a> untuk melanjutkan.', 'warning');
                            }
                        }, 1000);
                    }, 1000);
                } catch (redirectError) {
                    console.error('Error saat redirect:', redirectError);
                    showAlert('Terjadi kesalahan saat redirect: ' + redirectError.message, 'error');
                    
                    // Tampilkan link manual jika redirect gagal
                    const loginContainer = document.querySelector('.login-container');
                    if (loginContainer) {
                        const manualLink = document.createElement('div');
                        manualLink.className = 'manual-link';
                        manualLink.innerHTML = '<p>Jika redirect tidak berhasil, silakan klik link di bawah ini:</p>' +
                                            '<a href="' + window.location.origin + '/Frontend/dashboard_admin/index.html" class="redirect-link">Dashboard Admin</a>';
                        loginContainer.appendChild(manualLink);
                    }
                }
            }, 1500); // Tingkatkan delay dari 1 detik menjadi 1.5 detik
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
    
    // Gunakan innerHTML jika pesan mengandung HTML tag
    if (message.includes('<a')) {
        alert.innerHTML = message;
    } else {
        alert.textContent = message;
    }
    
    document.body.appendChild(alert);
    
    // Tampilkan alert
    setTimeout(() => alert.classList.add('show'), 100);
    
    // Hapus alert setelah 3 detik jika bukan warning
    if (type !== 'warning') {
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 500);
        }, 3000);
    }
}