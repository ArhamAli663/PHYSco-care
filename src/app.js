// Core Application Controller
import {
  getCurrentSession,
  loginUser,
  loginWithGoogle,
  registerUser,
  logoutUser,
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  clearAllAppointments,
  clearAllQuestions,
  createQuestion,
  getQuestions,
  answerQuestion,
  createReview,
  getReviews
} from './firebase.js';

let currentUser = getCurrentSession();
let isRegisterMode = false;

// DOM Element References
const publicView = document.getElementById('public-view');
const doctorPortal = document.getElementById('doctor-portal');
const userStatusContainer = document.getElementById('user-status-container');
const navLinks = document.querySelector('.nav-links');

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const btnOpenLogin = document.getElementById('btn-open-login');
const btnCloseModal = document.getElementById('btn-close-modal');
const authForm = document.getElementById('auth-form');
const btnGoogleLogin = document.getElementById('btn-google-login');
const authModalTitle = document.getElementById('auth-modal-title');
const authModalSubtitle = document.getElementById('auth-modal-subtitle');
const groupName = document.getElementById('group-name');
const groupPhone = document.getElementById('group-phone');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleLink = document.getElementById('auth-toggle-link');

// Appointment, Review & QA Form Elements
const appointmentForm = document.getElementById('appointment-form');
const askQuestionForm = document.getElementById('ask-question-form');
const reviewForm = document.getElementById('review-form');
const publicQaFeed = document.getElementById('public-qa-feed');
const patientReviewsFeed = document.getElementById('patient-reviews-feed');

// Doctor Portal Elements
const btnDoctorLogout = document.getElementById('btn-doctor-logout');
const btnBackPublic = document.getElementById('btn-back-public');
const tbodyAppointments = document.getElementById('doctor-appointments-tbody');
const doctorQaList = document.getElementById('doctor-qa-list');
const metricTotalApts = document.getElementById('metric-total-apts');
const metricPendingApts = document.getElementById('metric-pending-apts');
const metricPendingQa = document.getElementById('metric-pending-qa');
// Theme Toggle System (Dark / Light Mode)
function setupThemeSystem() {
  const headerToggle = document.getElementById('theme-toggle-btn');
  const menuToggle = document.getElementById('menu-theme-toggle-btn');
  const menuLabel = document.getElementById('menu-theme-label');
  const portalToggle = document.getElementById('portal-theme-toggle-btn');

  const savedTheme = localStorage.getItem('dr_rouf_theme') || 'dark';

  const updateUI = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dr_rouf_theme', theme);

    const isDark = theme === 'dark';
    const iconHtml = isDark 
      ? `<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>` 
      : `<i class="fa-solid fa-moon" style="color: #6366f1;"></i>`;

    if (headerToggle) {
      headerToggle.innerHTML = iconHtml;
      headerToggle.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
    if (portalToggle) {
      portalToggle.innerHTML = iconHtml;
      portalToggle.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
    if (menuLabel) {
      menuLabel.innerHTML = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    }
  };

  updateUI(savedTheme);

  const toggleHandler = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    updateUI(nextTheme);
  };

  headerToggle?.addEventListener('click', toggleHandler);
  menuToggle?.addEventListener('click', toggleHandler);
  portalToggle?.addEventListener('click', toggleHandler);
}

// Initial Setup & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  setupThemeSystem();
  setupMinDate();
  renderUserHeaderState();
  renderPublicQa();
  renderPatientReviews();
  renderPatientAppointmentStatus();
  setupMobileMenu();

  // Password Eye Toggle
  const toggleEye = document.getElementById('toggle-password-eye');
  const pwdInput = document.getElementById('auth-password');
  const eyeIcon = document.getElementById('eye-icon');
  if (toggleEye && pwdInput && eyeIcon) {
    toggleEye.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      eyeIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  }

  // Doctor Portal Clear Buttons Setup
  const btnClearApts = document.getElementById('btn-clear-apts');
  if (btnClearApts) {
    btnClearApts.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to clear all appointments and reset count to 0?')) {
        await clearAllAppointments();
        showToast('All appointments cleared. Reset count to 0.');
        await renderDoctorPortalData();
        await renderPatientAppointmentStatus();
      }
    });
  }

  const btnClearQa = document.getElementById('btn-clear-qa');
  if (btnClearQa) {
    btnClearQa.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to delete all patient questions?')) {
        await clearAllQuestions();
        showToast('All patient questions cleared.');
        await renderDoctorPortalData();
        await renderPublicQa();
      }
    });
  }

  // Persistent Doctor Session Check: If logged in as Doctor, show Doctor Portal automatically
  if (currentUser && currentUser.role === 'doctor') {
    showDoctorPortalView();
  }

  // Auto-refresh live data every 5 seconds (updates Doctor Portal and Patient Status live)
  setInterval(async () => {
    if (currentUser && currentUser.role === 'doctor') {
      await renderDoctorPortalData();
    } else {
      await renderPatientAppointmentStatus();
    }
  }, 5000);
});

// Mobile Navigation Toggle
function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navLinksEl = document.querySelector('.nav-links');

  if (toggleBtn && navLinksEl) {
    const closeMenu = () => {
      navLinksEl.classList.remove('mobile-open');
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-bars';
    };

    const openMenu = () => {
      navLinksEl.classList.add('mobile-open');
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-xmark';
    };

    const isOpen = () => navLinksEl.classList.contains('mobile-open');

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('click', (e) => {
      if (isOpen() && !toggleBtn.contains(e.target) && !navLinksEl.contains(e.target)) {
        closeMenu();
      }
    });
  }
}

// Toast System
function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  const color = type === 'error' ? '#e74c3c' : 'var(--teal-light)';
  toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// Minimum date setting for appointment picker
function setupMinDate() {
  const dateInput = document.getElementById('appointment-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }
}

// User Navigation & Persistent Header State
function renderUserHeaderState() {
  if (!userStatusContainer) return;
  const mobileUserSlot = document.getElementById('mobile-menu-user-slot');

  if (currentUser) {
    // Render profile card inside menu drawer
    if (mobileUserSlot) {
      mobileUserSlot.style.display = 'block';
      mobileUserSlot.innerHTML = `
        <div class="menu-user-card">
          <i class="fa-solid fa-circle-user"></i>
          <div>
            <strong>${currentUser.name}</strong>
            <span>${currentUser.role === 'doctor' ? 'Doctor Account' : 'Patient Session'}</span>
          </div>
        </div>
      `;
    }

    if (currentUser.role === 'doctor') {
      if (navLinks) navLinks.style.display = 'none';
      const isPortalVisible = doctorPortal && doctorPortal.style.display !== 'none';

      if (isPortalVisible) {
        userStatusContainer.innerHTML = `
          <button class="btn btn-outline" id="btn-logout-header" style="font-size:0.8rem; padding: 0.45rem 0.9rem;">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        `;
      } else {
        userStatusContainer.innerHTML = `
          <button class="btn btn-accent" id="btn-open-portal" style="font-size:0.8rem; padding: 0.45rem 0.9rem;">
            <i class="fa-solid fa-gauge-high"></i> Doctor Portal
          </button>
          <button class="btn btn-outline" id="btn-logout-header" style="font-size:0.8rem; padding: 0.45rem 0.9rem;">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        `;
        document.getElementById('btn-open-portal')?.addEventListener('click', showDoctorPortalView);
      }
      document.getElementById('btn-logout-header')?.addEventListener('click', handleLogout);
    } else {
      if (navLinks) navLinks.style.display = '';
      userStatusContainer.innerHTML = `
        <button class="btn btn-outline" id="btn-logout-header" style="font-size:0.8rem; padding: 0.45rem 0.9rem;">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      `;
      document.getElementById('btn-logout-header')?.addEventListener('click', handleLogout);

      // Prefill booking form for persistent patient session
      const nameInp = document.getElementById('patient-name');
      const emailInp = document.getElementById('patient-email');
      const phoneInp = document.getElementById('patient-phone');
      if (nameInp) nameInp.value = currentUser.name;
      if (emailInp) emailInp.value = currentUser.email;
      if (phoneInp && currentUser.phone) phoneInp.value = currentUser.phone;

      // Show patient appointment status bar
      renderPatientAppointmentStatus();
    }
  } else {
    if (mobileUserSlot) mobileUserSlot.style.display = 'none';
    if (navLinks) navLinks.style.display = '';
    userStatusContainer.innerHTML = `
      <button class="btn btn-outline" id="btn-open-login-dyn" style="font-size:0.8rem; padding: 0.45rem 0.9rem;">
        <i class="fa-solid fa-right-to-bracket"></i> Login / Sign Up
      </button>
    `;
    document.getElementById('btn-open-login-dyn')?.addEventListener('click', openModal);
  }
}

// View Switches
function showDoctorPortalView() {
  if (!currentUser || currentUser.role !== 'doctor') {
    showToast('Unauthorized access. Doctor credentials required.', 'error');
    return;
  }
  publicView.style.display = 'none';
  doctorPortal.style.display = 'block';
  if (navLinks) navLinks.style.display = 'none';
  renderUserHeaderState();
  window.scrollTo(0, 0);
  renderDoctorPortalData();
}

function showPublicView() {
  doctorPortal.style.display = 'none';
  publicView.style.display = 'block';
  if (navLinks) navLinks.style.display = '';
  renderUserHeaderState();
  renderPublicQa();
  renderPatientReviews();
  renderPatientAppointmentStatus();
}

btnBackPublic?.addEventListener('click', showPublicView);

// Modal Handlers
function openModal() {
  authModal.classList.add('active');
}

function closeModal() {
  authModal.classList.remove('active');
}

btnOpenLogin?.addEventListener('click', openModal);
btnCloseModal?.addEventListener('click', closeModal);

authToggleLink?.addEventListener('click', (e) => {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    authModalTitle.textContent = 'Create Patient Account';
    authModalSubtitle.textContent = 'Register to book appointments and consult Dr. Abdul Rouf';
    groupName.style.display = 'block';
    groupPhone.style.display = 'block';
    btnAuthSubmit.textContent = 'Register Account';
    authToggleText.textContent = 'Already have an account?';
    authToggleLink.textContent = 'Sign In';
  } else {
    authModalTitle.textContent = 'Login / Sign Up';
    authModalSubtitle.textContent = 'Access appointment booking & Q&A consultation';
    groupName.style.display = 'none';
    groupPhone.style.display = 'none';
    btnAuthSubmit.textContent = 'Sign In';
    authToggleText.textContent = "Don't have an account?";
    authToggleLink.textContent = 'Register Here';
  }
});

// Authentication Submissions
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    if (isRegisterMode) {
      const name = document.getElementById('auth-name').value;
      const phone = document.getElementById('auth-phone').value;
      currentUser = await registerUser(email, password, name, phone);
      showToast('Registration successful! Welcome to AR Physio Care.');
    } else {
      currentUser = await loginUser(email, password);
      showToast(`✅ Welcome back, ${currentUser.name}!`);
    }

    closeModal();
    renderUserHeaderState();

    if (currentUser.role === 'doctor') {
      showDoctorPortalView();
    } else {
      // Refresh patient data from Firestore on login
      renderPublicQa();
      renderPatientAppointmentStatus();
    }
  } catch (err) {
    showToast(err.message || 'Authentication error.', 'error');
  }
});

// Google Authentication Submission
btnGoogleLogin?.addEventListener('click', async () => {
  // Show loading state on button
  const originalHTML = btnGoogleLogin.innerHTML;
  btnGoogleLogin.disabled = true;
  btnGoogleLogin.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Connecting to Google...`;

  try {
    currentUser = await loginWithGoogle();
    showToast(`✅ Signed in successfully as ${currentUser.name}`);
    closeModal();
    renderUserHeaderState();

    if (currentUser.role === 'doctor') {
      showDoctorPortalView();
    } else {
      // Refresh patient data from Firestore on login
      renderPublicQa();
      renderPatientAppointmentStatus();
    }
  } catch (err) {
    console.error('Google Auth error:', err);

    // Friendly error messages per Firebase error code
    let errMsg = 'Google Sign-in failed. Please try again.';
    const code = err.code || '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      errMsg = 'Sign-in cancelled — you closed the Google popup.';
    } else if (code === 'auth/unauthorized-domain') {
      errMsg = '⚠️ Localhost not authorized in Firebase yet. Go to: Firebase Console → Authentication → Settings → Authorized Domains → Add "localhost"';
      showToast(errMsg, 'error', 12000);
      btnGoogleLogin.innerHTML = originalHTML;
      btnGoogleLogin.disabled = false;
      return;
    } else if (code === 'auth/popup-blocked') {
      errMsg = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
    } else if (code === 'auth/network-request-failed') {
      errMsg = 'No internet connection. Please check your network and try again.';
    } else if (err.message) {
      errMsg = err.message;
    }

    showToast(errMsg, 'error', 7000);
  } finally {
    btnGoogleLogin.innerHTML = originalHTML;
    btnGoogleLogin.disabled = false;
  }
});

async function handleLogout() {
  await logoutUser();
  currentUser = null;

  // Clear booking form on logout
  const nameInp = document.getElementById('patient-name');
  const emailInp = document.getElementById('patient-email');
  const phoneInp = document.getElementById('patient-phone');
  const dateInp = document.getElementById('appointment-date');
  const issueInp = document.getElementById('patient-issue');
  const timeInp = document.getElementById('appointment-time');
  if (nameInp) nameInp.value = '';
  if (emailInp) emailInp.value = '';
  if (phoneInp) phoneInp.value = '';
  if (dateInp) dateInp.value = '';
  if (issueInp) issueInp.value = '';
  if (timeInp) timeInp.value = '';

  // Clear patient status bar
  const bar = document.getElementById('patient-apt-status-bar');
  if (bar) bar.style.display = 'none';

  renderUserHeaderState();
  showPublicView();
  showToast('Logged out successfully.');
}

btnDoctorLogout?.addEventListener('click', handleLogout);

// Appointment Booking Handler
appointmentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Must be logged in to book
  if (!currentUser || currentUser.role === 'doctor') {
    showToast('Please log in or register first to book an appointment.', 'error');
    openModal();
    return;
  }

  const name = document.getElementById('patient-name').value.trim();
  const phone = document.getElementById('patient-phone').value.trim();
  const email = document.getElementById('patient-email').value.trim();
  const date = document.getElementById('appointment-date').value;
  const timeSlot = document.getElementById('appointment-time').value;
  const issue = document.getElementById('patient-issue').value.trim();

  if (!name) { showToast('Please enter your name.', 'error'); return; }
  if (!phone) { showToast('Please enter your phone number.', 'error'); return; }
  if (!date) { showToast('Please select an appointment date.', 'error'); return; }
  if (!timeSlot) { showToast('Please select a time slot between 4:00 PM and 10:00 PM.', 'error'); return; }

  try {
    await createAppointment({
      patientName: name,
      patientPhone: phone,
      patientEmail: currentUser.email || email,
      patientUid: currentUser.uid,
      date,
      timeSlot,
      issue
    });

    showToast(`✅ Appointment booked for ${date} at ${timeSlot}! Fee: 1,000 RS. Awaiting doctor approval.`);
    appointmentForm.reset();
    setupMinDate();
    try { renderPatientAppointmentStatus(); renderDoctorPortalData(); } catch (e) {}
  } catch (err) {
    showToast('Error saving appointment. Please try again.', 'error');
  }
});

// Q&A Question Submission Handler
askQuestionForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Must be logged in to ask questions
  if (!currentUser || currentUser.role === 'doctor') {
    showToast('Please log in or register first to ask a question.', 'error');
    openModal();
    return;
  }

  const questionText = document.getElementById('question-text').value.trim();
  if (!questionText) { showToast('Please enter your question.', 'error'); return; }

  try {
    await createQuestion(currentUser.name, currentUser.email, questionText, currentUser.uid);
    showToast('Your question has been sent to Dr. Abdul Rouf!');
    askQuestionForm.reset();
    try { renderPublicQa(); renderDoctorPortalData(); } catch (e) {}
  } catch (err) {
    showToast('Error submitting question.', 'error');
  }
});

// Show Patient Appointment Status Banner
async function renderPatientAppointmentStatus() {
  const bar = document.getElementById('patient-apt-status-bar');
  if (!bar) return;

  if (!currentUser || currentUser.role === 'doctor') {
    bar.style.display = 'none';
    return;
  }

  const allApts = await getAppointments();
  
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const userPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
  const userName = (currentUser.name || '').toLowerCase().trim();

  // Filter appointments belonging to this patient by uid, email, phone, or name
  const userUid = currentUser.uid || '';
  const myApts = allApts.filter(a => {
    const aptEmail = (a.patientEmail || '').toLowerCase().trim();
    const aptPhone = (a.patientPhone || '').replace(/[^0-9]/g, '');
    const aptName = (a.patientName || '').toLowerCase().trim();
    const aptUid = a.patientUid || '';

    return (
      (userUid && aptUid && aptUid === userUid) ||
      (userEmail && aptEmail && aptEmail === userEmail) ||
      (userPhone && aptPhone && aptPhone === userPhone) ||
      (userName && aptName && aptName === userName)
    );
  });

  if (myApts.length === 0) {
    bar.style.display = 'none';
    return;
  }

  // Show most recent appointment status
  const latest = myApts[0];
  const statusColor = latest.status === 'Approved' ? '#00e5cc' :
    latest.status === 'Cancelled' ? '#e74c3c' :
      latest.status === 'Completed' ? '#2ecc71' : '#f39c12';
  const statusIcon = latest.status === 'Approved' ? 'fa-circle-check' :
    latest.status === 'Cancelled' ? 'fa-circle-xmark' :
      latest.status === 'Completed' ? 'fa-check-double' : 'fa-hourglass-half';
  const statusMsg = latest.status === 'Approved'
    ? '✅ Your appointment has been <strong>Approved</strong> by Dr. Abdul Rouf! Please visit the clinic on time.'
    : latest.status === 'Cancelled'
      ? '❌ Your appointment was <strong>Cancelled</strong>. Please rebook or contact the clinic.'
      : latest.status === 'Completed'
        ? '🎉 Your appointment is <strong>Completed</strong>. Thank you for visiting AR Physio Care!'
        : '⏳ Your appointment is <strong>Pending</strong> — waiting for doctor approval.';

  bar.style.display = 'block';
  bar.innerHTML = `
    <div style="max-width:1280px; margin:0 auto; display:flex; align-items:center; gap:1rem; flex-wrap:wrap; padding: 0.2rem 0;">
      <div style="background:rgba(255,255,255,0.15); border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <i class="fa-solid ${statusIcon}" style="color:${statusColor}; font-size:1.4rem;"></i>
      </div>
      <div style="flex:1; min-width:0;">
        <div style="color:#fff; font-weight:700; font-size:0.95rem; margin-bottom:0.2rem;">
          Appointment: ${latest.date || ''} at ${latest.timeSlot || ''}
        </div>
        <div style="color:rgba(255,255,255,0.9); font-size:0.85rem;">${statusMsg}</div>
      </div>
      <span style="background:${statusColor}; color:#000; font-weight:800; font-size:0.8rem; padding:0.35rem 0.9rem; border-radius:999px; white-space:nowrap;">
        ${latest.status ? latest.status.toUpperCase() : 'PENDING'}
      </span>
    </div>
  `;
}

// Patient Review Submission Handler
reviewForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) {
    showToast('Please log in or register first to leave a review.');
    openModal();
    return;
  }

  const rating = parseInt(document.getElementById('review-rating').value, 10);
  const reviewText = document.getElementById('review-text').value;

  try {
    await createReview(currentUser.name, rating, reviewText);
    showToast('Thank you! Your review has been published.');
    reviewForm.reset();
    renderPatientReviews();
  } catch (err) {
    showToast('Error submitting review.');
  }
});

// Render Public Q&A Board - only shows current user's own questions
async function renderPublicQa() {
  if (!publicQaFeed) return;

  // If not logged in, prompt to login
  if (!currentUser || currentUser.role === 'doctor') {
    publicQaFeed.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.9rem;">
        <i class="fa-solid fa-lock" style="font-size: 1.8rem; color: var(--teal-accent); margin-bottom: 0.5rem; display: block;"></i>
        Please <strong style="color:var(--teal-accent); cursor:pointer;" id="qa-login-prompt">log in</strong> to view your questions & answers.
      </div>
    `;
    document.getElementById('qa-login-prompt')?.addEventListener('click', openModal);
    return;
  }

  const allQuestions = await getQuestions();

  // Filter: only show this patient's own questions
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const userUid = currentUser.uid || '';
  const userName = (currentUser.name || '').toLowerCase().trim();

  const myQuestions = allQuestions.filter(q => {
    const qEmail = (q.patientEmail || '').toLowerCase().trim();
    const qUid = q.patientUid || '';
    const qName = (q.patientName || '').toLowerCase().trim();
    return (userUid && qUid && qUid === userUid) ||
           (userEmail && qEmail && qEmail === userEmail) ||
           (userName && qName && qName === userName);
  });

  if (myQuestions.length === 0) {
    publicQaFeed.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.9rem;">
        <i class="fa-solid fa-comments" style="font-size: 1.8rem; color: var(--teal-accent); margin-bottom: 0.5rem; display: block;"></i>
        You haven't asked any questions yet. Ask Dr. Abdul Rouf below!
      </div>
    `;
    return;
  }

  publicQaFeed.innerHTML = `
    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem; font-family: var(--font-heading); color: var(--primary-navy); text-align: center; font-size: 1.25rem;">
      <i class="fa-solid fa-comments" style="color: var(--teal-accent);"></i> Your Questions & Answers
    </h3>
    <div class="qa-feed-list" style="display: flex; flex-direction: column; gap: 1rem;">
      ${myQuestions.map(q => `
        <div class="qa-card" style="background: #ffffff; padding: 1.2rem 1.4rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
          <div class="qa-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
            <span class="qa-author" style="font-weight: 700; color: var(--primary-navy); font-size: 0.92rem;">
              <i class="fa-solid fa-user-circle" style="color: var(--teal-accent);"></i> ${q.patientName || 'You'}
            </span>
            <span class="qa-date" style="font-size: 0.78rem; color: var(--text-muted);">
              ${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ''}
            </span>
          </div>
          <div class="qa-question" style="font-size: 0.92rem; color: var(--text-dark); background: var(--surface-muted); padding: 0.8rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.8rem; border-left: 3px solid var(--gold-accent);">
            <strong>Q:</strong> "${q.question}"
          </div>
          ${q.answer ? `
            <div class="qa-reply-box" style="background: rgba(0, 168, 150, 0.08); border-left: 3px solid var(--teal-accent); padding: 0.8rem 1rem; border-radius: var(--radius-sm);">
              <div class="doc-reply-title" style="font-weight: 700; color: var(--teal-accent); font-size: 0.88rem; margin-bottom: 0.3rem;">
                <i class="fa-solid fa-user-doctor"></i> Dr. Abdul Rouf's Answer:
              </div>
              <div class="doc-reply-text" style="color: var(--text-dark); font-size: 0.9rem; line-height: 1.5;">
                ${q.answer}
              </div>
            </div>
          ` : `
            <div class="pending-reply" style="font-size: 0.82rem; color: #d97706; display: flex; align-items: center; gap: 0.4rem; font-weight: 600;">
              <i class="fa-solid fa-clock"></i> Awaiting Dr. Abdul Rouf's response...
            </div>
          `}
        </div>
      `).join('')}
    </div>
  `;
}

// Render Patient Reviews
async function renderPatientReviews() {
  if (!patientReviewsFeed) return;
  const reviews = await getReviews();

  if (reviews.length === 0) {
    patientReviewsFeed.innerHTML = `<p style="color: var(--text-muted)">No reviews yet.</p>`;
    return;
  }

  patientReviewsFeed.innerHTML = reviews.map(r => {
    const stars = '⭐'.repeat(r.rating || 5);
    const dateFormatted = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '';
    const initial = r.patientName ? r.patientName.charAt(0).toUpperCase() : 'P';

    return `
      <div class="compact-review-item">
        <div class="review-avatar">${initial}</div>
        <div class="review-content-body">
          <div class="review-header-line">
            <span class="review-author">${r.patientName}</span>
            <span class="review-stars">${stars}</span>
          </div>
          <div class="review-comment-bubble">
            ${r.review}
          </div>
          ${dateFormatted ? `<div class="review-date">${dateFormatted}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Doctor Portal Data Renderer
async function renderDoctorPortalData() {
  let appointments = [];
  let questions = [];

  try {
    appointments = await getAppointments();
  } catch (e) { console.warn('getAppointments error:', e); }

  try {
    questions = await getQuestions();
  } catch (e) { console.warn('getQuestions error:', e); }

  // Metrics
  const elTotal = document.getElementById('metric-total-apts');
  const elPending = document.getElementById('metric-pending-apts');
  const elQa = document.getElementById('metric-pending-qa');
  if (elTotal) elTotal.textContent = appointments.length;
  if (elPending) elPending.textContent = appointments.filter(a => a.status === 'Pending').length;
  if (elQa) elQa.textContent = questions.filter(q => !q.answer).length;

  // Appointments Table
  const tbody = document.getElementById('doctor-appointments-tbody');
  if (tbody) {
    if (appointments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No appointments booked yet.</td></tr>`;
    } else {
      tbody.innerHTML = appointments.map(apt => {
        const rawPhone = (apt.patientPhone || '').replace(/[^0-9]/g, '');
        const waPhone = rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone;

        return `
          <tr>
            <td data-label="Date & Slot">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <strong style="color: var(--primary-navy); font-size:0.9rem;"><i class="fa-regular fa-calendar-check" style="color: var(--teal-accent);"></i> ${apt.date || 'N/A'}</strong>
                <span style="color: var(--teal-accent); font-weight:700; font-size:0.82rem;"><i class="fa-regular fa-clock"></i> ${apt.timeSlot || 'N/A'}</span>
              </div>
            </td>
            <td data-label="Patient Name">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <strong style="color: var(--primary-navy); font-size:0.92rem;"><i class="fa-solid fa-user-circle" style="color: var(--teal-accent);"></i> ${apt.patientName || 'Patient'}</strong>
                <span style="font-size:0.78rem; color: var(--text-muted);"><i class="fa-regular fa-envelope"></i> ${apt.patientEmail || 'No Email'}</span>
              </div>
            </td>
            <td data-label="Contact Phone">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <a href="tel:${apt.patientPhone}" style="color: var(--teal-accent); font-weight:700; font-size:0.85rem; text-decoration:none;">
                  <i class="fa-solid fa-phone"></i> ${apt.patientPhone || 'N/A'}
                </a>
                ${waPhone ? `
                  <a href="https://wa.me/${waPhone}" target="_blank" style="color: #25D366; font-size:0.78rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
                    <i class="fa-brands fa-whatsapp"></i> Chat WhatsApp
                  </a>
                ` : ''}
              </div>
            </td>
            <td data-label="Condition / Reason">
              <div style="font-size:0.85rem; color: var(--text-dark); max-width: 220px; line-height:1.4;">
                ${apt.issue ? `<strong>${apt.issue}</strong>` : '<span style="color: var(--text-muted); font-style:italic;">General Consultation</span>'}
              </div>
            </td>
            <td data-label="Fee">
              <strong style="color: var(--teal-accent); font-size:0.9rem;">1,000 RS</strong>
            </td>
            <td data-label="Status">
              <span class="badge-status ${apt.status}">
                ${apt.status === 'Approved' ? '<i class="fa-solid fa-circle-check"></i> Approved' :
                  apt.status === 'Pending' ? '<i class="fa-solid fa-hourglass-half"></i> Pending' :
                  apt.status === 'Completed' ? '<i class="fa-solid fa-check-double"></i> Completed' :
                  '<i class="fa-solid fa-circle-xmark"></i> Cancelled'}
              </span>
            </td>
            <td data-label="Actions">
              <div class="doctor-action-btns">
                ${apt.status === 'Pending' ? `
                  <button class="btn btn-primary action-btn-sm btn-status" data-id="${apt.id}" data-status="Approved" title="Accept appointment">
                    <i class="fa-solid fa-check"></i> Accept
                  </button>
                  <button class="btn btn-outline action-btn-sm btn-status" data-id="${apt.id}" data-status="Cancelled" style="color:#e74c3c; border-color:#e74c3c;" title="Reject appointment">
                    <i class="fa-solid fa-xmark"></i> Reject
                  </button>
                ` : apt.status === 'Approved' ? `
                  <button class="btn btn-accent action-btn-sm btn-status" data-id="${apt.id}" data-status="Completed" title="Mark completed">
                    <i class="fa-solid fa-check-double"></i> Complete
                  </button>
                  <button class="btn btn-outline action-btn-sm btn-status" data-id="${apt.id}" data-status="Cancelled" style="color:#e74c3c; border-color:#e74c3c;" title="Cancel appointment">
                    <i class="fa-solid fa-xmark"></i> Cancel
                  </button>
                ` : apt.status === 'Cancelled' ? `
                  <button class="btn btn-outline action-btn-sm btn-status" data-id="${apt.id}" data-status="Pending" style="color:var(--teal-accent); border-color:var(--teal-accent);" title="Reopen appointment">
                    <i class="fa-solid fa-rotate-left"></i> Re-open
                  </button>
                ` : `
                  <span style="color: var(--text-muted); font-size:0.8rem; font-weight:600;"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Done</span>
                `}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Reset / Clear All Appointments & Questions Handlers
  const btnClear = document.getElementById('btn-clear-apts');
  if (btnClear) {
    btnClear.onclick = async () => {
      if (confirm('Are you sure you want to clear all appointments and reset count to 0?')) {
        await clearAllAppointments();
        showToast('All appointments cleared. Count reset to 0.');
        await renderDoctorPortalData();
        await renderPatientAppointmentStatus();
      }
    };
  }

  const btnClearQa = document.getElementById('btn-clear-qa');
  if (btnClearQa) {
    btnClearQa.onclick = async () => {
      if (confirm('Are you sure you want to delete all patient questions?')) {
        await clearAllQuestions();
        showToast('All patient questions cleared.');
        await renderDoctorPortalData();
        await renderPublicQa();
      }
    };
  }

  // Status Action Click Handlers
  document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const targetBtn = e.target.closest('.btn-status');
      if (!targetBtn) return;
      const id = targetBtn.getAttribute('data-id');
      const newStatus = targetBtn.getAttribute('data-status');
      await updateAppointmentStatus(id, newStatus);
      showToast(`Appointment status updated to ${newStatus}`);
      renderDoctorPortalData();
      renderPatientAppointmentStatus();
    });
  });

  // Doctor Q&A Response Panel
  if (doctorQaList) {
    if (questions.length === 0) {
      doctorQaList.innerHTML = `<div style="text-align:center; padding: 2rem; background:#fff; border-radius: var(--radius-md); border:1px solid var(--border-light); color:var(--text-muted);">No patient questions submitted yet.</div>`;
    } else {
      doctorQaList.innerHTML = questions.map(q => `
        <div class="doctor-qa-card">
          <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 0.8rem; flex-wrap:wrap; gap:0.5rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.6rem;">
            <div>
              <strong style="color: var(--primary-navy); font-size: 1rem;"><i class="fa-solid fa-user-circle" style="color: var(--teal-accent);"></i> Patient: ${q.patientName || 'Anonymous'}</strong>
              <span style="font-size: 0.82rem; color: var(--text-muted); margin-left: 0.4rem;">(${q.patientEmail || 'No Email'})</span>
            </div>
            <span style="font-size: 0.78rem; color: var(--text-muted); background: var(--surface-muted); padding: 0.2rem 0.6rem; border-radius: 99px;">
              <i class="fa-solid fa-clock"></i> ${q.createdAt ? new Date(q.createdAt).toLocaleString() : ''}
            </span>
          </div>

          <div style="font-size:0.95rem; margin-bottom: 1rem; background: var(--surface-muted); padding: 0.9rem 1.1rem; border-radius: var(--radius-sm); border-left: 4px solid var(--gold-accent);">
            <strong style="color: var(--primary-navy); display: block; margin-bottom: 0.2rem;">Patient Question:</strong>
            <span style="color: var(--text-dark);">${q.question}</span>
          </div>

          ${q.answer ? `
            <div style="background: rgba(0, 168, 150, 0.08); padding: 0.9rem 1.1rem; border-radius: var(--radius-sm); border: 1px solid rgba(0, 168, 150, 0.3); border-left: 4px solid var(--teal-accent);">
              <strong style="color: var(--teal-accent); display: block; margin-bottom: 0.3rem;"><i class="fa-solid fa-user-doctor"></i> Dr. Abdul Rouf's Answer:</strong>
              <p style="color: var(--text-dark); font-size: 0.92rem; line-height: 1.5;">${q.answer}</p>
            </div>
          ` : `
            <form class="form-answer-qa" data-id="${q.id}" data-docid="${q._docId || q.firebaseId || q.id}" style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.8rem;">
              <input type="text" class="doctor-reply-input" placeholder="Type doctor's response to patient here..." required style="flex:1; min-width:220px; margin:0; padding:0.75rem 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
              <button type="submit" class="btn btn-primary action-btn-sm" style="padding:0.75rem 1.2rem; font-size:0.88rem; justify-content:center;">
                <i class="fa-solid fa-reply"></i> Post Answer
              </button>
            </form>
          `}
        </div>
      `).join('');
    }
  }

  document.querySelectorAll('.form-answer-qa').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.getAttribute('data-id');
      const docId = form.getAttribute('data-docid');
      const answerText = form.querySelector('input').value.trim();
      if (!answerText) return;
      // Use Firestore doc ID (_docId) for direct, reliable cross-device update
      await answerQuestion(docId || id, answerText);
      showToast('Answer posted to patient successfully!');
      renderDoctorPortalData();
      renderPublicQa();
    });
  });
}

// Doctor Portal Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const targetTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.portal-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(targetTab).style.display = 'block';
  });
});
