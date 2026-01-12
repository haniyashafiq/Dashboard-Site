// Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  checkAuthAndRedirect();

  const loginForm = document.querySelector('form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = loginForm.querySelector('.btn-login');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    // Disable button and show loading state
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Signing In...';
    submitButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save token
      saveAuthToken(data.token);

      // Show success message
      showSuccess('Login successful! Redirecting...');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '../index.html'; // Change to your dashboard page
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message || 'Login failed. Please try again.');

      // Re-enable button
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });

  // Optional: Add enter key handler for password field
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginForm.dispatchEvent(new Event('submit'));
    }
  });
});
