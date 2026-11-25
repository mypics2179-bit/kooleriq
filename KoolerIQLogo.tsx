import React from 'react';

interface KoolerIQLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export const KoolerIQLogo: React.FC<KoolerIQLogoProps> = ({
  size = 30,
  showWordmark = true,
  className = '',
}) => {
  const uid = React.useId().replace(/:/g, '');
  const bgGradId = `kq-bg-${uid}`;
  const iceGradId = `kq-ice-${uid}`;

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={bgGradId} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id={iceGradId} x1="25" y1="14" x2="33" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#5EEAD4" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" fill={`url(#${bgGradId})`} />
        <rect
          x="5.5"
          y="5.5"
          width="53"
          height="53"
          rx="11.5"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
        />
        <rect x="16.5" y="16" width="5.5" height="32" rx="1.5" fill="#FFFFFF" />
        <polygon points="29,14.5 32.8,20.5 29,26.5 25.2,20.5" fill={`url(#${iceGradId})`} />
        <path d="M22 32.5L37.5 16.5H45L25.5 36L22 32.5Z" fill="#FFFFFF" />
        <rect x="33" y="29" width="14.5" height="4.2" rx="1.2" fill="#CCFBF1" />
        <rect x="29.5" y="36" width="18" height="4.2" rx="1.2" fill="#99F6E4" />
        <path d="M25.5 34.5L45 48H36.8L22 37.5L25.5 34.5Z" fill="#FFFFFF" />
      </svg>

      {showWordmark && (
        <span className="text-lg font-display font-extrabold tracking-tight text-[var(--kq-text)]">
          Kooler<span className="text-[var(--kq-accent)]">IQ</span>
        </span>
      )}
    </span>
  );
};
