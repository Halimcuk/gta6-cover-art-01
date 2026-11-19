// Neon Coast cover engine: draws a multi-panel poster cover onto any 2D canvas.
// Every layout, grade and lettering style is original — no Rockstar artwork, logo or font.

export const LAYOUTS = {
  grid4: { panels: 4, label: 'Grid 4' },
  hero3: { panels: 4, label: 'Hero + 3' },
  strips3: { panels: 3, label: 'Strips 3' },
  duo: { panels: 2, label: 'Duo' },
  hero: { panels: 1, label: 'Hero' },
};

export const GRADES = {
  sunset: { filter: 'saturate(1.28) contrast(1.08) brightness(1.03)', stops: ['rgba(255,122,61,0.16)', 'rgba(255,46,136,0.30)'] },
  neon: { filter: 'saturate(1.65) contrast(1.16) hue-rotate(-8deg)', stops: ['rgba(255,46,136,0.22)', 'rgba(46,230,255,0.20)'] },
  golden: { filter: 'sepia(0.35) saturate(1.35) contrast(1.06)', stops: ['rgba(255,190,80,0.20)', 'rgba(255,122,61,0.22)'] },
  teal: { filter: 'saturate(1.22) contrast(1.10) hue-rotate(14deg)', stops: ['rgba(20,120,130,0.20)', 'rgba(46,230,255,0.16)'] },
  noir: { filter: 'grayscale(1) contrast(1.28) brightness(0.94)', stops: ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.34)'] },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** A fresh cover state: four panel slots, the first photo filling every panel by default. */
export function defaultState() {
  return {
    layout: 'grid4',
    size: '1080x1080',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'a sunset story in four frames',
    titleStyle: 'sunset',
    titlePos: 'bottom',
    selected: 0,
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

/** Panel rectangles for a layout, as fractions of the cover (inside the white frame). */
export function layoutRects(layout, w, h) {
  const frame = Math.round(Math.min(w, h) * 0.018);
  const gap = Math.round(Math.min(w, h) * 0.008);
  const x0 = frame, y0 = frame, x1 = w - frame, y1 = h - frame;
  const cw = x1 - x0, ch = y1 - y0;
  const at = (fx, fy, fw, fh) => ({ x: x0 + fx * cw, y: y0 + fy * ch, w: fw * cw, h: fh * ch });
  switch (layout) {
    case 'hero3': {
      const rw = 0.36;
      return [
        at(0, 0, 1 - rw - 0.004, 1),
        at(1 - rw, 0, rw, 0.33),
        at(1 - rw, 0.335, rw, 0.33),
        at(1 - rw, 0.67, rw, 0.33),
      ];
    }
    case 'strips3':
      return [at(0, 0, 0.33, 1), at(0.335, 0, 0.33, 1), at(0.67, 0, 0.33, 1)];
    case 'duo':
      return [at(0, 0, 0.55, 1), at(0.555, 0, 0.445, 1)];
    case 'hero':
      return [at(0, 0, 1, 1)];
    case 'grid4':
    default: {
      const half = 0.5;
      return [
        at(0, 0, half - 0.004, half - 0.004),
        at(half + 0.004, 0, half - 0.004, half - 0.004),
        at(0, half + 0.004, half - 0.004, half - 0.004),
        at(half + 0.004, half + 0.004, half - 0.004, half - 0.004),
      ];
    }
  }
}

// Deterministic film grain, built once: a seeded noise tile repeated over the cover.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 140; tile.height = 140;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(140, 140);
  let seed = 20261119;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
export function drawPanelPhoto(ctx, photo, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (photo) {
    const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
    const s = base * panel.zoom;
    const pw = photo.naturalWidth * s;
    const ph = photo.naturalHeight * s;
    const cx = rect.x + rect.w / 2 + panel.ox * rect.w;
    const cy = rect.y + rect.h / 2 + panel.oy * rect.h;
    ctx.filter = grade.filter;
    ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3a1c56'); g.addColorStop(1, '#160b22');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  tint.addColorStop(0, grade.stops[0]);
  tint.addColorStop(1, grade.stops[1]);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !lines[lines.length - 1]) {
      lines[lines.length - 1] = trial;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[lines.length - 1] += ` ${word}`;
    }
  }
  return lines;
}

/** Draws the title band: scrim, gradient sun, Anton title, Pacifico subtitle. */
export function drawTitleBand(ctx, state, w, h) {
  const bottom = state.titlePos === 'bottom';
  const bandH = h * 0.24;
  const bandY = bottom ? h - bandH : 0;
  const scrim = ctx.createLinearGradient(0, bottom ? bandY : bandY + bandH, 0, bottom ? h : bandY);
  scrim.addColorStop(0, 'rgba(12,5,22,0)');
  scrim.addColorStop(1, 'rgba(12,5,22,0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY, w, bandH);

  // Sunset sun disc glowing behind the title, kept inside the title band.
  const sunR = h * 0.065;
  const sunX = w * 0.5;
  const sunY = bottom ? h - bandH * 0.42 : bandY + bandH * 0.28;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255,214,102,0.7)');
  sun.addColorStop(0.55, 'rgba(255,122,61,0.35)');
  sun.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim();
  const maxW = w * 0.9;
  let size = h * 0.105;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let lines = [];
  if (title) {
    ctx.font = `${size}px Anton, sans-serif`;
    while (size > h * 0.03) {
      ctx.font = `${size}px Anton, sans-serif`;
      lines = wrapTitle(ctx, title, maxW);
      const tooWide = lines.some((l) => ctx.measureText(l).width > maxW);
      if (!tooWide && lines.length <= 2) break;
      size -= Math.max(2, size * 0.04);
    }
  }
  const lineH = size * 0.98;
  const blockH = lines.length * lineH + (subtitle ? h * 0.045 : 0);
  let cy = bottom ? h - bandH * 0.5 - blockH / 2 + lineH / 2 : bandY + bandH * 0.5 - blockH / 2 + lineH / 2;

  // Accent rule above the title.
  const ruleY = cy - lineH / 2 - h * 0.018;
  const rule = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
  rule.addColorStop(0, 'rgba(255,209,102,0)');
  rule.addColorStop(0.5, '#ffd166');
  rule.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = rule;
  ctx.fillRect(w * 0.2, ruleY, w * 0.6, Math.max(2, h * 0.004));

  for (const line of lines) {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = 'rgba(20,6,32,0.9)';
    ctx.strokeText(line, w / 2, cy);
    if (state.titleStyle === 'sunset') {
      const fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
      fill.addColorStop(0, '#ffe9a3');
      fill.addColorStop(0.45, '#ffb347');
      fill.addColorStop(0.75, '#ff5e62');
      fill.addColorStop(1, '#ff2e88');
      ctx.fillStyle = fill;
      ctx.shadowColor = 'rgba(255,46,136,0.65)';
      ctx.shadowBlur = size * 0.18;
      ctx.fillText(line, w / 2, cy);
      ctx.shadowBlur = 0;
    } else if (state.titleStyle === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.12;
      ctx.fillText(line, w / 2, cy);
      ctx.shadowBlur = 0;
    } else if (state.titleStyle === 'neon') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.35;
      ctx.fillText(line, w / 2, cy);
      ctx.shadowColor = '#2ee6ff';
      ctx.shadowBlur = size * 0.18;
      ctx.fillText(line, w / 2, cy);
      ctx.shadowBlur = 0;
    } else { // outline
      ctx.lineWidth = size * 0.045;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(line, w / 2, cy);
    }
    cy += lineH;
  }

  if (subtitle) {
    const subSize = Math.max(12, h * 0.028);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffe9a3';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(subtitle, w / 2, cy + subSize * 0.35);
    ctx.shadowBlur = 0;
  }
}

/**
 * Draws the whole cover: white poster frame, photo panels with the grade,
 * title band, grain and vignette. `photos` is an array of loaded images (or nulls).
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = layoutRects(state.layout, w, h);
  const count = LAYOUTS[state.layout].panels;

  // Poster frame.
  ctx.fillStyle = '#fdf7f0';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#160b22';
  const frame = Math.round(Math.min(w, h) * 0.018);
  ctx.fillRect(frame, frame, w - frame * 2, h - frame * 2);

  for (let i = 0; i < count; i += 1) {
    const panel = state.panels[i];
    const photo = panel && photos[panel.photo] ? photos[panel.photo] : null;
    drawPanelPhoto(ctx, photo, rects[i], panel ?? { zoom: 1, ox: 0, oy: 0 }, grade);
  }

  // Panel gutters: thin dark seams between panels.
  ctx.fillStyle = '#160b22';
  const gap = Math.round(Math.min(w, h) * 0.008);
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const a = rects[i]; const b = rects[j];
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (overlapX > gap && overlapY > 0 && overlapY < gap * 2) {
        ctx.fillRect(Math.max(a.x, b.x), Math.max(a.y, b.y), overlapX, overlapY);
      }
      if (overlapY > gap && overlapX > 0 && overlapX < gap * 2) {
        ctx.fillRect(Math.max(a.x, b.x), Math.max(a.y, b.y), overlapX, overlapY);
      }
    }
  }

  drawTitleBand(ctx, state, w, h);

  // Grain + vignette for the poster finish.
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,18,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Thin inner keyline inside the frame.
  ctx.strokeStyle = 'rgba(253,247,240,0.85)';
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.002);
  ctx.strokeRect(frame + gap, frame + gap, w - (frame + gap) * 2, h - (frame + gap) * 2);
}
