// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Toast Notification System
let toastContainer = null;

const initToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

const showToast = (message, type = 'info') => {
  const container = initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Utility Functions
const showError = (message) => {
  showToast(message, 'error');
};

const showSuccess = (message) => {
  showToast(message, 'success');
};

const showInfo = (message) => {
  showToast(message, 'info');
};

// Token Management
const saveAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Check if user is authenticated
const isAuthenticated = () => {
  return !!getAuthToken();
};

// Redirect to dashboard if already logged in
const checkAuthAndRedirect = () => {
  if (isAuthenticated()) {
    window.location.href = '../index.html'; // Redirect to main page or dashboard
  }
};

// Logout function
const logout = () => {
  removeAuthToken();
  window.location.href = './comp/Login.html';
};

// Make authenticated API requests
const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  // If unauthorized, logout user
  if (response.status === 401) {
    removeAuthToken();
    window.location.href = './comp/Login.html';
    throw new Error('Session expired. Please login again.');
  }

  return response;
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_BASE_URL,
    showError,
    showSuccess,
    saveAuthToken,
    getAuthToken,
    removeAuthToken,
    isAuthenticated,
    checkAuthAndRedirect,
    logout,
    authenticatedFetch,
  };
}
