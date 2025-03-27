// API BASE URL Configuration
window.API_BASE_URL = ''; // Empty string to use relative URLs

// Get current host dynamically 
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // If on production/ngrok, use the full URL
    window.API_BASE_URL = window.location.origin;
} else if (window.location.port === '5500' || window.location.port === '5501') {
    // If using Live Server, connect to backend on port 8080
    window.API_BASE_URL = 'http://localhost:8080';
}

// WebSocket Configuration
window.WS_BASE_URL = window.API_BASE_URL.replace('http', 'ws').replace('https', 'wss');

console.log('API Base URL configured as:', window.API_BASE_URL);
console.log('WebSocket Base URL configured as:', window.WS_BASE_URL); 