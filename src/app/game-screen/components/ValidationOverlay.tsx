'use client';

import React, { useEffect, useState } from 'react';

interface ValidationOverlayProps {
  isValid: boolean;
  onComplete: () => void;
}

export default function ValidationOverlay({ isValid, onComplete }: ValidationOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, isValid ? 1200 : 2000);
    return () => clearTimeout(t);
  }, [isValid, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
    >
      <div
        className={`slide-up-in neon-card border-2 px-8 py-5 text-center ${
          isValid ? 'border-neon-green' : 'border-neon-pink'
        }`}
        style={{
          boxShadow: isValid
            ? '0 0 40px rgba(57,255,20,0.3)'
            : '0 0 40px rgba(255,0,110,0.3)',
        }}
      >
        <div className="text-4xl mb-2">{isValid ? '✅' : '❌'}</div>
        <p
          className="text-lg font-black tracking-wide"
          style={{ color: isValid ? 'var(--neon-green)' : 'var(--neon-pink)' }}
        >
          {isValid ? 'WALL SECURED!' : 'WALL INVALID!'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isValid
            ? 'Bracing for impact...'
            : 'Shape not closed or emoji not enclosed'}
        </p>
      </div>
    </div>
  );
}