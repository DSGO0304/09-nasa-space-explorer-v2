// ================== CONFIG ==================
const FEED_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// ================== ELEMENTS ==================
// Keep a lightweight els container but resolve actual DOM nodes after DOMContentLoaded
const els = {
  form: null,
  start: null,
  end: null,
  fetchBtn: null,
  resetBtn: null,
  status: null,
  fact: null,
  gallery: null,
  tpl: null,
  modal: null,
  modalClose: null,
  modalMedia: null,
  modalTitle: null,
  modalDate: null,
  modalDesc: null,
};

let DATA = []; // cache global del feed

// ================== FACTS ==================
const FACTS = [
  'A Venus le dura más el día que el año.',
  'Algunas estrellas de neutrones giran 600+ veces por segundo.',
  'El Sol concentra ~99.86% de la masa del Sistema Solar.',
  'Andrómeda y la Vía Láctea colisionarán en ~4 mil millones de años.',
  'En la Luna las huellas pueden durar millones de años.'
];

function showRandomFact() {
  const f = FACTS[Math.floor(Math.random() * FACTS.length)];
  if (els.fact) els.fact.textContent = `Did you know? ${f}`;
}

// ================== UTILS ==================
function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(+d)) return iso || '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
function toISO(d) { return new Date(d).toISOString().slice(0,10); }
function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1];
      const v = u.searchParams.get('v'); if (v) return v;
    }
  } catch (e) {}
  return null;
}
function inRange(iso, a, b) {
  const x = new Date(iso).getTime();
  return x >= new Date(a).getTime() && x <= new Date(b).getTime();
}

// ---- small helper that was missing ----
function setStatus(msg) {
  if (!els.status) return;
  els.status.innerHTML = msg ? `<span>${msg}</span>` : '';
}

// ================== FETCH ==================
async function ensureDataLoaded() {
  if (DATA.length) return;
  setStatus('🔄 Loading space photos…');
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();

    // Normalize the parsed JSON to an array (some feeds use { items: [...] })
    const dataArray = Array.isArray(arr) ? arr : (Array.isArray(arr.items) ? arr.items : []);

    // Set bounds ASAP (even if array is empty we guard inside)
    setDateInputBoundsFromData(dataArray);

    if (!Array.isArray(dataArray) || dataArray.length === 0) throw new Error('Feed is not an array or is empty');

    // Ordena por fecha asc para min/max y luego usaremos filtros
    DATA = dataArray.slice().sort((a,b) => new Date(a.date) - new Date(b.date));
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('⚠️ Could not load data from the class feed.');
  }
}

// Ajusta los límites del calendario con base en las fechas del JSON
function setDateInputBoundsFromData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('⚠️ No data available to set date bounds.');
    return;
  }

  // Toma solo fechas válidas y ordénalas (YYYY-MM-DD ordena bien lexicográficamente)
  const sortedDates = data
    .map(item => item?.date)
    .filter(Boolean)
    .sort();

  if (sortedDates.length === 0) {
    console.warn('⚠️ No valid date fields found in data.');
    return;
  }

  const minDate = sortedDates[0]; // earliest
  const maxDate = sortedDates[sortedDates.length - 1]; // latest

  const startInput = document.getElementById('startDate') ||
    document.querySelector('.controls input[type="date"]:first-of-type') ||
    document.querySelectorAll('.controls input[type="date"]')[0];
  const endInput = document.getElementById('endDate') ||
    document.querySelector('.controls input[type="date"]:last-of-type') ||
    document.querySelectorAll('.controls input[type="date"]')[1];

  if (!startInput || !endInput) {
    console.warn('⚠️ Date input elements not found in the DOM.');
    return;
  }

  startInput.min = minDate;
  startInput.max = maxDate;
  endInput.min = minDate;
  endInput.max = maxDate;

  // Preselecciona últimos 7 días disponibles (recortado al mínimo)
  const end = new Date(maxDate);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  const startISO = start.toISOString().slice(0, 10);
  startInput.value = startISO < minDate ? minDate : startISO;
  endInput.value = maxDate;

  console.log(`📅 Date range set from ${minDate} to ${maxDate}`);
}

// ================== RENDER ==================
function clearGallery() {
  const gallery = els.gallery || document.querySelector('.gallery') || document.getElementById('gallery');
  if (gallery) gallery.innerHTML = '';
}

function createCard(item) {
  const isVideo = item.media_type === 'video';
  let node = null;
  const tpl = els.tpl || document.getElementById('cardTemplate');
  if (tpl && tpl.content) {
    node = tpl.content.firstElementChild.cloneNode(true);
  } else {
    node = document.createElement('article');
    node.className = 'card';
    node.innerHTML = `
      <div class="thumb-wrap"><img class="thumb" alt=""></div>
      <div class="card-body">
        <h3 class="card-title"></h3>
        <p class="card-date"></p>
      </div>
    `;
  }

  const img = node.querySelector('.thumb');
  const titleEl = node.querySelector('[data-title]') || node.querySelector('.card-title');
  const dateEl = node.querySelector('[data-date]') || node.querySelector('.card-date');
  const badge = node.querySelector('[data-type]');

  if (isVideo) {
    const yt = parseYouTubeId(item.url || '');
    img.src = item.thumbnail_url || (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : 'https://placehold.co/800x450?text=Video');
    img.alt = item.title || 'APOD video';
    if (badge) { badge.textContent = 'VIDEO'; badge.classList.add('is-video'); }
  } else {
    img.src = item.hdurl || item.url || '';
    img.alt = item.title || 'APOD image';
    if (badge) { badge.textContent = 'IMAGE'; badge.classList.add('is-image'); }
  }

  if (titleEl) titleEl.textContent = item.title || 'Untitled';
  if (dateEl) dateEl.textContent = formatDate(item.date);

  node.tabIndex = 0;
  node.style.cursor = 'pointer';
  node.addEventListener('click', () => openModal(item));
  node.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') openModal(item); });

  return node;
}

function renderList(items) {
  const gallery = els.gallery || document.querySelector('.gallery') || document.getElementById('gallery');
  if (!gallery) return;

  gallery.innerHTML = '';
  if (!items || items.length === 0) {
    setStatus('🙈 No results for that date range.');
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(item => frag.appendChild(createCard(item)));
  gallery.appendChild(frag);

  setStatus(`${items.length} item(s) displayed.`);
}

// ================== MODAL ==================
function openModal(item) {
  const modal = els.modal || document.getElementById('modal');
  const modalMedia = els.modalMedia || document.getElementById('modalMedia');
  const modalTitle = els.modalTitle || document.getElementById('modalTitle');
  const modalDate = els.modalDate || document.getElementById('modalDate');
  const modalDesc = els.modalDesc || document.getElementById('modalDesc');

  if (!modal || !modalMedia) {
    if (item.url) window.open(item.url, '_blank', 'noopener');
    return;
  }

  modalMedia.innerHTML = '';
  if (modalTitle) modalTitle.textContent = item.title || '';
  if (modalDate)  modalDate.textContent  = formatDate(item.date);
  if (modalDesc)  modalDesc.textContent  = item.explanation || '';

  if (item.media_type === 'image') {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url || '';
    img.alt = item.title || '';
    modalMedia.appendChild(img);
  } else if (item.media_type === 'video') {
    const yt = parseYouTubeId(item.url || '');
    const iframe = document.createElement('iframe');
    iframe.src = yt ? `https://www.youtube.com/embed/${yt}` : (item.url || '');
    iframe.width = '100%';
    iframe.height = '480';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('allowfullscreen', '');
    modalMedia.appendChild(iframe);
  }

  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = els.modal || document.getElementById('modal');
  const modalMedia = els.modalMedia || document.getElementById('modalMedia');
  if (!modal) return;
  modal.setAttribute('hidden', '');
  if (modalMedia) modalMedia.innerHTML = '';
  document.body.style.overflow = '';
}

function bindModalEvents() {
  els.modal = els.modal || document.getElementById('modal');
  els.modalClose = els.modalClose || document.getElementById('modalClose');
  els.modalMedia = els.modalMedia || document.getElementById('modalMedia');

  if (els.modal) {
    els.modal.addEventListener('click', (e) => {
      if (e.target === els.modal || e.target.hasAttribute('data-close')) closeModal();
    });
  }
  if (els.modalClose) {
    els.modalClose.addEventListener('click', closeModal);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.modal && !els.modal.hidden) closeModal(); });
}

// ================== ACTIONS ==================
async function onSubmit(e) {
  e.preventDefault();
  await ensureDataLoaded();
  if (!DATA.length) return;

  const s = els.start?.value;
  const eDate = els.end?.value;

  if (!s || !eDate) {
    setStatus('🗓️ Please pick both start and end dates.');
    return;
  }
  if (new Date(s) > new Date(eDate)) {
    setStatus('↔️ Start date must be before end date.');
    return;
  }

  const results = DATA
    .filter(it => inRange(it.date, s, eDate))
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  setStatus('');
  renderList(results);
}

function onReset() {
  if (els.start) els.start.value = '';
  if (els.end) els.end.value = '';
  clearGallery();
  setStatus('🔭 Pick a date range and hit “Get Space Images.”');
  if (els.start) els.start.focus();
}

// ================== INIT ==================
document.addEventListener('DOMContentLoaded', async () => {
  // Resolve elements
  els.form   = document.getElementById('controls') || document.querySelector('.controls') || document.querySelector('form');
  els.start  = document.getElementById('startDate') || document.querySelectorAll('.controls input[type="date"]')[0];
  els.end    = document.getElementById('endDate')   || document.querySelectorAll('.controls input[type="date"]')[1];
  els.fetchBtn = document.getElementById('fetchBtn') || document.querySelector('.controls button');
  els.resetBtn = document.getElementById('resetDateRangeBtn') || document.querySelector('#resetDateRangeBtn');
  els.status = document.getElementById('status');
  els.fact   = document.getElementById('fact');
  els.gallery= document.getElementById('gallery') || document.querySelector('.gallery');
  els.tpl    = document.getElementById('cardTemplate');
  els.modal  = document.getElementById('modal');
  els.modalClose = document.getElementById('modalClose');
  els.modalMedia = document.getElementById('modalMedia');
  els.modalTitle = document.getElementById('modalTitle');
  els.modalDate  = document.getElementById('modalDate');
  els.modalDesc  = document.getElementById('modalDesc');

  showRandomFact();
  setStatus('🔭 Pick a date range and hit “Get Space Images.”');
  bindModalEvents();

  try { await ensureDataLoaded(); } catch (e) { /* handled inside */ }

  if (els.form) {
    els.form.addEventListener('submit', onSubmit);
  } else if (els.fetchBtn) {
    els.fetchBtn.addEventListener('click', (ev) => { ev.preventDefault(); onSubmit(ev); });
  }

  if (els.resetBtn) els.resetBtn.addEventListener('click', onReset);
});
