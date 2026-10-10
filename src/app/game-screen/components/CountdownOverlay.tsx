'use client';

import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  onComplete: () => void;
}

export default function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(3);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (count === 0) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCount((c) => c - 1);
      setKey((k) => k + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <p className="text-muted-foreground text-sm font-semibold tracking-widest uppercase mb-4">
        Get Ready to Draw!
      </p>
      <div
        key={`countdown-${key}`}
        className="countdown-pulse text-9xl font-black text-neon-cyan text-glow-cyan"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {count === 0 ? 'GO!' : count}
      </div>
    </div>
  );
}