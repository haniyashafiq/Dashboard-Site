// Dashboard initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    window.location.href = './Frontend/comp/Login.html';
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

    if (data.success && data.data) {
      const user = data.data.user;
      // Check if user has access to this specific software
      const currentPath = window.location.pathname;
      const userProduct = user.productId; // e.g., 'hospital-pms'

      // Define keywords for each product's pages
      const productKeywords = {
        'hospital-pms': ['hospital-pms', 'pms'],
        'pharmacy-pos': ['pharmacy-pos', 'pos'],
        'lab-reporting': ['lab-reporting', 'lab'],
        'quick-invoice': ['quick-invoice', 'invoice'],
        'private-clinic-lite': ['private-clinic-lite', 'clinic']
      };

      const keywords = productKeywords[userProduct] || [];
      const isAccessingCorrectProduct = keywords.some(keyword => currentPath.toLowerCase().includes(keyword.toLowerCase()));

      // If NOT on dashboard OR index, and NOT on a page related to their product, redirect
      const isGeneralPage = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.toLowerCase().includes('dashboard');

      if (!isGeneralPage && !isAccessingCorrectProduct) {
        showError('You do not have access to this software. Redirecting to your software...');
        setTimeout(() => {
          // Find the correct landing page for their product
          const productPages = {
            'hospital-pms': '/Frontend/comp/pricing-hospital-pms.html',
            'pharmacy-pos': '/Frontend/comp/pricing-pharmacy-pos.html',
            'lab-reporting': '/Frontend/comp/pricing-lab-reporting.html',
            'quick-invoice': '/Frontend/comp/pricing-quick-invoice.html',
            'private-clinic-lite': '/Frontend/comp/pricing-private-clinic-lite.html'
          };
          window.location.href = productPages[userProduct] || '/index.html';
        }, 3000);
        return;
      }

      displayUserInfo(user);
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
  // Update names
  const userNameElement = document.getElementById('userName');
  if (userNameElement) userNameElement.textContent = user.companyName || user.email;

  const userNameSmallElement = document.getElementById('userNameSmall');
  if (userNameSmallElement) userNameSmallElement.textContent = user.companyName || 'User';

  const userInitialElement = document.getElementById('userInitial');
  if (userInitialElement) userInitialElement.textContent = (user.companyName || 'U').charAt(0).toUpperCase();

  // Update email
  const userEmailElement = document.getElementById('userEmail');
  if (userEmailElement) userEmailElement.textContent = user.email;

  // Update software info
  const softwareNameElement = document.getElementById('softwareName');
  const softwareNameFullElement = document.getElementById('softwareNameFull');
  if (softwareNameElement) softwareNameElement.textContent = user.productId || 'None';
  if (softwareNameFullElement) softwareNameFullElement.textContent = user.productId || 'Software';

  const tenantDbNameElement = document.getElementById('tenantDbName');
  if (tenantDbNameElement) tenantDbNameElement.textContent = user.tenantDbName || 'Not Provisioned';

  // Update subscription info
  const subStatusTextElement = document.getElementById('subStatusText');
  const trialEndDateTextElement = document.getElementById('trialEndDateText');
  const subscriptionBadgeElement = document.getElementById('subscriptionBadge');

  if (subStatusTextElement) {
    subStatusTextElement.textContent = user.subscriptionStatus.toUpperCase();
  }

  if (trialEndDateTextElement && user.trialEndDate) {
    const end = new Date(user.trialEndDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      trialEndDateTextElement.textContent = `Ends in ${diffDays} days`;
    } else {
      trialEndDateTextElement.textContent = 'Expired';
      trialEndDateTextElement.style.color = '#ef4444';
    }
  }

  if (subscriptionBadgeElement) {
    if (user.subscriptionStatus === 'trial') {
      subscriptionBadgeElement.innerHTML = '<span class="badge-trial">Free Trial</span>';
    } else {
      subscriptionBadgeElement.innerHTML = '<span class="badge-active">Active</span>';
    }
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
