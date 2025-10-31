// Your NASA API key and base URL
const API_KEY = 'aI6YTCkUEp5WwnGDD7Eyj1PMnWnvtV4e6uiwUAW0'; // Your NASA API key
const BASE_URL = 'https://api.nasa.gov/planetary/apod';

// Get references to DOM elements
const form = document.getElementById('controls');
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const fetchBtn = document.getElementById('fetchBtn');
const statusEl = document.getElementById('status');
const galleryEl = document.getElementById('gallery');
const template = document.getElementById('cardTemplate');
const modal = document.getElementById('modal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDesc = document.getElementById('modalDesc');
const modalClose = document.getElementById('modalClose');
const resetBtn = document.getElementById('resetDateRangeBtn');

// --- Date input constraints & synchronization ---
// Removed custom min/max and synchronization for the date inputs to restore
// the browser's default date picker behavior (allow month/year navigation).
// Previously this file limited selection to the current month; that code has
// been removed so users can pick any date via the native date picker.

// Optionally, set default dates (last 7 days) for a quick demo
(function setDefaultDates() {
  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 6); // last 7 days
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (startInput && !startInput.value) startInput.value = fmt(prior);
  if (endInput && !endInput.value) endInput.value = fmt(today);
})();

// Function to fetch NASA's APOD data
async function fetchAPODData(startDate, endDate) {
  try {
    // Build request URL using template literals
    const url = `${BASE_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`;
    // Fetch from NASA API
    const response = await fetch(url);

    // Check for HTTP/network errors (helpful for debugging)
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Network response was not ok (${response.status} ${response.statusText}) ${text}`);
    }

    let data = await response.json();

    // If the API returns a single object (when startDate === endDate), normalize to an array
    if (data && !Array.isArray(data) && data.url) {
      data = [data];
    }

    // If we receive an array of APOD entries, render them
    if (Array.isArray(data) && data.length > 0) {
      displayGallery(data);
      statusEl.textContent = `✅ Showing ${data.length} result(s).`;
    } else if (data && data.error) {
      statusEl.textContent = `Error: ${data.error.message || 'Invalid request'}`;
      console.error('API error:', data);
      // show an empty prompt in the gallery so user sees instructional message
      showInitialPrompt();
    } else {
      statusEl.textContent = 'No results found for that range.';
      console.error('Invalid data:', data);
      showInitialPrompt();
    }
  } catch (error) {
    // Friendly message for users + detailed error in console for debugging
    statusEl.textContent = 'Failed to load data. See console for details.';
    console.error('There was a problem with the fetch operation:', error);
    showInitialPrompt();
  }
}

// Small helper to show an instructional prompt inside the gallery
function showInitialPrompt() {
  if (!galleryEl) return;
  galleryEl.innerHTML = `
    <div class="card" style="background:transparent;box-shadow:none;text-align:center;">
      <div style="padding:32px;">
        <p style="font-size:1.1rem;color:#333;margin-bottom:8px;">🔭 Select a date range to get space images.</p>
        <p style="color:#666;margin:0;">Use the date pickers above and click <strong>Get Space Images</strong>.</p>
      </div>
    </div>
  `;
}

// Render gallery using the template in the HTML
function displayGallery(items) {
  // Debug: check data passed in (helpful for beginners to inspect in DevTools)
  console.log('displayGallery called with items:', items);

  // Clear previous gallery
  galleryEl.innerHTML = '';

  // Sort by date descending so newest appear first
  const sorted = items.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((item) => {
    // Clone template content (keeps DOM creation simple for beginners)
    const node = template.content.cloneNode(true);
    const article = node.querySelector('article');
    const img = node.querySelector('.thumb');
    const badge = node.querySelector('.badge');
    const titleEl = node.querySelector('[data-title]');
    const dateEl = node.querySelector('[data-date]');

    // Fill card fields using template literals for clarity
    titleEl.textContent = `${item.title || 'Untitled'}`;
    dateEl.textContent = `${item.date || ''}`;
    badge.textContent = item.media_type === 'video' ? 'VIDEO' : 'IMAGE';
    badge.setAttribute('data-type', item.media_type);

    if (item.media_type === 'image') {
      img.src = item.url;
      img.alt = item.title || 'Astronomy Picture';
    } else {
      // For videos, if a thumbnail URL is available use it; otherwise show a placeholder
      img.src = item.thumbnail_url || '';
      img.alt = item.title || 'APOD video';
    }

    // Open modal on click or keypress (Enter / Space) for accessibility
    article.addEventListener('click', () => openModal(item));
    article.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item);
      }
    });

    // Append the card to the gallery — CSS will make it full-width single column
    galleryEl.appendChild(node);
  });
}

// Open modal with full media and info
function openModal(item) {
  // Debug: confirm the modal open is triggered (useful while learning)
  console.log('Opening modal for:', item && item.title ? item.title : item);

  // Clear previous media and insert new content
  modalMedia.innerHTML = '';

  modalTitle.textContent = item.title || '';
  modalDate.textContent = item.date || '';
  modalDesc.textContent = item.explanation || '';

  if (item.media_type === 'image') {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url;
    img.alt = item.title || 'APOD image';
    modalMedia.appendChild(img);
  } else if (item.media_type === 'video') {
    const iframe = document.createElement('iframe');
    iframe.src = item.url;
    iframe.title = item.title || 'APOD video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    modalMedia.appendChild(iframe);
  } else {
    modalMedia.textContent = 'Media format not supported.';
  }

  // Show modal and prevent background scroll
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

// Close modal helper
function closeModal() {
  modal.setAttribute('hidden', '');
  modalMedia.innerHTML = '';
  document.body.style.overflow = '';
}

// Wire up modal close controls (guard in case element missing)
if (modalClose) modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  // close when clicking backdrop (has data-close on backdrop in HTML)
  if (e.target.hasAttribute('data-close') || e.target === modal) {
    closeModal();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
    closeModal();
  }
});

// Handle form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const startDate = startInput.value;
  const endDate = endInput.value;

  // Basic validation
  if (!startDate || !endDate) {
    statusEl.textContent = 'Please choose both start and end dates.';
    return;
  }
  if (new Date(startDate) > new Date(endDate)) {
    statusEl.textContent = 'Start date must be before or equal to end date.';
    return;
  }

  statusEl.textContent = '🔭 Fetching images...';
  fetchAPODData(startDate, endDate);
});

// Function to reset date inputs and gallery state
function resetDateRange() {
  // Clear date inputs (empty so user can pick new range)
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';

  // Show initial prompt in the gallery
  showInitialPrompt();

  // Reset status/message to prompt the user
  if (statusEl) statusEl.textContent = '🔭 Pick a date range and hit “Get Space Images.”';

  // Close modal if open
  if (modal && !modal.hasAttribute('hidden')) {
    closeModal();
  }

  // Focus the start date input so the user can quickly choose a new range
  if (startInput) startInput.focus();
}

// Wire reset button to the function (guard in case element is missing)
if (resetBtn) {
  resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetDateRange();
  });
}

// Ensure initial prompt is shown on first load
showInitialPrompt();
