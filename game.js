(function () {
'use strict';

// ============================================================
//  CONFIGURATION
// ============================================================
const T = 32;                       // tile size
const W = 800;                      // canvas width
const H = 480;                      // canvas height
const GROUND_Y = H - 2 * T;        // ground surface (416)

const GRAV     = 0.48;
const JUMP     = -12;
const DJUMP    = -10;
const SPEED    = 4.5;
const ACCEL    = 0.5;
const DECEL    = 0.35;
const MAXFALL  = 13;
const ENEMY_SPD = 1.2;

// ============================================================
//  CANVAS
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = W;
canvas.height = H;

// ============================================================
//  INPUT  (registered once – never duplicated)
// ============================================================
const keys  = {};
const touch = { left: false, right: false, jump: false };

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
    e.preventDefault();
  onAction(e.code);
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

function onAction(code) {
  if (code !== 'Space' && code !== 'Enter') return;
  initAudio();
  if (G.state === 'menu')          resetGame();
  else if (G.state === 'gameOver') resetGame();
  else if (G.state === 'levelComplete') startLevel(G.level + 1);
}

// ============================================================
//  AUDIO  (procedural – no files needed)
// ============================================================
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  catch (_) { /* unsupported */ }
}

function note(freq, dur, type, vol) {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  } catch (_) { /* ignore */ }
}

function sfx(name) {
  switch (name) {
    case 'jump':
      note(260, 0.08); setTimeout(() => note(390, 0.12), 50); break;
    case 'coin':
      note(988, 0.05); setTimeout(() => note(1319, 0.15), 60); break;
    case 'stomp':
      note(400, 0.06); setTimeout(() => note(500, 0.1), 40); break;
    case 'die':
      note(400, 0.15, 'square', 0.15);
      setTimeout(() => note(300, 0.15), 150);
      setTimeout(() => note(200, 0.3, 'square', 0.1), 300); break;
    case 'clear':
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => note(f, 0.15), i * 100)); break;
    case 'bump':
      note(150, 0.1, 'triangle', 0.1); break;
  }
}

// ============================================================
//  UTILITIES
// ============================================================
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

// ============================================================
//  GAME STATE
// ============================================================
const G = {
  state: 'menu',   // menu | playing | gameOver | levelComplete
  level: 1,
  score: 0,
  coins: 0,
  lives: 3,
  time: 400,
  timeTick: 0,
  cam: 0,
  player: null,
  ground: [],
  platforms: [],
  pipes: [],
  enemies: [],
  collectibles: [],
  particles: [],
  deco: { clouds: [], hills: [] },
  levelLen: 0,
  flagX: 0,
  anim: 0,
};

// ============================================================
//  SPRITE DRAWING  (all canvas – no SVG files)
// ============================================================

function drawMario(x, y, w, h, frame, right, jumping) {
  ctx.save();
  if (!right) { ctx.translate(x + w, y); ctx.scale(-1, 1); x = 0; y = 0; }
  const s = w / 16;

  // hat
  ctx.fillStyle = '#E44030';
  ctx.fillRect(x + 3 * s, y, 10 * s, 3 * s);
  // hair
  ctx.fillStyle = '#6B3A00';
  ctx.fillRect(x + 2 * s, y + 3 * s, 3 * s, 2 * s);
  // face
  ctx.fillStyle = '#FFB89C';
  ctx.fillRect(x + 2 * s, y + 3 * s, 12 * s, 4 * s);
  // eye
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 10 * s, y + 4 * s, 2 * s, 2 * s);
  // nose
  ctx.fillStyle = '#FFB89C';
  ctx.fillRect(x + 12 * s, y + 5 * s, 2 * s, 2 * s);
  // mustache
  ctx.fillStyle = '#6B3A00';
  ctx.fillRect(x + 7 * s, y + 7 * s, 7 * s, s);

  // shirt
  ctx.fillStyle = '#E44030';
  ctx.fillRect(x + 3 * s, y + 8 * s, 10 * s, 2 * s);
  // overalls
  ctx.fillStyle = '#2038EC';
  ctx.fillRect(x + 3 * s, y + 9 * s, 10 * s, 5 * s);
  // straps
  ctx.fillRect(x + 4 * s, y + 8 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 10 * s, y + 8 * s, 2 * s, 2 * s);
  // buttons
  ctx.fillStyle = '#FCD848';
  ctx.fillRect(x + 6 * s, y + 10 * s, s, s);
  ctx.fillRect(x + 9 * s, y + 10 * s, s, s);

  // arms
  ctx.fillStyle = '#FFB89C';
  if (jumping) {
    ctx.fillRect(x, y + 5 * s, 3 * s, 3 * s);
    ctx.fillRect(x + 13 * s, y + 5 * s, 3 * s, 3 * s);
  } else {
    const ao = frame % 2 === 0 ? 0 : s;
    ctx.fillRect(x, y + 8 * s + ao, 3 * s, 3 * s);
    ctx.fillRect(x + 13 * s, y + 8 * s - ao, 3 * s, 3 * s);
  }

  // shoes
  ctx.fillStyle = '#6B3A00';
  if (jumping) {
    ctx.fillRect(x + 2 * s, y + 14 * s, 5 * s, 2 * s);
    ctx.fillRect(x + 9 * s, y + 14 * s, 5 * s, 2 * s);
  } else {
    const lo = frame % 2 === 0 ? 0 : s;
    ctx.fillRect(x + 2 * s, y + 14 * s + lo, 5 * s, 2 * s);
    ctx.fillRect(x + 9 * s, y + 14 * s - lo, 5 * s, 2 * s);
  }

  ctx.restore();
}

function drawGoomba(x, y, w, h, frame, squashed) {
  const s = w / 16;
  if (squashed) {
    ctx.fillStyle = '#C84C0C';
    ctx.fillRect(x + s, y + h - 4 * s, 14 * s, 4 * s);
    ctx.fillStyle = '#DC9048';
    ctx.fillRect(x + 2 * s, y + h - 4 * s, 12 * s, 2 * s);
    return;
  }
  // head
  ctx.fillStyle = '#DC9048';
  ctx.fillRect(x + 2 * s, y, 12 * s, 8 * s);
  ctx.fillRect(x, y + 2 * s, 16 * s, 4 * s);
  // brows
  ctx.fillStyle = '#C84C0C';
  ctx.fillRect(x + 2 * s, y + 2 * s, 5 * s, 2 * s);
  ctx.fillRect(x + 9 * s, y + 2 * s, 5 * s, 2 * s);
  // eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 3 * s, y + 4 * s, 4 * s, 3 * s);
  ctx.fillRect(x + 9 * s, y + 4 * s, 4 * s, 3 * s);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 5 * s, y + 5 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 9 * s, y + 5 * s, 2 * s, 2 * s);
  // body
  ctx.fillStyle = '#DC9048';
  ctx.fillRect(x + 3 * s, y + 8 * s, 10 * s, 5 * s);
  // feet
  ctx.fillStyle = '#000';
  const f = frame % 2 === 0 ? 0 : s;
  ctx.fillRect(x + s + f, y + 13 * s, 5 * s, 3 * s);
  ctx.fillRect(x + 10 * s - f, y + 13 * s, 5 * s, 3 * s);
}

function drawCoinSprite(x, y, sz, frame) {
  const widths = [1, 0.7, 0.3, 0.7];
  const w = sz * widths[frame % 4];
  const ox = x + (sz - w) / 2;
  ctx.fillStyle = '#FCB824';
  ctx.fillRect(ox, y, w, sz);
  if (w > sz * 0.4) {
    ctx.fillStyle = '#FDE894';
    ctx.fillRect(ox + w * 0.2, y + sz * 0.15, w * 0.3, sz * 0.7);
  }
}

function drawBrick(x, y) {
  ctx.fillStyle = '#C84C0C';
  ctx.fillRect(x, y, T, T);
  ctx.fillStyle = '#A0380C';
  ctx.fillRect(x, y + T / 2, T, 1);
  ctx.fillRect(x + T / 2, y, 1, T / 2);
  ctx.fillRect(x + T / 4, y + T / 2, 1, T / 2);
  ctx.fillRect(x + T * 3 / 4, y + T / 2, 1, T / 2);
  ctx.fillStyle = '#DC9048';
  ctx.fillRect(x + 1, y + 1, T - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, T / 2 - 1);
}

function drawQBlock(x, y, hit) {
  if (hit) {
    ctx.fillStyle = '#886644';
    ctx.fillRect(x, y, T, T);
    ctx.strokeStyle = '#664422';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, T - 4, T - 4);
    return;
  }
  ctx.fillStyle = '#DC9048';
  ctx.fillRect(x, y, T, T);
  ctx.strokeStyle = '#A06020';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, T - 4, T - 4);
  ctx.fillStyle = '#000';
  ctx.font = 'bold ' + (T * 0.55) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + T / 2, y + T / 2 + Math.sin(G.anim * 3) * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 3, y + 3, T / 3, T / 3);
}

function drawGroundTile(x, y, w, h) {
  ctx.fillStyle = '#C84C0C';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5ABD3C';
  ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = '#4AAD2C';
  ctx.fillRect(x, y + 6, w, 2);
}

function drawPipe(x, y, h) {
  const pw = T * 2;
  // body
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x + 4, y + T, pw - 8, h - T);
  // lip
  ctx.fillRect(x, y, pw, T);
  // dark edge
  ctx.fillStyle = '#007800';
  ctx.fillRect(x + pw - 6, y, 6, T);
  ctx.fillRect(x + pw - 10, y + T, 4, h - T);
  // highlight
  ctx.fillStyle = '#48D848';
  ctx.fillRect(x + 3, y, 6, T);
  ctx.fillRect(x + 7, y + T, 4, h - T);
}

function drawFlagPole(x, flagY) {
  const poleTop = T * 2;
  const poleH = GROUND_Y - poleTop;
  // pole
  ctx.fillStyle = '#aaa';
  ctx.fillRect(x + 14, poleTop, 4, poleH);
  // ball
  ctx.fillStyle = '#48D848';
  ctx.beginPath();
  ctx.arc(x + 16, poleTop, 6, 0, Math.PI * 2);
  ctx.fill();
  // flag
  const fy = flagY != null ? flagY : poleTop + 8;
  ctx.fillStyle = '#E44030';
  ctx.beginPath();
  ctx.moveTo(x + 18, fy);
  ctx.lineTo(x + 42, fy + 12);
  ctx.lineTo(x + 18, fy + 24);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(x, y, w) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const r = w / 4;
  ctx.beginPath();
  ctx.arc(x + r, y, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x + w / 2, y - r * 0.4, r, 0, Math.PI * 2);
  ctx.arc(x + w - r, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawHill(x, y, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w / 2, y - w * 0.35, x + w, y);
  ctx.closePath();
  ctx.fill();
}

// ============================================================
//  PARTICLES & FLOATING TEXT
// ============================================================
class Particle {
  constructor(x, y, vx, vy, life, color, sz) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.sz = sz;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.12;
    return --this.life > 0;
  }
  draw(cam) {
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - cam, this.y, this.sz, this.sz);
    ctx.globalAlpha = 1;
  }
}

class FloatText {
  constructor(x, y, text) {
    this.x = x; this.y = y; this.text = text; this.life = 35;
  }
  update() { this.y -= 1.2; return --this.life > 0; }
  draw(cam) {
    ctx.globalAlpha = this.life / 35;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x - cam, this.y);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.text, this.x - cam, this.y);
    ctx.globalAlpha = 1;
  }
}

function burst(x, y, n, color, spd) {
  for (let i = 0; i < n; i++)
    G.particles.push(new Particle(
      x, y, rand(-1, 1) * spd, rand(-2, -0.5) * spd,
      randInt(15, 30), color, randInt(2, 4)));
}

// ============================================================
//  PROCEDURAL LEVEL GENERATION
// ============================================================
function generateLevel(num) {
  const levelLen    = (80 + num * 25) * T;
  const gapChance   = Math.min(0.15 + num * 0.02, 0.35);
  const maxGap      = Math.min(2 + Math.floor(num / 3), 4);

  const ground    = [];
  const platforms = [];
  const coins     = [];
  const enemies   = [];
  const pipes     = [];
  const clouds    = [];
  const hills     = [];

  // --- always start with safe flat ground ---
  let cx = 0;
  ground.push({ x: 0, w: 10 * T });
  cx = 10 * T;

  while (cx < levelLen - 12 * T) {
    // maybe gap
    if (Math.random() < gapChance && cx > 12 * T) {
      const gw = randInt(2, maxGap) * T;
      const nc = Math.max(2, Math.floor(gw / T));
      for (let i = 0; i < nc; i++) {
        const frac = (i + 0.5) / nc;
        coins.push({
          x: cx + frac * gw - 8,
          y: GROUND_Y - 4 * T - Math.sin(frac * Math.PI) * 2 * T
        });
      }
      cx += gw;
    }

    // ground section
    const sw = randInt(6, 15) * T;
    ground.push({ x: cx, w: sw });

    // pipe
    if (Math.random() < 0.18 && sw > 5 * T) {
      const px = cx + randInt(2, Math.floor(sw / T) - 4) * T;
      const ph = randInt(2, 3) * T;
      let ok = true;
      for (const p of pipes) { if (Math.abs(p.x - px) < 3 * T) { ok = false; break; } }
      if (ok) pipes.push({ x: px, y: GROUND_Y - ph, h: ph });
    }

    // floating platforms
    if (Math.random() < 0.35) {
      const np = randInt(1, 2);
      for (let i = 0; i < np; i++) {
        const pw = randInt(3, 5) * T;
        const px = cx + randInt(0, Math.max(0, Math.floor((sw - pw) / T))) * T;
        const py = GROUND_Y - randInt(3, 4) * T;
        const type = Math.random() < 0.35 ? 'question' : 'brick';
        let ok = true;
        for (const p of pipes)
          if (px < p.x + T * 3 && px + pw > p.x - T) { ok = false; break; }
        for (const p of platforms)
          if (px < p.x + p.w + T && px + pw > p.x - T && Math.abs(py - p.y) < T * 2)
          { ok = false; break; }
        if (ok) {
          platforms.push({ x: px, y: py, w: pw, type: type, hit: false });
          const nc = randInt(1, Math.floor(pw / T));
          for (let j = 0; j < nc; j++)
            coins.push({ x: px + (j + 0.5) * (pw / nc) - 8, y: py - 1.5 * T });
          if (Math.random() < 0.25 && pw >= 3 * T)
            enemies.push({ x: px + T, y: py - 30 });
        }
      }
    }

    // ground enemies
    if (Math.random() < 0.3 + num * 0.05) {
      const ne = randInt(1, Math.min(1 + Math.floor(num / 2), 3));
      for (let i = 0; i < ne; i++) {
        const ex = cx + randInt(2, Math.floor(sw / T) - 3) * T;
        let ok = true;
        for (const p of pipes)
          if (Math.abs(ex - p.x) < 3 * T) { ok = false; break; }
        if (ok) enemies.push({ x: ex, y: GROUND_Y - 30 });
      }
    }
    cx += sw;
  }

  // --- end: flat ground + flag ---
  ground.push({ x: cx, w: 12 * T });
  const flagX = cx + 7 * T;

  // --- decorations ---
  for (let x = 0; x < cx + 12 * T; x += randInt(5, 12) * T)
    clouds.push({ x: x + rand(0, 4 * T), y: rand(30, 100), w: rand(60, 120), spd: rand(0.1, 0.3) });
  for (let x = 0; x < cx + 12 * T; x += randInt(8, 18) * T)
    hills.push({ x: x + rand(0, 6 * T), w: rand(120, 280), far: Math.random() < 0.5 });

  return { ground, platforms, pipes, coins, enemies, clouds, hills,
           length: cx + 12 * T, flagX };
}

// ============================================================
//  PLAYER
// ============================================================
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 32;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.canDJ = false;
    this.right = true;
    this.frame = 0; this.ftimer = 0;
    this.dead = false; this.deathT = 0;
    this.invince = 0;
    this.atFlag = false; this.flagPhase = '';
    this._jHeld = false;
  }

  update() {
    if (this.dead) {
      this.deathT++;
      if (this.deathT > 15) { this.vy += GRAV; this.y += this.vy; }
      return;
    }
    if (this.atFlag) { this._flagUpdate(); return; }

    // input
    const l = keys.ArrowLeft  || keys.KeyA || touch.left;
    const r = keys.ArrowRight || keys.KeyD || touch.right;
    const j = keys.Space || keys.ArrowUp || keys.KeyW || touch.jump;

    // horizontal movement with acceleration / deceleration
    if (l)       { this.vx = Math.max(this.vx - ACCEL, -SPEED); this.right = false; }
    else if (r)  { this.vx = Math.min(this.vx + ACCEL,  SPEED); this.right = true; }
    else {
      if      (this.vx > 0) this.vx = Math.max(0, this.vx - DECEL);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + DECEL);
    }

    // gravity
    this.vy = Math.min(this.vy + GRAV, MAXFALL);

    // move
    this.x += this.vx;
    this.y += this.vy;

    // bounds
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x > G.levelLen - this.w) this.x = G.levelLen - this.w;

    // collisions
    this.onGround = false;
    this._collideWorld();

    // jump
    if (j && !this._jHeld) {
      if (this.onGround) {
        this.vy = JUMP; this.onGround = false; this.canDJ = true;
        sfx('jump');
      } else if (this.canDJ) {
        this.vy = DJUMP; this.canDJ = false;
        sfx('jump');
        burst(this.x + this.w / 2, this.y + this.h, 4, '#fff', 1);
      }
    }
    this._jHeld = j;

    // fall death
    if (this.y > H + 50) this.die();

    if (this.invince > 0) this.invince--;

    // animation
    this.ftimer++;
    if (Math.abs(this.vx) > 0.5 && this.onGround) {
      if (this.ftimer > 5) { this.ftimer = 0; this.frame = (this.frame + 1) % 4; }
    } else if (!this.onGround) {
      this.frame = 1;
    } else {
      this.frame = 0; this.ftimer = 0;
    }
  }

  _flagUpdate() {
    if (this.flagPhase === 'slide') {
      this.x = G.flagX + 6;
      if (this.y < GROUND_Y - this.h) this.y += 3;
      else { this.y = GROUND_Y - this.h; this.flagPhase = 'walk'; this.right = true; }
    } else if (this.flagPhase === 'walk') {
      this.x += 2;
      this.ftimer++;
      if (this.ftimer > 5) { this.ftimer = 0; this.frame = (this.frame + 1) % 4; }
    }
  }

  _collideWorld() {
    // --- ground segments ---
    for (const s of G.ground) {
      if (this.x + this.w > s.x && this.x < s.x + s.w) {
        if (this.y + this.h > GROUND_Y) {
          if (this.vy > 4) burst(this.x + this.w / 2, GROUND_Y, 3, '#C8A070', 0.8);
          this.y = GROUND_Y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }

    // --- platforms (one-way: land on top / bump from below) ---
    for (const p of G.platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        const prevBot = this.y + this.h - this.vy;
        const prevTop = this.y - this.vy;

        if (this.vy > 0 && this.y + this.h > p.y && prevBot <= p.y + 6) {
          if (this.vy > 4) burst(this.x + this.w / 2, p.y, 2, '#C8A070', 0.6);
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0 && this.y < p.y + T && prevTop >= p.y + T - 6) {
          this.y = p.y + T;
          this.vy = 1;
          if (p.type === 'question' && !p.hit) {
            p.hit = true;
            G.score += 100; G.coins++;
            sfx('coin');
            burst(p.x + p.w / 2, p.y, 5, '#FCB824', 2);
            G.particles.push(new FloatText(p.x + p.w / 2, p.y - 10, '+100'));
          } else {
            sfx('bump');
          }
        }
      }
    }

    // --- pipes (full solid collision, previous-position based) ---
    for (const pipe of G.pipes) {
      const pw = T * 2;
      if (!(this.x + this.w > pipe.x && this.x < pipe.x + pw &&
            this.y + this.h > pipe.y && this.y < pipe.y + pipe.h)) continue;

      const prevBot   = this.y + this.h - this.vy;
      const prevTop   = this.y - this.vy;
      const prevRight = this.x + this.w - this.vx;
      const prevLeft  = this.x - this.vx;

      if (prevBot <= pipe.y + 4 && this.vy >= 0) {
        this.y = pipe.y - this.h; this.vy = 0; this.onGround = true;
      } else if (prevTop >= pipe.y + pipe.h - 4 && this.vy < 0) {
        this.y = pipe.y + pipe.h; this.vy = 0;
      } else if (prevRight <= pipe.x + 4 && this.vx > 0) {
        this.x = pipe.x - this.w; this.vx = 0;
      } else if (prevLeft >= pipe.x + pw - 4 && this.vx < 0) {
        this.x = pipe.x + pw; this.vx = 0;
      } else {
        // fallback: minimum overlap
        const ol = this.x + this.w - pipe.x;
        const or_ = pipe.x + pw - this.x;
        const ot = this.y + this.h - pipe.y;
        const ob = pipe.y + pipe.h - this.y;
        const m = Math.min(ol, or_, ot, ob);
        if      (m === ot) { this.y = pipe.y - this.h; this.vy = 0; this.onGround = true; }
        else if (m === ob) { this.y = pipe.y + pipe.h; this.vy = 0; }
        else if (m === ol) { this.x = pipe.x - this.w; this.vx = 0; }
        else               { this.x = pipe.x + pw;     this.vx = 0; }
      }
    }
  }

  die() {
    if (this.dead || this.invince > 0) return;
    this.dead = true; this.vy = -10; this.vx = 0;
    sfx('die');
  }

  draw(cam) {
    if (this.invince > 0 && Math.floor(this.invince / 3) % 2 === 0) return;
    drawMario(this.x - cam, this.y, this.w, this.h,
              this.frame, this.right, !this.onGround && !this.atFlag);
  }
}

// ============================================================
//  ENEMY (Goomba)
// ============================================================
class Goomba {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 28;
    this.vx = ENEMY_SPD * (Math.random() < 0.5 ? 1 : -1);
    this.vy = 0;
    this.alive = true;
    this.squashed = false; this.sqT = 0;
    this.frame = 0; this.ftimer = 0;
  }

  update() {
    if (this.squashed) { this.sqT++; return this.sqT < 25; }
    if (!this.alive) return false;

    this.vy = Math.min(this.vy + GRAV, MAXFALL);
    this.x += this.vx;
    this.y += this.vy;

    // ground
    for (const s of G.ground) {
      if (this.x + this.w > s.x && this.x < s.x + s.w) {
        if (this.y + this.h > GROUND_Y) {
          this.y = GROUND_Y - this.h; this.vy = 0;
          if (this.x <= s.x + 4) this.vx = Math.abs(this.vx);
          if (this.x + this.w >= s.x + s.w - 4) this.vx = -Math.abs(this.vx);
        }
      }
    }

    // platforms
    for (const p of G.platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        const prevBot = this.y + this.h - this.vy;
        if (this.vy > 0 && this.y + this.h > p.y && prevBot <= p.y + 6) {
          this.y = p.y - this.h; this.vy = 0;
          if (this.x <= p.x + 4) this.vx = Math.abs(this.vx);
          if (this.x + this.w >= p.x + p.w - 4) this.vx = -Math.abs(this.vx);
        }
      }
    }

    // pipes
    for (const p of G.pipes) {
      const pw = T * 2;
      if (this.x + this.w > p.x && this.x < p.x + pw && this.y + this.h > p.y) {
        if (this.vx > 0) this.vx = -Math.abs(this.vx);
        else              this.vx =  Math.abs(this.vx);
      }
    }

    if (this.y > H + 100) return false;

    this.ftimer++;
    if (this.ftimer > 12) { this.ftimer = 0; this.frame = (this.frame + 1) % 2; }
    return true;
  }

  stomp() { this.alive = false; this.squashed = true; return 100; }

  draw(cam) {
    drawGoomba(this.x - cam - 2, this.y - 2, 32, 32, this.frame, this.squashed);
  }
}

// ============================================================
//  COIN ENTITY
// ============================================================
class CoinEntity {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 16; this.h = 16;
    this.baseY = y; this.t = Math.random() * Math.PI * 2;
    this.collected = false;
  }
  update() {
    this.t += 0.06;
    this.y = this.baseY + Math.sin(this.t) * 3;
    return !this.collected;
  }
  draw(cam) {
    if (this.collected) return;
    drawCoinSprite(this.x - cam, this.y, 16, Math.floor(this.t * 1.5) % 4);
  }
}

// ============================================================
//  GAME FUNCTIONS
// ============================================================
function startLevel(n) {
  G.level = n;
  G.state = 'playing';
  G.time = 400; G.timeTick = 0;
  G.particles = [];
  G.anim = 0;

  const lv = generateLevel(n);
  G.ground     = lv.ground;
  G.platforms  = lv.platforms;
  G.pipes      = lv.pipes;
  G.deco       = { clouds: lv.clouds, hills: lv.hills };
  G.levelLen   = lv.length;
  G.flagX      = lv.flagX;
  G.enemies    = lv.enemies.map(e => new Goomba(e.x, e.y));
  G.collectibles = lv.coins.map(c => new CoinEntity(c.x, c.y));
  G.player     = new Player(3 * T, GROUND_Y - 40);
  G.cam        = 0;
}

function resetGame() {
  G.score = 0; G.coins = 0; G.lives = 3;
  startLevel(1);
}

// ============================================================
//  UPDATE
// ============================================================
function update() {
  if (G.state !== 'playing') return;

  const p = G.player;
  G.anim += 1 / 60;

  // timer
  if (!p.dead && !p.atFlag) {
    G.timeTick++;
    if (G.timeTick >= 60) { G.timeTick = 0; G.time--; if (G.time <= 0) p.die(); }
  }

  p.update();

  // death → lose life
  if (p.dead && p.y > H + 100) {
    G.lives--;
    if (G.lives <= 0) { G.state = 'gameOver'; }
    else startLevel(G.level);
    return;
  }

  // flag
  if (!p.dead && !p.atFlag && p.x + p.w >= G.flagX) {
    p.atFlag = true; p.flagPhase = 'slide'; p.vx = 0; p.vy = 0;
    sfx('clear');
    G.score += G.time * 10;
  }
  if (p.atFlag && p.flagPhase === 'walk' && p.x > G.flagX + 180) {
    G.state = 'levelComplete';
  }

  // camera
  if (!p.dead) {
    const target = p.x - W / 3;
    G.cam = lerp(G.cam, target, 0.08);
    G.cam = clamp(G.cam, 0, Math.max(0, G.levelLen - W));
  }

  const vl = G.cam - 100;
  const vr = G.cam + W + 100;

  // enemies
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.x < vl - 200 || e.x > vr + 200) continue;
    if (!e.update()) { G.enemies.splice(i, 1); continue; }

    if (e.alive && !p.dead && !p.atFlag && p.invince <= 0) {
      if (p.x + p.w > e.x && p.x < e.x + e.w &&
          p.y + p.h > e.y && p.y < e.y + e.h) {
        const prevBot = p.y + p.h - p.vy;
        if (p.vy > 0 && prevBot <= e.y + 8) {
          G.score += e.stomp();
          p.vy = -8; p.canDJ = true;
          sfx('stomp');
          burst(e.x + e.w / 2, e.y + e.h / 2, 6, '#DC9048', 2);
          G.particles.push(new FloatText(e.x + e.w / 2, e.y, '+100'));
        } else {
          p.die();
        }
      }
    }
  }

  // coins
  for (let i = G.collectibles.length - 1; i >= 0; i--) {
    const c = G.collectibles[i];
    if (c.x < vl || c.x > vr) continue;
    c.update();
    if (!c.collected && !p.dead && !p.atFlag) {
      if (p.x + p.w > c.x && p.x < c.x + c.w &&
          p.y + p.h > c.y && p.y < c.y + c.h) {
        c.collected = true; G.score += 50; G.coins++;
        sfx('coin');
        burst(c.x + c.w / 2, c.y + c.h / 2, 4, '#FCB824', 1.5);
        G.particles.push(new FloatText(c.x + c.w / 2, c.y, '+50'));
      }
    }
    if (c.collected) G.collectibles.splice(i, 1);
  }

  // particles
  for (let i = G.particles.length - 1; i >= 0; i--)
    if (!G.particles[i].update()) G.particles.splice(i, 1);
}

// ============================================================
//  RENDER
// ============================================================
function render() {
  const cam = G.cam;

  // sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#5C94FC'); sky.addColorStop(1, '#A4C8FD');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // hills far
  for (const h of G.deco.hills) {
    if (!h.far) continue;
    const hx = h.x - cam * 0.2;
    if (hx + h.w > -50 && hx < W + 50) drawHill(hx, GROUND_Y, h.w, '#7BC850');
  }
  // hills near
  for (const h of G.deco.hills) {
    if (h.far) continue;
    const hx = h.x - cam * 0.5;
    if (hx + h.w > -50 && hx < W + 50) drawHill(hx, GROUND_Y, h.w, '#5ABD3C');
  }
  // clouds
  for (const c of G.deco.clouds) {
    const cx = c.x - cam * 0.15;
    if (cx + c.w > -20 && cx < W + 20) drawCloud(cx, c.y, c.w);
  }

  // ground
  for (const s of G.ground) {
    const gx = s.x - cam;
    if (gx + s.w > 0 && gx < W) drawGroundTile(gx, GROUND_Y, s.w, H - GROUND_Y);
  }
  // pipes
  for (const p of G.pipes) {
    const px = p.x - cam;
    if (px + T * 2 > 0 && px < W) drawPipe(px, p.y, p.h);
  }
  // platforms
  for (const p of G.platforms) {
    const px = p.x - cam;
    if (px + p.w > 0 && px < W) {
      const n = Math.floor(p.w / T);
      for (let i = 0; i < n; i++) {
        if (p.type === 'question') drawQBlock(px + i * T, p.y, p.hit);
        else drawBrick(px + i * T, p.y);
      }
    }
  }

  // flag pole
  const fx = G.flagX - cam;
  if (fx > -50 && fx < W + 50) {
    let flagSlideY = null;
    const pl = G.player;
    if (pl.atFlag) flagSlideY = pl.flagPhase === 'slide' ? pl.y : GROUND_Y - 28;
    drawFlagPole(fx, flagSlideY);
  }

  // coins
  for (const c of G.collectibles) {
    const cx = c.x - cam;
    if (cx > -20 && cx < W + 20) c.draw(cam);
  }
  // enemies
  for (const e of G.enemies) {
    const ex = e.x - cam;
    if (ex > -40 && ex < W + 40) e.draw(cam);
  }
  // player
  G.player.draw(cam);
  // particles
  for (const pt of G.particles) pt.draw(cam);

  renderHUD();
}

// ============================================================
//  HUD
// ============================================================
function renderHUD() {
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textBaseline = 'top';

  function label(str, x, y, align) {
    ctx.textAlign = align || 'left';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(str, x, y);
  }

  label('SCORE',  20, 10);
  label(String(G.score).padStart(6, '0'), 20, 28);

  label('COINS',  160, 10);
  label('x' + G.coins, 160, 28);

  label('WORLD',  W / 2, 10, 'center');
  label('1-' + G.level, W / 2, 28, 'center');

  label('TIME',   W - 100, 10, 'center');
  label(String(G.time), W - 100, 28, 'center');

  label('LIVES',  W - 20, 10, 'right');
  label('x' + G.lives, W - 20, 28, 'right');
}

// ============================================================
//  SCREENS
// ============================================================
function renderMenu() {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#5C94FC'); sky.addColorStop(1, '#A4C8FD');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawCloud(60, 70, 100);
  drawCloud(320, 45, 80);
  drawCloud(580, 85, 110);
  drawHill(50, GROUND_Y, 200, '#7BC850');
  drawHill(400, GROUND_Y, 300, '#5ABD3C');
  drawGroundTile(0, GROUND_Y, W, H - GROUND_Y);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // title shadow + title
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.fillStyle = '#000';
  ctx.fillText('SUPER MARIO', W / 2 + 3, 143);
  ctx.fillStyle = '#E44030';
  ctx.fillText('SUPER MARIO', W / 2, 140);

  // subtitle
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.strokeText('~ RANDOM WORLDS ~', W / 2, 180);
  ctx.fillStyle = '#FCD848';
  ctx.fillText('~ RANDOM WORLDS ~', W / 2, 180);

  // blink prompt
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeText('PRESS SPACE TO START', W / 2, 260);
    ctx.fillStyle = '#fff';
    ctx.fillText('PRESS SPACE TO START', W / 2, 260);
  }

  // controls
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ['Arrow Keys / WASD - Move', 'Space / Up - Jump',
   'Double Jump in mid-air!'].forEach((t, i) => {
    ctx.strokeText(t, W / 2, 310 + i * 22);
    ctx.fillText(t, W / 2, 310 + i * 22);
  });

  // mini Mario
  drawMario(W / 2 - 16, GROUND_Y - 38, 32, 38,
            Math.floor(Date.now() / 200) % 4, true, false);
}

function renderGameOver() {
  render();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.font = 'bold 44px "Courier New", monospace';
  ctx.fillStyle = '#E44030';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('FINAL SCORE: ' + G.score, W / 2, H / 2 + 10);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = '15px "Courier New", monospace';
    ctx.fillText('PRESS SPACE TO RESTART', W / 2, H / 2 + 55);
  }
}

function renderLevelComplete() {
  render();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.font = 'bold 40px "Courier New", monospace';
  ctx.fillStyle = '#48D848';
  ctx.fillText('WORLD 1-' + G.level + ' CLEAR!', W / 2, H / 2 - 50);

  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('SCORE: ' + G.score, W / 2, H / 2);
  ctx.fillText('TIME BONUS: +' + G.time * 10, W / 2, H / 2 + 28);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = '15px "Courier New", monospace';
    ctx.fillText('PRESS SPACE FOR NEXT WORLD', W / 2, H / 2 + 75);
  }
}

// ============================================================
//  MAIN LOOP  (fixed-timestep)
// ============================================================
let lastTs = 0;
let acc = 0;
const STEP = 1000 / 60;

function loop(ts) {
  if (!lastTs) lastTs = ts;
  let dt = ts - lastTs;
  lastTs = ts;
  if (dt > 100) dt = 100; // cap to avoid spiral of death

  acc += dt;
  while (acc >= STEP) { update(); acc -= STEP; }

  ctx.clearRect(0, 0, W, H);

  switch (G.state) {
    case 'menu':          renderMenu();          break;
    case 'playing':       render();              break;
    case 'gameOver':      renderGameOver();      break;
    case 'levelComplete': renderLevelComplete(); break;
  }

  requestAnimationFrame(loop);
}

// ============================================================
//  TOUCH CONTROLS  (created once)
// ============================================================
function setupTouch() {
  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                   .test(navigator.userAgent) || ('ontouchstart' in window);
  if (!mobile) return;

  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:20px;left:0;width:100%;display:flex;' +
    'justify-content:space-between;padding:0 24px;box-sizing:border-box;z-index:10;pointer-events:none;';

  function btn(txt) {
    const b = document.createElement('button');
    b.textContent = txt;
    b.style.cssText = 'width:60px;height:60px;font-size:26px;' +
      'background:rgba(255,255,255,0.35);border:2px solid rgba(255,255,255,0.5);' +
      'border-radius:50%;pointer-events:auto;touch-action:none;color:#333;' +
      'font-weight:bold;user-select:none;-webkit-user-select:none;';
    return b;
  }

  const lb = btn('\u2190'), rb = btn('\u2192'), jb = btn('\u2191');
  const md = document.createElement('div');
  md.style.cssText = 'display:flex;gap:16px;';
  md.append(lb, rb);
  div.append(md, jb);
  document.body.appendChild(div);

  const act = () => { initAudio(); if (G.state !== 'playing') onAction('Space'); };

  lb.addEventListener('touchstart', e => { e.preventDefault(); touch.left  = true;  act(); });
  lb.addEventListener('touchend',   e => { e.preventDefault(); touch.left  = false; });
  rb.addEventListener('touchstart', e => { e.preventDefault(); touch.right = true;  act(); });
  rb.addEventListener('touchend',   e => { e.preventDefault(); touch.right = false; });
  jb.addEventListener('touchstart', e => { e.preventDefault(); touch.jump  = true;  act(); });
  jb.addEventListener('touchend',   e => { e.preventDefault(); touch.jump  = false; });

  canvas.addEventListener('touchstart', e => { e.preventDefault(); act(); });
}

// ============================================================
//  START
// ============================================================
setupTouch();
requestAnimationFrame(loop);

})();
