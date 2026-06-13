const SCENES = [
  { id: 'sea', keywords: ['海', 'うみ', '波', 'ビーチ', 'beach', 'ocean', 'sea'], label: '海' },
  { id: 'night', keywords: ['夜', 'よる', '星', '月', 'night', 'moon', 'star'], label: '夜' },
  { id: 'cafe', keywords: ['カフェ', '珈琲', 'コーヒー', 'cafe', 'coffee', '喫茶'], label: 'カフェ' },
  { id: 'anger', keywords: ['怒り', '怒', 'いかり', 'angry', 'anger', '激怒'], label: '怒り' },
  { id: 'rain', keywords: ['雨', 'あめ', 'rain', '嵐', 'storm'], label: '雨' },
  { id: 'forest', keywords: ['森', 'もり', '林', 'forest', '木', '緑'], label: '森' },
  { id: 'snow', keywords: ['雪', 'ゆき', 'snow', '冬', 'winter'], label: '雪' },
];

const field = document.getElementById('stageField');
const input = document.getElementById('stageInput');
const badge = document.getElementById('sceneBadge');

function spawnParticles(container, count, className, styleFn) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = className;
    Object.assign(el.style, styleFn(i));
    container.appendChild(el);
  }
}

spawnParticles(document.getElementById('stars'), 28, 'star', (i) => ({
  left: `${8 + (i * 5.2) % 88}%`,
  top: `${5 + (i * 7.3) % 45}%`,
  '--dur': `${2.5 + (i % 4)}s`,
  '--delay': `${(i * 0.4) % 3}s`,
}));

spawnParticles(document.getElementById('raindrops'), 36, 'raindrop', (i) => ({
  left: `${(i * 4.3) % 98}%`,
  top: `${(i * 3.7) % 30}%`,
  '--dur': `${0.6 + (i % 5) * 0.15}s`,
  '--delay': `${(i * 0.12) % 2}s`,
}));

spawnParticles(document.getElementById('fireflies'), 14, 'firefly', (i) => ({
  left: `${15 + (i * 11) % 70}%`,
  top: `${40 + (i * 8) % 45}%`,
  '--dur': `${5 + (i % 3)}s`,
  '--delay': `${(i * 0.7) % 4}s`,
}));

spawnParticles(document.getElementById('snowflakes'), 26, 'snowflake', (i) => ({
  left: `${(i * 6.5) % 95}%`,
  top: `${(i * 4) % 20}%`,
  '--dur': `${4 + (i % 4)}s`,
  '--delay': `${(i * 0.3) % 3}s`,
  '--drift': `${-15 + (i % 30)}px`,
}));

document.querySelectorAll('.steam span').forEach((el, i) => {
  el.style.setProperty('--dur', `${3.5 + i * 0.4}s`);
  el.style.setProperty('--delay', `${i * 0.6}s`);
});

function detectScenes(text) {
  const lower = text.toLowerCase();
  return SCENES.filter((scene) =>
    scene.keywords.some((kw) =>
      kw === kw.toLowerCase() ? lower.includes(kw) : text.includes(kw)
    )
  );
}

function updateScenes() {
  const text = input.value;
  const active = detectScenes(text);

  document.querySelectorAll('.stage[data-scene]').forEach((el) => {
    el.classList.toggle('is-active', active.some((s) => s.id === el.dataset.scene));
  });

  field.classList.toggle('is-anger', active.some((s) => s.id === 'anger'));

  if (active.length > 0) {
    badge.textContent = active.map((s) => s.label).join(' · ');
    badge.classList.add('is-visible');
  } else {
    badge.classList.remove('is-visible');
  }
}

let timer;
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(updateScenes, 80);
});

document.querySelectorAll('.keyword-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const word = chip.textContent;
    const pos = input.selectionStart;
    const before = input.value.slice(0, pos);
    const after = input.value.slice(pos);
    const sep = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
    input.value = before + sep + word + after;
    input.focus();
    const newPos = pos + sep.length + word.length;
    input.setSelectionRange(newPos, newPos);
    updateScenes();
  });
});

updateScenes();
input.focus();
