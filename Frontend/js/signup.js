// Signup Form Handler
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  checkAuthAndRedirect();

  // Get plan info from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlan = urlParams.get('plan') || 'basic';
  const planName = urlParams.get('planName') || 'Basic Plan';

  // Display selected plan if provided
  displaySelectedPlan(planName);

  const signupForm = document.querySelector('form');
  const submitButton = signupForm.querySelector('.btn-login');

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form inputs by ID
    const companyName = document.getElementById('companyName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const termsChecked = document.getElementById('terms').checked;

    // Validation
    if (!companyName || !email || !password) {
      showError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }

    if (!termsChecked) {
      showError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address');
      return;
    }

    // Disable button and show loading state
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Creating Account...';
    submitButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          companyName,
          planType: selectedPlan, // Use plan from URL or default to basic
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save token if returned
      if (data.token) {
        saveAuthToken(data.token);
      }

      // Show success message
      showSuccess('Account created successfully! Redirecting to login...');

      // Redirect to login or dashboard
      setTimeout(() => {
        if (data.token) {
          window.location.href = '../index.html'; // Redirect to dashboard
        } else {
          window.location.href = './Login.html'; // Redirect to login
        }
      }, 1500);
    } catch (error) {
      console.error('Signup error:', error);
      showError(error.message || 'Registration failed. Please try again.');

      // Re-enable button
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
});

// Display selected plan information
function displaySelectedPlan(planName) {
  const planInfoElement = document.getElementById('selectedPlanInfo');
  if (planInfoElement && planName !== 'Basic Plan') {
    planInfoElement.innerHTML = `
      <div style="background: #EEF2FF; border: 2px solid #4F46E5; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: center;">
        <i class="fa-solid fa-check-circle" style="color: #4F46E5; font-size: 20px;"></i>
        <p style="margin: 8px 0 0 0; color: #374151; font-weight: 600;">Selected Plan: <strong style="color: #4F46E5;">${planName}</strong></p>
      </div>
    `;
    planInfoElement.style.display = 'block';
  }
}
