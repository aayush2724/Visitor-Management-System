// Configuration for API endpoints
const CONFIG = {
    // Replace this with your actual Render URL after deployment
    // Example: 'https://rsb-visitor-management-backend.onrender.com'
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '' 
        : 'https://rsb-visitor-management-system.onrender.com'
};

window.API_BASE_URL = CONFIG.API_BASE_URL;
