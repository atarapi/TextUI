import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const STAGE = document.getElementById('squishStage');
const CANVAS = document.getElementById('squishCanvas');
const OVERLAY = document.querySelector('.squish-overlay');
const INPUT = document.getElementById('squishInput');

const SEGMENTS = 18;
const GLYPH_SEGMENTS = 10;
const STIFFNESS = 0.14;
const GLYPH_STIFFNESS = 0.18;
const DAMPING = 0.82;
const IMPULSE_DECAY = 0.9;
const LINE_H_PX = 26.4;
const FONT_PX = 16;
const MAX_GLYPHS = 120;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeceaf4);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0.2, 7.2);

const renderer = new THREE.WebGLRenderer({
  canvas: CANVAS,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.1);
keyLight.position.set(4, 6, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8b8ff, 0.45);
fillLight.position.set(-5, -2, 4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
rimLight.position.set(0, 0, -6);
scene.add(rimLight);

const meshGroup = new THREE.Group();
const glyphsGroup = new THREE.Group();
scene.add(meshGroup);
meshGroup.add(glyphsGroup);

let mesh;
let geometry;
let restPositions;
let velocities;
let impulses = [];
let boxW = 5.6;
let boxH = 3.2;
let boxD = 0.95;

const glyphs = [];
const textureCache = new Map();
let fontsReady = false;

const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

const pointer = new THREE.Vector2(0.5, 0.5);
const pointerTarget = new THREE.Vector2(0.5, 0.5);
const pointerActive = { value: 0 };
const pointerTargetActive = { value: 0 };
const breathe = { phase: Math.random() * Math.PI * 2 };
const squash = { x: 1, y: 1, z: 1 };
const squashVel = { x: 0, y: 0, z: 0 };
const tilt = { x: 0, y: 0 };

let composing = false;

const fieldMat = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xf6f2ff,
    roughness: 0.38,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0xd4c8ff),
  });

function buildMesh() {
  if (mesh) {
    meshGroup.remove(mesh);
    geometry.dispose();
    mesh.material.dispose();
  }

  geometry = new RoundedBoxGeometry(boxW, boxH, boxD, SEGMENTS, 0.22);
  mesh = new THREE.Mesh(geometry, fieldMat());
  meshGroup.add(mesh);

  const pos = geometry.attributes.position;
  restPositions = new Float32Array(pos.array.length);
  velocities = new Float32Array(pos.array.length);
  restPositions.set(pos.array);
}

buildMesh();

function resize() {
  const rect = STAGE.getBoundingClientRect();
  const w = Math.max(rect.width, 1);
  const h = Math.max(rect.height, 1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  syncGlyphs();
}

function worldToLocal(x, y) {
  return {
    x: (x - 0.5) * boxW * 0.92,
    y: (0.5 - y) * boxH * 0.88,
  };
}

function pxToWorld(px, py) {
  const w = OVERLAY.clientWidth || 1;
  const h = OVERLAY.clientHeight || 1;
  const nx = px / w;
  const ny = py / h;
  return {
    x: nx * boxW * 0.86 - boxW * 0.43,
    y: (1 - ny) * boxH * 0.82 - boxH * 0.41,
  };
}

function measureCharPx(char) {
  measureCtx.font = `${FONT_PX}px "IBM Plex Mono", "Noto Sans JP", sans-serif`;
  return measureCtx.measureText(char).width || FONT_PX * 0.6;
}

function layoutText(text) {
  const positions = [];
  const wrapW = OVERLAY.clientWidth || 1;
  let penX = 0;
  let penY = 0;

  for (const ch of text) {
    if (ch === '\n') {
      penX = 0;
      penY += LINE_H_PX;
      continue;
    }
    const width = measureCharPx(ch);
    if (penX + width > wrapW && penX > 0) {
      penX = 0;
      penY += LINE_H_PX;
    }
    const world = pxToWorld(penX + width * 0.5, penY + LINE_H_PX * 0.5);
    positions.push({ char: ch, x: world.x, y: world.y });
    penX += width;
  }
  return positions;
}

function createCharTexture(char) {
  if (textureCache.has(char)) return textureCache.get(char);

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f2ff';
  ctx.fillRect(0, 0, 160, 160);
  ctx.fillStyle = '#1a1a1e';
  ctx.font = '88px "IBM Plex Mono", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 80, 84);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  textureCache.set(char, tex);
  return tex;
}

function initVertexPhysics(geom) {
  const pos = geom.attributes.position;
  const rest = new Float32Array(pos.array.length);
  const vel = new Float32Array(pos.array.length);
  rest.set(pos.array);
  return { rest, vel };
}

function disposeGlyph(item) {
  glyphsGroup.remove(item.group);
  item.geometry.dispose();
  item.mesh.material.dispose();
}

function removeLastGlyph() {
  const item = glyphs.pop();
  if (item) disposeGlyph(item);
}

function clearGlyphs() {
  while (glyphs.length > 0) removeLastGlyph();
}

function createGlyph(char, x, y, isNew) {
  const worldH = 0.34;
  const pxW = measureCharPx(char);
  const worldW = Math.max(0.2, (pxW / FONT_PX) * 0.34);
  const worldD = 0.19;
  const surfaceZ = boxD * 0.5 + worldD * 0.5 + 0.03;

  const geom = new RoundedBoxGeometry(worldW, worldH, worldD, GLYPH_SEGMENTS, worldH * 0.2);
  const { rest, vel } = initVertexPhysics(geom);
  const mat = fieldMat();
  mat.map = createCharTexture(char);
  const glyphMesh = new THREE.Mesh(geom, mat);

  const group = new THREE.Group();
  group.position.set(x, y, isNew ? surfaceZ + 0.42 : surfaceZ);
  group.add(glyphMesh);
  glyphsGroup.add(group);

  const item = {
    char,
    mesh: glyphMesh,
    geometry: geom,
    group,
    restPositions: rest,
    velocities: vel,
    worldW,
    worldH,
    worldD,
    targetX: x,
    targetY: y,
    targetZ: surfaceZ,
    zVel: isNew ? -0.02 : 0,
    squash: { x: 1, y: 1, z: 1 },
    squashVel: { x: 0, y: 0, z: 0 },
    bornAt: performance.now(),
    isNew,
  };

  if (isNew) {
    item.squashVel.y = -0.12;
    pokeGlyph(item, 1.08, 0.82, 1.05);
  }

  glyphs.push(item);
  while (glyphs.length > MAX_GLYPHS) {
    disposeGlyph(glyphs.shift());
  }
}

function syncGlyphs() {
  if (!fontsReady) return;
  const text = INPUT.value;
  const layout = layoutText(text);

  while (glyphs.length > layout.length) removeLastGlyph();

  for (let i = 0; i < layout.length; i++) {
    const L = layout[i];
    if (i < glyphs.length) {
      const g = glyphs[i];
      if (g.char !== L.char) {
        clearGlyphs();
        layout.forEach((entry, j) => createGlyph(entry.char, entry.x, entry.y, j >= i));
        return;
      }
      g.targetX = L.x;
      g.targetY = L.y;
    } else {
      createGlyph(L.char, L.x, L.y, true);
    }
  }
}

function pokeGlyph(item, sx, sy, sz) {
  item.squashVel.x += (sx - item.squash.x) * 0.4;
  item.squashVel.y += (sy - item.squash.y) * 0.4;
  item.squashVel.z += (sz - item.squash.z) * 0.4;
}

function updateSoftMesh(item, dt, opts) {
  const {
    stiffness,
    halfW,
    halfH,
    halfD,
    impulses: localImpulses,
    pointerPush,
    pointerLocal,
    breatheAmt,
    cornerSoftness,
  } = opts;

  const pos = item.geometry.attributes.position;
  const arr = pos.array;
  const rest = item.restPositions;
  const vel = item.velocities;

  for (let i = 0; i < arr.length; i += 3) {
    const rx = rest[i];
    const ry = rest[i + 1];
    const rz = rest[i + 2];

    let force = 0;
    const nx = rx / halfW;
    const ny = ry / halfH;
    const nz = rz / halfD;
    const edge = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
    const cornerSoft = THREE.MathUtils.smoothstep(edge, 0.55, 1.05);

    for (const imp of localImpulses) {
      const dx = rx - imp.x;
      const dy = ry - imp.y;
      const dz = rz - imp.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const falloff = Math.exp(-(dist * dist) / (imp.radius * imp.radius * 0.45));
      force += imp.strength * falloff * imp.life;
    }

    if (pointerPush > 0.01 && pointerLocal) {
      const dx = rx - pointerLocal.x;
      const dy = ry - pointerLocal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const push = Math.exp(-(dist * dist) / 1.8) * pointerPush * 0.55;
      const frontBias = THREE.MathUtils.smoothstep(rz, halfD * 0.2, halfD);
      force += push * (0.35 + frontBias * 0.65);
    }

    force += breatheAmt * (1 - cornerSoft * 0.7);

    vel[i] += force * dt * 60;
    vel[i] -= (arr[i] - rx) * stiffness;
    vel[i] *= DAMPING;
    arr[i] = rx + vel[i] * (1 - cornerSoft * cornerSoftness);

    vel[i + 1] += force * dt * 52;
    vel[i + 1] -= (arr[i + 1] - ry) * stiffness;
    vel[i + 1] *= DAMPING;
    arr[i + 1] = ry + vel[i + 1] * (1 - cornerSoft * cornerSoftness);

    vel[i + 2] += force * dt * 68;
    vel[i + 2] -= (arr[i + 2] - rz) * (stiffness * 1.15);
    vel[i + 2] *= DAMPING;
    arr[i + 2] = rz + vel[i + 2] * (1 - cornerSoft * 0.2);
  }

  pos.needsUpdate = true;
  item.geometry.computeVertexNormals();
}

function addImpulse(nx, ny, strength, radius = 1.1) {
  const { x: lx, y: ly } = worldToLocal(nx, ny);
  impulses.push({ x: lx, y: ly, z: 0, strength, radius, life: 1 });
  if (impulses.length > 24) impulses.shift();

  glyphs.forEach((g) => {
    const dx = g.group.position.x - lx;
    const dy = g.group.position.y - ly;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius * 1.4) {
      pokeGlyph(g, 1.04, 0.9, 1.03);
      g.zVel += strength * 0.08;
    }
  });
}

function pokeSquash(sx, sy, sz) {
  squashVel.x += (sx - squash.x) * 0.35;
  squashVel.y += (sy - squash.y) * 0.35;
  squashVel.z += (sz - squash.z) * 0.35;
}

function updateVertices(dt) {
  const pointerLocal =
    pointerActive.value > 0.01 ? worldToLocal(pointer.x, pointer.y) : null;

  updateSoftMesh(
    { geometry, restPositions, velocities },
    dt,
    {
      stiffness: STIFFNESS,
      halfW: boxW * 0.5,
      halfH: boxH * 0.5,
      halfD: boxD * 0.5,
      impulses,
      pointerPush: pointerActive.value,
      pointerLocal,
      breatheAmt: Math.sin(breathe.phase) * 0.018,
      cornerSoftness: 0.35,
    },
  );
}

function updateGlyphSquash(item, dt) {
  item.squashVel.x += (1 - item.squash.x) * 0.14;
  item.squashVel.y += (1 - item.squash.y) * 0.14;
  item.squashVel.z += (1 - item.squash.z) * 0.14;
  item.squashVel.x *= 0.76;
  item.squashVel.y *= 0.76;
  item.squashVel.z *= 0.76;
  item.squash.x += item.squashVel.x * dt * 60;
  item.squash.y += item.squashVel.y * dt * 60;
  item.squash.z += item.squashVel.z * dt * 60;
  item.mesh.scale.set(item.squash.x, item.squash.y, item.squash.z);
}

function updateGlyphs(dt) {
  const breatheAmt = Math.sin(breathe.phase + 0.6) * 0.012;

  const fieldPointer =
    pointerActive.value > 0.01 ? worldToLocal(pointer.x, pointer.y) : null;

  glyphs.forEach((g) => {
    g.group.position.x += (g.targetX - g.group.position.x) * 0.14;
    g.group.position.y += (g.targetY - g.group.position.y) * 0.14;

    const dz = g.targetZ - g.group.position.z;
    g.zVel += dz * 0.16;
    g.zVel *= 0.78;
    g.group.position.z += g.zVel * dt * 60;
    if (Math.abs(dz) < 0.008 && Math.abs(g.zVel) < 0.004) {
      g.group.position.z = g.targetZ;
      g.zVel = 0;
    }

    const localImpulses = impulses.map((imp) => ({
      ...imp,
      x: imp.x - g.group.position.x,
      y: imp.y - g.group.position.y,
      z: imp.z,
    }));

    const glyphPointer = fieldPointer
      ? { x: fieldPointer.x - g.group.position.x, y: fieldPointer.y - g.group.position.y }
      : null;

    updateSoftMesh(g, dt, {
      stiffness: GLYPH_STIFFNESS,
      halfW: g.worldW * 0.5,
      halfH: g.worldH * 0.5,
      halfD: g.worldD * 0.5,
      impulses: localImpulses,
      pointerPush: pointerActive.value * 0.85,
      pointerLocal: glyphPointer,
      breatheAmt,
      cornerSoftness: 0.25,
    });

    updateGlyphSquash(g, dt);
  });
}

function updateSquash(dt) {
  squashVel.x += (1 - squash.x) * 0.12;
  squashVel.y += (1 - squash.y) * 0.12;
  squashVel.z += (1 - squash.z) * 0.12;
  squashVel.x *= 0.78;
  squashVel.y *= 0.78;
  squashVel.z *= 0.78;
  squash.x += squashVel.x * dt * 60;
  squash.y += squashVel.y * dt * 60;
  squash.z += squashVel.z * dt * 60;
  mesh.scale.set(squash.x, squash.y, squash.z);
}

function updateImpulses() {
  impulses = impulses
    .map((imp) => ({ ...imp, life: imp.life * IMPULSE_DECAY, strength: imp.strength * 0.97 }))
    .filter((imp) => imp.life > 0.04);
}

function updateTilt() {
  const tx = (pointerTarget.y - 0.5) * 0.22;
  const ty = (pointerTarget.x - 0.5) * -0.28;
  tilt.x += (tx - tilt.x) * 0.07;
  tilt.y += (ty - tilt.y) * 0.07;
  meshGroup.rotation.x = tilt.x;
  meshGroup.rotation.y = tilt.y;
}

let lastTime = performance.now();

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  pointer.x += (pointerTarget.x - pointer.x) * 0.14;
  pointer.y += (pointerTarget.y - pointer.y) * 0.14;
  pointerActive.value += (pointerTargetActive.value - pointerActive.value) * 0.12;

  breathe.phase += dt * 1.6;

  updateImpulses();
  updateVertices(dt);
  updateGlyphs(dt);
  updateSquash(dt);
  updateTilt();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function setPointerFromEvent(e) {
  const rect = STAGE.getBoundingClientRect();
  pointerTarget.x = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
  pointerTarget.y = THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1);
}

function onPointerMove(e, strength = 1) {
  setPointerFromEvent(e);
  pointerTargetActive.value = strength;
}

function onPointerDown(e) {
  setPointerFromEvent(e);
  pointerTargetActive.value = 1.2;
  addImpulse(pointerTarget.x, pointerTarget.y, 0.35, 0.9);
  pokeSquash(1.03, 0.94, 1.06);
}

STAGE.addEventListener('pointermove', (e) => onPointerMove(e, 1));
STAGE.addEventListener('pointerdown', onPointerDown);
STAGE.addEventListener('pointerleave', () => {
  pointerTargetActive.value = 0;
});
STAGE.addEventListener('pointerup', () => {
  pointerTargetActive.value = 0.35;
});

INPUT.addEventListener('pointermove', (e) => onPointerMove(e, 0.7));
INPUT.addEventListener('pointerdown', onPointerDown);

INPUT.addEventListener('focus', () => STAGE.classList.add('is-focused'));
INPUT.addEventListener('blur', () => STAGE.classList.remove('is-focused'));

INPUT.addEventListener('compositionstart', () => {
  composing = true;
});

INPUT.addEventListener('compositionend', () => {
  composing = false;
  syncGlyphs();
});

INPUT.addEventListener('input', () => {
  if (!composing) syncGlyphs();
  const nx = 0.25 + Math.random() * 0.5;
  const ny = 0.28 + Math.random() * 0.44;
  addImpulse(nx, ny, 0.22 + Math.random() * 0.18, 0.75 + Math.random() * 0.35);
  pokeSquash(1.02 + Math.random() * 0.03, 0.9 - Math.random() * 0.04, 1.03);
  const last = glyphs[glyphs.length - 1];
  if (last) pokeGlyph(last, 1.06, 0.88, 1.04);
});

INPUT.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace') {
    addImpulse(0.5, 0.5, -0.12, 1.2);
    pokeSquash(0.98, 1.04, 0.99);
    requestAnimationFrame(() => syncGlyphs());
    return;
  }
  if (e.key.length === 1) {
    pokeSquash(1.01, 0.93, 1.02);
  }
});

window.addEventListener('resize', resize);

document.fonts.ready.then(() => {
  fontsReady = true;
  measureCtx.font = `${FONT_PX}px "IBM Plex Mono", "Noto Sans JP", sans-serif`;
  syncGlyphs();
});

resize();
requestAnimationFrame(tick);
INPUT.focus();
