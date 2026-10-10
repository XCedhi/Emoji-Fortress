'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';

// ── types ──────────────────────────────────────────────────────────────────
interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

interface HighScore {
  mode: string;
  score: number;
  level: number;
  date: string;
}

// ── constants ──────────────────────────────────────────────────────────────
const FLOATING_EMOJIS = [
  '😀','😎','🥺','🤖','👻','🐱','🍕','💎',
  '🔥','⚡','🌟','🎮','🛡️','⚔️','🎯','💫',
  '🌈','🦄','🐉','🎪','🏆','🎭','🚀','💥',
];

const GAME_MODES = [
  {
    id: 'classic',
    label: 'Classic',
    icon: '🛡️',
    desc: '3 lives • Progressive difficulty • Level-based scoring',
    color: 'cyan',
    borderClass: 'border-neon-cyan',
    textClass: 'text-neon-cyan',
    glowClass: 'hover:glow-cyan',
    bgClass: 'hover:bg-[rgba(0,245,255,0.08)]',
  },
  {
    id: 'endless',
    label: 'Endless',
    icon: '♾️',
    desc: 'Survive as long as possible • Infinite scaling • Pure score',
    color: 'pink',
    borderClass: 'border-neon-pink',
    textClass: 'text-neon-pink',
    glowClass: 'hover:glow-pink',
    bgClass: 'hover:bg-[rgba(255,0,110,0.08)]',
  },
  {
    id: 'daily',
    label: 'Daily Challenge',
    icon: '📅',
    desc: 'Same seed for everyone • Global leaderboard • One attempt',
    color: 'yellow',
    borderClass: 'border-neon-yellow',
    textClass: 'text-neon-yellow',
    glowClass: 'hover:glow-yellow',
    bgClass: 'hover:bg-[rgba(255,190,11,0.08)]',
  },
] as const;

// ── static data ────────────────────────────────────────────────────────────
const DEFAULT_SCORES: HighScore[] = [
  { mode: 'classic', score: 1850, level: 8, date: '2026-10-08' },
  { mode: 'endless', score: 3200, level: 14, date: '2026-10-07' },
  { mode: 'daily',   score: 950,  level: 5,  date: '2026-10-06' },
];

const HOW_TO_STEPS = [
  {
    num: '1',
    title: 'Pick Your Emoji',
    desc: 'Choose any emoji from the grid — this is what you\'re protecting.',
  },
  {
    num: '2',
    title: 'Draw a Closed Wall',
    desc: 'Click/touch and drag to draw a continuous closed shape around the emoji. The shape must fully surround it.',
  },
  {
    num: '3',
    title: 'Survive the Barrage',
    desc: 'Projectiles spawn from the edges and fly toward your emoji. Your wall must block them all.',
  },
  {
    num: '4',
    title: 'Level Up',
    desc: 'Survive the wave to advance. Each level brings faster bullets, new projectile types, and shorter draw time.',
  },
  {
    num: '5',
    title: 'Score Points',
    desc: 'Earn +100 per level plus bonuses for leftover time, wall efficiency, and no-hit streaks.',
  },
];

// ── component ──────────────────────────────────────────────────────────────
export default function MainMenuScreen() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const emojisRef = useRef<FloatingEmoji[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('classic');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showHowTo, setShowHowTo] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  // ── load high scores from localStorage ────────────────────────────────
  useEffect(() => {
    // Backend integration point: replace with API call to fetch user scores
    const stored = localStorage.getItem('emoji-fortress-scores');
    if (stored) {
      try {
        setHighScores(JSON.parse(stored));
      } catch {
        setHighScores(DEFAULT_SCORES);
      }
    } else {
      setHighScores(DEFAULT_SCORES);
    }
    // stagger title animation
    const t = setTimeout(() => setTitleVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // ── init floating emojis ───────────────────────────────────────────────
  const initEmojis = useCallback((w: number, h: number) => {
    emojisRef.current = Array.from({ length: 24 }, (_, i) => ({
      id: `float-emoji-${i}`,
      emoji: FLOATING_EMOJIS[i % FLOATING_EMOJIS.length],
      x: (i / 24) * w + Math.sin(i * 1.3) * 40,
      y: h + (i * 60),
      size: 20 + (i % 5) * 8,
      speed: 0.3 + (i % 4) * 0.2,
      drift: Math.sin(i * 0.7) * 0.5,
      opacity: 0.15 + (i % 3) * 0.1,
      rotation: i * 15,
      rotationSpeed: (i % 2 === 0 ? 1 : -1) * (0.2 + (i % 3) * 0.1),
    }));
  }, []);

  // ── canvas animation loop ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initEmojis(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const draw = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      // clear
      ctx.clearRect(0, 0, w, h);

      // background gradient
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
      grad.addColorStop(0, '#0d1225');
      grad.addColorStop(0.5, '#0a0e1a');
      grad.addColorStop(1, '#070a14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // subtle grid
      ctx.strokeStyle = 'rgba(0,245,255,0.025)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // floating emojis
      emojisRef.current.forEach((e) => {
        e.y -= e.speed;
        e.x += Math.sin(frame * 0.01 + parseFloat(e.id.split('-')[2]) * 0.5) * e.drift;
        e.rotation += e.rotationSpeed;

        if (e.y < -e.size * 2) {
          e.y = h + e.size;
          e.x = Math.random() * w;
        }

        ctx.save();
        ctx.globalAlpha = e.opacity;
        ctx.translate(e.x, e.y);
        ctx.rotate((e.rotation * Math.PI) / 180);
        ctx.font = `${e.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, 0, 0);
        ctx.restore();
      });

      // scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initEmojis]);

  const handlePlay = () => {
    // Backend integration point: save selected mode to session/context
    localStorage.setItem('emoji-fortress-mode', selectedMode);
    router.push('/emoji-selection-screen');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-navy-deep">
      {/* background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-bg opacity-30" />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">

        {/* logo + title */}
        <div
          className="flex flex-col items-center gap-4 mb-8"
          style={{ opacity: titleVisible ? 1 : 0, transform: titleVisible ? 'translateY(0)' : 'translateY(-20px)', transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div className="flex items-center gap-3">
            <AppLogo size={52} />
            <div className="flex flex-col">
              <span
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-neon-cyan text-glow-cyan neon-flicker leading-none"
              >
                EMOJI
              </span>
              <span
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-neon-pink text-glow-pink leading-none"
              >
                FORTRESS
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base font-medium tracking-widest uppercase text-center">
            Draw fast &nbsp;·&nbsp; Draw perfect &nbsp;·&nbsp; Protect your emoji
          </p>
        </div>

        {/* game mode cards */}
        <div className="w-full max-w-2xl mb-6">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase text-center mb-3">
            Select Mode
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GAME_MODES.map((mode) => (
              <button
                key={`mode-${mode.id}`}
                onClick={() => setSelectedMode(mode.id)}
                className={`
                  relative neon-card p-4 text-left transition-all duration-200 cursor-pointer
                  border-2 ${mode.borderClass} ${mode.bgClass}
                  ${selectedMode === mode.id ? 'opacity-100' : 'opacity-60 hover:opacity-80'}
                `}
                style={{
                  boxShadow: selectedMode === mode.id
                    ? mode.color === 'cyan' ?'0 0 15px rgba(0,245,255,0.3), inset 0 0 15px rgba(0,245,255,0.05)'
                      : mode.color === 'pink' ?'0 0 15px rgba(255,0,110,0.3), inset 0 0 15px rgba(255,0,110,0.05)' :'0 0 15px rgba(255,190,11,0.3), inset 0 0 15px rgba(255,190,11,0.05)' :'none',
                }}
              >
                {selectedMode === mode.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current animate-pulse" style={{ color: 'inherit' }} />
                )}
                <span className="text-2xl mb-2 block">{mode.icon}</span>
                <span className={`block font-bold text-sm tracking-wide ${mode.textClass}`}>
                  {mode.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-8">
          <button
            onClick={handlePlay}
            className="game-btn game-btn-primary flex-1 py-4 text-base glow-cyan"
          >
            <span className="mr-2">▶</span> Play Now
          </button>
          <button
            onClick={() => setShowHowTo(true)}
            className="game-btn game-btn-accent py-4 px-6 text-base"
          >
            How to Play
          </button>
        </div>

        {/* high scores */}
        <div className="w-full max-w-lg">
          <div className="hud-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                🏆 High Scores
              </span>
              <span className="text-xs text-muted-foreground">Local</span>
            </div>
            {highScores.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-2">
                No scores yet — play your first game!
              </p>
            ) : (
              <div className="space-y-2">
                {highScores.slice(0, 3).map((hs, i) => (
                  <div key={`hs-${i}-${hs.mode}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-4">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{hs.mode}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">Lvl {hs.level}</span>
                      <span className="text-sm font-bold font-mono text-neon-cyan tabular-nums">
                        {hs.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* version tag */}
        <p className="mt-6 text-xs text-muted-foreground opacity-40 tracking-widest">
          v1.0.0 &nbsp;·&nbsp; © 2026 EmojiStronghold
        </p>
      </div>

      {/* HOW TO PLAY MODAL */}
      {showHowTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowHowTo(false)}
        >
          <div
            className="neon-card border-2 border-neon-cyan w-full max-w-lg p-6 slide-up-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 0 40px rgba(0,245,255,0.2)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-neon-cyan tracking-wide">HOW TO PLAY</h2>
              <button
                onClick={() => setShowHowTo(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {HOW_TO_STEPS.map((step) => (
                <div key={`howto-${step.num}`} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-neon-cyan flex items-center justify-center">
                    <span className="text-xs font-bold text-neon-cyan">{step.num}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-lg" style={{ background: 'rgba(255,190,11,0.08)', border: '1px solid rgba(255,190,11,0.3)' }}>
              <p className="text-xs text-neon-yellow font-semibold">
                ⚠️ Pro tip: A tighter wall = more bonus points. But leave room for bouncing projectiles!
              </p>
            </div>
            <button
              onClick={() => { setShowHowTo(false); handlePlay(); }}
              className="game-btn game-btn-primary w-full py-3 mt-5 text-sm"
            >
              Got it — Let&apos;s Play!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}