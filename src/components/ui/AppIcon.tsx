import React from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';

type HeroIconName = keyof typeof HeroIcons;
type HeroIconSolidName = keyof typeof HeroIconsSolid;

interface IconProps {
  name: HeroIconName | HeroIconSolidName;
  variant?: 'outline' | 'solid';
  size?: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function Icon({
  name,
  variant = 'outline',
  size = 24,
  className = '',
  onClick,
  disabled = false,
}: IconProps) {
  const icons = variant === 'solid' ? HeroIconsSolid : HeroIcons;
  const IconComponent = (icons as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[name];

  if (!IconComponent) return null;

  return (
    <IconComponent
      style={{ width: size, height: size }}
      className={`${className} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={disabled ? undefined : onClick}
      aria-hidden="true"
    />
  );
}