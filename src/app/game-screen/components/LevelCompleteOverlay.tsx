'use client';

import React, { useEffect, useState } from 'react';

interface LevelCompleteOverlayProps {
  level: number;
  score: number;
  timeBonus: number;
  efficiencyBonus: number;
  stars: number;
  onNextLevel: () => void;
  onMainMenu: () => void;
}

export default function LevelCompleteOverlay({
  level,
  score,
  timeBonus,
  efficiencyBonus,
  stars,
  onNextLevel,
  onMainMenu,
}: LevelCompleteOverlayProps) {
  const [showStars, setShowStars] = useState(false);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowStars(true), 300);
    const t2 = setTimeout(() => setShowScore(true), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div className="overlay-slide neon-card border-2 border-neon-cyan w-full max-w-sm mx-4 p-8 text-center"
        style={{ boxShadow: '0 0 60px rgba(0,245,255,0.25)' }}
      >
        {/* confetti emoji */}
        <div className="text-5xl mb-3 emoji-celebrate">🎉</div>

        <h2 className="text-2xl font-black text-neon-cyan text-glow-cyan tracking-wide mb-1">
          LEVEL CLEAR!
        </h2>
        <p className="text-muted-foreground text-sm mb-5">
          Level {level} completed
        </p>

        {/* stars */}
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3].map((s) => (
            <span
              key={`complete-star-${s}`}
              className={`text-4xl transition-all duration-300 ${
                s <= stars ? (
                  s === 1 ? 'star-pop-1' : s === 2 ? 'star-pop-2' : 'star-pop-3' ) :'opacity-20'
              }`}
              style={{
                filter: showStars && s <= stars ? 'drop-shadow(0 0 8px #ffbe0b)' : 'none',
              }}
            >
              ⭐
            </span>
          ))}
        </div>

        {/* score breakdown */}
        {showScore && (
          <div className="space-y-2 mb-6 fade-in">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Level Bonus</span>
              <span className="font-mono font-bold text-foreground tabular-nums">+100</span>
            </div>
            {timeBonus > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">⏱ Time Bonus</span>
                <span className="font-mono font-bold text-neon-yellow tabular-nums">+{timeBonus}</span>
              </div>
            )}
            {efficiencyBonus > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">🎯 Wall Efficiency</span>
                <span className="font-mono font-bold text-neon-green tabular-nums">+{efficiencyBonus}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
              <span className="font-semibold text-foreground">Total Score</span>
              <span className="font-mono font-black text-neon-cyan text-xl tabular-nums text-glow-cyan">
                {score.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* buttons */}
        <div className="flex gap-3">
          <button
            onClick={onMainMenu}
            className="game-btn flex-1 py-3 text-sm border-2 border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            Menu
          </button>
          <button
            onClick={onNextLevel}
            className="game-btn game-btn-primary flex-1 py-3 text-sm glow-cyan"
          >
            Level {level + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}