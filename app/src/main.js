// Wires the Neon Coast editor: photo upload, layout, per-panel crop, caption,
// grade, export sizes and PNG export. Photos stay local — read with FileReader
// and object URLs, never uploaded. A `?shot=` query sets up a fixed scene for
// a screenshot instead (./shots.js).
import { drawCover, defaultState, layoutRects, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
const photos = []; // loaded HTMLImageElements, in upload order
let fontsReady = false;

function redraw() {
  const [w, h] = SIZES[state.size];
  const previewScale = Math.min(720 / w, 720 / h, 1);
  canvas.width = Math.round(w * previewScale);
  canvas.height = Math.round(h * previewScale);
  drawCover(canvas, state, photos);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds files as photos, assigning each to a panel in order from the selected one. */
async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  const firstNew = photos.length;
  for (const file of files) {
    photos.push(await loadImage(URL.createObjectURL(file)));
  }
  files.forEach((_, k) => {
    const target = (state.selected + k) % state.panels.length;
    const panel = state.panels[target];
    panel.photo = firstNew + k;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
  });
  refreshPanelPicker();
  syncCropControls();
  redraw();
  status.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded — drag a panel to move it.`;
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function refreshPanelPicker() {
  const picker = document.getElementById('panelPicker');
  picker.innerHTML = '';
  for (let i = 0; i < panelCount(); i += 1) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'panel-chip';
    chip.textContent = `Panel ${i + 1}`;
    const p = state.panels[i];
    if (!photos[p.photo]) chip.classList.add('is-empty');
    if (i === state.selected) chip.classList.add('is-active');
    chip.addEventListener('click', () => {
      state.selected = i;
      refreshPanelPicker();
      syncCropControls();
      redraw();
    });
    picker.appendChild(chip);
  }
}

function syncCropControls() {
  const p = state.panels[state.selected];
  document.getElementById('zoomRange').value = p.zoom;
  document.getElementById('panXRange').value = p.ox;
  document.getElementById('panYRange').value = p.oy;
  document.getElementById('zoomVal').textContent = `${p.zoom.toFixed(2)}×`;
}

function selectGroup(rowId, attr, value) {
  document.querySelectorAll(`#${rowId} [data-${attr}]`).forEach((b) => {
    b.classList.toggle('is-active', b.dataset[attr] === value);
  });
}

// --- Controls ---------------------------------------------------------------

document.getElementById('photoInput').addEventListener('change', (e) => addFiles(e.target.files));

const dropZone = document.getElementById('dropZone');
['dragover', 'dragenter'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
}));
['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
}));
dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  addFiles(e.dataTransfer.files);
});

document.getElementById('sampleBtn').addEventListener('click', async () => {
  const samples = ['samples/boulevard.jpg', 'samples/pier.jpg'];
  for (const src of samples) {
    if (!photos.some((p) => p.dataset?.sample === src)) {
      const img = await loadImage(src);
      img.dataset.sample = src;
      photos.push(img);
    }
  }
  state.panels.forEach((p, i) => { p.photo = i % photos.length; });
  refreshPanelPicker();
  redraw();
  status.textContent = 'Sample photos loaded — try the layouts and grades.';
});

document.getElementById('fillAllBtn').addEventListener('click', () => {
  if (!photos.length) {
    status.textContent = 'Load a photo first.';
    return;
  }
  state.panels.forEach((p) => { p.photo = 0; });
  refreshPanelPicker();
  redraw();
  status.textContent = 'Every panel now uses photo 1.';
});

document.getElementById('layoutRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (!btn) return;
  state.layout = btn.dataset.layout;
  if (state.selected >= panelCount()) state.selected = 0;
  selectGroup('layoutRow', 'layout', state.layout);
  refreshPanelPicker();
  syncCropControls();
  redraw();
});

document.getElementById('zoomRange').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  document.getElementById('zoomVal').textContent = `${state.panels[state.selected].zoom.toFixed(2)}×`;
  redraw();
});
document.getElementById('panXRange').addEventListener('input', (e) => {
  state.panels[state.selected].ox = Number(e.target.value);
  redraw();
});
document.getElementById('panYRange').addEventListener('input', (e) => {
  state.panels[state.selected].oy = Number(e.target.value);
  redraw();
});
document.getElementById('resetCropBtn').addEventListener('click', () => {
  Object.assign(state.panels[state.selected], { zoom: 1, ox: 0, oy: 0 });
  syncCropControls();
  redraw();
});

document.getElementById('titleInput').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitleInput').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('titleStyleRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-title-style]');
  if (!btn) return;
  state.titleStyle = btn.dataset.titleStyle;
  selectGroup('titleStyleRow', 'titleStyle', state.titleStyle);
  redraw();
});
document.getElementById('titlePosRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-title-pos]');
  if (!btn) return;
  state.titlePos = btn.dataset.titlePos;
  selectGroup('titlePosRow', 'titlePos', state.titlePos);
  redraw();
});
document.getElementById('gradeRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  selectGroup('gradeRow', 'grade', state.grade);
  redraw();
});
document.getElementById('sizeRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-size]');
  if (!btn) return;
  state.size = btn.dataset.size;
  selectGroup('sizeRow', 'size', state.size);
  redraw();
});

// --- Drag to pan, wheel to zoom, click to select a panel --------------------

let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const px = ((clientX - r.left) / r.width) * canvas.width;
  const py = ((clientY - r.top) / r.height) * canvas.height;
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < panelCount(); i += 1) {
    const rc = rects[i];
    if (px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h) return { index: i, px, py };
  }
  return null;
}
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  state.selected = hit.index;
  refreshPanelPicker();
  syncCropControls();
  const p = state.panels[hit.index];
  drag = { x: hit.px, y: hit.py, ox: p.ox, oy: p.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const p = state.panels[state.selected];
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  const rc = rects[state.selected];
  p.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (hit.px - drag.x) / rc.w));
  p.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (hit.py - drag.y) / rc.h));
  if (Math.abs(p.ox - drag.ox) > 0.002 || Math.abs(p.oy - drag.oy) > 0.002) drag.moved = true;
  syncCropControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const p = state.panels[hit.index];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  state.selected = hit.index;
  refreshPanelPicker();
  syncCropControls();
  redraw();
}, { passive: false });

// --- Export -----------------------------------------------------------------

document.getElementById('exportBtn').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, photos);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved neon-coast-${state.size}.png (${w} × ${h}).`;
  }, 'image/png');
});

// --- Boot -------------------------------------------------------------------

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
  const shot = new URLSearchParams(location.search).get('shot');
  refreshPanelPicker();
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, photos, redraw, loadImage);
  } else {
    redraw();
  }
}

boot();
