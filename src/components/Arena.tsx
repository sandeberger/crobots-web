import { useEffect, useMemo, useRef } from 'react';
import { ARENA_MAX } from '../engine/constants';
import { MatchState } from '../engine/match';
import { Robot } from '../engine/types';

const CANVAS_SIZE = 620;

export interface ArenaProps {
  state: MatchState | null;
  showScans: boolean;
}

export function Arena({ state, showScans }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const lastTickRef = useRef(-1);

  const dpr = useMemo(() => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1), []);

  useEffect(() => {
    gridRef.current = buildGrid(dpr);
  }, [dpr]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (canvas.width !== CANVAS_SIZE * dpr) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastTickRef.current = -1;

    const render = () => {
      const tick = state?.arena.tick ?? -1;
      const hasFx = !!state && (
        state.arena.missiles.length > 0 ||
        state.arena.explosions.length > 0 ||
        state.arena.scans.length > 0 ||
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
  }, [state, dpr, showScans]);

  return (
    <div className="arena-wrap">
      <canvas
        ref={canvasRef}
        className="arena-canvas"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      />
      <div className="arena-corner tl" />
      <div className="arena-corner tr" />
      <div className="arena-corner bl" />
      <div className="arena-corner br" />
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
    drawRobot(ctx, r, toX(r.x), toY(r.y));
  }

  drawHud(ctx, W, H, state);
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

  const path = new Path2D();
  path.moveTo(toX(r.trail[0].x), toY(r.trail[0].y));
  for (let i = 1; i < n; i++) {
    path.lineTo(toX(r.trail[i].x), toY(r.trail[i].y));
  }

  ctx.globalCompositeOperation = 'lighter';

  ctx.strokeStyle = withAlpha(r.color, 0.12);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke(path);

  ctx.strokeStyle = withAlpha(r.color, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke(path);

  ctx.globalCompositeOperation = 'source-over';
}

function drawMissile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  heading: number,
) {
  const rad = (-heading * Math.PI) / 180;
  const tailX = cx - 18 * Math.cos(rad);
  const tailY = cy - 18 * Math.sin(rad);
  const grad = ctx.createLinearGradient(cx, cy, tailX, tailY);
  grad.addColorStop(0, 'rgba(255, 230, 140, 0.95)');
  grad.addColorStop(0.5, 'rgba(255, 140, 60, 0.35)');
  grad.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(cx, cy);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 200, 90, 0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff5c4';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
  ctx.fill();
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
  const a1 = Math.max(0, 1 - k) * 0.9;
  const a2 = Math.max(0, 1 - k) * 0.55;

  ctx.fillStyle = `rgba(255, 220, 140, ${a1 * 0.55})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r1 * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 230, 160, ${a1 * 0.85})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 140, 50, ${a2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 240, 200, ${a2 * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r2 * 1.55, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  r: Robot,
  cx: number,
  cy: number,
) {
  if (!r.alive) {
    ctx.strokeStyle = 'rgba(120, 130, 150, 0.7)';
    ctx.fillStyle = 'rgba(40, 50, 70, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
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

  const flash = r.damageFlash > 0 ? r.damageFlash / 6 : 0;

  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = withAlpha(r.color, 0.22);
  ctx.beginPath();
  ctx.arc(cx, cy, 11 + flash * 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-r.heading * Math.PI) / 180);
  ctx.fillStyle = flash > 0 ? mixColor('#ffffff', r.color, 1 - flash) : r.color;
  ctx.strokeStyle = '#02030a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-6, 6);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = withAlpha(r.color, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawRobotHpBar(ctx, r, cx, cy);

  ctx.fillStyle = withAlpha(r.color, 0.9);
  ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(r.name.toUpperCase(), cx + 14, cy - 8);
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
