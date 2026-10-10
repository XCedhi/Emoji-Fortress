'use client';

import React from 'react';

interface GameOverOverlayProps {
  level: number;
  score: number;
  reason: 'hit' | 'timeout' | 'invalid_wall';
  onRetry: () => void;
  onMainMenu: () => void;
}

const REASON_DATA = {
  hit: {
    emoji: '💥',
    title: 'EMOJI DOWN!',
    desc: 'A projectile got through your wall.',
    color: 'var(--neon-pink)',
    tip: 'Make sure your wall fully surrounds the emoji with no gaps.',
  },
  timeout: {
    emoji: '⏰',
    title: 'TIME\'S UP!',
    desc: 'You ran out of time to draw a wall.',
    color: 'var(--neon-yellow)',
    tip: 'Practice drawing quick circles — you don\'t need to be perfect, just fast!',
  },
  invalid_wall: {
    emoji: '⚠️',
    title: 'WALL INVALID!',
    desc: 'Your shape wasn\'t closed or didn\'t surround the emoji.',
    color: 'var(--neon-yellow)',
    tip: 'Connect your start and end points. The emoji must be inside your shape.',
  },
};

export default function GameOverOverlay({
  level,
  score,
  reason,
  onRetry,
  onMainMenu,
}: GameOverOverlayProps) {
  const data = REASON_DATA[reason];

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="overlay-slide neon-card border-2 w-full max-w-sm mx-4 p-8 text-center"
        style={{ borderColor: data.color, boxShadow: `0 0 60px ${data.color}33` }}
      >
        {/* icon */}
        <div className="text-6xl mb-3">{data.emoji}</div>

        <h2
          className="text-2xl font-black tracking-wide mb-1"
          style={{ color: data.color }}
        >
          {data.title}
        </h2>
        <p className="text-muted-foreground text-sm mb-5">{data.desc}</p>

        {/* stats */}
        <div className="neon-card p-4 mb-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Level Reached</span>
            <span className="font-mono font-bold text-foreground tabular-nums">{level}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Final Score</span>
            <span className="font-mono font-black text-neon-cyan text-lg tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* tip */}
        <div
          className="p-3 rounded-lg mb-5 text-left"
          style={{ background: `${data.color}15`, border: `1px solid ${data.color}40` }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: data.color }}>
            💡 Pro Tip
          </p>
          <p className="text-xs text-muted-foreground">{data.tip}</p>
        </div>

        {/* buttons */}
        <div className="flex gap-3">
          <button
            onClick={onMainMenu}
            className="game-btn flex-1 py-3 text-sm border-2 border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            ← Menu
          </button>
          <button
            onClick={onRetry}
            className="game-btn game-btn-accent flex-1 py-3 text-sm glow-pink"
          >
            ↺ Retry
          </button>
        </div>
      </div>
    </div>
  );
}