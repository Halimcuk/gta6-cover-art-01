// Fixed scenes for screenshots, driven by `?shot=`:
//   ?shot=cover  — the cover alone, drawn at the screenshot size (w/h query, default 1280x720)
//   ?shot=editor — the editor with sample photos loaded
// Query keys: layout, grade, title, subtitle, titleStyle, titlePos, size, w, h.
// window.__shotReady is set once the scene has painted, for the screenshot driver.
import { drawCover } from './cover.js';

async function loadSamples(loadImage, photos) {
  for (const src of ['samples/boulevard.jpg', 'samples/pier.jpg']) {
    if (!photos.some((p) => p.dataset?.sample === src)) {
      const img = await loadImage(src);
      img.dataset.sample = src;
      photos.push(img);
    }
  }
}

export async function runShot(shot, query, state, photos, redraw, loadImage) {
  const canvas = document.getElementById('cover');
  await loadSamples(loadImage, photos);

  state.layout = query.get('layout') ?? 'grid4';
  state.grade = query.get('grade') ?? 'sunset';
  state.title = query.get('title') ?? 'NEON COAST';
  state.subtitle = query.get('subtitle') ?? 'a sunset story in four frames';
  state.titleStyle = query.get('titleStyle') ?? 'sunset';
  state.titlePos = query.get('titlePos') ?? 'bottom';
  state.size = query.get('size') ?? '1080x1080';

  // Alternate the two sample photos across the panels.
  state.panels.forEach((p, i) => {
    p.photo = i % photos.length;
    p.zoom = 1 + (i % 2) * 0.15;
    p.ox = 0;
    p.oy = 0;
  });

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const w = Number(query.get('w') ?? 1280);
    const h = Number(query.get('h') ?? 720);
    canvas.width = w;
    canvas.height = h;
    drawCover(canvas, state, photos);
  } else {
    // Editor scene: keep the normal UI and draw the live preview.
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
