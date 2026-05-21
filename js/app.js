// ===== TryOnix — Main App Logic =====
import { isLoggedIn, getUser, clearAuth } from './api.js';

// Update nav based on auth state
function updateNav() {
  const navGuest = document.getElementById('navGuest');
  const navUser = document.getElementById('navUser');
  const navDashboard = document.getElementById('navDashboard');
  const navUserName = document.getElementById('navUserName');

  if (!navGuest || !navUser) return;

  if (isLoggedIn()) {
    const user = getUser();
    navGuest.style.display = 'none';
    navUser.style.display = 'flex';
    if (navDashboard) navDashboard.style.display = '';
    if (navUserName && user) navUserName.textContent = user.name;
  } else {
    navGuest.style.display = 'flex';
    navUser.style.display = 'none';
    if (navDashboard) navDashboard.style.display = 'none';
  }
}

// Logout handler
function setupLogout() {
  const logoutBtn = document.getElementById('navLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      window.location.href = '/';
    });
  }
}

// Mobile hamburger menu
function setupHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
}

// Occasion card click → go to recommendations
function setupOccasionCards() {
  const cards = document.querySelectorAll('.occasion-card[data-occasion]');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const occasion = card.dataset.occasion;
      window.location.href = `/pages/recommend.html?occasion=${occasion}`;
    });
  });
}

// Intersection Observer for scroll animations
function setupScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.animate-fade-in-up, .animate-slide-right, .animate-slide-left').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}

// Active nav link
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (path === href || (path === '/' && href === '/') || (path.includes(href) && href !== '/')) {
      link.classList.add('active');
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  setupLogout();
  setupHamburger();
  setupOccasionCards();
  setupScrollAnimations();
  setActiveNav();
});
