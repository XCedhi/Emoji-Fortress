import React from 'react';
import AppImage from './AppImage';

interface AppLogoProps {
  src?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export default function AppLogo({
  src = '/assets/images/app_logo.png',
  size = 64,
  className = '',
  onClick,
}: AppLogoProps) {
  return (
    <div
      className={`flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      style={{ width: size, height: size }}
    >
      <AppImage
        src={src}
        alt="Emoji Fortress app logo — hexagonal fortress shield with neon glow"
        width={size}
        height={size}
        className="object-contain w-full h-full"
        priority
      />
    </div>
  );
}