import React from 'react';
import { SkuItem } from '../types/kooleriq';

interface BeverageVisualProps {
  sku: SkuItem;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}

export const BeverageVisual: React.FC<BeverageVisualProps> = ({
  sku,
  size = 'md',
  dimmed = false,
}) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [sku.imageUrl]);

  const dims =
    size === 'sm'
      ? { w: 22, h: 38 }
      : size === 'lg'
        ? { w: 46, h: 80 }
        : { w: 30, h: 54 };

  const opacityClass = dimmed ? 'opacity-30 grayscale' : 'opacity-100';

  if (sku.imageUrl && !imgError) {
    return (
      <img
        src={sku.imageUrl}
        alt={sku.name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        style={{ width: dims.w + 8, height: dims.h }}
        className={`rounded object-cover shrink-0 border border-white/15 transition-opacity duration-150 ${opacityClass}`}
      />
    );
  }

  if (sku.containerType === 'bottle' || sku.containerType === 'glass-bottle') {
    const isGlass = sku.containerType === 'glass-bottle';
    return (
      <svg
        width={dims.w}
        height={dims.h}
        viewBox="0 0 36 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-opacity duration-150 ${opacityClass}`}
        aria-hidden="true"
      >
        {/* Cap */}
        <rect x="13" y="2" width="10" height="5" rx="1.5" fill={sku.capColor} />
        <rect x="14" y="7" width="8" height="3" fill="#94A3B8" fillOpacity="0.45" />
        {/* Neck & Shoulders */}
        <path
          d={
            isGlass
              ? 'M14 10 L22 10 L27 22 L27 58 C27 60.2 25.2 62 23 62 L13 62 C10.8 62 9 60.2 9 58 L9 22 Z'
              : 'M14 10 L22 10 L28 20 L28 57 C28 59.8 25.8 62 23 62 L13 62 C10.2 62 8 59.8 8 57 L8 20 Z'
          }
          fill={sku.primaryColor}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
        {/* Label Band */}
        <rect
          x={isGlass ? 9 : 8}
          y="25"
          width={isGlass ? 18 : 20}
          height="20"
          fill={sku.secondaryColor}
          fillOpacity="0.92"
        />
        {/* Brand Accent Stripe */}
        <rect
          x={isGlass ? 9 : 8}
          y="33"
          width={isGlass ? 18 : 20}
          height="4"
          fill={sku.brandColor}
        />
        {/* Cold Specular Highlight */}
        <rect
          x="11"
          y="16"
          width="3"
          height="40"
          rx="1.5"
          fill="white"
          fillOpacity="0.24"
        />
      </svg>
    );
  }

  const isTall = sku.containerType === 'tall-can';

  return (
    <svg
      width={dims.w}
      height={dims.h}
      viewBox="0 0 36 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-opacity duration-150 ${opacityClass}`}
      aria-hidden="true"
    >
      {/* Top Rim */}
      <rect
        x={isTall ? 9 : 7}
        y={isTall ? 4 : 10}
        width={isTall ? 18 : 22}
        height="3.5"
        rx="1.5"
        fill="#CBD5E1"
      />
      {/* Can Body */}
      <rect
        x={isTall ? 8 : 6}
        y={isTall ? 7 : 13}
        width={isTall ? 20 : 24}
        height={isTall ? 53 : 47}
        rx="3"
        fill={sku.primaryColor}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />
      {/* Dynamic Diagonal / Graphic Accent */}
      <rect
        x={isTall ? 8 : 6}
        y={isTall ? 22 : 25}
        width={isTall ? 20 : 24}
        height="16"
        fill={sku.secondaryColor}
        fillOpacity="0.9"
      />
      {/* Bottom Rim */}
      <rect
        x={isTall ? 9.5 : 7.5}
        y="59.5"
        width={isTall ? 17 : 21}
        height="2.5"
        rx="1"
        fill="#94A3B8"
        fillOpacity="0.7"
      />
      {/* Condensation / Chill Gloss */}
      <rect
        x={isTall ? 10.5 : 9}
        y={isTall ? 10 : 16}
        width="3"
        height={isTall ? 46 : 40}
        rx="1.5"
        fill="white"
        fillOpacity="0.25"
      />
    </svg>
  );
};
