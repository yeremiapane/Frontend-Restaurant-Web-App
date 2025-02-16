// Chart Configurations
document.addEventListener('DOMContentLoaded', function() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Sales',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#2A9D8F',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(42, 157, 143, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Popular Items Chart
    const itemsCtx = document.getElementById('itemsChart').getContext('2d');
    const itemsChart = new Chart(itemsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Nasi Goreng', 'Mie Goreng', 'Ayam Bakar', 'Es Teh'],
            datasets: [{
                data: [30, 25, 20, 15],
                backgroundColor: [
                    '#2A9D8F',
                    '#E9C46A',
                    '#E76F51',
                    '#264653'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Sample Orders Data
    const orders = [
        {
            id: 'ORD001',
            customer: 'John Doe',
            items: '3 items',
            total: 'Rp 150,000',
            status: 'Completed'
        },
        {
            id: 'ORD002',
            customer: 'Jane Smith',
            items: '2 items',
            total: 'Rp 85,000',
            status: 'In Progress'
        },
        {
            id: 'ORD003',
            customer: 'Mike Johnson',
            items: '4 items',
            total: 'Rp 200,000',
            status: 'Pending'
        }
    ];

    // Populate Orders Table
    const tbody = document.querySelector('.recent-orders tbody');
    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.items}</td>
            <td>${order.total}</td>
            <td><span class="status ${order.status.toLowerCase()}">${order.status}</span></td>
            <td>
                <button class="btn-view">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add hover effect to sidebar items
    const navLinks = document.querySelectorAll('.nav-links li');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Notifications click handler
    const notifications = document.querySelector('.notifications');
    notifications.addEventListener('click', function() {
        // Add notification functionality here
        console.log('Notifications clicked');
    });

    // Handle Navigation
    // Set active navigation based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links li');
    
    navLinks.forEach(link => {
        const linkHref = link.querySelector('a').getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Shared notification system
    window.showNotification = function(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    };

    // Shared modal handling
    window.handleModal = function(modalId, show = true) {
        const modal = document.getElementById(modalId);
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    };
});

// Add smooth scrolling to all pages
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
