document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const button = e.target.querySelector('button');
    const buttonText = button.querySelector('span');
    const loader = button.querySelector('.loader');
    
    // Validasi password
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showAlert('Password tidak cocok!', 'error');
        return;
    }
    
    // Tampilkan loading
    buttonText.style.opacity = '0';
    loader.style.display = 'block';
    
    try {
        const name = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const role = document.getElementById('role').value;
        
        const response = await fetch('http://localhost:8080/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registrasi berhasil! Silahkan login.', 'success');
            
            // Redirect ke halaman login setelah 2 detik
            setTimeout(() => {
                window.location.href = '../login';
            }, 2000);
        } else {
            throw new Error(data.error || 'Registrasi gagal');
        }
    } catch (error) {
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
