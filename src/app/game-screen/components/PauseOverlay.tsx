'use client';

import React from 'react';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export default function PauseOverlay({ onResume, onRestart, onMainMenu }: PauseOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="slide-up-in neon-card border-2 border-neon-cyan w-full max-w-xs mx-4 p-8 text-center"
        style={{ boxShadow: '0 0 40px rgba(0,245,255,0.2)' }}
      >
        <div className="text-4xl mb-3">⏸</div>
        <h2 className="text-xl font-black text-neon-cyan tracking-wide mb-6">PAUSED</h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="game-btn game-btn-primary py-3 text-sm glow-cyan"
          >
            ▶ Resume
          </button>
          <button
            onClick={onRestart}
            className="game-btn game-btn-yellow py-3 text-sm"
          >
            ↺ Restart Level
          </button>
          <button
            onClick={onMainMenu}
            className="game-btn py-3 text-sm border-2 border-border text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            ← Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}