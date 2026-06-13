const MAX_RUNNERS = 80;
const ESCAPE_SPEED = 0.4;
const RETURN_SPEED = 0.55;
const FIGHT_SPEED = 1.65;
const HIT_RANGE = 40;
const SWING_DURATION = 280;
const SWING_COOLDOWN = 380;
const PAD = 28;
const LINE_H = 33.6;
const LEG_LEFT_SRC = '../assets/leg-left.png';
const LEG_RIGHT_SRC = '../assets/leg-right.png';
const HAMMER_SRC = '../assets/hammer.png';
const LEG_DISPLAY_H = 19.2;
const INPUT_PLACEHOLDER = 'ここに打つと、文字が逃げ出す…';

const WRAP = document.getElementById('runawayWrap');
const LAYER = document.getElementById('runawayLayer');
const INPUT = document.getElementById('runawayInput');
const FIGHT_BTN = document.getElementById('runawayFight');
const ALIGN_BTN = document.getElementById('runawayAlign');
const CLEAR_BTN = document.getElementById('runawayClear');
const CARET = document.getElementById('runawayCaret');

const runners = [];
const measurer = document.createElement('span');
measurer.className = 'runaway-char__glyph';
measurer.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
LAYER.appendChild(measurer);

let composing = false;
let prevValue = '';
let penX = PAD;
let penY = PAD;
let rafId = null;
let fighting = false;
let alignMode = false;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function measureChar(char) {
  measurer.textContent = char;
  return measurer.getBoundingClientRect().width || 16;
}

function getBounds() {
  const rect = WRAP.getBoundingClientRect();
  return { w: rect.width, h: rect.height, pad: 10 };
}

function resetPen() {
  penX = PAD;
  penY = PAD;
  updateCaret();
}

function updateCaret() {
  CARET.style.transform = `translate(${penX}px, ${penY}px)`;
}

function advancePen(char) {
  if (char === '\n') return;
  const { w } = getBounds();
  const width = measureChar(char);
  if (penX + width > w - PAD) {
    penX = PAD;
    penY += LINE_H;
  }
  penX += width;
}

function randomLegTiming() {
  return {
    legGrowDelay: 400 + Math.random() * 2800,
    legGrowDuration: 700 + Math.random() * 2200,
  };
}

function randomEscapeVelocity() {
  const up = Math.random() < 0.5;
  const vy = (up ? -1 : 1) * (ESCAPE_SPEED + Math.random() * 0.25);
  const vx = (Math.random() - 0.5) * 0.35;
  return { vx, vy };
}

function updateLegVisual(item) {
  const feet = item.el.querySelector('.runaway-char__feet');
  const legs = item.el.querySelectorAll('.runaway-char__leg');
  const p = item.legProgress;
  feet.style.height = `${p * LEG_DISPLAY_H}px`;
  legs.forEach((leg, i) => {
    const legP = Math.max(0, Math.min(1, (p - i * 0.12) / 0.88));
    leg.style.transform = `scaleY(${legP})`;
    leg.style.opacity = String(0.4 + legP * 0.6);
  });
}

function updateAlignButton() {
  const hasRunners = runners.length > 0;
  ALIGN_BTN.disabled = fighting || !hasRunners;
  ALIGN_BTN.textContent = alignMode ? '解散' : '整列';
  ALIGN_BTN.classList.toggle('is-active', alignMode);
}

function updateFightButton() {
  FIGHT_BTN.disabled = fighting || runners.length < 2;
  FIGHT_BTN.classList.toggle('is-active', fighting);
  FIGHT_BTN.textContent = fighting ? '戦闘中' : '戦う';
  updateAlignButton();
}

function createRunner(char, spawnX, spawnY) {
  const el = document.createElement('div');
  el.className = 'runaway-char';
  el.innerHTML = `
    <div class="runaway-char__body">
      <img class="runaway-char__hammer" src="${HAMMER_SRC}" alt="" draggable="false" hidden />
      <span class="runaway-char__glyph">${escapeHtml(char)}</span>
      <div class="runaway-char__feet">
        <img class="runaway-char__leg runaway-char__leg--left" src="${LEG_LEFT_SRC}" alt="" draggable="false" />
        <img class="runaway-char__leg runaway-char__leg--right" src="${LEG_RIGHT_SRC}" alt="" draggable="false" />
      </div>
    </div>
  `;
  LAYER.appendChild(el);

  const timing = randomLegTiming();
  const item = {
    char,
    el,
    spawnX,
    spawnY,
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    state: 'dormant',
    bornAt: Date.now(),
    growStart: 0,
    legGrowDelay: timing.legGrowDelay,
    legGrowDuration: timing.legGrowDuration,
    legProgress: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    hp: 100,
    alive: true,
    target: null,
    swinging: false,
    swingStart: 0,
    nextSwingAt: 0,
    didHitThisSwing: false,
  };

  el.style.transform = `translate(${spawnX}px, ${spawnY}px)`;
  updateLegVisual(item);

  runners.push(item);
  trimRunners();
  startLoop();
  updateFightButton();
  return item;
}

function beginEscape(item) {
  if (item.state === 'running' || item.state === 'returning' || item.state === 'settled' || item.state === 'fighting') return;

  item.state = 'running';
  item.legProgress = 1;
  const feet = item.el.querySelector('.runaway-char__feet');
  feet.style.height = `${LEG_DISPLAY_H}px`;
  item.el.querySelectorAll('.runaway-char__leg').forEach((leg) => {
    leg.style.transform = '';
    leg.style.opacity = '1';
  });

  const vel = randomEscapeVelocity();
  item.vx = vel.vx;
  item.vy = vel.vy;
  item.el.classList.add('is-walking', 'is-panicking');
}

function addChar(char) {
  if (char === '\n' || fighting) return;

  const spawnX = penX;
  const spawnY = penY;
  const item = createRunner(char, spawnX, spawnY);
  advancePen(char);
  item.penAfterX = penX;
  item.penAfterY = penY;
  updateCaret();
}

function restorePen() {
  if (runners.length === 0) {
    resetPen();
    return;
  }
  const last = runners[runners.length - 1];
  penX = last.penAfterX;
  penY = last.penAfterY;
}

function removeLastRunner() {
  const item = runners.pop();
  if (!item) return;
  item.el.remove();
  restorePen();
  updateCaret();
  updateFightButton();
}

function spawnChars(text) {
  [...text].forEach((char) => addChar(char));
}

function handleInput() {
  if (composing || fighting) return;

  const raw = INPUT.value.replace(/\r?\n/g, '');
  if (raw !== INPUT.value) INPUT.value = raw;

  if (raw.length < prevValue.length) {
    const removed = prevValue.length - raw.length;
    for (let i = 0; i < removed; i++) removeLastRunner();
  } else if (raw.length > prevValue.length) {
    spawnChars(raw.slice(prevValue.length));
  }

  INPUT.value = '';
  prevValue = '';
  updateCaret();
}

function blockEnter(e) {
  if (e.key !== 'Enter' && e.keyCode !== 13) return;
  e.preventDefault();
  e.stopPropagation();
  INPUT.value = INPUT.value.replace(/\r?\n/g, '');
  updateCaret();
}

INPUT.addEventListener('compositionstart', () => {
  composing = true;
  INPUT.classList.add('is-composing');
  CARET.classList.add('is-hidden');
});

INPUT.addEventListener('compositionend', () => {
  composing = false;
  INPUT.classList.remove('is-composing');
  CARET.classList.remove('is-hidden');
  if (INPUT.value && !fighting) spawnChars(INPUT.value);
  INPUT.value = '';
  prevValue = '';
  updateCaret();
});

INPUT.addEventListener('keydown', blockEnter, true);
INPUT.addEventListener('keypress', blockEnter, true);
INPUT.addEventListener('beforeinput', (e) => {
  if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
    e.preventDefault();
    updateCaret();
  }
});

INPUT.addEventListener('input', handleInput);

function clearAll() {
  fighting = false;
  alignMode = false;
  runners.splice(0).forEach((item) => item.el.remove());
  INPUT.value = '';
  prevValue = '';
  INPUT.placeholder = INPUT_PLACEHOLDER;
  INPUT.disabled = false;
  resetPen();
  updateFightButton();
  INPUT.focus();
}

CLEAR_BTN.addEventListener('click', clearAll);

function prepareLegsForWalk(item) {
  if (item.legProgress >= 1) return;
  item.legProgress = 1;
  const feet = item.el.querySelector('.runaway-char__feet');
  feet.style.height = `${LEG_DISPLAY_H}px`;
  item.el.querySelectorAll('.runaway-char__leg').forEach((leg) => {
    leg.style.transform = '';
    leg.style.opacity = '1';
  });
}

function alignAll() {
  if (fighting) return;
  let hasWork = false;
  runners.forEach((item) => {
    if (item.state === 'settled') return;
    const dx = item.spawnX - item.x;
    const dy = item.spawnY - item.y;
    if (Math.hypot(dx, dy) < 1.5 && item.state !== 'running') {
      item.x = item.spawnX;
      item.y = item.spawnY;
      item.state = 'settled';
      item.el.classList.remove('is-walking', 'is-panicking', 'is-winner');
      item.el.style.transform = `translate(${item.spawnX}px, ${item.spawnY}px)`;
      const body = item.el.querySelector('.runaway-char__body');
      if (body) body.style.transform = '';
      return;
    }
    item.state = 'returning';
    item.el.classList.remove('is-panicking', 'is-winner');
    item.el.classList.add('is-walking');
    prepareLegsForWalk(item);
    hasWork = true;
  });
  alignMode = true;
  if (hasWork) startLoop();
  if (runners.length > 0) INPUT.placeholder = '';
  updateAlignButton();
}

function releaseRunner(item) {
  if (item.state === 'fighting' || item.state === 'running') return;

  item.state = 'running';
  prepareLegsForWalk(item);
  const vel = randomEscapeVelocity();
  item.vx = vel.vx;
  item.vy = vel.vy;
  item.el.classList.remove('is-winner');
  item.el.classList.add('is-walking', 'is-panicking');
}

function disperseAll() {
  if (fighting) return;

  let hasWork = false;
  runners.forEach((item) => {
    if (item.state === 'settled' || item.state === 'returning') {
      releaseRunner(item);
      hasWork = true;
    }
  });

  alignMode = false;
  if (hasWork) startLoop();
  updateAlignButton();
}

ALIGN_BTN.addEventListener('click', () => {
  if (alignMode) disperseAll();
  else alignAll();
});

function getLiving() {
  return runners.filter((r) => r.alive);
}

function pickTarget(fighter) {
  const others = getLiving().filter((r) => r !== fighter);
  if (others.length === 0) return null;
  let best = others[0];
  let bestDist = Infinity;
  for (const other of others) {
    const d = (other.x - fighter.x) ** 2 + (other.y - fighter.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = other;
    }
  }
  return best;
}

function clampFighter(item, pad, maxX, maxY) {
  if (item.x < pad) item.x = pad;
  if (item.x > maxX) item.x = maxX;
  if (item.y < pad) item.y = pad;
  if (item.y > maxY) item.y = maxY;
}

function applyFacing(item, body, towardX) {
  const facingLeft = towardX < item.x;
  item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
  if (body) body.style.transform = facingLeft ? 'scaleX(-1)' : '';
}

function eliminate(item) {
  if (!item.alive) return;
  item.alive = false;
  item.swinging = false;
  item.el.classList.remove('is-swinging', 'is-fighting', 'is-walking', 'is-hit');
  item.el.classList.add('is-defeated');

  setTimeout(() => {
    const idx = runners.indexOf(item);
    if (idx !== -1) runners.splice(idx, 1);
    item.el.remove();
    if (fighting && getLiving().length <= 1) endFight(getLiving()[0] || null);
    updateFightButton();
  }, 210);
}

function dealDamage(attacker, target, now) {
  if (!target.alive || attacker.didHitThisSwing) return;
  const dist = Math.hypot(target.x - attacker.x, target.y - attacker.y);
  if (dist > HIT_RANGE) return;

  attacker.didHitThisSwing = true;
  target.hp -= 22 + Math.floor(Math.random() * 18);
  target.el.classList.add('is-hit');
  setTimeout(() => target.el.classList.remove('is-hit'), 180);

  if (target.hp <= 0) eliminate(target);
}

function tickFighter(item, now, pad, maxX, maxY) {
  const body = item.el.querySelector('.runaway-char__body');

  if (item.swinging) {
    const t = (now - item.swingStart) / SWING_DURATION;
    if (t >= 0.4 && t < 0.65) dealDamage(item, item.target, now);
    if (t >= 1) {
      item.swinging = false;
      item.el.classList.remove('is-swinging');
    }
    applyFacing(item, body, item.target ? item.target.x : item.x + item.vx);
    return;
  }

  item.target = pickTarget(item);
  if (!item.target) return;

  const dx = item.target.x - item.x;
  const dy = item.target.y - item.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (dist <= HIT_RANGE && now >= item.nextSwingAt) {
    item.swinging = true;
    item.swingStart = now;
    item.didHitThisSwing = false;
    item.nextSwingAt = now + SWING_DURATION + SWING_COOLDOWN + Math.random() * 120;
    item.el.classList.add('is-swinging');
    applyFacing(item, body, item.target.x);
    return;
  }

  item.x += (dx / dist) * FIGHT_SPEED;
  item.y += (dy / dist) * FIGHT_SPEED;
  clampFighter(item, pad, maxX, maxY);
  applyFacing(item, body, item.target.x);
}

function startFight() {
  if (fighting || runners.length < 2) return;

  fighting = true;
  alignMode = false;
  INPUT.disabled = true;
  CARET.classList.add('is-hidden');

  runners.forEach((item) => {
    item.state = 'fighting';
    item.hp = 100;
    item.alive = true;
    item.target = null;
    item.swinging = false;
    item.nextSwingAt = Date.now() + Math.random() * 500;
    prepareLegsForWalk(item);
    item.el.classList.remove('is-panicking', 'is-winner', 'is-defeated', 'is-hit');
    item.el.classList.add('is-fighting', 'is-walking');
    const hammer = item.el.querySelector('.runaway-char__hammer');
    if (hammer) hammer.hidden = false;
  });

  updateFightButton();
}

function alignWinner(winner) {
  if (!winner) return;

  winner.el.classList.remove('is-fighting', 'is-swinging', 'is-hit');
  winner.el.classList.add('is-winner', 'is-walking');
  prepareLegsForWalk(winner);

  const hammer = winner.el.querySelector('.runaway-char__hammer');
  if (hammer) hammer.hidden = true;

  const dx = winner.spawnX - winner.x;
  const dy = winner.spawnY - winner.y;
  if (Math.hypot(dx, dy) < 1.5) {
    winner.x = winner.spawnX;
    winner.y = winner.spawnY;
    winner.state = 'settled';
    winner.el.classList.remove('is-walking', 'is-panicking');
    winner.el.style.transform = `translate(${winner.spawnX}px, ${winner.spawnY}px)`;
    const body = winner.el.querySelector('.runaway-char__body');
    if (body) body.style.transform = '';
  } else {
    winner.state = 'returning';
    winner.el.classList.remove('is-panicking');
  }

  if (runners.length > 0) INPUT.placeholder = '';
  alignMode = true;
  startLoop();
  updateAlignButton();
}

function endFight(winner) {
  fighting = false;
  INPUT.disabled = false;
  CARET.classList.remove('is-hidden');

  runners.forEach((item) => {
    item.el.classList.remove('is-fighting', 'is-swinging');
    const hammer = item.el.querySelector('.runaway-char__hammer');
    if (hammer) hammer.hidden = true;
  });

  alignWinner(winner);
  updateFightButton();
}

FIGHT_BTN.addEventListener('click', startFight);

function tick() {
  const now = Date.now();
  const { w, h, pad } = getBounds();
  const glyphPad = 20;
  const maxX = w - glyphPad;
  const maxY = h - glyphPad;

  if (fighting) {
    getLiving().forEach((item) => tickFighter(item, now, pad, maxX, maxY));
    rafId = requestAnimationFrame(tick);
    return;
  }

  runners.forEach((item) => {
    const body = item.el.querySelector('.runaway-char__body');

    if (item.state === 'dormant') {
      const wait = now - item.bornAt;
      const wobble = Math.sin(now * 0.004 + item.wobblePhase) * 0.8;
      item.el.style.transform = `translate(${item.x + wobble}px, ${item.y}px)`;
      if (body) body.style.transform = '';

      if (wait >= item.legGrowDelay) {
        item.state = 'growing';
        item.growStart = now;
      }
      return;
    }

    if (item.state === 'growing') {
      const t = Math.min((now - item.growStart) / item.legGrowDuration, 1);
      item.legProgress = t;
      updateLegVisual(item);

      const wobble = Math.sin(t * Math.PI * 3 + item.wobblePhase) * 2 * t;
      item.el.style.transform = `translate(${item.x + wobble}px, ${item.y}px)`;
      if (body) body.style.transform = '';

      if (t >= 1) beginEscape(item);
      return;
    }

    if (item.state === 'returning') {
      const dx = item.spawnX - item.x;
      const dy = item.spawnY - item.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 1.5) {
        item.x = item.spawnX;
        item.y = item.spawnY;
        item.state = 'settled';
        item.vx = 0;
        item.vy = 0;
        item.el.classList.remove('is-walking', 'is-panicking');
        item.el.style.transform = `translate(${item.spawnX}px, ${item.spawnY}px)`;
        if (body) body.style.transform = '';
        return;
      }

      item.vx = (dx / dist) * RETURN_SPEED;
      item.vy = (dy / dist) * RETURN_SPEED;
      item.x += item.vx;
      item.y += item.vy;

      const facingLeft = item.vx < 0;
      item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
      if (body) body.style.transform = facingLeft ? 'scaleX(-1)' : '';
      return;
    }

    if (item.state === 'settled') {
      item.el.style.transform = `translate(${item.spawnX}px, ${item.spawnY}px)`;
      if (body) body.style.transform = '';
      return;
    }

    if (item.state !== 'running') return;

    item.x += item.vx;
    item.y += item.vy;

    if (item.x < pad) { item.x = pad; item.vx = Math.abs(item.vx); }
    if (item.x > maxX) { item.x = maxX; item.vx = -Math.abs(item.vx); }
    if (item.y < pad) { item.y = pad; item.vy = Math.abs(item.vy); }
    if (item.y > maxY) { item.y = maxY; item.vy = -Math.abs(item.vy); }

    const facingLeft = item.vx < 0;
    item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
    if (body) body.style.transform = facingLeft ? 'scaleX(-1)' : '';
  });

  rafId = requestAnimationFrame(tick);
}

function trimRunners() {
  while (runners.length > MAX_RUNNERS) {
    const old = runners.shift();
    old.el.remove();
  }
}

function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

updateCaret();
updateFightButton();
INPUT.focus();
