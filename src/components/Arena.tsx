import { useEffect, useMemo, useRef } from 'react';
import { ARENA_MAX, RELOAD } from '../engine/constants';
import { MatchState } from '../engine/match';
import { Robot } from '../engine/types';

const CANVAS_SIZE = 620;

export interface ArenaProps {
  state: MatchState | null;
  showScans: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function Arena({ state, showScans, zoom, onZoomIn, onZoomOut, onZoomReset }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const lastTickRef = useRef(-1);

  const dpr = useMemo(() => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1), []);
  const scale = dpr * zoom;
  const displaySize = CANVAS_SIZE * zoom;

  useEffect(() => {
    gridRef.current = buildGrid(scale);
  }, [scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const px = CANVAS_SIZE * scale;
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    lastTickRef.current = -1;

    const render = () => {
      const tick = state?.arena.tick ?? -1;
      const hasFx = !!state && (
        state.arena.missiles.length > 0 ||
        state.arena.explosions.length > 0 ||
        state.arena.scans.length > 0 ||
        state.arena.smoke.length > 0 ||
        state.arena.robots.some((r) => r.damageFlash > 0)
      );
      const needsRender = tick !== lastTickRef.current || hasFx;
      if (needsRender) {
        draw(ctx, state, gridRef.current, showScans);
        lastTickRef.current = tick;
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, scale, showScans]);

  return (
    <div className="arena-wrap" style={{ width: displaySize, height: displaySize }}>
      <canvas
        ref={canvasRef}
        className="arena-canvas"
        style={{ width: displaySize, height: displaySize }}
      />
      <div className="arena-corner tl" />
      <div className="arena-corner tr" />
      <div className="arena-corner bl" />
      <div className="arena-corner br" />
      <div className="arena-zoom">
        <button className="zoom-btn" onClick={onZoomOut} title="Zooma ut (Z)" aria-label="Zooma ut">−</button>
        <button className="zoom-label" onClick={onZoomReset} title="Återställ (0)">
          {Math.round(zoom * 100)}%
        </button>
        <button className="zoom-btn" onClick={onZoomIn} title="Zooma in (Z)" aria-label="Zooma in">+</button>
      </div>
    </div>
  );
}

function buildGrid(dpr: number): HTMLCanvasElement {
  const W = CANVAS_SIZE;
  const H = CANVAS_SIZE;
  const S = W / ARENA_MAX;
  const c = document.createElement('canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.75);
  bg.addColorStop(0, '#070b18');
  bg.addColorStop(1, '#02030a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.025)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 50; i < 1000; i += 50) {
    if (i % 100 === 0) continue;
    const p = Math.floor(i * S) + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, H);
    ctx.moveTo(0, p);
    ctx.lineTo(W, p);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.09)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 100; i < 1000; i += 100) {
    const p = Math.floor(i * S) + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, H);
    ctx.moveTo(0, p);
    ctx.lineTo(W, p);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  return c;
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: MatchState | null,
  grid: HTMLCanvasElement | null,
  showScans: boolean,
) {
  const W = CANVAS_SIZE;
  const H = CANVAS_SIZE;
  const S = W / ARENA_MAX;
  const toX = (x: number) => x * S;
  const toY = (y: number) => H - y * S;

  if (grid) {
    ctx.drawImage(grid, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, W, H);
  }

  if (!state) {
    ctx.fillStyle = '#6a7ba2';
    ctx.font = '12px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AWAITING SIGNAL', W / 2, H / 2 - 4);
    ctx.fillStyle = '#3b486a';
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('PRESS  ▶  START', W / 2, H / 2 + 14);
    return;
  }

  const { arena } = state;

  if (showScans && arena.scans.length > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of arena.scans) {
      const robot = arena.robots[s.robotId];
      if (!robot || !robot.alive) continue;
      drawScanCone(ctx, toX(robot.x), toY(robot.y), s, S);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  for (const r of arena.robots) {
    if (!r.alive) continue;
    drawTrail(ctx, r, toX, toY);
  }

  if (arena.smoke.length > 0) {
    drawSmoke(ctx, arena.smoke, toX, toY);
  }

  if (arena.missiles.length > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (const m of arena.missiles) {
      drawMissile(ctx, toX(m.x), toY(m.y), m.heading);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  if (arena.explosions.length > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (const e of arena.explosions) {
      drawExplosion(ctx, toX(e.x), toY(e.y), e.age);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  for (const r of arena.robots) {
    drawRobot(ctx, r, toX(r.x), toY(r.y), arena.tick);
  }

  drawHud(ctx, W, H, state);
}

function drawSmoke(
  ctx: CanvasRenderingContext2D,
  smoke: { x: number; y: number; age: number; maxAge: number; size: number }[],
  toX: (x: number) => number,
  toY: (y: number) => number,
) {
  for (const p of smoke) {
    const k = p.age / p.maxAge;
    const alpha = (1 - k) * 0.55;
    if (alpha < 0.01) continue;
    const r = p.size;
    const cx = toX(p.x);
    const cy = toY(p.y);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const young = k < 0.25 ? 1 - k * 4 : 0;
    const innerR = Math.round(180 + young * 60);
    const innerG = Math.round(170 + young * 30);
    const innerB = Math.round(160 + young * 20);
    grad.addColorStop(0, `rgba(${innerR}, ${innerG}, ${innerB}, ${alpha})`);
    grad.addColorStop(0.55, `rgba(120, 125, 140, ${alpha * 0.55})`);
    grad.addColorStop(1, 'rgba(70, 75, 95, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScanCone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: { heading: number; resolution: number; range: number; hit: boolean; age: number },
  scale: number,
) {
  const fade = Math.max(0, 1 - s.age / 8);
  const alpha = fade * 0.08;
  if (alpha < 0.005) return;
  const r = s.range * scale;
  const res = Math.max(1, s.resolution);
  const rad = (s.heading * Math.PI) / 180;
  const halfArc = (res * Math.PI) / 180;

  ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -rad - halfArc, -rad + halfArc);
  ctx.closePath();
  ctx.fill();

  if (s.hit && s.age < 3) {
    const lineA = fade * 0.18;
    ctx.strokeStyle = `rgba(120, 220, 255, ${lineA})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + s.range * scale * Math.cos(-rad), cy + s.range * scale * Math.sin(-rad));
    ctx.stroke();
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  r: Robot,
  toX: (x: number) => number,
  toY: (y: number) => number,
) {
  const n = r.trail.length;
  if (n < 2) return;

  const baseCol = parseHex(r.color);
  const TRACK_OFFSET = 4;

  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';

  for (let i = 1; i < n; i++) {
    const a = r.trail[i - 1];
    const b = r.trail[i];
    const t = i / (n - 1);
    const alpha = Math.pow(t, 1.6) * 0.42;
    if (alpha < 0.01) continue;

    const radA = (a.heading * Math.PI) / 180;
    const radB = (b.heading * Math.PI) / 180;
    const perpAX = -Math.sin(radA);
    const perpAY = -Math.cos(radA);
    const perpBX = -Math.sin(radB);
    const perpBY = -Math.cos(radB);

    const ax = toX(a.x);
    const ay = toY(a.y);
    const bx = toX(b.x);
    const by = toY(b.y);

    const mr = Math.round(baseCol.r * 0.32 + 18);
    const mg = Math.round(baseCol.g * 0.32 + 22);
    const mb = Math.round(baseCol.b * 0.32 + 28);
    ctx.strokeStyle = `rgba(${mr}, ${mg}, ${mb}, ${alpha})`;

    ctx.beginPath();
    ctx.moveTo(ax + perpAX * TRACK_OFFSET, ay + perpAY * TRACK_OFFSET);
    ctx.lineTo(bx + perpBX * TRACK_OFFSET, by + perpBY * TRACK_OFFSET);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ax - perpAX * TRACK_OFFSET, ay - perpAY * TRACK_OFFSET);
    ctx.lineTo(bx - perpBX * TRACK_OFFSET, by - perpBY * TRACK_OFFSET);
    ctx.stroke();
  }
}

function drawMissile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  heading: number,
) {
  const rad = (-heading * Math.PI) / 180;
  const tailX = cx - 22 * Math.cos(rad);
  const tailY = cy - 22 * Math.sin(rad);
  const grad = ctx.createLinearGradient(cx, cy, tailX, tailY);
  grad.addColorStop(0, 'rgba(255, 235, 150, 1)');
  grad.addColorStop(0.4, 'rgba(255, 150, 70, 0.55)');
  grad.addColorStop(1, 'rgba(255, 150, 70, 0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(cx, cy);
  ctx.stroke();

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
  halo.addColorStop(0, 'rgba(255, 220, 120, 0.85)');
  halo.addColorStop(0.5, 'rgba(255, 180, 80, 0.35)');
  halo.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#ffd066';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff5c4';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawExplosion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  age: number,
) {
  const k = age / 8;
  const r1 = 3 + age * 5;
  const r2 = 6 + age * 9;
  const a1 = Math.max(0, 1 - k) * 0.95;
  const a2 = Math.max(0, 1 - k) * 0.6;

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2 * 2);
  halo.addColorStop(0, `rgba(255, 230, 160, ${a1 * 0.8})`);
  halo.addColorStop(0.4, `rgba(255, 150, 60, ${a1 * 0.45})`);
  halo.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r2 * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#ffaa50';
  ctx.shadowBlur = 18;
  ctx.fillStyle = `rgba(255, 240, 180, ${a1})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(255, 150, 60, ${a2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 240, 200, ${a2 * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r2 * 1.6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  r: Robot,
  cx: number,
  cy: number,
  tick: number,
) {
  if (!r.alive) {
    ctx.strokeStyle = 'rgba(120, 130, 150, 0.7)';
    ctx.fillStyle = 'rgba(40, 50, 70, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.moveTo(cx + 5, cy - 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.stroke();
    return;
  }

  const caps = r.capabilities;
  const flash = r.damageFlash > 0 ? r.damageFlash / 6 : 0;

  ctx.globalCompositeOperation = 'lighter';
  const haloR = 22 + flash * 10;
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
  halo.addColorStop(0, withAlpha(r.color, 0.55));
  halo.addColorStop(0.35, withAlpha(r.color, 0.28));
  halo.addColorStop(0.7, withAlpha(r.color, 0.08));
  halo.addColorStop(1, withAlpha(r.color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-r.heading * Math.PI) / 180);

  if (caps.drive) drawTreads(ctx, r);
  drawChassis(ctx, r, flash);
  if (caps.status) drawStatusLeds(ctx, tick, r.id, r.damage);

  ctx.restore();

  if (caps.cannon) {
    const cannonAngle =
      r.lastCannonTick >= 0 ? r.lastCannonHeading : r.heading;
    const recoil = r.reload > RELOAD - 4 ? (RELOAD - r.reload) / 4 : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-cannonAngle * Math.PI) / 180);
    drawCannonTurret(ctx, r, recoil);
    ctx.restore();
  }

  if (caps.scan) {
    const scanAngle =
      r.lastScanTick >= 0 ? r.lastScanHeading : r.heading;
    const recent = r.lastScanTick >= 0 && tick - r.lastScanTick < 3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-scanAngle * Math.PI) / 180);
    drawSensorHead(ctx, r, recent);
    ctx.restore();
  }

  if (caps.gps) drawAntenna(ctx, cx, cy, tick, r.id);

  drawRobotHpBar(ctx, r, cx, cy);

  ctx.fillStyle = withAlpha(r.color, 0.9);
  ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(r.name.toUpperCase(), cx + 16, cy - 11);
}

function drawTreads(ctx: CanvasRenderingContext2D, r: Robot) {
  const S = CANVAS_SIZE / ARENA_MAX;
  const stripeOffset = ((r.travel * S * 1.4) % 4 + 4) % 4;
  const treadHalfLen = 9;
  const treadW = 3;
  const sidePositions = [-7, 7];

  for (const sy of sidePositions) {
    ctx.fillStyle = '#0d1322';
    ctx.fillRect(-treadHalfLen, sy - treadW / 2, treadHalfLen * 2, treadW);
    ctx.strokeStyle = 'rgba(40, 50, 75, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      -treadHalfLen + 0.5,
      sy - treadW / 2 + 0.5,
      treadHalfLen * 2 - 1,
      treadW - 1,
    );

    ctx.fillStyle = r.speed > 0
      ? withAlpha(r.color, 0.45)
      : 'rgba(70, 80, 110, 0.6)';
    for (
      let x = -treadHalfLen + stripeOffset;
      x < treadHalfLen;
      x += 4
    ) {
      ctx.fillRect(x, sy - treadW / 2 + 0.5, 1.2, treadW - 1);
    }
  }
}

function drawChassis(ctx: CanvasRenderingContext2D, r: Robot, flash: number) {
  ctx.fillStyle = flash > 0 ? mixColor('#ffffff', '#1a2238', 1 - flash) : '#1a2238';
  ctx.strokeStyle = withAlpha(r.color, 0.95);
  ctx.lineWidth = 1.3;
  ctx.shadowColor = r.color;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.moveTo(8, -5);
  ctx.lineTo(10, 0);
  ctx.lineTo(8, 5);
  ctx.lineTo(-7, 5);
  ctx.lineTo(-7, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = flash > 0 ? '#ffffff' : withAlpha(r.color, 1);
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(7, -2);
  ctx.lineTo(7, 2);
  ctx.closePath();
  ctx.fill();
}

function drawCannonTurret(
  ctx: CanvasRenderingContext2D,
  r: Robot,
  recoil: number,
) {
  const barrelLen = 12 * recoil + 2;
  const barrelStart = 3;

  ctx.fillStyle = '#2a3550';
  ctx.strokeStyle = withAlpha(r.color, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1a2236';
  ctx.strokeStyle = 'rgba(20, 26, 44, 1)';
  ctx.fillRect(barrelStart, -1.4, barrelLen, 2.8);
  ctx.strokeRect(barrelStart + 0.5, -1.4 + 0.5, barrelLen - 1, 2.8 - 1);

  ctx.fillStyle = withAlpha(r.color, 0.9);
  ctx.fillRect(barrelStart + barrelLen - 1.5, -1.9, 1.5, 3.8);

  if (r.reload === 0 && r.missilesInFlight < 2) {
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(barrelStart + barrelLen + 1, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawSensorHead(
  ctx: CanvasRenderingContext2D,
  r: Robot,
  recent: boolean,
) {
  const offX = -1.5;
  ctx.fillStyle = '#0e1628';
  ctx.strokeStyle = recent ? withAlpha(r.color, 0.95) : withAlpha(r.color, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(offX, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = recent ? withAlpha(r.color, 1) : withAlpha(r.color, 0.6);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(offX + 2, 0, 3.2, -Math.PI / 2.4, Math.PI / 2.4);
  ctx.stroke();

  if (recent) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(offX + 4.6, 0, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAntenna(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tick: number,
  id: number,
) {
  const tipY = cy - 13;
  ctx.strokeStyle = 'rgba(160, 170, 200, 0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 4);
  ctx.lineTo(cx - 4, tipY);
  ctx.stroke();

  ctx.fillStyle = (tick + id * 7) % 16 < 8
    ? 'rgba(255, 200, 87, 0.95)'
    : 'rgba(255, 200, 87, 0.25)';
  ctx.beginPath();
  ctx.arc(cx - 4, tipY, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawStatusLeds(
  ctx: CanvasRenderingContext2D,
  tick: number,
  id: number,
  damage: number,
) {
  const speedDot = (tick * 2 + id * 5) % 10 < 5;
  ctx.fillStyle = speedDot
    ? 'rgba(124, 255, 107, 0.95)'
    : 'rgba(124, 255, 107, 0.2)';
  ctx.beginPath();
  ctx.arc(-4, -2.6, 0.9, 0, Math.PI * 2);
  ctx.fill();

  const dmgPulseRate = damage < 40 ? 12 : damage < 75 ? 6 : 3;
  const dmgDot = (tick + id * 3) % dmgPulseRate < dmgPulseRate / 2;
  const dmgCol = damage < 40 ? '#7cff6b' : damage < 75 ? '#ffc857' : '#ff3860';
  ctx.fillStyle = dmgDot ? dmgCol : withAlpha(dmgCol, 0.18);
  ctx.beginPath();
  ctx.arc(-4, 2.6, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawRobotHpBar(
  ctx: CanvasRenderingContext2D,
  r: Robot,
  cx: number,
  cy: number,
) {
  const w = 22;
  const h = 3;
  const x = cx - w / 2;
  const y = cy + 14;
  const ratio = (100 - r.damage) / 100;
  const col = r.damage < 40 ? '#7cff6b' : r.damage < 75 ? '#ffc857' : '#ff3860';

  ctx.fillStyle = 'rgba(2, 3, 10, 0.75)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w * ratio, h);
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: MatchState,
) {
  ctx.fillStyle = 'rgba(106, 123, 162, 0.85)';
  ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`TICK ${state.arena.tick.toString().padStart(6, '0')}`, 14, H - 14);
  ctx.textAlign = 'right';
  ctx.fillText(`CPU ${state.cpuCycles.toString().padStart(7, '0')}`, W - 14, H - 14);

  const alive = state.arena.robots.filter((r) => r.alive).length;
  ctx.textAlign = 'left';
  ctx.fillText(`ALIVE ${alive}/${state.arena.robots.length}`, 14, 18);

  if (state.arena.missiles.length > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 200, 87, 0.85)';
    ctx.fillText(`MIS ${state.arena.missiles.length}`, W - 14, 18);
  }
}

function withAlpha(hex: string, a: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mixColor(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}
