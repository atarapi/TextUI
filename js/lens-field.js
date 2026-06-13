const HIRAGANA =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' +
  'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっーゔ';
const KATAKANA =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポァィゥェォャュョッーヴ';
const DIGITS = '0123456789';
const POOL = HIRAGANA + KATAKANA + DIGITS;

const WALL = document.getElementById('lensWall');
const SPOTLIGHT = document.getElementById('lensSpotlight');
const COMPOSE = document.getElementById('lensCompose');
const OUTPUT = document.getElementById('lensOutput');
const PLACEHOLDER = document.getElementById('lensPlaceholder');
const INPUT = document.getElementById('lensInput');
const CLEAR_BTN = document.getElementById('lensClear');
const PAPER_SHEET = document.getElementById('lensPaperSheet');
const PAPER_SIZE_LABEL = document.getElementById('lensPaperSize');
const LENS_SIZE_INPUT = document.getElementById('lensSize');
const LENS_SIZE_VALUE = document.getElementById('lensSizeValue');

const charIndex = new Map();
const entries = [];

const lens = { size: 76 };

let lensX = window.innerWidth * 0.5;
let lensY = window.innerHeight * 0.42;
let burnCursor = 0;
let busy = false;
let composing = false;
let resizeTimer = null;

function isAllowedChar(ch) {
  return ch.length === 1 && POOL.includes(ch);
}

function burnDuration() {
  return 520 + lens.size * 2.6;
}

function applyLensSize() {
  const half = lens.size * 0.5;
  document.documentElement.style.setProperty('--lens-size', `${lens.size}px`);
  document.documentElement.style.setProperty('--lens-core-inset', `${Math.round(lens.size * 0.18)}px`);
  document.documentElement.style.setProperty('--lens-burn-duration', `${burnDuration()}ms`);
  LENS_SIZE_VALUE.textContent = String(lens.size);
  PAPER_SIZE_LABEL.textContent = `${lens.size}px`;
}

function cellCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
}

function setLensPos(x, y) {
  lensX = x;
  lensY = y;
  SPOTLIGHT.style.transform = `translate(${x}px, ${y}px)`;
}

function showLens() {
  SPOTLIGHT.classList.add('is-visible');
}

function animateLensTo(x, y, duration, easeFn) {
  const startX = lensX;
  const startY = lensY;
  const start = performance.now();

  return new Promise((resolve) => {
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = easeFn(t);
      setLensPos(startX + (x - startX) * eased, startY + (y - startY) * eased);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function indexCell(el, prevChar, nextChar) {
  if (prevChar && charIndex.has(prevChar)) {
    const list = charIndex.get(prevChar);
    const idx = list.indexOf(el);
    if (idx !== -1) list.splice(idx, 1);
  }
  if (!charIndex.has(nextChar)) charIndex.set(nextChar, []);
  charIndex.get(nextChar).push(el);
}

function buildWall() {
  WALL.innerHTML = '';
  charIndex.clear();

  const probe = document.createElement('span');
  probe.className = 'lens-cell';
  probe.textContent = 'あ';
  probe.style.visibility = 'hidden';
  WALL.appendChild(probe);
  const cellW = probe.offsetWidth || 16;
  const cellH = probe.offsetHeight || 20;
  probe.remove();

  const cols = Math.ceil(window.innerWidth / cellW) + 2;
  const rows = Math.ceil(window.innerHeight / cellH) + 2;

  for (let i = 0; i < cols * rows; i++) {
    const ch = POOL[Math.floor(Math.random() * POOL.length)];
    const el = document.createElement('span');
    el.className = 'lens-cell';
    el.textContent = ch;
    WALL.appendChild(el);
    indexCell(el, null, ch);
  }
}

function findTarget(char) {
  const free = (charIndex.get(char) || []).filter((el) => !el.classList.contains('is-burned'));
  if (free.length > 0) {
    let best = free[0];
    let bestDist = Infinity;
    for (const el of free) {
      const c = cellCenter(el);
      const d = (c.x - lensX) ** 2 + (c.y - lensY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = el;
      }
    }
    return best;
  }

  const spare = [...WALL.querySelectorAll('.lens-cell:not(.is-burned)')];
  if (spare.length === 0) return null;
  const el = spare[Math.floor(Math.random() * spare.length)];
  const prev = el.textContent;
  el.textContent = char;
  indexCell(el, prev, char);
  return el;
}

function pickScanCells(target, count = 5) {
  const all = [...WALL.querySelectorAll('.lens-cell:not(.is-burned)')];
  const pool = all.filter((el) => el !== target);
  const picks = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

function cellsInLensRadius(cx, cy) {
  const radius = lens.size * 0.48;
  return [...WALL.querySelectorAll('.lens-cell:not(.is-burned)')].filter((el) => {
    const c = cellCenter(el);
    const dx = c.x - cx;
    const dy = c.y - cy;
    return dx * dx + dy * dy <= radius * radius;
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderCompose() {
  const text = entries.map((e) => e.char).join('');
  OUTPUT.textContent = text;
  PLACEHOLDER.hidden = text.length > 0;
}

function paperFontSize() {
  return Math.round(11 + lens.size * 0.1);
}

function addPaperImprint(entry) {
  const el = document.createElement('span');
  el.className = 'lens-imprint';
  el.textContent = entry.char;
  el.style.setProperty('--imprint-font', `${paperFontSize()}px`);
  PAPER_SHEET.appendChild(el);
  entry.paperEl = el;
  requestAnimationFrame(() => el.classList.add('is-imprinted'));
}

function releaseWallCell(el) {
  if (!el) return;
  el.classList.remove('is-burned', 'is-burning', 'is-scanning', 'is-lens-hot');
}

async function seekAndBurn(entry) {
  const target = findTarget(entry.char);
  if (!target) return;

  entry.status = 'burning';
  showLens();
  SPOTLIGHT.classList.add('is-seeking');
  SPOTLIGHT.classList.remove('is-burning');

  const scans = pickScanCells(target, 4);
  for (const cell of scans) {
    const c = cellCenter(cell);
    cell.classList.add('is-scanning');
    await animateLensTo(c.x, c.y, 90, easeInOutCubic);
    await wait(40);
    cell.classList.remove('is-scanning');
  }

  const center = cellCenter(target);
  await animateLensTo(center.x, center.y, 220, easeInOutCubic);

  const hotCells = cellsInLensRadius(center.x, center.y);
  hotCells.forEach((cell) => cell.classList.add('is-lens-hot'));

  SPOTLIGHT.classList.remove('is-seeking');
  SPOTLIGHT.classList.add('is-burning');
  target.classList.add('is-burning');
  entry.wallEl = target;

  const duration = burnDuration();
  await wait(duration);

  hotCells.forEach((cell) => cell.classList.remove('is-lens-hot'));
  target.classList.remove('is-burning');
  target.classList.add('is-burned');
  SPOTLIGHT.classList.remove('is-burning');

  entry.status = 'burned';
  addPaperImprint(entry);
}

async function processQueue() {
  if (busy) return;
  busy = true;

  while (burnCursor < entries.length) {
    const entry = entries[burnCursor];
    if (entry.status === 'burned') {
      burnCursor++;
      continue;
    }
    await seekAndBurn(entry);
    burnCursor++;
  }

  busy = false;
}

function enqueueChar(ch) {
  if (!isAllowedChar(ch)) return;
  entries.push({ char: ch, status: 'pending', wallEl: null, paperEl: null });
  renderCompose();
  processQueue();
}

function handleBackspace() {
  if (entries.length === 0) return;
  const last = entries[entries.length - 1];

  if (last.status === 'burning') return;

  entries.pop();

  if (last.status === 'burned') {
    releaseWallCell(last.wallEl);
    last.paperEl?.remove();
  }

  if (burnCursor > entries.length) burnCursor = entries.length;
  renderCompose();
}

function clearAll() {
  entries.length = 0;
  burnCursor = 0;
  busy = false;
  while (PAPER_SHEET.firstChild) PAPER_SHEET.removeChild(PAPER_SHEET.firstChild);
  [...WALL.querySelectorAll('.lens-cell')].forEach((el) => releaseWallCell(el));
  renderCompose();
  INPUT.value = '';
  SPOTLIGHT.classList.remove('is-visible', 'is-seeking', 'is-burning');
  setLensPos(window.innerWidth * 0.5, window.innerHeight * 0.42);
  INPUT.focus();
}

LENS_SIZE_INPUT.addEventListener('input', () => {
  lens.size = Number(LENS_SIZE_INPUT.value);
  applyLensSize();
});

INPUT.addEventListener('compositionstart', () => {
  composing = true;
});

INPUT.addEventListener('compositionend', (e) => {
  composing = false;
  const text = e.data || INPUT.value;
  INPUT.value = '';
  [...text].filter(isAllowedChar).forEach(enqueueChar);
});

INPUT.addEventListener('keydown', (e) => {
  if (composing) return;

  if (e.key === 'Backspace') {
    e.preventDefault();
    handleBackspace();
    return;
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    if (isAllowedChar(e.key)) enqueueChar(e.key);
    INPUT.value = '';
  }
});

INPUT.addEventListener('input', () => {
  if (composing) return;
  const pending = [...INPUT.value].filter(isAllowedChar);
  INPUT.value = '';
  pending.forEach(enqueueChar);
});

INPUT.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text');
  [...text].filter(isAllowedChar).forEach(enqueueChar);
});

COMPOSE.addEventListener('click', () => INPUT.focus());
CLEAR_BTN.addEventListener('click', clearAll);

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildWall();
    setLensPos(window.innerWidth * 0.5, window.innerHeight * 0.42);
  }, 180);
});

applyLensSize();
buildWall();
setLensPos(lensX, lensY);
renderCompose();
INPUT.focus();
