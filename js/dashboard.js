// ===== StyleSync — Dashboard Logic =====
import { apiGet, apiDelete, apiUpload, isLoggedIn, getUser, showToast } from './api.js';

// Auth guard
if (!isLoggedIn()) {
  window.location.href = '/pages/login.html';
}

// Load profile
async function loadProfile() {
  try {
    const profile = await apiGet('/auth/me');
    document.getElementById('dashUserName').textContent = profile.name;
    document.getElementById('dashUserEmail').textContent = profile.email;
    document.getElementById('statSaved').textContent = profile.savedOutfitsCount || 0;

    if (profile.avatar) {
      const avatar = document.getElementById('dashboardAvatar');
      avatar.src = profile.avatar;
      avatar.style.display = 'block';
      document.getElementById('avatarPlaceholder').style.display = 'none';
      showCurrentAvatar(profile.avatar);
    }
  } catch (err) {
    const user = getUser();
    if (user) {
      document.getElementById('dashUserName').textContent = user.name;
      document.getElementById('dashUserEmail').textContent = user.email;
    }
  }
}

// Load saved outfits
async function loadSavedOutfits() {
  try {
    const outfits = await apiGet('/outfits');
    const grid = document.getElementById('savedGrid');
    const empty = document.getElementById('savedEmpty');

    if (outfits.length === 0) {
      grid.style.display = 'none';
      empty.style.display = '';
      return;
    }

    grid.style.display = '';
    empty.style.display = 'none';
    document.getElementById('statSaved').textContent = outfits.length;

    grid.innerHTML = outfits.map(item => `
      <div class="outfit-card" id="saved_${item.id}">
        <div class="outfit-card-image" style="background: var(--gradient-glass); display:flex; align-items:center; justify-content:center;">
          ${item.tryon_result_url
            ? `<img src="${item.tryon_result_url}" alt="Try-on result" style="width:100%;height:100%;object-fit:cover;" />`
            : '<span style="font-size: 4rem; opacity: 0.3;">👔</span>'}
        </div>
        <div class="outfit-card-body">
          <h4 class="outfit-card-name">${item.outfit_id}</h4>
          <p class="outfit-card-desc text-secondary" style="font-size:0.8rem;">
            Saved on ${new Date(item.saved_at).toLocaleDateString()}
          </p>
          ${item.notes ? `<p class="outfit-card-desc">${item.notes}</p>` : ''}
          <div class="outfit-card-actions">
            <button class="btn btn-outline btn-sm tryon-saved" data-id="${item.outfit_id}">👗 Try On</button>
            <button class="btn btn-ghost btn-sm remove-saved" data-id="${item.outfit_id}">🗑️ Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    // Remove handlers
    grid.querySelectorAll('.remove-saved').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiDelete(`/outfits/${btn.dataset.id}`);
          showToast('Outfit removed', 'success');
          loadSavedOutfits();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Try-on handlers
    grid.querySelectorAll('.tryon-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = `/pages/tryon.html?outfit=${btn.dataset.id}`;
      });
    });
  } catch (err) {
    console.error('Failed to load saved outfits:', err);
  }
}

// Avatar upload
function setupAvatarUpload() {
  // Small avatar in header
  const headerZone = document.getElementById('avatarUploadZone');
  const headerInput = document.getElementById('avatarInput');
  headerZone.addEventListener('click', () => headerInput.click());
  headerInput.addEventListener('change', () => uploadAvatar(headerInput.files[0]));

  // Large avatar upload
  const largeZone = document.getElementById('avatarUploadLarge');
  const largeInput = document.getElementById('avatarInputLarge');
  largeZone.addEventListener('click', () => largeInput.click());
  largeInput.addEventListener('change', () => uploadAvatar(largeInput.files[0]));

  largeZone.addEventListener('dragover', (e) => { e.preventDefault(); largeZone.classList.add('drag-over'); });
  largeZone.addEventListener('dragleave', () => largeZone.classList.remove('drag-over'));
  largeZone.addEventListener('drop', (e) => {
    e.preventDefault();
    largeZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) uploadAvatar(e.dataTransfer.files[0]);
  });
}

async function uploadAvatar(file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const data = await apiUpload('/avatar', formData);
    showToast('Avatar updated!', 'success');

    // Update header avatar
    const avatar = document.getElementById('dashboardAvatar');
    avatar.src = data.avatar;
    avatar.style.display = 'block';
    document.getElementById('avatarPlaceholder').style.display = 'none';

    showCurrentAvatar(data.avatar);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showCurrentAvatar(url) {
  const preview = document.getElementById('currentAvatarPreview');
  const img = document.getElementById('currentAvatarImg');
  img.src = url;
  preview.style.display = '';
}

// Tab switching
document.querySelectorAll('.dashboard-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.dashboard-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`tabContent${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}`).style.display = '';
  });
});

// Init
loadProfile();
loadSavedOutfits();
setupAvatarUpload();
