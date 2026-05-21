// ===== StyleSync — Virtual Try-On Logic =====
import { apiPost, apiGet, isLoggedIn, showToast } from './api.js';

const state = { personFile: null, garmentFile: null, category: 'auto', processing: false };

// DOM refs
const personZone = document.getElementById('personZone');
const garmentZone = document.getElementById('garmentZone');
const personInput = document.getElementById('personInput');
const garmentInput = document.getElementById('garmentInput');
const tryOnBtn = document.getElementById('tryOnBtn');
const uploadSection = document.getElementById('uploadSection');
const processingState = document.getElementById('processingState');
const resultState = document.getElementById('resultState');
const errorState = document.getElementById('errorState');

// File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Setup upload zone
function setupUploadZone(zone, input, key) {
  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file, zone, key);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0], zone, key);
  });
}

function handleFile(file, zone, key) {
  state[key] = file;
  const url = URL.createObjectURL(file);
  zone.innerHTML = `<img src="${url}" alt="Uploaded ${key}" />
    <p class="upload-zone-text" style="margin-top: var(--space-sm);"><strong>Click to change</strong></p>`;
  updateTryOnBtn();
}

function updateTryOnBtn() {
  tryOnBtn.disabled = !(state.personFile && state.garmentFile);
}

setupUploadZone(personZone, personInput, 'personFile');
setupUploadZone(garmentZone, garmentInput, 'garmentFile');

// Category chips
document.querySelectorAll('.filter-chip[data-cat]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip[data-cat]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.category = chip.dataset.cat;
  });
});

// Try-on submit
tryOnBtn.addEventListener('click', async () => {
  if (!state.personFile || !state.garmentFile || state.processing) return;

  state.processing = true;
  showSection('processing');

  try {
    const [modelImage, garmentImage] = await Promise.all([
      fileToBase64(state.personFile),
      fileToBase64(state.garmentFile),
    ]);

    const data = await apiPost('/tryon/start', {
      modelImage,
      garmentImage,
      category: state.category,
    });

    if (data.error) throw new Error(data.error);

    // Poll for result
    await pollResult(data.id);
  } catch (err) {
    showError(err.message);
  } finally {
    state.processing = false;
  }
});

async function pollResult(predictionId) {
  const progressFill = document.getElementById('progressFill');
  let progress = 10;
  progressFill.style.width = `${progress}%`;

  const interval = setInterval(() => {
    progress = Math.min(progress + 5, 90);
    progressFill.style.width = `${progress}%`;
  }, 2000);

  try {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const status = await apiGet(`/tryon/${predictionId}`);

      if (status.status === 'completed' && status.output) {
        clearInterval(interval);
        progressFill.style.width = '100%';
        const resultUrl = Array.isArray(status.output) ? status.output[0] : status.output;
        showResult(resultUrl);
        return;
      }

      if (status.status === 'failed') {
        clearInterval(interval);
        throw new Error(status.error || 'Try-on generation failed');
      }
    }
    clearInterval(interval);
    throw new Error('Generation timed out. Please try again.');
  } catch (err) {
    clearInterval(interval);
    throw err;
  }
}

function showSection(section) {
  uploadSection.style.display = section === 'upload' ? '' : 'none';
  processingState.style.display = section === 'processing' ? '' : 'none';
  resultState.style.display = section === 'result' ? '' : 'none';
  errorState.style.display = section === 'error' ? '' : 'none';
  tryOnBtn.style.display = section === 'upload' ? '' : 'none';
  const catContainer = document.querySelector('.filter-chip[data-cat]');
  if (catContainer) {
    const parent = catContainer.closest('.text-center');
    if (parent) parent.style.display = section === 'upload' ? '' : 'none';
  }
}

function showResult(imageUrl) {
  const img = document.getElementById('resultImage');
  img.src = imageUrl;
  showSection('result');

  // Download
  document.getElementById('downloadResult').onclick = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'tryonix-tryon-result.png';
    a.click();
  };

  // Save to wardrobe
  document.getElementById('saveResult').onclick = async () => {
    if (!isLoggedIn()) {
      showToast('Please log in to save results', 'info');
      return;
    }
    try {
      await apiPost('/outfits', {
        outfitId: `tryon_${Date.now()}`,
        tryonResultUrl: imageUrl,
      });
      showToast('Saved to your wardrobe!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showSection('error');
}

// Try another / retry
document.getElementById('tryAnother')?.addEventListener('click', () => {
  state.personFile = null;
  state.garmentFile = null;
  personZone.innerHTML = `<div class="upload-zone-icon">🧍</div>
    <p class="upload-zone-text"><strong>Click or drag</strong> your full-body photo here<br/>
    <small style="color: var(--text-tertiary);">JPG, PNG — clear, front-facing photo works best</small></p>`;
  garmentZone.innerHTML = `<div class="upload-zone-icon">👔</div>
    <p class="upload-zone-text"><strong>Click or drag</strong> the garment image here<br/>
    <small style="color: var(--text-tertiary);">Clean product photo on white background works best</small></p>`;
  updateTryOnBtn();
  showSection('upload');
});

document.getElementById('retryBtn')?.addEventListener('click', () => showSection('upload'));

// Initialize
showSection('upload');
