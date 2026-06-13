const DISPLAY = document.getElementById('strokeDisplay');
const INPUT = document.getElementById('strokeInput');
const CLEAR_BTN = document.getElementById('strokeClear');

let composing = false;
let prevText = '';

function createCharElement(char) {
  const strokes = getStrokeCount(char);
  const motion = getMotionVars(char);
  const span = document.createElement('span');
  span.className = `stroke-char stroke-char--${motion.type}`;
  span.title = `${strokes}区画`;
  span.textContent = char;
  span.style.fontWeight = String(getWeight(char));

  if (motion.type === 'float') {
    span.style.setProperty('--float-y', motion.floatY);
    span.style.setProperty('--rise-dur', motion.riseDur);
    span.style.setProperty('--bob-dur', motion.bobDur);
  } else {
    span.style.setProperty('--sink-y', motion.sinkY);
    span.style.setProperty('--sink-dur', motion.sinkDur);
    span.style.setProperty('--sink-tilt', motion.sinkTilt);
    span.style.setProperty('--sink-scale', motion.sinkScale);
    if (motion.type === 'heavy') {
      span.style.letterSpacing = '-0.02em';
    }
  }

  return span;
}

function appendChar(char) {
  if (char === '\n') {
    DISPLAY.appendChild(document.createElement('br'));
    return;
  }
  DISPLAY.appendChild(createCharElement(char));
}

function removeLastNode() {
  if (DISPLAY.lastChild) DISPLAY.lastChild.remove();
}

function fullRender(text) {
  DISPLAY.innerHTML = '';
  for (const char of text) appendChar(char);
}

function sync(text) {
  if (text === prevText) return;

  if (text.length > prevText.length && text.startsWith(prevText)) {
    for (let i = prevText.length; i < text.length; i++) appendChar(text[i]);
  } else if (text.length < prevText.length && prevText.startsWith(text)) {
    for (let i = text.length; i < prevText.length; i++) removeLastNode();
  } else {
    fullRender(text);
  }

  prevText = text;
}

INPUT.addEventListener('compositionstart', () => {
  composing = true;
  INPUT.classList.add('is-composing');
  DISPLAY.style.visibility = 'hidden';
});

INPUT.addEventListener('compositionend', () => {
  composing = false;
  INPUT.classList.remove('is-composing');
  DISPLAY.style.visibility = 'visible';
  sync(INPUT.value);
});

INPUT.addEventListener('input', () => {
  if (!composing) sync(INPUT.value);
});

function clearAll() {
  DISPLAY.innerHTML = '';
  INPUT.value = '';
  prevText = '';
  INPUT.focus();
}

CLEAR_BTN.addEventListener('click', clearAll);

INPUT.focus();
