import React from "react";

interface PixelIconProps {
  className?: string;
  size?: number;
}

export const PixelCoffee: React.FC<PixelIconProps> = ({ className, size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ imageRendering: "pixelated" }}
  >
    {/* Steam */}
    <rect x="5" y="1" width="1" height="1" fill="currentColor" opacity="0.3" />
    <rect x="7" y="0" width="1" height="1" fill="currentColor" opacity="0.3" />
    <rect x="9" y="1" width="1" height="1" fill="currentColor" opacity="0.3" />
    <rect x="5" y="2" width="1" height="1" fill="currentColor" opacity="0.2" />
    <rect x="9" y="2" width="1" height="1" fill="currentColor" opacity="0.2" />
    {/* Cup body */}
    <rect x="3" y="4" width="1" height="1" fill="currentColor" />
    <rect x="4" y="4" width="6" height="1" fill="currentColor" opacity="0.8" />
    <rect x="10" y="4" width="1" height="1" fill="currentColor" />
    <rect x="3" y="5" width="1" height="5" fill="currentColor" />
    <rect x="4" y="5" width="6" height="5" fill="currentColor" opacity="0.6" />
    <rect x="10" y="5" width="1" height="5" fill="currentColor" />
    {/* Handle */}
    <rect x="11" y="5" width="1" height="1" fill="currentColor" />
    <rect x="12" y="5" width="1" height="3" fill="currentColor" />
    <rect x="11" y="8" width="1" height="1" fill="currentColor" />
    {/* Cup bottom */}
    <rect x="4" y="10" width="6" height="1" fill="currentColor" />
    {/* Saucer */}
    <rect x="2" y="12" width="10" height="1" fill="currentColor" opacity="0.7" />
    <rect x="3" y="13" width="8" height="1" fill="currentColor" opacity="0.5" />
  </svg>
);

export const PixelLeaf: React.FC<PixelIconProps> = ({ className, size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ imageRendering: "pixelated" }}
  >
    {/* Leaf body */}
    <rect x="8" y="1" width="2" height="1" fill="currentColor" opacity="0.6" />
    <rect x="7" y="2" width="4" height="1" fill="currentColor" opacity="0.7" />
    <rect x="6" y="3" width="5" height="1" fill="currentColor" opacity="0.8" />
    <rect x="5" y="4" width="6" height="1" fill="currentColor" />
    <rect x="4" y="5" width="6" height="1" fill="currentColor" />
    <rect x="3" y="6" width="6" height="1" fill="currentColor" opacity="0.9" />
    <rect x="3" y="7" width="5" height="1" fill="currentColor" opacity="0.8" />
    <rect x="4" y="8" width="4" height="1" fill="currentColor" opacity="0.7" />
    <rect x="5" y="9" width="3" height="1" fill="currentColor" opacity="0.6" />
    {/* Vein */}
    <rect x="7" y="3" width="1" height="1" fill="currentColor" opacity="0.4" />
    <rect x="6" y="5" width="1" height="1" fill="currentColor" opacity="0.4" />
    <rect x="5" y="7" width="1" height="1" fill="currentColor" opacity="0.4" />
    {/* Stem */}
    <rect x="6" y="10" width="1" height="1" fill="currentColor" opacity="0.7" />
    <rect x="5" y="11" width="1" height="1" fill="currentColor" opacity="0.7" />
    <rect x="4" y="12" width="1" height="1" fill="currentColor" opacity="0.6" />
    <rect x="3" y="13" width="1" height="1" fill="currentColor" opacity="0.5" />
  </svg>
);

export const PixelMoon: React.FC<PixelIconProps> = ({ className, size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ imageRendering: "pixelated" }}
  >
    {/* Moon crescent */}
    <rect x="6" y="1" width="3" height="1" fill="currentColor" opacity="0.7" />
    <rect x="5" y="2" width="1" height="1" fill="currentColor" opacity="0.8" />
    <rect x="9" y="2" width="1" height="1" fill="currentColor" opacity="0.8" />
    <rect x="4" y="3" width="1" height="2" fill="currentColor" />
    <rect x="10" y="3" width="1" height="1" fill="currentColor" />
    <rect x="3" y="5" width="1" height="3" fill="currentColor" />
    <rect x="4" y="8" width="1" height="2" fill="currentColor" />
    <rect x="5" y="10" width="1" height="1" fill="currentColor" opacity="0.8" />
    <rect x="6" y="11" width="3" height="1" fill="currentColor" opacity="0.7" />
    <rect x="9" y="10" width="1" height="1" fill="currentColor" opacity="0.8" />
    <rect x="10" y="8" width="1" height="2" fill="currentColor" />
    {/* Inner shadow (crescent cutout) */}
    <rect x="7" y="3" width="3" height="1" fill="currentColor" opacity="0.2" />
    <rect x="8" y="4" width="2" height="2" fill="currentColor" opacity="0.2" />
    <rect x="9" y="6" width="1" height="2" fill="currentColor" opacity="0.2" />
    {/* Stars */}
    <rect x="12" y="2" width="1" height="1" fill="currentColor" opacity="0.4" />
    <rect x="1" y="5" width="1" height="1" fill="currentColor" opacity="0.3" />
    <rect x="13" y="7" width="1" height="1" fill="currentColor" opacity="0.35" />
    <rect x="2" y="11" width="1" height="1" fill="currentColor" opacity="0.3" />
  </svg>
);
