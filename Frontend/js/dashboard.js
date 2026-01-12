// Dashboard initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    window.location.href = './comp/Login.html';
    return;
  }

  // Load user profile
  await loadUserProfile();
});

// Load and display user profile
async function loadUserProfile() {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/profile`);
    const data = await response.json();

    if (data.success) {
      displayUserInfo(data.user);
    } else {
      throw new Error(data.message || 'Failed to load profile');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showError('Failed to load user profile');
  }
}

// Display user information in the UI
function displayUserInfo(user) {
  // Example: Update user name in header
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = user.companyName || user.email;
  }

  // Example: Display user email
  const userEmailElement = document.getElementById('userEmail');
  if (userEmailElement) {
    userEmailElement.textContent = user.email;
  }

  // Example: Display subscription info
  const planTypeElement = document.getElementById('planType');
  if (planTypeElement) {
    planTypeElement.textContent = user.subscriptionStatus?.planType || 'Free Trial';
  }

  console.log('User profile loaded:', user);
}

// Logout button handler
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });
  }
}

// Initialize logout button when DOM is ready
document.addEventListener('DOMContentLoaded', setupLogoutButton);
