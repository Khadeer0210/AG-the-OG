/**
 * LIVING FIREFLY FIELD · COSMIC EMERALD SWARM AMBIENT MODULE
 * Self-contained Vanilla JS IIFE
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // Config Object
  window.FIREFLY_CONFIG = Object.assign({
    density: 18000,
    maxCount: 110,
    minCount: 26,
    mobileMax: 34,
    canvasOpacity: 0.9,
    dprCap: 2,
    speeds: { wander: [14, 40], dart: [130, 190], dartTime: [0.25, 0.7] },
    forces: {
      wander: 1.0,
      separation: 0.55,
      cohesion: 0.10,
      walls: 0.80,
      cursorShy: 0.30,
      cursorRadius: 120,
      sepRadius: 26,
      cohRadius: 130,
      wallMargin: 70
    },
    blink: {
      period: [2.5, 9],
      attack: [0.15, 0.25],
      hold: [0.12, 0.45],
      decay: [0.6, 1.2],
      dim: [0.06, 0.16],
      peak: [0.5, 0.85]
    },
    perch: { duration: [4, 14], edgeInset: [2, 8], energyTrigger: 0.3 },
    chorus: { interval: [18, 36], participation: [0.3, 0.6], window: 0.5 },
    layer: "behind"
  }, window.FIREFLY_CONFIG || {});

  const CFG = window.FIREFLY_CONFIG;

  // Helper Randoms
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Canvas & Context Setup
  let canvas = document.getElementById('firefly-field');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'firefly-field';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('tabindex', '-1');
    const firstLayer = document.body ? document.body.firstChild : null;
    if (firstLayer && document.body) {
      document.body.insertBefore(canvas, firstLayer);
    } else if (document.body) {
      document.body.appendChild(canvas);
    }
  }

  // Inject Styles
  const styleId = 'firefly-field-styles';
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.textContent = `
      #firefly-field {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        user-select: none !important;
        z-index: 0 !important;
        opacity: ${CFG.canvasOpacity} !important;
      }
      header, nav, main, section, article, aside, footer, .modal, .menu, dialog, [class*="overlay"] {
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(styleTag);
  }

  let ctx = null;
  try {
    ctx = canvas.getContext('2d', { alpha: true });
  } catch (e) {
    return; // Silent fail gracefully
  }
  if (!ctx) return;

  // Pre-rendered Sprites (Emerald, Teal, Lime)
  const sprites = {};
  const PALETTES = {
    emerald: { core: '#f0fff7', glow: '#00ff9d', deep: '#00c878' },
    teal:    { core: '#f0fff7', glow: '#00ffd0', deep: '#00a390' },
    lime:    { core: '#f0fff7', glow: '#aaff66', deep: '#77cc33' }
  };

  function createGlowSprite(colorKey) {
    const size = 96;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const octx = offCanvas.getContext('2d');
    const center = size / 2;
    const rad = size / 2;

    const pal = PALETTES[colorKey] || PALETTES.emerald;
    const grad = octx.createRadialGradient(center, center, 0, center, center, rad);
    grad.addColorStop(0.00, 'rgba(240, 255, 247, 1.0)');
    grad.addColorStop(0.18, pal.glow + 'd9');
    grad.addColorStop(0.42, pal.glow + '52');
    grad.addColorStop(0.70, pal.deep + '1a');
    grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(center, center, rad, 0, Math.PI * 2);
    octx.fill();

    return offCanvas;
  }

  sprites.emerald = createGlowSprite('emerald');
  sprites.teal    = createGlowSprite('teal');
  sprites.lime    = createGlowSprite('lime');

  // Pointer state (passive)
  let mouse = { x: -9999, y: -9999 };
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

  // Viewport Dimensions
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap);

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
  }

  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      resizeCanvas();
      initAgents();
    }, 200);
  }, { passive: true });

  resizeCanvas();

  // Agent Class
  class Firefly {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = rand(20, width - 20);
      this.y = rand(20, height - 20);
      this.vx = rand(-15, 15);
      this.vy = rand(-15, 15);

      // Depth 0.5, 0.75, or 1.0
      this.depth = randItem([0.5, 0.75, 1.0]);

      this.coreSize = rand(0.7, 1.6) * this.depth;
      this.glowRadius = rand(9, 24) * this.depth;

      // Hue variant (76% emerald, 12% teal, 12% lime)
      const roll = Math.random();
      this.hue = roll < 0.76 ? 'emerald' : roll < 0.88 ? 'teal' : 'lime';

      // Personality
      this.curiosity   = Math.random();
      this.timidity    = Math.random();
      this.sociability = Math.random();
      this.laziness    = Math.random();

      // Energy
      this.energy = rand(0.7, 1.0);

      // Noise seed & timing
      this.noiseSeed = Math.random() * 1000;
      this.bobPhase  = Math.random() * Math.PI * 2;
      this.bobFreq   = rand(1.5, 3.5);

      // State machine
      this.state = 'WANDER';
      this.stateTimer = rand(2, 6);
      this.perchTarget = null;
      this.prevX = this.x;
      this.prevY = this.y;

      // Photobiology Blink Engine
      this.blinkPeriod = rand(CFG.blink.period[0], CFG.blink.period[1]);
      this.blinkTimer  = Math.random() * this.blinkPeriod;
      this.attackTime  = rand(CFG.blink.attack[0], CFG.blink.attack[1]);
      this.holdTime    = rand(CFG.blink.hold[0], CFG.blink.hold[1]);
      this.decayTime   = rand(CFG.blink.decay[0], CFG.blink.decay[1]);
      this.dimBase     = rand(CFG.blink.dim[0], CFG.blink.dim[1]);
      this.peakAlpha   = rand(CFG.blink.peak[0], CFG.blink.peak[1]);
      this.brightness  = this.dimBase;
      this.envelope    = 0;
    }

    update(dt, t, globalMood, agents) {
      this.prevX = this.x;
      this.prevY = this.y;

      this.stateTimer -= dt;

      // Energy metabolism
      if (this.state === 'DART') {
        this.energy = Math.max(0, this.energy - 0.05 * dt);
      } else if (this.state === 'HOVER') {
        this.energy = Math.min(1.0, this.energy + 0.05 * dt);
      } else if (this.state === 'PERCH') {
        this.energy = Math.min(1.0, this.energy + 0.09 * dt);
      } else {
        this.energy = Math.max(0, this.energy - 0.012 * dt);
      }

      // Energy trigger perch-seeking
      if (this.energy <= CFG.perch.energyTrigger && this.state !== 'PERCH') {
        this.enterPerchState();
      }

      // State transitions
      if (this.stateTimer <= 0) {
        if (this.state === 'PERCH') {
          this.state = 'WANDER';
          this.vx = rand(-30, 30);
          this.vy = rand(-50, -20);
          this.stateTimer = rand(3, 7);
        } else if (this.state === 'HOVER') {
          this.state = 'WANDER';
          this.stateTimer = rand(3, 8);
        } else if (this.state === 'DART') {
          this.state = 'WANDER';
          this.stateTimer = rand(2, 6);
        } else {
          if (Math.random() < 0.25 + 0.35 * this.laziness) {
            this.state = 'HOVER';
            this.stateTimer = rand(1, 4);
          } else if (Math.random() < 0.2 + 0.3 * this.curiosity) {
            this.state = 'DART';
            const angle = Math.random() * Math.PI * 2;
            const dartSpd = rand(CFG.speeds.dart[0], CFG.speeds.dart[1]) * this.depth;
            this.vx = Math.cos(angle) * dartSpd;
            this.vy = Math.sin(angle) * dartSpd;
            this.stateTimer = rand(CFG.speeds.dartTime[0], CFG.speeds.dartTime[1]);
          } else if (Math.random() < 0.15) {
            this.enterPerchState();
          } else {
            this.stateTimer = rand(2, 6);
          }
        }
      }

      // Startled by cursor
      if (this.state === 'HOVER') {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        if (Math.hypot(dx, dy) < 80) {
          this.state = 'DART';
          const angle = Math.atan2(dy, dx);
          const dartSpd = rand(CFG.speeds.dart[0], CFG.speeds.dart[1]);
          this.vx = Math.cos(angle) * dartSpd;
          this.vy = Math.sin(angle) * dartSpd;
          this.stateTimer = rand(0.3, 0.6);
        }
      }

      // Steering Forces
      let fx = 0;
      let fy = 0;

      if (this.state === 'PERCH' && this.perchTarget) {
        const dx = this.perchTarget.x - this.x;
        const dy = this.perchTarget.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const maxSpd = 60 * this.depth;
          const desiredSpd = dist < 80 ? (dist / 80) * maxSpd : maxSpd;
          fx += (dx / dist) * desiredSpd - this.vx;
          fy += (dy / dist) * desiredSpd - this.vy;
        } else {
          this.vx = (Math.random() - 0.5) * 0.8;
          this.vy = (Math.random() - 0.5) * 0.8;
        }
      } else if (this.state === 'HOVER') {
        this.vx *= 0.85;
        this.vy *= 0.85;
        fx += (Math.random() - 0.5) * 12;
        fy += (Math.random() - 0.5) * 12;
      } else {
        // Wander noise
        const nAngle = (Math.sin(t * 0.8 + this.noiseSeed) + Math.cos(t * 0.3 + this.noiseSeed * 0.5)) * Math.PI * 2;
        const wanderSpd = rand(CFG.speeds.wander[0], CFG.speeds.wander[1]) * globalMood * this.depth;
        fx += Math.cos(nAngle) * wanderSpd * CFG.forces.wander;
        fy += Math.sin(nAngle) * wanderSpd * CFG.forces.wander;

        // Separation & Cohesion
        let sepX = 0, sepY = 0, sepCount = 0;
        let cohX = 0, cohY = 0, cohCount = 0;

        for (let i = 0; i < agents.length; i++) {
          const other = agents[i];
          if (other === this) continue;
          const dx = this.x - other.x;
          const dy = this.y - other.y;
          const d = Math.hypot(dx, dy);

          if (d > 0 && d < CFG.forces.sepRadius) {
            sepX += (dx / d) * (CFG.forces.sepRadius - d);
            sepY += (dy / d) * (CFG.forces.sepRadius - d);
            sepCount++;
          }
          if (d < CFG.forces.cohRadius) {
            cohX += other.x;
            cohY += other.y;
            cohCount++;
          }
        }

        if (sepCount > 0) {
          fx += (sepX / sepCount) * CFG.forces.separation * 8;
          fy += (sepY / sepCount) * CFG.forces.separation * 8;
        }

        if (cohCount > 0 && this.sociability > 0.4) {
          const centerX = cohX / cohCount;
          const centerY = cohY / cohCount;
          fx += (centerX - this.x) * CFG.forces.cohesion * 0.05 * this.sociability;
          fy += (centerY - this.y) * CFG.forces.cohesion * 0.05 * this.sociability;
        }

        // Soft Wall Repulsion
        const margin = CFG.forces.wallMargin;
        if (this.x < margin) fx += (margin - this.x) * CFG.forces.walls * 2;
        if (this.x > width - margin) fx -= (this.x - (width - margin)) * CFG.forces.walls * 2;
        if (this.y < margin) fy += (margin - this.y) * CFG.forces.walls * 2;
        if (this.y > height - margin) fy -= (this.y - (height - margin)) * CFG.forces.walls * 2;

        // Cursor Avoidance
        const mdx = this.x - mouse.x;
        const mdy = this.y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < CFG.forces.cursorRadius && this.timidity > 0.3) {
          const push = (CFG.forces.cursorRadius - mdist) / CFG.forces.cursorRadius;
          fx += (mdx / mdist) * push * 160 * CFG.forces.cursorShy * this.timidity;
          fy += (mdy / mdist) * push * 160 * CFG.forces.cursorShy * this.timidity;
        }
      }

      // Physics Integration
      const maxForce = 50;
      const fMag = Math.hypot(fx, fy);
      if (fMag > maxForce) {
        fx = (fx / fMag) * maxForce;
        fy = (fy / fMag) * maxForce;
      }

      this.vx += fx * dt;
      this.vy += fy * dt;

      const damping = Math.pow(0.98, dt * 60);
      this.vx *= damping;
      this.vy *= damping;

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.x = Math.max(4, Math.min(width - 4, this.x));
      this.y = Math.max(4, Math.min(height - 4, this.y));

      // Photobiology Blink Engine calculation
      this.blinkTimer += dt;
      if (this.blinkTimer >= this.blinkPeriod) {
        this.blinkTimer = 0;
        this.energy = Math.max(0, this.energy - rand(0.04, 0.07));
      }

      const bt = this.blinkTimer;
      const totalBlinkTime = this.attackTime + this.holdTime + this.decayTime;

      if (bt < this.attackTime) {
        const progress = bt / this.attackTime;
        this.envelope = progress * progress;
      } else if (bt < this.attackTime + this.holdTime) {
        const flicker = 1 + (Math.random() - 0.5) * 0.1;
        this.envelope = Math.min(1.0, 1.0 * flicker);
      } else if (bt < totalBlinkTime) {
        const progress = (bt - this.attackTime - this.holdTime) / this.decayTime;
        this.envelope = Math.pow(1 - progress, 2);
      } else {
        this.envelope = 0;
      }

      this.brightness = this.dimBase + this.envelope * this.peakAlpha * (0.5 + 0.5 * this.energy);
    }

    enterPerchState() {
      this.state = 'PERCH';
      this.stateTimer = rand(CFG.perch.duration[0], CFG.perch.duration[1]);
      const side = randItem(['top', 'bottom', 'left', 'right']);
      const inset = rand(CFG.perch.edgeInset[0], CFG.perch.edgeInset[1]);
      let tx = this.x, ty = this.y;
      if (side === 'top') { ty = inset; tx = rand(20, width - 20); }
      else if (side === 'bottom') { ty = height - inset; tx = rand(20, width - 20); }
      else if (side === 'left') { tx = inset; ty = rand(20, height - 20); }
      else { tx = width - inset; ty = rand(20, height - 20); }
      this.perchTarget = { x: tx, y: ty };
    }

    triggerChorusBlink() {
      this.blinkTimer = 0;
      this.envelope = 1.0;
    }

    draw(ctx, t) {
      const renderY = this.y + Math.sin(t * this.bobFreq + this.bobPhase) * (1.8 * this.depth);
      const renderX = this.x;

      // 1. Fast movement streak (>90 px/s)
      const spd = Math.hypot(this.vx, this.vy);
      if (spd > 90) {
        ctx.strokeStyle = PALETTES[this.hue].glow;
        ctx.globalAlpha = 0.08;
        ctx.lineWidth = this.coreSize;
        ctx.beginPath();
        ctx.moveTo(this.prevX, this.prevY);
        ctx.lineTo(renderX, renderY);
        ctx.stroke();
      }

      // 2. Pre-rendered Glow Sprite
      const sprite = sprites[this.hue] || sprites.emerald;
      const currentRadius = this.glowRadius * (0.6 + 0.4 * this.envelope);
      const drawSize = currentRadius * 2;

      ctx.globalAlpha = Math.min(0.85, this.brightness);
      ctx.drawImage(
        sprite,
        renderX - currentRadius,
        renderY - currentRadius,
        drawSize,
        drawSize
      );

      // 3. Core Ember Dot
      ctx.fillStyle = PALETTES[this.hue].core;
      ctx.globalAlpha = Math.min(0.9, this.brightness * 1.2);
      ctx.beginPath();
      ctx.arc(renderX, renderY, this.coreSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Population Setup
  let agents = [];
  function getPopulationCount() {
    const isMobile = width <= 700 || window.matchMedia('(pointer: coarse)').matches;
    if (isMobile) {
      return Math.min(CFG.mobileMax, Math.max(18, Math.round((width * height) / CFG.density)));
    }
    return Math.min(CFG.maxCount, Math.max(CFG.minCount, Math.round((width * height) / CFG.density)));
  }

  function initAgents() {
    const count = getPopulationCount();
    agents = [];
    for (let i = 0; i < count; i++) {
      agents.push(new Firefly());
    }
  }

  initAgents();

  let chorusTimer = rand(CFG.chorus.interval[0], CFG.chorus.interval[1]);
  let lastTime = performance.now();
  let animFrameId = null;
  let isPaused = false;

  function renderFrame(now) {
    if (isPaused) return;

    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.033) dt = 0.033;

    const t = now / 1000;
    const globalMood = 0.8 + 0.35 * Math.sin((t * Math.PI * 2) / 90);

    // Chorus calculation
    chorusTimer -= dt;
    if (chorusTimer <= 0) {
      chorusTimer = rand(CFG.chorus.interval[0], CFG.chorus.interval[1]);
      const partRatio = rand(CFG.chorus.participation[0], CFG.chorus.participation[1]);
      agents.forEach(agent => {
        if (agent.sociability > 0.3 && Math.random() < partRatio) {
          setTimeout(() => agent.triggerChorusBlink(), Math.random() * CFG.chorus.window * 1000);
        }
      });
    }

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < agents.length; i++) {
      agents[i].update(dt, t, globalMood, agents);
      agents[i].draw(ctx, t);
    }

    animFrameId = requestAnimationFrame(renderFrame);
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotionQuery.matches) {
    renderStaticReducedMotionFrame();
  } else {
    animFrameId = requestAnimationFrame(renderFrame);
  }

  function renderStaticReducedMotionFrame() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    agents.forEach(agent => {
      agent.brightness = 0.12;
      agent.envelope = 0;
      agent.draw(ctx, 0);
    });
  }

  reducedMotionQuery.addEventListener('change', function (e) {
    if (e.matches) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      isPaused = true;
      renderStaticReducedMotionFrame();
    } else {
      isPaused = false;
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(renderFrame);
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      isPaused = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      if (!reducedMotionQuery.matches) {
        isPaused = false;
        lastTime = performance.now();
        animFrameId = requestAnimationFrame(renderFrame);
      }
    }
  });

})();
