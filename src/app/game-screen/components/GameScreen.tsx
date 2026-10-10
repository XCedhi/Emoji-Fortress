'use client';

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { GamePhase, Point, ProjectileWaveConfig, GameCanvasRef } from './GameCanvas';
import GameHUD from './GameHUD';
import LevelCompleteOverlay from './LevelCompleteOverlay';
import GameOverOverlay from './GameOverOverlay';
import CountdownOverlay from './CountdownOverlay';
import ValidationOverlay from './ValidationOverlay';
import PauseOverlay from './PauseOverlay';

// dynamic import to avoid SSR issues with canvas
const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false });

// ── level config ───────────────────────────────────────────────────────────
interface LevelConfig {
  projectileCount: number;
  speed: number;
  drawTimeMs: number;
  types: Array<'basic' | 'fast' | 'bouncer' | 'splitter' | 'homing'>;
  spawnInterval: number;
}

function getLevelConfig(level: number): LevelConfig {
  const base: LevelConfig = {
    projectileCount: 1,
    speed: 2.5,
    drawTimeMs: 6000,
    types: ['basic'],
    spawnInterval: 80,
  };

  if (level === 1) return { ...base, projectileCount: 1, speed: 2.5, drawTimeMs: 6000, types: ['basic'], spawnInterval: 90 };
  if (level === 2) return { ...base, projectileCount: 2, speed: 2.5, drawTimeMs: 5000, types: ['basic'], spawnInterval: 80 };
  if (level === 3) return { ...base, projectileCount: 3, speed: 3.0, drawTimeMs: 5000, types: ['basic'], spawnInterval: 70 };
  if (level === 4) return { ...base, projectileCount: 3, speed: 3.0, drawTimeMs: 4000, types: ['basic', 'bouncer'], spawnInterval: 70 };
  if (level === 5) return { ...base, projectileCount: 5, speed: 3.5, drawTimeMs: 4000, types: ['basic', 'bouncer'], spawnInterval: 60 };
  if (level === 6) return { ...base, projectileCount: 5, speed: 4.0, drawTimeMs: 3000, types: ['basic', 'bouncer', 'splitter'], spawnInterval: 55 };
  if (level === 7) return { ...base, projectileCount: 7, speed: 4.5, drawTimeMs: 3000, types: ['basic', 'fast', 'bouncer', 'splitter'], spawnInterval: 50 };
  if (level === 8) return { ...base, projectileCount: 8, speed: 5.0, drawTimeMs: 2500, types: ['basic', 'fast', 'bouncer', 'splitter'], spawnInterval: 45 };
  if (level === 9) return { ...base, projectileCount: 10, speed: 5.5, drawTimeMs: 2000, types: ['fast', 'bouncer', 'splitter'], spawnInterval: 40 };
  if (level === 10) return { ...base, projectileCount: 12, speed: 6.0, drawTimeMs: 2000, types: ['fast', 'bouncer', 'splitter', 'homing'], spawnInterval: 35 };

  // level 11+
  const extra = level - 10;
  return {
    projectileCount: 12 + extra * 2,
    speed: Math.min(6.0 + extra * 0.3, 10),
    drawTimeMs: Math.max(1500, 2000 - extra * 50),
    types: ['fast', 'bouncer', 'splitter', 'homing'],
    spawnInterval: Math.max(25, 35 - extra * 2),
  };
}

function calculateStars(timeLeftMs: number, drawTimeMs: number, wallPerimeter: number): number {
  const timeRatio = timeLeftMs / drawTimeMs;
  // smaller perimeter relative to a 'huge' wall = better efficiency
  const efficiencyScore = Math.max(0, 1 - wallPerimeter / 3000);
  let total = timeRatio * 0.5 + efficiencyScore * 0.5;
  if (total > 0.7) return 3;
  if (total > 0.35) return 2;
  return 1;
}

function calculateWallPerimeter(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// ── main component ─────────────────────────────────────────────────────────
export default function GameScreen() {
  const router = useRouter();
  const canvasRef = useRef<GameCanvasRef>(null);
  const drawTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [drawTimeLeft, setDrawTimeLeft] = useState(6000);
  const [isShaking, setIsShaking] = useState(false);
  const [emojiChar, setEmojiChar] = useState('😀');
  const [drawColor, setDrawColor] = useState('#00f5ff');
  const [gameOverReason, setGameOverReason] = useState<'hit' | 'timeout' | 'invalid_wall'>('hit');
  const [levelCompleteData, setLevelCompleteData] = useState({
    timeBonus: 0, efficiencyBonus: 0, stars: 1,
  });
  const [validationResult, setValidationResult] = useState<{ valid: boolean } | null>(null);
  const [drawnPoints, setDrawnPoints] = useState<Point[]>([]);
  const [projectilesLeft, setProjectilesLeft] = useState(0);

  const levelConfig = getLevelConfig(level);

  // ── load emoji from storage ────────────────────────────────────────────
  useEffect(() => {
    // Backend integration point: load selected emoji from game session
    const stored = localStorage.getItem('emoji-fortress-selected');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setEmojiChar(parsed.char || '😀');
      } catch {
        setEmojiChar('😀');
      }
    }
    // pick a random draw color from neon palette
    const colors = ['#00f5ff', '#ff006e', '#ffbe0b', '#39ff14', '#bf5af2'];
    setDrawColor(colors[Math.floor(Date.now() / 1000) % colors.length]);
    // start countdown
    setTimeout(() => setPhase('countdown'), 300);
  }, []);

  // ── countdown complete → drawing phase ────────────────────────────────
  const handleCountdownComplete = useCallback(() => {
    setPhase('drawing');
    canvasRef.current?.startDrawPhase();
    const config = getLevelConfig(level);
    setDrawTimeLeft(config.drawTimeMs);

    // draw timer
    const interval = 100;
    let remaining = config.drawTimeMs;
    drawTimerRef.current = setInterval(() => {
      remaining -= interval;
      setDrawTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(drawTimerRef.current!);
        // time ran out
        setGameOverReason('timeout');
        setPhase('game_over');
      }
    }, interval);
  }, [level]);

  // ── draw complete ──────────────────────────────────────────────────────
  const handleDrawComplete = useCallback((points: Point[]) => {
    if (drawTimerRef.current) clearInterval(drawTimerRef.current);
    setDrawnPoints(points);
    setPhase('validating');
  }, []);

  // ── validation complete ────────────────────────────────────────────────
  const handleValidationComplete = useCallback(() => {
    // check if wall was valid (set by GameCanvas in validating phase)
    // we use a small delay to let canvas set wall state
    const stored = localStorage.getItem('emoji-fortress-wall-valid');
    const isValid = stored === 'true';
    localStorage.removeItem('emoji-fortress-wall-valid');

    if (!isValid) {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setGameOverReason('invalid_wall');
        setPhase('game_over');
      } else {
        // retry draw
        setTimeout(() => setPhase('countdown'), 500);
      }
      return;
    }

    // start defense
    setPhase('defending');
    canvasRef.current?.startDefensePhase();
    setProjectilesLeft(levelConfig.projectileCount);
  }, [lives, levelConfig.projectileCount]);

  // ── projectile hit emoji ───────────────────────────────────────────────
  const handleProjectileHitEmoji = useCallback(() => {
    const newLives = lives - 1;
    setLives(newLives);
    handleShake();
    if (newLives <= 0) {
      setGameOverReason('hit');
      setPhase('game_over');
    } else {
      // restart level
      setTimeout(() => {
        canvasRef.current?.clearWall();
        setPhase('countdown');
      }, 1500);
    }
  }, [lives]);

  // ── wave complete ──────────────────────────────────────────────────────
  const handleWaveComplete = useCallback(() => {
    const config = getLevelConfig(level);
    const timeBonus = Math.floor((drawTimeLeft / config.drawTimeMs) * 50);
    const perimeter = calculateWallPerimeter(drawnPoints);
    const efficiencyBonus = Math.max(0, Math.floor((1 - perimeter / 3000) * 30));
    const stars = calculateStars(drawTimeLeft, config.drawTimeMs, perimeter);
    const levelScore = 100 + timeBonus + efficiencyBonus;

    setScore((s) => s + levelScore);
    setLevelCompleteData({ timeBonus, efficiencyBonus, stars });
    setPhase('level_complete');
  }, [level, drawTimeLeft, drawnPoints]);

  // ── screen shake ───────────────────────────────────────────────────────
  const handleShake = useCallback(() => {
    setIsShaking(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setIsShaking(false), 350);
  }, []);

  // ── next level ────────────────────────────────────────────────────────
  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    canvasRef.current?.clearWall();
    setDrawnPoints([]);
    setProjectilesLeft(0);
    setPhase('countdown');
  }, [level]);

  // ── retry ─────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setLevel(1);
    setScore(0);
    setLives(3);
    canvasRef.current?.clearWall();
    setDrawnPoints([]);
    setProjectilesLeft(0);
    setPhase('countdown');
  }, []);

  // ── pause ─────────────────────────────────────────────────────────────
  const handlePause = useCallback(() => {
    if (phase === 'drawing' && drawTimerRef.current) {
      clearInterval(drawTimerRef.current);
    }
    setPhase('paused');
  }, [phase]);

  const handleResume = useCallback(() => {
    if (drawnPoints.length === 0) {
      setPhase('drawing');
      // restart timer
      const config = getLevelConfig(level);
      let remaining = drawTimeLeft;
      drawTimerRef.current = setInterval(() => {
        remaining -= 100;
        setDrawTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(drawTimerRef.current!);
          setGameOverReason('timeout');
          setPhase('game_over');
        }
      }, 100);
    } else {
      setPhase('defending');
    }
  }, [drawnPoints, drawTimeLeft, level]);

  // ── save high score on game over ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'game_over') return;
    // Backend integration point: POST score to leaderboard API
    const mode = localStorage.getItem('emoji-fortress-mode') || 'classic';
    const stored = localStorage.getItem('emoji-fortress-scores');
    let scores = [];
    try { scores = stored ? JSON.parse(stored) : []; } catch { scores = []; }
    scores.push({ mode, score, level, date: new Date().toISOString().split('T')[0] });
    scores.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    localStorage.setItem('emoji-fortress-scores', JSON.stringify(scores.slice(0, 10)));
  }, [phase, score, level]);

  // ── keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'drawing') handlePause();
      if (e.key === 'Escape' && phase === 'paused') handleResume();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, handlePause, handleResume]);

  // ── cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (drawTimerRef.current) clearInterval(drawTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // ── projectile config for canvas ──────────────────────────────────────
  const projectileConfig: ProjectileWaveConfig = {
    count: levelConfig.projectileCount,
    speed: levelConfig.speed,
    types: levelConfig.types,
    spawnInterval: levelConfig.spawnInterval,
  };

  return (
    <div
      className={`relative w-full h-screen overflow-hidden bg-navy-deep ${isShaking ? 'screen-shake' : ''}`}
    >
      {/* game canvas */}
      <GameCanvas
        ref={canvasRef}
        phase={phase}
        level={level}
        emojiChar={emojiChar}
        drawColor={drawColor}
        onDrawComplete={handleDrawComplete}
        onProjectileHitEmoji={handleProjectileHitEmoji}
        onWaveComplete={handleWaveComplete}
        onShake={handleShake}
        projectileConfig={projectileConfig}
      />

      {/* HUD */}
      {phase !== 'game_over' && phase !== 'level_complete' && phase !== 'paused' && (
        <GameHUD
          phase={phase}
          level={level}
          score={score}
          lives={lives}
          maxLives={3}
          drawTimeLeft={drawTimeLeft}
          drawTimeMax={levelConfig.drawTimeMs}
          projectilesLeft={projectilesLeft}
          totalProjectiles={levelConfig.projectileCount}
          onPause={handlePause}
        />
      )}

      {/* countdown overlay */}
      {phase === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}

      {/* validation overlay */}
      {phase === 'validating' && validationResult !== null && (
        <ValidationOverlay
          isValid={validationResult.valid}
          onComplete={handleValidationComplete}
        />
      )}

      {/* level complete */}
      {phase === 'level_complete' && (
        <LevelCompleteOverlay
          level={level}
          score={score}
          timeBonus={levelCompleteData.timeBonus}
          efficiencyBonus={levelCompleteData.efficiencyBonus}
          stars={levelCompleteData.stars}
          onNextLevel={handleNextLevel}
          onMainMenu={() => router.push('/')}
        />
      )}

      {/* game over */}
      {phase === 'game_over' && (
        <GameOverOverlay
          level={level}
          score={score}
          reason={gameOverReason}
          onRetry={handleRetry}
          onMainMenu={() => router.push('/')}
        />
      )}

      {/* pause */}
      {phase === 'paused' && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handleRetry}
          onMainMenu={() => router.push('/')}
        />
      )}

      {/* draw color picker — bottom right */}
      {phase === 'drawing' && (
        <div className="absolute bottom-20 right-4 z-20 hud-panel p-2 flex flex-col gap-1.5 pointer-events-auto fade-in">
          <p className="text-xs text-muted-foreground text-center mb-1">Color</p>
          {['#00f5ff', '#ff006e', '#ffbe0b', '#39ff14', '#bf5af2'].map((color) => (
            <button
              key={`color-${color}`}
              onClick={() => setDrawColor(color)}
              className="w-6 h-6 rounded-full transition-all duration-150 border-2"
              style={{
                background: color,
                borderColor: drawColor === color ? '#ffffff' : 'transparent',
                boxShadow: drawColor === color ? `0 0 8px ${color}` : 'none',
                transform: drawColor === color ? 'scale(1.2)' : 'scale(1)',
              }}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}