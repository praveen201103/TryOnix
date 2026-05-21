// ===== StyleSync — Recommendation Logic =====
import { apiPost, isLoggedIn, showToast } from './api.js';

const state = {
  step: 1,
  itemType: null,
  occasion: null,
  bodyType: null,
  budget: null,
  gender: null,
};

// Check URL params for pre-selected occasion
const params = new URLSearchParams(window.location.search);
if (params.get('occasion')) {
  state.occasion = params.get('occasion');
}

// DOM refs
const quizSection = document.getElementById('quizSection');
const resultsSection = document.getElementById('resultsSection');

// Setup option card selection
function setupOptionCards(containerId, stateKey, nextBtnId) {
  const container = document.getElementById(containerId);
  const nextBtn = document.getElementById(nextBtnId);
  if (!container) return;

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.option-card');
    if (!card) return;

    container.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state[stateKey] = card.dataset.value;

    if (nextBtn) nextBtn.disabled = false;
  });

  // Pre-select if state already has a value
  if (state[stateKey]) {
    const card = container.querySelector(`[data-value="${state[stateKey]}"]`);
    if (card) {
      card.classList.add('selected');
      if (nextBtn) nextBtn.disabled = false;
    }
  }
}

setupOptionCards('genderOptions', 'gender', 'step1Next');
setupOptionCards('occasionOptions', 'occasion', 'step2Next');
setupOptionCards('budgetOptions', 'budget', 'step3Next');
setupOptionCards('itemTypeOptions', 'itemType', 'step4Next');
setupOptionCards('bodyTypeOptions', 'bodyType', null);

// Step navigation
function goToStep(stepNum) {
  state.step = stepNum;

  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(`step${stepNum}`);
  if (step) step.classList.add('active');

  // Update step indicators
  document.querySelectorAll('.steps .step').forEach(s => {
    const num = parseInt(s.dataset.step);
    s.classList.remove('active', 'completed');
    if (num === stepNum) s.classList.add('active');
    if (num < stepNum) s.classList.add('completed');
  });
}

// Navigation buttons
document.getElementById('step1Next')?.addEventListener('click', () => goToStep(2));
document.getElementById('step2Back')?.addEventListener('click', () => goToStep(1));
document.getElementById('step2Next')?.addEventListener('click', () => goToStep(3));
document.getElementById('step3Back')?.addEventListener('click', () => goToStep(2));
document.getElementById('step3Next')?.addEventListener('click', () => goToStep(4));
document.getElementById('step4Back')?.addEventListener('click', () => goToStep(3));
document.getElementById('step4Next')?.addEventListener('click', () => goToStep(5));
document.getElementById('step5Back')?.addEventListener('click', () => goToStep(4));

// Submit
document.getElementById('step5Submit')?.addEventListener('click', () => fetchRecommendations());

// Change filters / retry
document.getElementById('changeFilters')?.addEventListener('click', showQuiz);
document.getElementById('retryFilters')?.addEventListener('click', showQuiz);

function showQuiz() {
  quizSection.style.display = '';
  resultsSection.style.display = 'none';
  goToStep(1);
}

// Fetch recommendations
async function fetchRecommendations() {
  const btn = document.getElementById('step5Submit');
  btn.disabled = true;
  btn.textContent = 'Finding items...';

  try {
    const data = await apiPost('/recommend', {
      itemType: state.itemType,
      occasion: state.occasion,
      bodyType: state.bodyType,
      budget: state.budget,
      gender: state.gender,
    });

    renderResults(data.results, data.total, data.aiRecommendation);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎨 Get Recommendations';
  }
}

// Render results
function renderResults(results, total, aiRecommendation) {
  quizSection.style.display = 'none';
  resultsSection.style.display = '';

  const grid = document.getElementById('resultsGrid');
  const count = document.getElementById('resultsCount');
  const noResults = document.getElementById('noResults');
  const aiBox = document.getElementById('aiRecommendationBox');
  const aiText = document.getElementById('aiRecommendationText');

  count.textContent = `${total} outfit${total !== 1 ? 's' : ''} found for your style`;

  if (aiRecommendation && aiBox && aiText) {
    aiText.textContent = aiRecommendation;
    aiBox.style.display = 'block';
  } else if (aiBox) {
    aiBox.style.display = 'none';
  }

  if (results.length === 0) {
    grid.style.display = 'none';
    noResults.style.display = '';
    return;
  }

  grid.style.display = '';
  noResults.style.display = 'none';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  grid.innerHTML = results.map((outfit, i) => `
    <div class="outfit-card animate-fade-in-up delay-${Math.min(i + 1, 6)}${outfit.aiPicked ? ' ai-picked' : ''}" id="outfitCard_${outfit.id}">
      <div class="outfit-card-image" style="background: var(--bg-secondary); overflow: hidden; position: relative;">
        <img src="${outfit.imageUrl}" alt="${outfit.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/400x500/1A1A2E/E94560?text=TryOnix';" />
        ${outfit.aiPicked ? '<span style="position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#8B5CF6,#EC4899);color:#fff;font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(139,92,246,0.4);">AI Pick ✨</span>' : ''}
      </div>
      <div class="outfit-card-body">
        <h4 class="outfit-card-name">${outfit.name}</h4>
        <p class="outfit-card-desc">${outfit.description}</p>
        <div class="outfit-card-tags">
          ${outfit.pieces.slice(0, 3).map(p => `<span class="tag">${p}</span>`).join('')}
        </div>
        <div class="outfit-card-meta">
          <span class="outfit-card-price">₹${outfit.price.toLocaleString('en-IN')}</span>
          <span class="tag tag-green">${outfit.priceRange}</span>
        </div>
        <div class="outfit-card-actions">
          <button class="btn btn-primary btn-sm tryon-btn" data-id="${outfit.id}">👗 Try On</button>
          <button class="btn btn-secondary btn-sm save-btn" data-id="${outfit.id}">♡ Save</button>
          <a href="https://www.amazon.com/s?k=${encodeURIComponent(outfit.name + ' outfit')}" target="_blank" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;">🛒 Buy Now</a>
        </div>
      </div>
    </div>
  `).join('');

  // Try-on button handlers
  grid.querySelectorAll('.tryon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `/pages/tryon.html?outfit=${btn.dataset.id}`;
    });
  });

  // Save button handlers
  grid.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!isLoggedIn()) {
        showToast('Please log in to save outfits', 'info');
        return;
      }
      try {
        await apiPost('/outfits', { outfitId: btn.dataset.id });
        btn.textContent = '♥ Saved';
        btn.disabled = true;
        showToast('Outfit saved!', 'success');
      } catch (err) {
        if (err.message.includes('already')) {
          btn.textContent = '♥ Saved';
          btn.disabled = true;
        } else {
          showToast(err.message, 'error');
        }
      }
    });
  });
}

// Auto-submit if occasion came from URL
if (state.occasion) {
  const card = document.querySelector(`#occasionOptions [data-value="${state.occasion}"]`);
  if (card) card.classList.add('selected');
  document.getElementById('step1Next').disabled = false;
}
