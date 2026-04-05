// auth.js – logic for auth.html

document.addEventListener('DOMContentLoaded', () => {

  // ── If already logged in, skip straight to home ──────────────────────────
  const session = JSON.parse(localStorage.getItem('echoSession') || 'null');
  const params  = new URLSearchParams(window.location.search);
  const nextUrl = params.get('demo') === 'true' ? 'index.html?demo=true' : 'index.html';

  if (session) {
    window.location.href = nextUrl;
    return;
  }

  // ── Element refs ──────────────────────────────────────────────────────────
  const tabSignup   = document.getElementById('tabSignup');
  const tabLogin    = document.getElementById('tabLogin');
  const signupForm  = document.getElementById('signupForm');
  const loginForm   = document.getElementById('loginForm');
  const authError   = document.getElementById('authError');

  // ── Tab switching ─────────────────────────────────────────────────────────
  function showTab(tab) {
    const isSignup = tab === 'signup';
    tabSignup.classList.toggle('auth-tab--active', isSignup);
    tabLogin.classList.toggle('auth-tab--active', !isSignup);
    tabSignup.setAttribute('aria-selected', isSignup);
    tabLogin.setAttribute('aria-selected', !isSignup);
    signupForm.classList.toggle('auth-form--hidden', !isSignup);
    loginForm.classList.toggle('auth-form--hidden', isSignup);
    clearError();
  }

  tabSignup.addEventListener('click', () => showTab('signup'));
  tabLogin.addEventListener('click',  () => showTab('login'));

  // Inline "switch" links inside forms
  document.querySelectorAll('.auth-switch__link').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.switch));
  });

  // ── Show/hide password toggles ────────────────────────────────────────────
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  // ── Error helpers ─────────────────────────────────────────────────────────
  function showError(msg) {
    authError.textContent = msg;
    authError.classList.add('auth-error--visible');
  }
  function clearError() {
    authError.textContent = '';
    authError.classList.remove('auth-error--visible');
  }

  // ── Storage helpers ───────────────────────────────────────────────────────
  function getUsers()        { return JSON.parse(localStorage.getItem('echoUsers') || '[]'); }
  function saveUsers(users)  { localStorage.setItem('echoUsers', JSON.stringify(users)); }
  function startSession(user){ localStorage.setItem('echoSession', JSON.stringify({ name: user.name, email: user.email })); }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const name     = document.getElementById('signupName').value.trim();
    const email    = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirm  = document.getElementById('signupConfirm').value;

    // Validation
    if (!name || !email || !password || !confirm) {
      showError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
      showError('An account with this email already exists. Log in instead.');
      return;
    }

    // Save user
    const newUser = { name, email, password };
    users.push(newUser);
    saveUsers(users);
    startSession(newUser);

    window.location.href = nextUrl;
  });

  // ── Log In ────────────────────────────────────────────────────────────────
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showError('Please fill in all fields.');
      return;
    }

    const users = getUsers();
    const user  = users.find(u => u.email === email && u.password === password);

    if (!user) {
      showError('Incorrect email or password. Please try again.');
      return;
    }

    startSession(user);
    window.location.href = nextUrl;
  });

});
