const FIELDS = [
  {
    id: 'runaway-field',
    title: 'Runaway Field',
    description: '文字ごとにランダムなタイミングで足が生え、逃げていく。',
    href: 'fields/runaway-field.html',
    previewClass: 'preview--runaway',
    previewHTML: `
      <span class="mini-runner mini-runner--a">あ</span>
      <span class="mini-runner mini-runner--b">逃</span>
      <span class="mini-runner mini-runner--c">!</span>
      <div class="mini-runaway-input"></div>
    `,
    available: true,
  },
  {
    id: 'stroke-field',
    title: 'Stroke Field',
    description: '区画の多い文字は傾きながら沈み、少ない文字はふわふわと浮く。',
    href: 'fields/stroke-field.html',
    previewClass: 'preview--stroke',
    previewHTML: `
      <span class="mini-stroke-char">一</span>
      <span class="mini-stroke-char">木</span>
      <span class="mini-stroke-char">森</span>
      <span class="mini-stroke-char">鬱</span>
    `,
    available: true,
  },
];

const grid = document.getElementById('fieldGrid');

FIELDS.forEach((field) => {
  const card = document.createElement(field.available ? 'a' : 'div');
  card.className = 'field-card' + (field.available ? '' : ' field-card--disabled');
  if (field.available) card.href = field.href;

  card.innerHTML = `
    <div class="field-card__preview ${field.previewClass}">
      ${field.previewHTML}
    </div>
    <div class="field-card__body">
      <div class="field-card__title">${field.title}</div>
      <div class="field-card__desc">${field.description}</div>
      ${field.available ? '' : '<span class="field-card__badge field-card__badge--soon">準備中</span>'}
    </div>
  `;

  grid.appendChild(card);
});
