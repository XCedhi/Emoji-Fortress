'use client';

import React, {
  useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle,
} from 'react';

// ── types ──────────────────────────────────────────────────────────────────
export type GamePhase = 'idle' | 'countdown' | 'drawing' | 'validating' | 'defending' | 'level_complete' | 'game_over' | 'paused';

export interface Point { x: number; y: number; }

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'basic' | 'fast' | 'bouncer' | 'splitter' | 'homing';
  color: string;
  trail: Point[];
  bounces: number;
  maxBounces: number;
  destroyed: boolean;
  hitWall: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface WallSegment {
  points: Point[];
  closed: boolean;
  valid: boolean;
}

export interface GameCanvasRef {
  startDrawPhase: () => void;
  startDefensePhase: () => void;
  clearWall: () => void;
  getWallPoints: () => Point[];
}

interface GameCanvasProps {
  phase: GamePhase;
  level: number;
  emojiChar: string;
  drawColor: string;
  onDrawComplete: (points: Point[]) => void;
  onProjectileHitEmoji: () => void;
  onWaveComplete: () => void;
  onShake: () => void;
  projectileConfig: ProjectileWaveConfig;
}

export interface ProjectileWaveConfig {
  count: number;
  speed: number;
  types: Array<Projectile['type']>;
  spawnInterval: number;
}

// ── helpers ────────────────────────────────────────────────────────────────
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 0.001) return false;
  let t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

function projectileColor(type: Projectile['type']): string {
  switch (type) {
    case 'basic':    return '#00f5ff';
    case 'fast':     return '#ffffff';
    case 'bouncer':  return '#ffbe0b';
    case 'splitter': return '#ff006e';
    case 'homing':   return '#bf5af2';
    default:         return '#00f5ff';
  }
}

// ── component ──────────────────────────────────────────────────────────────
const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(function GameCanvas(
  { phase, level, emojiChar, drawColor, onDrawComplete, onProjectileHitEmoji, onWaveComplete, onShake, projectileConfig },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<Point[]>([]);
  const wallRef = useRef<WallSegment | null>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const spawnedCountRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const waveCompleteRef = useRef(false);
  const frameRef = useRef(0);
  const emojiCenterRef = useRef<Point>({ x: 0, y: 0 });
  const emojiRadiusRef = useRef(50);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  // expose imperative API
  useImperativeHandle(ref, () => ({
    startDrawPhase: () => {
      drawPointsRef.current = [];
      wallRef.current = null;
      isDrawingRef.current = false;
    },
    startDefensePhase: () => {
      projectilesRef.current = [];
      spawnedCountRef.current = 0;
      spawnTimerRef.current = 0;
      waveCompleteRef.current = false;
    },
    clearWall: () => {
      wallRef.current = null;
      drawPointsRef.current = [];
    },
    getWallPoints: () => drawPointsRef.current,
  }));

  // ── resize ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setCanvasSize({ w, h });
      emojiCenterRef.current = { x: w / 2, y: h / 2 };
      emojiRadiusRef.current = Math.min(w, h) * 0.07;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── spawn projectile ───────────────────────────────────────────────────
  const spawnProjectile = useCallback((idx: number) => {
    const { w, h } = canvasSize;
    const center = emojiCenterRef.current;
    const types = projectileConfig.types;
    const type = types[idx % types.length];
    const speed = projectileConfig.speed;

    // spawn from random edge
    const edge = Math.floor(idx * 7 % 4); // deterministic based on index
    let x = 0, y = 0;
    switch (edge) {
      case 0: x = (idx * 137) % w; y = -20; break;
      case 1: x = w + 20; y = (idx * 97) % h; break;
      case 2: x = (idx * 113) % w; y = h + 20; break;
      case 3: x = -20; y = (idx * 79) % h; break;
    }

    const angle = Math.atan2(center.y - y, center.x - x);
    const variance = (idx % 5 - 2) * 0.15;

    const proj: Projectile = {
      id: `proj-${level}-${idx}`,
      x, y,
      vx: Math.cos(angle + variance) * speed * (type === 'fast' ? 1.8 : 1),
      vy: Math.sin(angle + variance) * speed * (type === 'fast' ? 1.8 : 1),
      radius: type === 'fast' ? 5 : type === 'splitter' ? 10 : 8,
      type,
      color: projectileColor(type),
      trail: [],
      bounces: 0,
      maxBounces: type === 'bouncer' ? 4 : 0,
      destroyed: false,
      hitWall: false,
    };
    projectilesRef.current.push(proj);
  }, [canvasSize, level, projectileConfig]);

  // ── wall collision check ───────────────────────────────────────────────
  const checkWallCollision = useCallback((proj: Projectile): boolean => {
    const wall = wallRef.current;
    if (!wall || !wall.closed || wall.points.length < 3) return false;

    const pts = wall.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      // distance from projectile center to segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      let t = Math.max(0, Math.min(1, ((proj.x - p1.x) * dx + (proj.y - p1.y) * dy) / len2));
      const cx = p1.x + t * dx;
      const cy = p1.y + t * dy;
      const dist = Math.sqrt((proj.x - cx) ** 2 + (proj.y - cy) ** 2);

      if (dist < proj.radius + 6) {
        // spawn impact particles
        for (let p = 0; p < 8; p++) {
          const angle = (p / 8) * Math.PI * 2;
          particlesRef.current.push({
            id: `particle-${proj.id}-${p}-${frameRef.current}`,
            x: cx,
            y: cy,
            vx: Math.cos(angle) * (1 + p * 0.3),
            vy: Math.sin(angle) * (1 + p * 0.3),
            life: 30,
            maxLife: 30,
            radius: 2 + (p % 3),
            color: proj.color,
          });
        }

        if (proj.type === 'bouncer' && proj.bounces < proj.maxBounces) {
          // reflect velocity
          const nx = -dy / Math.sqrt(len2);
          const ny = dx / Math.sqrt(len2);
          const dot = proj.vx * nx + proj.vy * ny;
          proj.vx -= 2 * dot * nx;
          proj.vy -= 2 * dot * ny;
          proj.bounces++;
          return false;
        }

        if (proj.type === 'splitter' && !proj.hitWall) {
          proj.hitWall = true;
          // spawn 3 split projectiles
          for (let s = 0; s < 3; s++) {
            const splitAngle = Math.atan2(proj.vy, proj.vx) + (s - 1) * 0.6;
            projectilesRef.current.push({
              id: `split-${proj.id}-${s}`,
              x: proj.x,
              y: proj.y,
              vx: Math.cos(splitAngle) * projectileConfig.speed * 0.8,
              vy: Math.sin(splitAngle) * projectileConfig.speed * 0.8,
              radius: 5,
              type: 'basic',
              color: '#ff006e',
              trail: [],
              bounces: 0,
              maxBounces: 0,
              destroyed: false,
              hitWall: false,
            });
          }
        }

        onShake();
        return true;
      }
    }
    return false;
  }, [onShake, projectileConfig.speed]);

  // ── main render loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    const { w, h } = canvasSize;
    const center = emojiCenterRef.current;
    const emojiRadius = emojiRadiusRef.current;

    const render = () => {
      frameRef.current++;
      const frame = frameRef.current;
      ctx.clearRect(0, 0, w, h);

      // ── background ─────────────────────────────────────────────────
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, '#0d1225');
      bg.addColorStop(1, '#070a14');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = 'rgba(0,245,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ── emoji ──────────────────────────────────────────────────────
      const emojiSize = emojiRadius * 2;
      const bounce = Math.sin(frame * 0.05) * 3;

      // glow ring
      if (phase === 'drawing') {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,245,255,0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(center.x, center.y, emojiRadius + 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // emoji glow
      const emojiGlow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, emojiRadius * 1.5);
      emojiGlow.addColorStop(0, 'rgba(0,245,255,0.08)');
      emojiGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = emojiGlow;
      ctx.beginPath();
      ctx.arc(center.x, center.y, emojiRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // emoji text
      ctx.font = `${emojiSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emojiChar, center.x, center.y + bounce);

      // ── drawn wall ─────────────────────────────────────────────────
      const pts = drawPointsRef.current;
      if (pts.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 10;

        // glow layers
        const glowLayers = [
          { blur: 20, alpha: 0.2 },
          { blur: 10, alpha: 0.4 },
          { blur: 0,  alpha: 1.0 },
        ];

        glowLayers.forEach(({ blur, alpha }) => {
          ctx.shadowBlur = blur;
          ctx.shadowColor = drawColor;
          ctx.strokeStyle = drawColor.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
          if (drawColor.startsWith('#')) {
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = alpha;
          }
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          if (wallRef.current?.closed) ctx.closePath();
          ctx.stroke();
        });

        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // ── wall (closed, validated) ───────────────────────────────────
      if (wallRef.current?.closed && phase !== 'drawing') {
        const wpts = wallRef.current.points;
        const isValid = wallRef.current.valid;

        ctx.save();
        const wallColor = isValid ? drawColor : '#ff4444';
        const pulse = 0.8 + Math.sin(frame * 0.08) * 0.2;

        // fill
        ctx.globalAlpha = 0.05 * pulse;
        ctx.fillStyle = wallColor;
        ctx.beginPath();
        ctx.moveTo(wpts[0].x, wpts[0].y);
        wpts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();

        // stroke with glow
        ctx.globalAlpha = pulse;
        ctx.shadowBlur = 15;
        ctx.shadowColor = wallColor;
        ctx.strokeStyle = wallColor;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(wpts[0].x, wpts[0].y);
        wpts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // ── projectiles ────────────────────────────────────────────────
      if (phase === 'defending') {
        // spawn
        spawnTimerRef.current++;
        if (
          spawnedCountRef.current < projectileConfig.count &&
          spawnTimerRef.current >= projectileConfig.spawnInterval
        ) {
          spawnProjectile(spawnedCountRef.current);
          spawnedCountRef.current++;
          spawnTimerRef.current = 0;
        }

        // update + draw projectiles
        projectilesRef.current = projectilesRef.current.filter((proj) => !proj.destroyed);

        projectilesRef.current.forEach((proj) => {
          if (proj.destroyed) return;

          // homing behavior
          if (proj.type === 'homing') {
            const angle = Math.atan2(center.y - proj.y, center.x - proj.x);
            proj.vx += Math.cos(angle) * 0.15;
            proj.vy += Math.sin(angle) * 0.15;
            const speed = Math.sqrt(proj.vx ** 2 + proj.vy ** 2);
            if (speed > projectileConfig.speed * 1.2) {
              proj.vx = (proj.vx / speed) * projectileConfig.speed * 1.2;
              proj.vy = (proj.vy / speed) * projectileConfig.speed * 1.2;
            }
          }

          // move
          proj.x += proj.vx;
          proj.y += proj.vy;

          // trail
          proj.trail.push({ x: proj.x, y: proj.y });
          if (proj.trail.length > 15) proj.trail.shift();

          // wall collision
          if (wallRef.current?.closed && !proj.hitWall) {
            const hit = checkWallCollision(proj);
            if (hit) {
              proj.destroyed = true;
              return;
            }
          }

          // emoji collision
          const distToEmoji = distance({ x: proj.x, y: proj.y }, center);
          if (distToEmoji < emojiRadius * 0.85 + proj.radius) {
            proj.destroyed = true;
            // big impact particles
            for (let p = 0; p < 20; p++) {
              const angle = (p / 20) * Math.PI * 2;
              particlesRef.current.push({
                id: `hit-particle-${proj.id}-${p}`,
                x: center.x,
                y: center.y,
                vx: Math.cos(angle) * (2 + p * 0.2),
                vy: Math.sin(angle) * (2 + p * 0.2),
                life: 50,
                maxLife: 50,
                radius: 3 + (p % 4),
                color: '#ff006e',
              });
            }
            onProjectileHitEmoji();
            return;
          }

          // out of bounds
          if (proj.x < -50 || proj.x > w + 50 || proj.y < -50 || proj.y > h + 50) {
            proj.destroyed = true;
          }

          // draw trail
          if (proj.trail.length > 1) {
            ctx.save();
            for (let t = 1; t < proj.trail.length; t++) {
              const alpha = (t / proj.trail.length) * 0.6;
              const radius = proj.radius * (t / proj.trail.length) * 0.8;
              ctx.globalAlpha = alpha;
              ctx.fillStyle = proj.color;
              ctx.shadowBlur = 6;
              ctx.shadowColor = proj.color;
              ctx.beginPath();
              ctx.arc(proj.trail[t].x, proj.trail[t].y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }

          // draw projectile
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = proj.color;
          ctx.fillStyle = proj.color;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
          ctx.fill();

          // white core
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffffff';
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        });

        // check wave complete
        const allSpawned = spawnedCountRef.current >= projectileConfig.count;
        const allGone = projectilesRef.current.filter((p) => !p.destroyed).length === 0;
        if (allSpawned && allGone && !waveCompleteRef.current) {
          waveCompleteRef.current = true;
          onWaveComplete();
        }
      }

      // ── particles ──────────────────────────────────────────────────
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      particlesRef.current.forEach((p) => {
        p.life--;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;

        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    canvasSize, phase, emojiChar, drawColor,
    checkWallCollision, spawnProjectile, onProjectileHitEmoji, onWaveComplete,
    projectileConfig.count, projectileConfig.spawnInterval,
  ]);

  // ── drawing event handlers ─────────────────────────────────────────────
  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const handleDrawStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'drawing') return;
    e.preventDefault();
    isDrawingRef.current = true;
    drawPointsRef.current = [];
    wallRef.current = null;
    const pt = getPoint(e);
    drawPointsRef.current.push(pt);
  }, [phase]);

  const handleDrawMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || phase !== 'drawing') return;
    e.preventDefault();
    const pt = getPoint(e);
    const lastPt = drawPointsRef.current[drawPointsRef.current.length - 1];
    if (distance(pt, lastPt) > 4) {
      drawPointsRef.current.push(pt);
    }
  }, [phase]);

  const handleDrawEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || phase !== 'drawing') return;
    e.preventDefault();
    isDrawingRef.current = false;
    const pts = drawPointsRef.current;
    if (pts.length < 10) return;
    onDrawComplete(pts);
  }, [phase, onDrawComplete]);

  // ── validate drawn shape ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'validating') return;
    const pts = drawPointsRef.current;
    if (pts.length < 10) return;

    const first = pts[0];
    const last = pts[pts.length - 1];
    const closureThreshold = Math.min(canvasSize.w, canvasSize.h) * 0.05;
    const isClosed = distance(first, last) < closureThreshold;
    const center = emojiCenterRef.current;
    const isEnclosed = pointInPolygon(center, pts);

    // check no segment touches emoji
    const emojiRadius = emojiRadiusRef.current;
    let touchesEmoji = false;
    for (let i = 0; i < pts.length - 1 && !touchesEmoji; i++) {
      const dx = pts[i + 1].x - pts[i].x;
      const dy = pts[i + 1].y - pts[i].y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      let t = Math.max(0, Math.min(1, ((center.x - pts[i].x) * dx + (center.y - pts[i].y) * dy) / len2));
      const cx = pts[i].x + t * dx;
      const cy = pts[i].y + t * dy;
      if (distance({ x: cx, y: cy }, center) < emojiRadius * 0.9) {
        touchesEmoji = true;
      }
    }

    const valid = isClosed && isEnclosed && !touchesEmoji;
    wallRef.current = { points: pts, closed: true, valid };
  }, [phase, canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: phase === 'drawing' ? 'crosshair' : 'default', touchAction: 'none' }}
      onMouseDown={handleDrawStart}
      onMouseMove={handleDrawMove}
      onMouseUp={handleDrawEnd}
      onMouseLeave={handleDrawEnd}
      onTouchStart={handleDrawStart}
      onTouchMove={handleDrawMove}
      onTouchEnd={handleDrawEnd}
    />
  );
});

export default GameCanvas;