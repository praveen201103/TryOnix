// ===== TryOnix — Auth Logic =====
import { apiPost, setAuth, showToast, isLoggedIn } from './api.js';

// Redirect if already logged in
if (isLoggedIn()) {
  window.location.href = '/pages/dashboard.html';
}

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmit');

    errorEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      const data = await apiPost('/auth/login', { email, password });
      setAuth(data.token, data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      setTimeout(() => window.location.href = '/pages/dashboard.html', 500);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });
}

// Signup form
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const gender = document.getElementById('signupGender').value;
    const errorEl = document.getElementById('signupError');
    const btn = document.getElementById('signupSubmit');

    errorEl.classList.remove('visible');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const data = await apiPost('/auth/signup', { name, email, password, gender });
      setAuth(data.token, data.user);
      showToast('Account created! Welcome to TryOnix.', 'success');
      setTimeout(() => window.location.href = '/pages/dashboard.html', 500);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}
