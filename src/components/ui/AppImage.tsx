'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface AppImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  fill?: boolean;
  sizes?: string;
  onClick?: () => void;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  unoptimized?: boolean;
}

export default function AppImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality,
  placeholder,
  fill = false,
  sizes,
  onClick,
  fallbackSrc = '/assets/images/no_image.png',
  loading,
  unoptimized = false,
}: AppImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      fill={fill}
      sizes={sizes}
      onClick={onClick}
      loading={loading}
      unoptimized={unoptimized}
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
}