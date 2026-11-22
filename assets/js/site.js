/* Binsness: interactions. No dependencies. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ settings */
// Fill these in when ready. Until BOOKING_EMAIL is set the form explains itself instead of opening email.
const BOOKING_EMAIL = 'lindsayo1981@hotmail.com';
// Videos are trimmed 720x1280 H.264 MP4s in assets/video (made by _dev/encoder.html from the originals).

/* ------------------------------------------------------------------ chapters & contents */
const CHAPTERS = [
  { id: 'story',   n: 'I',   t: 'Our Story',     pg: 'the sand, the doctor, the cabbages' },
  { id: 'house',   n: 'II',  t: 'The House',     pg: 'room by room' },
  { id: 'bothy',   n: 'III', t: 'The Bothy',     pg: 'for two' },
  { id: 'garden',  n: 'IV',  t: 'The Garden',    pg: 'box, borders and yews' },
  { id: 'area',    n: 'V',   t: 'The Area Surrounding Binsness', pg: 'bay, beach, forest' },
  { id: 'explore', n: 'VI',  t: 'Things to Do',  pg: 'the expedition deck' },
  { id: 'food',    n: 'VII', t: 'Food',          pg: 'tonight’s menu' },
  { id: 'booking', n: 'VIII', t: 'Booking',      pg: 'send word' },
];
$$('.toc').forEach(ol => {
  ol.innerHTML = CHAPTERS.map(c => `<li><a href="#${c.id}"><span class="num">${c.n}.</span>${c.t}<span class="dots"></span><span class="pg">${c.pg}</span></a></li>`).join('');
});

let openCh = null, lastFocus = null;
function openChapter(id, anchor) {
  const el = $('#ch-' + id);
  if (!el) return;
  if (openCh && openCh !== el) openCh.classList.remove('open');
  if (!openCh) lastFocus = document.activeElement;
  openCh = el;
  el.classList.add('open');
  document.body.classList.add('locked');
  el.scrollTop = 0;
  closeDrawer();
  requestAnimationFrame(() => {
    if (anchor) { const a = $('#' + anchor, el); if (a) el.scrollTop = a.offsetTop - 70; }
    el.focus({ preventScroll: true });
    revealIn(el);
    lazyVideos(el);
  });
}
function closeChapter() {
  if (!openCh) return;
  openCh.classList.remove('open');
  $$('video', openCh).forEach(v => v.pause());
  openCh = null;
  document.body.classList.remove('locked');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
function route() {
  const h = location.hash.slice(1);
  if (CHAPTERS.some(c => c.id === h)) openChapter(h);
  else { closeChapter(); if (h === 'map') $('#map').scrollIntoView(); }
}
addEventListener('hashchange', route);
$$('[data-back]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); history.pushState(null, '', '#map'); closeChapter(); $('#map').scrollIntoView({ behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' }); }));
$('#begin').addEventListener('click', () => $('#map').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));

// map hotspots
$$('.hot').forEach(h => {
  const go = () => { const id = h.dataset.go, anchor = h.dataset.anchor; if (anchor) { history.pushState(null, '', '#' + id); openChapter(id, anchor); } else location.hash = id; };
  h.addEventListener('click', go);
  h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

// contents drawer (ribbon)
const drawer = $('#drawer');
function closeDrawer() { drawer.classList.remove('open'); }
$('#ribbon').addEventListener('click', () => { drawer.classList.add('open'); $('a', drawer).focus(); });
$$('[data-close]', drawer).forEach(b => b.addEventListener('click', closeDrawer));
drawer.addEventListener('click', e => { if (e.target.closest('a')) closeDrawer(); });

addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#roompanel').classList.contains('open')) return closeRoom();
  if (drawer.classList.contains('open')) return closeDrawer();
  if (openCh) { history.pushState(null, '', '#map'); closeChapter(); }
});

/* ------------------------------------------------------------------ reveal on scroll */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
function revealIn(root) { $$('.rv:not(.in)', root).forEach(el => io.observe(el)); }
revealIn(document);

/* ------------------------------------------------------------------ videos: load when near, play when seen */
const vio = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { loadVideo(v); const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
}), { threshold: .35 });
function loadVideo(v) {
  if (v.dataset.loaded) return;
  v.innerHTML = `<source src="${v.dataset.src}.mp4" type="video/mp4">`;
  v.dataset.loaded = 1; v.load();
}
function lazyVideos(root) { $$('video[data-src]', root).forEach(v => vio.observe(v)); }

/* ------------------------------------------------------------------ the map: drawn bits */
const svg = $('#mapsvg');
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
// seeded random so the forest is the same for everyone
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// sea ripples
const sea = $('#sealines');
for (let i = 0; i < 46; i++) {
  const x = rnd() * 1180, y = 20 + rnd() * 220;
  if (x > 1020 && y < 170) continue;
  el('path', { d: `M${x} ${y} q8 -5 16 0 q8 5 16 0` }, sea);
}
for (let i = 0; i < 16; i++) { const x = 760 + rnd() * 220, y = 320 + rnd() * 220; el('path', { d: `M${x} ${y} q6 -4 12 0 q6 4 12 0` }, sea); }
// forest: pines scattered in the forest polygon, avoiding the things drawn on top
const forest = $('#forest');
const avoid = [[170, 372, 46], [440, 392, 56], [330, 520, 46], [240, 402, 80], [94, 440, 34], [650, 480, 95], [604, 528, 60], [300, 470, 140, 30], [460, 700, 60], [40, 352, 0]];
function inForest(x, y) {
  if (y < 330 || y > 790) return false;
  if (x > 700 && y < 560) return false;           // bay side
  if (x > 760) return false;
  if (x > 560 && y > 600 && x < 680) return false; // river corridor
  if (y > 330 && y < 362 && x < 470) return false; // beach note
  for (const a of avoid) { if (a.length === 4) { if (Math.abs(x - a[0]) < a[2] && Math.abs(y - a[1]) < a[3]) return false; } else if (Math.hypot(x - a[0], y - a[1]) < a[2]) return false; }
  if (Math.hypot(x - 520, y - 650) < 30) return false;
  return true;
}
const trees = [];
for (let i = 0; i < 2400 && trees.length < 330; i++) { const x = rnd() * 760, y = 330 + rnd() * 470; if (inForest(x, y) && !trees.some(t => Math.hypot(t[0] - x, t[1] - y) < 19)) trees.push([x, y]); }
trees.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
  const s = 9 + rnd() * 6;
  el('path', { class: 'tree' + (rnd() > .55 ? ' dark' : ''), d: `M${x} ${y - s * 1.6} L${x + s * .7} ${y} L${x - s * .7} ${y} Z` }, forest);
});
// yew avenue: two rows from the house towards the bay
const yews = $('#yews');
for (let i = 0; i < 6; i++) {
  const x = 716 + i * 11, y1 = 472 - i * 3, y2 = 496 - i * 2;
  el('path', { class: 'tree dark', d: `M${x} ${y1 - 15} L${x + 4} ${y1} L${x - 4} ${y1} Z` }, yews);
  el('path', { class: 'tree dark', d: `M${x} ${y2 - 15} L${x + 4} ${y2} L${x - 4} ${y2} Z` }, yews);
}

// on phones the map is wider than the screen: start it centred on the house
const mf = $('.mapframe');
if (mf.scrollWidth > mf.clientWidth) mf.scrollLeft = mf.scrollWidth * (650 / 1200) - mf.clientWidth / 2;

/* ------------------------------------------------------------------ curiosities */
const CURIOS = {
  sun:      ['The third-sunniest spot', 'Findhorn Bay has a renowned micro-climate and the third-highest sunshine count in the British Isles. Bring a hat. And a jumper, just in case. It is still Scotland.'],
  dolphins: ['Dolphins!', 'The Moray Firth is home to a famous resident population of bottlenose dolphins. Click again and they may oblige once more.'],
  seals:    ['Not rocks', 'Those lumps on the sandbank at low tide are usually seals, enjoying the sunshine statistics.'],
  chimney:  ['Is anybody there?', 'In the 18th century a chimney of the buried Culbin mansion poked out of the sand. A man called down it, and a voice answered. He did not stay to chat.'],
  cards:    ['Still playing', 'Legend says the Laird of Culbin plays cards with the Devil inside the largest dune. Nobody knows the score. Chapter I has more.'],
  hill99:   ['Hill 99', 'Culbin’s highest dune, at a dizzy 99 feet. A wooden tower on top gives you a squirrel’s-eye view to the Moray Firth.'],
  osprey:   ['Something overhead', 'Keep your eyes up over the bay. It is a fine place for watching birds. Binoculars live in the hall.'],
  apple:    ['The tree that came back', 'An old man swore he saw an apple tree rise out of the sand, blossom and bear fruit of a "particularly delicious" flavour.'],
  witches:  ['When shall we three meet again?', 'Macbeth’s witches are on their way to Forres, five miles away and named in the play’s opening scene. Forres is, happily, rather nicer than they make it sound.'],
  taxi:     ['All aboard', 'A water taxi can collect you from near the house and run you across to Findhorn, and its pubs, in minutes. By road it takes far longer.'],
};
const CUR_KEYS = Object.keys(CURIOS);
$('#total').textContent = CUR_KEYS.length;
let found = new Set();
try { found = new Set(JSON.parse(localStorage.getItem('binsness-found') || '[]')); } catch (e) {}
const pips = $('#pips');
function paintCount() {
  $('#found').textContent = found.size;
  pips.innerHTML = CUR_KEYS.map(k => `<i class="${found.has(k) ? 'on' : ''}"></i>`).join('');
  $$('.cur').forEach(c => c.classList.toggle('found', found.has(c.dataset.cur)));
}
paintCount();
const note = $('#note'); let noteT;
function showNote(h, p, ms = 7000) {
  $('h4', note).textContent = h; $('p', note).textContent = p;
  note.classList.add('show'); clearTimeout(noteT); noteT = setTimeout(() => note.classList.remove('show'), ms);
}
$('.x', note).addEventListener('click', () => note.classList.remove('show'));
function curio(key) {
  const [h, p] = CURIOS[key];
  const isNew = !found.has(key);
  found.add(key);
  try { localStorage.setItem('binsness-found', JSON.stringify([...found])); } catch (e) {}
  paintCount();
  if (key === 'dolphins') ['#dolphin1', '#dolphin2'].forEach((s, i) => { const d = $(s); d.classList.remove('leap'); void d.getBBox(); setTimeout(() => d.classList.add('leap'), i * 250); });
  if (key === 'taxi') $('#taxi').classList.toggle('across');
  if (isNew && found.size === CUR_KEYS.length) {
    showNote('Certified Binsness Explorer', 'You have found every curiosity on the map. This entitles you to absolutely nothing, except our admiration and a strong suspicion that you would enjoy staying here.', 12000);
  } else showNote(h, p);
}
$$('.cur').forEach(c => {
  c.addEventListener('click', () => curio(c.dataset.cur));
  c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); curio(c.dataset.cur); } });
});

/* ------------------------------------------------------------------ Chapter I: sand */
const story = $('#ch-story'), stage = $('#sandstage'), dune = $('#dune'), fx = $('#sandfx');
let sandForced = null;
function sandFromScroll() {
  if (sandForced !== null || !story.classList.contains('open')) return;
  const r = stage.getBoundingClientRect(), vh = innerHeight;
  const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .5)));
  dune.style.setProperty('--sand', (p * 78).toFixed(1) + '%');
}
story.addEventListener('scroll', sandFromScroll, { passive: true });
const grains = []; let fxOn = false;
function blow() {
  sandForced = 92; dune.style.transition = 'height 5s ease-in'; dune.style.setProperty('--sand', '92%');
  $('#sandBtn').textContent = 'Dig it out again';
  if (reduced) return;
  const c = fx.getContext('2d'); fx.width = stage.clientWidth; fx.height = stage.clientHeight;
  for (let i = 0; i < 380; i++) grains.push({ x: -rnd() * fx.width, y: rnd() * fx.height, v: 3 + rnd() * 6, s: 1 + rnd() * 2 });
  fxOn = true; const t0 = performance.now();
  (function tick(t) {
    c.clearRect(0, 0, fx.width, fx.height); c.fillStyle = 'rgba(176,140,70,.65)';
    for (const g of grains) { g.x += g.v; g.y += Math.sin((g.x + t) / 60) * .6 + .4; if (g.x > fx.width) { g.x = -10; g.y = rnd() * fx.height; } c.fillRect(g.x, g.y, g.s * 2, g.s); }
    if (t - t0 < 6000 && fxOn) requestAnimationFrame(tick); else { c.clearRect(0, 0, fx.width, fx.height); grains.length = 0; }
  })(t0);
}
$('#sandBtn').addEventListener('click', () => {
  if (sandForced === null) blow();
  else { sandForced = null; fxOn = false; dune.style.transition = 'height 1.2s ease-out'; dune.style.setProperty('--sand', '0%'); $('#sandBtn').textContent = 'Let the wind blow'; setTimeout(() => dune.style.transition = '', 1300); }
});

// the devil's card table
const HANDS = ['The Laird draws the Queen of Spades. The Devil smiles.', 'The Devil plays a joker. Nobody remembers putting one in the deck.', 'Trumps are sand. They are always sand.', 'The Laird is winning! (He has been "winning" since 1694.)', 'The Devil proposes double or nothing. The Laird has nothing. Again.'];
const dc = $('#devilcard');
const deal = () => showNote('Meanwhile, inside the big dune…', HANDS[Math.floor(Math.random() * HANDS.length)]);
dc.addEventListener('click', deal); dc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deal(); } });

// scratch-off sand
(() => {
  const box = $('#scratch'), cv = $('canvas', box), img = $('img', box), hint = $('.hint', box);
  let ctx, drawing = false, rubbed = 0;
  function paint() {
    const w = box.clientWidth, h = img.clientHeight || w * .66; cv.width = w; cv.height = h; ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e6cf98'); g.addColorStop(1, '#d4b373');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(120,90,40,.25)'; for (let i = 0; i < w * h / 60; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    ctx.globalCompositeOperation = 'destination-out';
  }
  // paint once the image is actually on screen (the chapter is display:none until opened)
  let painted = false;
  new IntersectionObserver(es => { if (es[0].isIntersecting && !painted && img.complete && img.clientHeight) { painted = true; paint(); } }, { threshold: .1 }).observe(box);
  img.addEventListener('load', () => { if (!painted && img.clientHeight) { painted = true; paint(); } });
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const rub = e => { if (!drawing || !ctx) return; const [x, y] = pos(e); ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); if (++rubbed > 6) hint.style.opacity = 0; };
  cv.addEventListener('pointerdown', e => { drawing = true; cv.setPointerCapture(e.pointerId); rub(e); });
  cv.addEventListener('pointermove', rub);
  cv.addEventListener('pointerup', () => drawing = false);
  cv.addEventListener('pointercancel', () => drawing = false);
})();

/* ------------------------------------------------------------------ Chapter II: the dolls' house */
const IMG = id => `assets/img/${id}-s.jpg`;
const ROOMS = [
  // ground floor (y 450 to 680)
  { id: 'hall', name: 'The Hall', x: 20, y: 450, w: 140, h: 230, photos: ['x-hall', 'x-portrait-hall'],
    cap: 'Sticks for walks, a basket for boots, an oak settle and a bronze horseman who keeps an eye on the weather. The portraits are watching too.' },
  { id: 'drawing', name: 'The Drawing Room', x: 160, y: 450, w: 240, h: 230, photos: ['h07-drawing-room', 'h08-chessmen'], video: 'v07-drawing-room',
    cap: 'Red sofas, walls of books, a piano and ancestors in gilt frames. The Lewis chessmen are mid-game. Please do not move the queen.' },
  { id: 'sitting', name: 'The Sitting Room', x: 400, y: 450, w: 160, h: 230, photos: ['h12-sitting-room'],
    cap: 'Sunny cushions, a big fireplace and shelves of paperbacks. For crosswords, naps and doing nothing whatsoever.' },
  { id: 'dining', name: 'The Dining Room', x: 560, y: 450, w: 180, h: 230, photos: ['h09-dining', 'h10-dresser'],
    cap: 'A long table on a red rug, a dresser of gold-rimmed plates and a model yacht on the mantelpiece. For four-course dinners, or for leftover pizza eaten off very good china.' },
  { id: 'kitchen', name: 'The Kitchen', x: 740, y: 450, w: 190, h: 230, photos: ['h11-kitchen'],
    cap: 'An Aga that never goes cold, a big oak table and a window over the garden. Everyone always ends up in here.' },
  { id: 'fourposter', name: 'The Four-Poster Room', x: 930, y: 450, w: 150, h: 230, photos: ['h14-four-poster'], video: 'v08-four-poster',
    cap: 'A canopied four-poster, flowered walls, an old mirror and late flowers on the table. Lamps on early, curtains drawn late.' },
  { id: 'gardenroom', name: 'The Garden Room', x: 1080, y: 540, w: 105, h: 140, glass: true, photos: ['h13-garden-room', 'x-guestbook'],
    cap: 'Stone walls, wicker chairs, orange cushions and glass on three sides, in the third-sunniest spot in Britain. The visitors’ book lives here. Do write in it.' },
  // first floor (y 220 to 450)
  { id: 'terrace', name: 'The Roof Terrace', x: 20, y: 220, w: 230, h: 230, open: true, photos: ['h17-roof-terrace', 'h18-window-view'], video: 'v10-window',
    cap: 'A south-west roof terrace with a panorama across the garden and the bay. A table, two chairs, the yews below and Findhorn on the far shore. Bring something cold to drink.' },
  { id: 'bear', name: 'The Bear’s Room', x: 250, y: 220, w: 150, h: 230, photos: ['h20-teddy'],
    cap: 'Blue-and-white headboards, tartan blankets and a resident bear who has never once complained about the snoring.' },
  { id: 'rose', name: 'The Rose-Window Room', x: 400, y: 220, w: 200, h: 230, photos: ['h15-trompe-room'], video: 'v09-trompe-room',
    cap: 'Round windows and a painted window above the fireplace that looks out on a garden that is not there. Two beds, two very upright chairs.' },
  { id: 'master', name: 'The Big Bedroom', x: 600, y: 220, w: 180, h: 230, photos: ['x-master-bed'],
    cap: 'A wide bed with a tartan throw, a sofa to read on, antique chests and windows on to the garden.' },
  { id: 'twins', name: 'The Twin Rooms', x: 780, y: 220, w: 180, h: 230, photos: ['x-yellow-twin', 'x-green-twin'],
    cap: 'Yellow walls and an oval mirror in one, a view of the yews in the other. Good for children, cousins, or friends who promise to stop talking.' },
  { id: 'bath', name: 'The Mural Bathroom', x: 960, y: 220, w: 120, h: 230, photos: ['h16-mural-bath'],
    cap: 'Someone painted a garden on the bathroom wall, roses, trellis and all. It is the only bathroom we know of with its own herbaceous border.' },
];
function furniture(r, g) {
  const cx = r.x + r.w / 2, by = r.y + r.h - 14, top = r.y + 70; // top: clear of a two-line label
  const f = el('g', { class: 'furn' }, g);
  const P = d => el('path', { d }, f);
  switch (r.id) {
    case 'terrace': P(`M${r.x + 16} ${by} V${by - 34} M${r.x + 16} ${by - 26} H${r.x + r.w - 16} M${r.x + r.w - 16} ${by} V${by - 34}`); for (let i = r.x + 30; i < r.x + r.w - 16; i += 16) P(`M${i} ${by} V${by - 26}`); el('ellipse', { cx, cy: by - 40, rx: 26, ry: 6, class: 'f' }, f); P(`M${cx} ${by - 40} V${by}`); P(`M${cx - 22} ${by - 52} l6 -14 M${cx + 18} ${by - 52} v-16`); break;
    case 'bear': P(`M${r.x + 16} ${by} v-26 h70 v26 M${r.x + 16} ${by - 14} h70`); el('circle', { cx: r.x + 115, cy: by - 30, r: 9, class: 'f' }, f); P(`M${r.x + 103} ${by} q12 -26 24 0 M${r.x + 109} ${by - 40} a3 3 0 1 1 1 0 M${r.x + 121} ${by - 40} a3 3 0 1 1 1 0`); break;
    case 'bath': P(`M${r.x + 14} ${by - 24} h86 q0 24 -18 24 h-50 q-18 0 -18 -24 Z`); P(`M${r.x + 100} ${by - 24} v-22 h-10`); P(`M${r.x + 16} ${top + 20} q11 -14 22 0 q11 14 22 0 q11 -14 22 0 q11 14 22 0 M${r.x + 28} ${top + 40} q12 -10 24 0 q12 10 24 0`); break;
    case 'fourposter': P(`M${cx - 60} ${by} V${by - 100} M${cx + 60} ${by} V${by - 100} M${cx - 66} ${by - 100} H${cx + 66}`); el('rect', { x: cx - 56, y: by - 34, width: 112, height: 22, class: 'f' }, f); P(`M${cx - 60} ${by - 92} q15 10 30 0 q15 10 30 0 q15 10 30 0 q15 10 30 0`); break;
    case 'rose': el('circle', { cx: r.x + 42, cy: top + 10, r: 18, class: 'f' }, f); P(`M${r.x + 24} ${top + 10} h36 M${r.x + 42} ${top - 8} v36`); el('circle', { cx: r.x + r.w - 42, cy: top + 10, r: 18, class: 'f' }, f); P(`M${r.x + r.w - 60} ${top + 10} h36 M${r.x + r.w - 42} ${top - 8} v36`); P(`M${cx - 40} ${by} v-30 h80 v30 M${cx - 34} ${by - 30} v-40 h68 v40 M${cx - 24} ${by - 64} q24 -18 48 0`); break;
    case 'master': el('rect', { x: cx - 70, y: by - 30, width: 140, height: 24, class: 'f' }, f); P(`M${cx - 70} ${by - 30} v-24 h140 v24 M${cx - 40} ${by - 18} h80`); break;
    case 'twins': el('rect', { x: r.x + 16, y: by - 26, width: 62, height: 20, class: 'f' }, f); el('rect', { x: r.x + r.w - 78, y: by - 26, width: 62, height: 20, class: 'f' }, f); P(`M${r.x + 16} ${by - 26} v-20 M${r.x + r.w - 16} ${by - 26} v-20`); el('ellipse', { cx, cy: top + 20, rx: 14, ry: 18, class: 'f' }, f); break;
    case 'hall': P(`M${r.x + 30} ${by} v-60 h18 v60 M${r.x + 32} ${by - 60} q4 -26 14 -30 l6 -8 M${r.x + 39} ${by - 86} a5 5 0 1 1 1 0`); P(`M${r.x + 90} ${by} v-70 M${r.x + 98} ${by} v-74 M${r.x + 106} ${by} v-66`); break;
    case 'drawing': P(`M${r.x + 20} ${by} v-30 h90 v30 M${r.x + 20} ${by - 18} h90`); el('rect', { x: r.x + 146, y: by - 60, width: 74, height: 50, class: 'f' }, f); P(`M${r.x + 146} ${by - 10} h74 M${r.x + 156} ${by} v-10 M${r.x + 210} ${by} v-10`); for (let i = 0; i < 8; i++) P(`M${r.x + 20 + i * 12} ${top} v34`); break;
    case 'sitting': P(`M${cx - 50} ${by} v-26 h100 v26 M${cx - 50} ${by - 14} h100`); el('rect', { x: cx - 26, y: top, width: 52, height: 60, class: 'f' }, f); P(`M${cx - 16} ${top + 60} v-26 h32 v26`); break;
    case 'dining': P(`M${cx - 70} ${by - 30} h140 M${cx - 60} ${by - 30} v30 M${cx + 60} ${by - 30} v30`); for (let i = -45; i <= 45; i += 30) P(`M${cx + i} ${by - 30} v-22`); P(`M${cx - 20} ${top + 10} l20 -10 l20 10 v40 h-40 z`); break;
    case 'kitchen': el('rect', { x: r.x + 16, y: by - 58, width: 70, height: 58, class: 'f' }, f); P(`M${r.x + 16} ${by - 30} h70 M${r.x + 51} ${by - 58} v58 M${r.x + 26} ${by - 66} h50`); el('circle', { cx: r.x + 145, cy: top + 10, r: 14 }, f); P(`M${r.x + 145} ${top + 10} v-8 M${r.x + 145} ${top + 10} h6`); P(`M${r.x + 104} ${by - 30} h70 M${r.x + 112} ${by - 30} v30 M${r.x + 166} ${by - 30} v30`); break;
    case 'gardenroom': for (let i = r.x + 18; i < r.x + r.w; i += 22) P(`M${i} ${r.y + 56} V${r.y + r.h - 6}`); P(`M${r.x} ${r.y + 56} h${r.w}`); P(`M${cx - 14} ${by} q-6 -24 6 -30 q12 6 8 30`); break;
  }
}
// Room names wrap on to a second line when the room is too narrow for them.
function roomLabel(r, g) {
  const name = r.name.replace(/^The /, ''), t = el('text', { x: r.x + 10, y: r.y + 26 }, g);
  const words = name.split(' ');
  if (name.length * 9.6 <= r.w - 16 || words.length < 2) { t.textContent = name; return; }
  const cut = Math.ceil(words.length / 2);
  [words.slice(0, cut).join(' '), words.slice(cut).join(' ')].forEach((line, k) => {
    const s = el('tspan', { x: r.x + 10, dy: k ? 22 : 0 }, t); s.textContent = line;
  });
}
function buildDolls() {
  const W = 1200, H = 760;
  const s = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Cut-away drawing of the house: ground floor and first floor. Each room opens its photographs.' });
  el('rect', { class: 'sky', x: 0, y: 0, width: W, height: H, fill: '#e9efe9' }, s);
  for (let i = 0; i < 40; i++) el('circle', { class: 'star', cx: rnd() * W, cy: rnd() * 150, r: 1 + rnd() * 1.5, fill: '#fff6d0' }, s);
  el('circle', { class: 'star', cx: 1130, cy: 70, r: 26, fill: '#f6edc8' }, s);
  // ground
  el('rect', { x: 0, y: 680, width: W, height: 80, fill: '#9cb07a' }, s);
  el('path', { d: 'M0 686 q60 -6 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5 }, s);
  // slate roof over the first floor (the terrace on the left stays open to the sky), two chimneys
  el('rect', { x: 340, y: 64, width: 24, height: 60, fill: '#b9a48a', stroke: 'var(--ink)', 'stroke-width': 1.5 }, s);
  el('rect', { x: 950, y: 64, width: 24, height: 60, fill: '#b9a48a', stroke: 'var(--ink)', 'stroke-width': 1.5 }, s);
  el('path', { d: 'M236 220 L320 104 L1000 104 L1094 220 Z', fill: '#8e8a93', stroke: 'var(--ink)', 'stroke-width': 2 }, s);
  el('path', { class: 'smoke', d: 'M962 58 q-8 -10 0 -18 q8 -8 0 -16', fill: 'none', stroke: '#9a948c', 'stroke-width': 3 }, s);
  // glass roof of the garden room
  el('path', { d: 'M1080 540 L1080 520 L1190 540 Z', fill: '#cfe0dc', stroke: 'var(--ink)', 'stroke-width': 1.5 }, s);
  // stone outer wall and the floor between the storeys
  el('rect', { x: 14, y: 214, width: 1072, height: 472, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 5 }, s);
  ROOMS.forEach((r, i) => {
    const g = el('g', { class: 'room', tabindex: 0, role: 'button', 'aria-label': r.name, 'data-i': i }, s);
    el('rect', { class: 'box' + (r.open ? ' open' : ''), x: r.x, y: r.y, width: r.w, height: r.h }, g);
    furniture(r, g);
    roomLabel(r, g);
    g.addEventListener('click', () => openRoom(i));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoom(i); } });
  });
  el('path', { d: 'M14 450 H1086', stroke: 'var(--ink)', 'stroke-width': 5 }, s);
  [['First floor', 1098, 340], ['Ground floor', 1098, 480]].forEach(([txt, x, y]) => {
    const t = el('text', { x, y, style: 'font-family:var(--fellsc);font-size:15px;letter-spacing:.06em;fill:var(--ink-soft)' }, s); t.textContent = txt;
  });
  const n = el('text', { x: 40, y: 735, style: 'font-family:var(--hand);font-size:22px;fill:var(--ink-soft)' }, s);
  n.textContent = 'Not to scale. Rooms arranged by artistic licence, not by architect.';
  $('#dolls').appendChild(s);
}
buildDolls();

const rp = $('#roompanel'); let curRoom = 0, roomReturn = null;
function openRoom(i) {
  curRoom = (i + ROOMS.length) % ROOMS.length; const r = ROOMS[curRoom];
  if (!rp.classList.contains('open')) roomReturn = document.activeElement;
  $('#roomtitle').textContent = r.name; $('#roomcap').textContent = r.cap;
  const grid = $('#roomgrid');
  grid.classList.toggle('has-vid', !!r.video);
  grid.innerHTML = `<div class="pics">` + r.photos.map(p => `<figure class="photo" style="margin:0"><img src="${IMG(p)}" alt="${r.name}" loading="lazy"></figure>`).join('') + `</div>` +
    (r.video ? `<figure class="photo" style="margin:0"><video data-src="assets/video/${r.video}" poster="assets/video/${r.video}.jpg" muted loop playsinline aria-label="Video of ${r.name}"></video></figure>` : '');
  rp.classList.add('open');
  $$('.room').forEach((g, k) => g.classList.toggle('lit', k === curRoom));
  const v = $('video', grid); if (v) { loadVideo(v); v.play().catch(() => {}); }
  $('.x', rp).focus();
}
function closeRoom() { rp.classList.remove('open'); $$('video', rp).forEach(v => v.pause()); $$('.room').forEach(g => g.classList.remove('lit')); if (roomReturn) roomReturn.focus(); tourOn = false; }
$$('[data-close]', rp).forEach(b => b.addEventListener('click', closeRoom));
$('#prevRoom').addEventListener('click', () => openRoom(curRoom - 1));
$('#nextRoom').addEventListener('click', () => openRoom(curRoom + 1));
let tourOn = false;
$('#tourBtn').addEventListener('click', () => { tourOn = true; openRoom(0); });
$('#lampBtn').addEventListener('click', e => {
  const night = $('#ch-house').classList.toggle('night');
  $$('.room').forEach(g => g.classList.toggle('lit', night));
  e.currentTarget.textContent = night ? 'Morning, please' : 'Switch the lamps on';
});

/* ------------------------------------------------------------------ Chapter III: stove */
const stove = $('#stove');
const toggleStove = () => { const on = stove.classList.toggle('on'); stove.setAttribute('aria-pressed', on); $('#stovecap').textContent = on ? 'Crackling nicely. The kettle is on.' : 'Click to light the stove.'; };
stove.addEventListener('click', toggleStove);
stove.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStove(); } });

/* ------------------------------------------------------------------ Chapter V: the beachcomber's tray */
$$('#tray .spec').forEach(s => s.addEventListener('click', () => {
  const open = !s.classList.contains('open');
  $$('#tray .spec.open').forEach(o => { o.classList.remove('open'); o.setAttribute('aria-expanded', 'false'); });
  s.classList.toggle('open', open); s.setAttribute('aria-expanded', open);
}));

/* ------------------------------------------------------------------ Chapter V: the expedition deck */
const SUITS = { wild: ['Wild & Wet', '🌊'], castle: ['Castles & Curiosities', '🏰'], shop: ['Shops & Villages', '🧵'], golf: ['Golf', '⛳'], small: ['Little People & Rainy Days', '🦕'] };
const ACTS = [
  ['wild', 'ACE Adventures & Hideaways', 'White-water rafting, cliff jumping, canyoning, woodland high ropes, zip lining and more.', 'aceadventures.co.uk', 'https://aceadventures.co.uk', '01309 611729', 'info@aceadventures.co.uk'],
  ['wild', 'North 58 Sea Adventures', 'Trips out on to the Moray Firth to see the coastline and its abundant wildlife. They also run a water taxi, and can collect you from near the house and take you to Findhorn.', 'north58.co.uk', 'https://www.north58.co.uk', '01309 690099', 'adventure@north58.co.uk'],
  ['wild', 'Bike Bothy, Forres', 'Bicycle hire, for the forest tracks and the coast.', '', '', '01309 671745', ''],
  ['wild', 'Nairn Kayak Centre', 'A 1½-hour beginners’ kayak trip from beside Nairn harbour and along the beach, with a relaxed, knowledgeable guide.', 'highlandexperiences.com', 'https://highlandexperiences.com/kayakgairloch/nairn-kayak-centre/', '', 'highlandexperiences@gmail.com'],
  ['wild', 'Equus Riding', 'Beach and forest hacks, a riding school and pony clubs for children.', 'equusscotland.co.uk', 'https://equusscotland.co.uk', '07917 572154', 'equusridinguk@gmail.com'],
  ['castle', 'Cawdor Castle', 'Home to the Cawdor family for over 600 years. The medieval tower was built around a legendary holly tree. There is a drawbridge, a moat, turrets, a vaulted 16th-century kitchen, twelve principal rooms of tapestries and art, and three gardens.', 'cawdorcastle.com', 'https://www.cawdorcastle.com', '01667 404401', 'info@cawdorcastle.com'],
  ['castle', 'Pluscarden Abbey', 'Benedictine monks living in the only medieval British monastery still used for its original purpose. It sits in a secluded glen six miles south-west of Elgin, and the quiet there has hardly changed since the 13th century.', 'pluscardenabbey.org', 'https://www.pluscardenabbey.org/', '01343 890257', ''],
  ['castle', 'Brodie Castle', 'A magnificent turreted castle with a playful garden, over 400 varieties of daffodil, green walks and nature spotting.', 'nts.org.uk', 'https://www.nts.org.uk', '01309 641371', ''],
  ['castle', 'Benromach Distillery', 'A family-owned distillery making Speyside whisky by hand, with a subtle smoky character. Tours of the whisky and the gin.', 'benromach.com', 'https://www.benromach.com', '01309 675968', 'info@benromach.com'],
  ['castle', 'Morayvia', 'A science and technology centre bringing aerospace, astronomy, technology and the arts under one roof.', 'morayvia.org.uk', 'https://www.morayvia.org.uk', '01309 691916', ''],
  ['shop', 'Brodie Countryfare', 'Clothing, a deli and a café.', 'brodiecountryfare.com', 'http://www.brodiecountryfare.com', '01309 641555', ''],
  ['shop', 'Beauly', 'Supposedly named by Mary Queen of Scots in 1564: "C’est un beau lieu". A pretty village with shops and places to eat, twenty minutes from Inverness.', 'visitbeauly.com', 'https://www.visitbeauly.com/things-to-do-in-beauly/', '', ''],
  ['shop', 'Campbells of Beauly', 'Country tailors and outfitters, with beautiful Highland fabrics.', 'campbellsofbeauly.com', 'http://www.campbellsofbeauly.com', '', ''],
  ['shop', 'Petra Palumbo', 'Hand-painted glass and tiles, and a great deal else.', 'houseofpetra.com', 'https://houseofpetra.com/', '01463 782594', ''],
  ['golf', 'Forres Golf Club', 'A delightful par 70 designed by Open champions James Braid and Willie Park. Beautifully kept, picturesque and a good test for every handicap.', 'forresgolfclub.co.uk', 'https://forresgolfclub.co.uk', '01309 672949', 'manager@forresgolfclub.co.uk'],
  ['golf', 'Nairn Golf Club', 'A classic links along the shore at Nairn, founded in 1887. Bring a windproof and a sense of humour.', 'nairngolfclub.co.uk', 'http://www.nairngolfclub.co.uk/', '01667 453208', '', 'Seabank Road, Nairn IV12 4HB'],
  ['golf', 'Cabot Highlands', 'The Castle Stuart links, now part of Cabot Highlands, on the Moray Firth near Inverness. Big views, bigger bunkers.', 'cabot.com/highlands', 'https://cabot.com/highlands/', '01463 796111', '', 'Dalcross, Inverness IV2 7JL'],
  ['golf', 'Covesea Links', 'Golf on the coast between Burghead and Lossiemouth, with the sea for company.', 'covesealinks.com', 'https://covesealinks.com/', '07769 157093', '', 'B9040, Elgin IV30 5QS'],
  ['small', 'Nairn Beach', 'Starts at the harbour and runs west to the Nairn Golf Club (1887). There is a children’s splash pad and a good ice-cream shop. Walk out along the sand and come back through the old town.', 'nairnscotland.co.uk', 'https://nairnscotland.co.uk/', '', ''],
  ['small', 'Landmark Adventure Park', 'A wild water coaster, a dinosaur kingdom, a butterfly house, ant city, a forest tower, a Tarzan trail, a lost labyrinth, ropeworks and more.', 'landmarkpark.co.uk', 'https://www.landmarkpark.co.uk/', '0800 731 3446', ''],
  ['small', 'Moray Leisure Centre', 'An ice rink, a swimming pool, soft play, a gym, classes and a café. The rainy-day rescue.', 'morayleisurecentre.com', 'https://www.morayleisurecentre.com', '01343 550033', ''],
];
const deck = $('#deck'), chips = $('#chips');
chips.innerHTML = `<button class="chip" aria-pressed="true" data-s="all">All suits</button>` + Object.entries(SUITS).map(([k, [n]]) => `<button class="chip" aria-pressed="false" data-s="${k}">${n}</button>`).join('');
deck.innerHTML = ACTS.map(([s, t, d, ws, url, tel, mail, addr], i) => `
  <button class="card3d" data-s="${s}" aria-label="${t}: turn over for details">
    <div class="in">
      <div class="face front"><span class="glyph" aria-hidden="true">${SUITS[s][1]}</span><span class="suit">${SUITS[s][0]}</span><h4>${t}</h4><p>${d}</p><span class="turn">turn over →</span></div>
      <div class="face back"><h4>${t}</h4>
        ${url ? `<div><a href="${url}" target="_blank" rel="noopener">${ws}</a></div>` : ''}
        ${tel ? `<div>Telephone: <a href="tel:${tel.replace(/\s/g, '')}">${tel}</a></div>` : ''}
        ${mail ? `<div>Email: <a href="mailto:${mail}">${mail}</a></div>` : ''}
        ${addr ? `<div>${addr}</div>` : ''}
        ${!url && !tel && !mail ? '<div>Ask us and we will point the way.</div>' : ''}
        <span class="hand" style="margin-top:12px;font-size:19px;opacity:.85">← turn back</span>
      </div>
    </div>
  </button>`).join('');
deck.addEventListener('click', e => { if (e.target.closest('a')) return; const c = e.target.closest('.card3d'); if (c) c.classList.toggle('flipped'); });
function filterDeck(s) {
  $$('.chip', chips).forEach(c => c.setAttribute('aria-pressed', c.dataset.s === s));
  $$('.card3d', deck).forEach(c => { c.hidden = !(s === 'all' || c.dataset.s === s); c.classList.remove('flipped', 'dealt'); });
  $('#golfmap').hidden = s !== 'golf';
}
// golf map: each flag turns over its club's card
$$('#golfmap .pin').forEach(p => {
  const go = () => {
    const card = $$('.card3d', deck).find(c => c.getAttribute('aria-label').startsWith(p.dataset.card + ':'));
    if (!card) return; card.classList.add('flipped'); card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  p.addEventListener('click', go);
  p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
chips.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) filterDeck(c.dataset.s); });
$('#dealBtn').addEventListener('click', () => {
  const cards = $$('.card3d', deck); const picks = new Set();
  // one from wild, one from castle/shop, one wildcard: a balanced day
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  picks.add(pick(cards.filter(c => c.dataset.s === 'wild')));
  picks.add(pick(cards.filter(c => c.dataset.s === 'castle' || c.dataset.s === 'shop')));
  while (picks.size < 3) picks.add(pick(cards));
  $$('.chip', chips).forEach(c => c.setAttribute('aria-pressed', 'false'));
  cards.forEach(c => { c.hidden = !picks.has(c); c.classList.remove('flipped', 'dealt'); });
  [...picks].forEach((c, i) => setTimeout(() => c.classList.add('dealt'), i * 120));
  showNote('Your day, as dealt', 'Morning, afternoon and a wildcard. Not keen? Deal again. The deck never minds.', 5000);
});

/* ------------------------------------------------------------------ Chapter VII: envelope + enquiry */
const env = $('#envelope'), letter = $('#letter');
const openEnv = () => { env.classList.add('open'); env.setAttribute('aria-expanded', 'true'); setTimeout(() => letter.classList.add('show'), 450); };
env.addEventListener('click', openEnv);
env.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnv(); } });
$('#enquiry').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (!BOOKING_EMAIL) { showNote('Almost there', 'The booking email address has not been added to the website yet. Please use the contact details above for now.'); return; }
  const body = `Name: ${f.get('name')}\nStaying in: ${f.get('where')}\nArriving: ${f.get('from')}\nLeaving: ${f.get('to')}\nGuests: ${f.get('guests')}\nLindsay to cook: ${f.get('chef')}\n\n${f.get('msg')}`;
  location.href = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent('Binsness enquiry: ' + f.get('name'))}&body=${encodeURIComponent(body)}`;
});

/* ------------------------------------------------------------------ go */
route();
})();
