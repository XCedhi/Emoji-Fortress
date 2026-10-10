'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';

// ── emoji data ─────────────────────────────────────────────────────────────
interface EmojiEntry {
  id: string;
  char: string;
  name: string;
  category: string;
}

const EMOJI_DATA: EmojiEntry[] = [
  // Faces
  { id: 'emoji-grinning',    char: '😀', name: 'Grinning',       category: 'faces' },
  { id: 'emoji-sunglasses',  char: '😎', name: 'Cool',           category: 'faces' },
  { id: 'emoji-pleading',    char: '🥺', name: 'Pleading',       category: 'faces' },
  { id: 'emoji-robot',       char: '🤖', name: 'Robot',          category: 'faces' },
  { id: 'emoji-ghost',       char: '👻', name: 'Ghost',          category: 'faces' },
  { id: 'emoji-alien',       char: '👽', name: 'Alien',          category: 'faces' },
  { id: 'emoji-clown',       char: '🤡', name: 'Clown',          category: 'faces' },
  { id: 'emoji-skull',       char: '💀', name: 'Skull',          category: 'faces' },
  { id: 'emoji-fire',        char: '😤', name: 'Determined',     category: 'faces' },
  { id: 'emoji-angry',       char: '😡', name: 'Angry',          category: 'faces' },
  { id: 'emoji-cry',         char: '😭', name: 'Crying',         category: 'faces' },
  { id: 'emoji-laugh',       char: '🤣', name: 'ROFL',           category: 'faces' },
  { id: 'emoji-mind-blown',  char: '🤯', name: 'Mind Blown',     category: 'faces' },
  { id: 'emoji-nerd',        char: '🤓', name: 'Nerd',           category: 'faces' },
  { id: 'emoji-cowboy',      char: '🤠', name: 'Cowboy',         category: 'faces' },
  { id: 'emoji-devil',       char: '😈', name: 'Devil',          category: 'faces' },
  // Animals
  { id: 'emoji-cat',         char: '🐱', name: 'Cat',            category: 'animals' },
  { id: 'emoji-dog',         char: '🐶', name: 'Dog',            category: 'animals' },
  { id: 'emoji-fox',         char: '🦊', name: 'Fox',            category: 'animals' },
  { id: 'emoji-panda',       char: '🐼', name: 'Panda',          category: 'animals' },
  { id: 'emoji-dragon',      char: '🐉', name: 'Dragon',         category: 'animals' },
  { id: 'emoji-unicorn',     char: '🦄', name: 'Unicorn',        category: 'animals' },
  { id: 'emoji-frog',        char: '🐸', name: 'Frog',           category: 'animals' },
  { id: 'emoji-owl',         char: '🦉', name: 'Owl',            category: 'animals' },
  { id: 'emoji-shark',       char: '🦈', name: 'Shark',          category: 'animals' },
  { id: 'emoji-wolf',        char: '🐺', name: 'Wolf',           category: 'animals' },
  { id: 'emoji-lion',        char: '🦁', name: 'Lion',           category: 'animals' },
  { id: 'emoji-bear',        char: '🐻', name: 'Bear',           category: 'animals' },
  // Food
  { id: 'emoji-pizza',       char: '🍕', name: 'Pizza',          category: 'food' },
  { id: 'emoji-burger',      char: '🍔', name: 'Burger',         category: 'food' },
  { id: 'emoji-taco',        char: '🌮', name: 'Taco',           category: 'food' },
  { id: 'emoji-donut',       char: '🍩', name: 'Donut',          category: 'food' },
  { id: 'emoji-cake',        char: '🎂', name: 'Cake',           category: 'food' },
  { id: 'emoji-sushi',       char: '🍣', name: 'Sushi',          category: 'food' },
  { id: 'emoji-ramen',       char: '🍜', name: 'Ramen',          category: 'food' },
  { id: 'emoji-icecream',    char: '🍦', name: 'Ice Cream',      category: 'food' },
  // Objects
  { id: 'emoji-diamond',     char: '💎', name: 'Diamond',        category: 'objects' },
  { id: 'emoji-crown',       char: '👑', name: 'Crown',          category: 'objects' },
  { id: 'emoji-trophy',      char: '🏆', name: 'Trophy',         category: 'objects' },
  { id: 'emoji-rocket',      char: '🚀', name: 'Rocket',         category: 'objects' },
  { id: 'emoji-bomb',        char: '💣', name: 'Bomb',           category: 'objects' },
  { id: 'emoji-crystal',     char: '🔮', name: 'Crystal Ball',   category: 'objects' },
  { id: 'emoji-lightning',   char: '⚡', name: 'Lightning',      category: 'objects' },
  { id: 'emoji-star',        char: '⭐', name: 'Star',           category: 'objects' },
  { id: 'emoji-heart',       char: '💖', name: 'Sparkling Heart',category: 'objects' },
  { id: 'emoji-fire-elem',   char: '🔥', name: 'Fire',           category: 'objects' },
  { id: 'emoji-controller',  char: '🎮', name: 'Controller',     category: 'objects' },
  { id: 'emoji-shield',      char: '🛡️', name: 'Shield',        category: 'objects' },
];

const CATEGORIES = [
  { id: 'all',     label: 'All',     icon: '✨' },
  { id: 'faces',   label: 'Faces',   icon: '😀' },
  { id: 'animals', label: 'Animals', icon: '🐱' },
  { id: 'food',    label: 'Food',    icon: '🍕' },
  { id: 'objects', label: 'Objects', icon: '💎' },
] as const;

// ── emoji reactions based on state ────────────────────────────────────────
const READY_MESSAGES = [
  'Ready to be protected!',
  'Don\'t let them get me!',
  'Draw me a fortress!',
  'I believe in you!',
  'Make it tight!',
];

export default function EmojiSelectionScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('emoji-grinning');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [readyMsgIdx, setReadyMsgIdx] = useState(0);
  const [customEmoji, setCustomEmoji] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [previewAnimClass, setPreviewAnimClass] = useState('emoji-bounce');

  // cycle ready messages
  useEffect(() => {
    const t = setInterval(() => {
      setReadyMsgIdx((i) => (i + 1) % READY_MESSAGES.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // trigger bounce on selection change
  useEffect(() => {
    setPreviewAnimClass('');
    const t = setTimeout(() => setPreviewAnimClass('emoji-bounce'), 50);
    return () => clearTimeout(t);
  }, [selectedId]);

  const filteredEmojis = useMemo(() => {
    return EMOJI_DATA.filter((e) => {
      const matchesCat = category === 'all' || e.category === category;
      const matchesSearch = search === '' ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.char.includes(search);
      return matchesCat && matchesSearch;
    });
  }, [category, search]);

  const selectedEmoji = useMemo(() => {
    if (customMode && customEmoji) {
      return { id: 'custom', char: customEmoji, name: 'Custom', category: 'custom' };
    }
    return EMOJI_DATA.find((e) => e.id === selectedId) ?? EMOJI_DATA[0];
  }, [selectedId, customMode, customEmoji]);

  const handleStartGame = () => {
    // Backend integration point: save selected emoji to game session context
    localStorage.setItem('emoji-fortress-selected', JSON.stringify({
      char: selectedEmoji.char,
      name: selectedEmoji.name,
    }));
    router.push('/game-screen');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="relative min-h-screen bg-navy-deep grid-bg flex flex-col">
      {/* scanlines */}
      <div className="absolute inset-0 pointer-events-none scanline-bg opacity-20" />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-neon-cyan transition-colors text-sm font-medium"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Back to Menu</span>
        </button>
        <div className="flex items-center gap-2">
          <AppLogo size={32} />
          <span className="font-black text-base tracking-tight text-neon-cyan">EMOJI FORTRESS</span>
        </div>
        <div className="w-24 sm:w-32" />
      </header>

      {/* main content */}
      <div className="relative z-10 flex flex-col lg:flex-row flex-1 gap-0">

        {/* LEFT: emoji preview panel */}
        <div className="lg:w-72 xl:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col items-center justify-center gap-5">
          {/* preview */}
          <div className="relative flex items-center justify-center">
            {/* glow rings */}
            <div
              className="absolute rounded-full opacity-20"
              style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(0,245,255,0.3) 0%, transparent 70%)' }}
            />
            <div
              className="absolute rounded-full border border-neon-cyan opacity-30 pulse-ring"
              style={{ width: 140, height: 140 }}
            />
            <div
              className="absolute rounded-full border border-neon-cyan opacity-20"
              style={{ width: 170, height: 170 }}
            />
            {/* emoji */}
            <span
              className={`text-8xl sm:text-9xl select-none ${previewAnimClass}`}
              style={{ filter: 'drop-shadow(0 0 20px rgba(0,245,255,0.4))' }}
            >
              {selectedEmoji.char}
            </span>
          </div>

          {/* name + message */}
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{selectedEmoji.name}</p>
            <p className="text-xs text-neon-cyan mt-1 font-medium animate-pulse">
              {READY_MESSAGES[readyMsgIdx]}
            </p>
          </div>

          {/* stats preview */}
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Difficulty</span>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((dot) => (
                  <div
                    key={`diff-dot-${dot}`}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: dot <= 3 ? 'var(--neon-cyan)' : 'var(--muted)',
                      boxShadow: dot <= 3 ? '0 0 4px var(--neon-cyan)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Hitbox Size</span>
              <span className="text-neon-yellow font-mono">Medium</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Starting Lives</span>
              <span className="text-neon-pink">❤️ ❤️ ❤️</span>
            </div>
          </div>

          {/* custom emoji input */}
          <div className="w-full">
            <button
              onClick={() => setCustomMode((v) => !v)}
              className="text-xs text-muted-foreground hover:text-neon-cyan transition-colors w-full text-center mb-2"
            >
              {customMode ? '← Back to grid' : '✏️ Use custom emoji'}
            </button>
            {customMode && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value.slice(0, 2))}
                  placeholder="Paste emoji..."
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-2xl text-center focus:outline-none focus:border-neon-cyan transition-colors"
                  maxLength={2}
                />
              </div>
            )}
          </div>

          {/* start button */}
          <button
            onClick={handleStartGame}
            disabled={customMode && !customEmoji}
            className="game-btn game-btn-primary w-full py-4 text-sm glow-cyan disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Protect This Emoji →
          </button>
        </div>

        {/* RIGHT: emoji grid */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
          <h1 className="text-xl font-black text-foreground mb-4">
            Choose Your <span className="text-neon-cyan">Emoji</span>
          </h1>

          {/* search + filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emojis..."
                className="w-full bg-input border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            {/* category tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={`cat-${cat.id}`}
                  onClick={() => setCategory(cat.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150
                    ${category === cat.id
                      ? 'bg-neon-cyan text-navy-deep shadow-lg'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-navy-light'
                    }
                  `}
                  style={category === cat.id ? { boxShadow: '0 0 10px rgba(0,245,255,0.4)' } : {}}
                >
                  <span>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* results count */}
          <p className="text-xs text-muted-foreground mb-3">
            {filteredEmojis.length} emoji{filteredEmojis.length !== 1 ? 's' : ''} available
          </p>

          {/* emoji grid */}
          {filteredEmojis.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
              <span className="text-5xl">🔍</span>
              <p className="text-foreground font-semibold">No emojis found</p>
              <p className="text-muted-foreground text-sm">Try a different search or category</p>
              <button
                onClick={() => { setSearch(''); setCategory('all'); }}
                className="game-btn game-btn-primary px-6 py-2 text-xs mt-2"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    onClick={() => { setSelectedId(emoji.id); setCustomMode(false); }}
                    title={emoji.name}
                    className={`
                      relative aspect-square flex items-center justify-center rounded-xl text-2xl sm:text-3xl
                      transition-all duration-150 cursor-pointer border-2
                      ${selectedId === emoji.id && !customMode
                        ? 'border-neon-cyan scale-110' :'border-transparent hover:border-border hover:scale-105'
                      }
                    `}
                    style={{
                      background: selectedId === emoji.id && !customMode
                        ? 'rgba(0,245,255,0.1)'
                        : 'rgba(255,255,255,0.03)',
                      boxShadow: selectedId === emoji.id && !customMode
                        ? '0 0 12px rgba(0,245,255,0.3)'
                        : 'none',
                    }}
                  >
                    <span className="select-none">{emoji.char}</span>
                    {selectedId === emoji.id && !customMode && (
                      <span
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neon-cyan"
                        style={{ boxShadow: '0 0 6px var(--neon-cyan)' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* bottom tip */}
          <div className="mt-4 p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <span className="text-neon-yellow">💡 Tip:</span> The emoji&apos;s size determines your hitbox.
              Larger emojis are easier to draw around. Smaller ones require more precision!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}