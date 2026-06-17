"use client";
import React from "react";

// Inline SVG so there's no asset to load; scales crisply, themes with the UI.
// Motif: a conductor's baton sweeping over three rising bars — the Maestro
// "conducting" the agents.
export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Marketer Maestro logo" role="img">
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="#eeedfe" stroke="#534ab7" strokeWidth="1.5" />
      <rect x="11" y="22" width="3.4" height="8" rx="1.7" fill="#534ab7" />
      <rect x="17" y="17" width="3.4" height="13" rx="1.7" fill="#7b73d6" />
      <rect x="23" y="12" width="3.4" height="18" rx="1.7" fill="#ba7517" />
      <line x1="9" y1="14" x2="29" y2="8" stroke="#534ab7" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="29.5" cy="7.5" r="2.1" fill="#534ab7" />
    </svg>
  );
}
