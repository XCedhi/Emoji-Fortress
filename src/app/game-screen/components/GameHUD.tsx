'use client';

import React from 'react';
import type { GamePhase } from './GameCanvas';

interface GameHUDProps {
  phase: GamePhase;
  level: number;
  score: number;
  lives: number;
  maxLives: number;
  drawTimeLeft: number;
  drawTimeMax: number;
  projectilesLeft: number;
  totalProjectiles: number;
  onPause: () => void;
}

export default function GameHUD({
  phase,
  level,
  score,
  lives,
  maxLives,
  drawTimeLeft,
  drawTimeMax,
  projectilesLeft,
  totalProjectiles,
  onPause,
}: GameHUDProps) {
  const timerPct = (drawTimeLeft / drawTimeMax) * 100;
  const timerColor = timerPct > 50 ? 'var(--neon-cyan)' : timerPct > 25 ? 'var(--neon-yellow)' : 'var(--neon-pink)';

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* top HUD bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
        {/* left: level + score */}
        <div className="hud-panel px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground leading-none mb-0.5">
                Level
              </p>
              <p className="text-2xl font-black text-neon-cyan tabular-nums leading-none text-glow-cyan">
                {level}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground leading-none mb-0.5">
                Score
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums leading-none font-mono">
                {score.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* center: phase badge + timer */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-xs">
          {/* phase badge */}
          <div className="hud-panel px-3 py-1.5 pointer-events-none">
            {phase === 'drawing' && (
              <span className="phase-badge phase-draw">⟳ DRAW PHASE</span>
            )}
            {phase === 'validating' && (
              <span className="phase-badge phase-validate">✓ VALIDATING</span>
            )}
            {phase === 'defending' && (
              <span className="phase-badge phase-defend">⚡ DEFEND!</span>
            )}
            {phase === 'countdown' && (
              <span className="phase-badge phase-validate">◉ GET READY</span>
            )}
            {phase === 'idle' && (
              <span className="phase-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                STARTING
              </span>
            )}
          </div>

          {/* draw timer bar */}
          {phase === 'drawing' && (
            <div className="w-full hud-panel px-3 py-2 pointer-events-none">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground font-semibold">Draw Time</span>
                <span
                  className="text-sm font-black font-mono tabular-nums"
                  style={{ color: timerColor }}
                >
                  {(drawTimeLeft / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${timerPct}%`,
                    background: timerColor,
                    boxShadow: `0 0 8px ${timerColor}`,
                  }}
                />
              </div>
            </div>
          )}

          {/* projectile counter during defense */}
          {phase === 'defending' && (
            <div className="hud-panel px-3 py-2 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Projectiles</span>
                <div className="flex gap-1">
                  {Array.from({ length: totalProjectiles }, (_, i) => (
                    <div
                      key={`proj-indicator-${i}`}
                      className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{
                        background: i < projectilesLeft ? 'var(--neon-pink)' : 'var(--muted)',
                        boxShadow: i < projectilesLeft ? '0 0 4px var(--neon-pink)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* right: lives + pause */}
        <div className="flex flex-col items-end gap-2">
          <div className="hud-panel px-4 py-2.5 pointer-events-auto flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: maxLives }, (_, i) => (
                <span
                  key={`life-heart-${i}`}
                  className="text-lg transition-all duration-300"
                  style={{
                    opacity: i < lives ? 1 : 0.2,
                    filter: i < lives ? 'drop-shadow(0 0 4px #ff006e)' : 'none',
                    transform: i < lives ? 'scale(1)' : 'scale(0.8)',
                  }}
                >
                  ❤️
                </span>
              ))}
            </div>
            <button
              onClick={onPause}
              className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors text-sm ml-1"
              title="Pause"
            >
              ⏸
            </button>
          </div>
        </div>
      </div>

      {/* bottom: draw instruction */}
      {phase === 'drawing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none fade-in">
          <div className="hud-panel px-5 py-3 text-center">
            <p className="text-sm font-semibold text-neon-cyan">
              ✏️ Draw a closed shape around the emoji
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &amp; drag — release to finish
            </p>
          </div>
        </div>
      )}

      {/* defending tip */}
      {phase === 'defending' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none fade-in">
          <div className="hud-panel px-5 py-2">
            <p className="text-xs font-semibold text-neon-pink text-center">
              ⚡ Projectiles incoming — protect your emoji!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}