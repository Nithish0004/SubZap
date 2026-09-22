import React from 'react';

export const AuthBackground: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" 
      aria-hidden="true"
    >
      {/* 1. Deep Space-Like Navy/Indigo Canvas */}
      <div className="absolute inset-0 bg-[#050713] bg-radial-[at_top_center] from-[#0d152e] via-[#070b19] to-[#03050c]" />

      {/* 2. Extremely subtle starry dust texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.7) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* 3. Large Soft Orbital Curves & Curved Light Trails */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <defs>
          {/* Orbital Gradient 1: Cyan to Indigo */}
          <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.03" />
            <stop offset="40%" stopColor="#818cf8" stopOpacity="0.22" />
            <stop offset="80%" stopColor="#6366f1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.02" />
          </linearGradient>

          {/* Orbital Gradient 2: Purple to Cyan */}
          <linearGradient id="orbitGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.03" />
            <stop offset="45%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>

          {/* Flowing Light Trail Gradient */}
          <linearGradient id="trailGrad1" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="30%" stopColor="#818cf8" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="90%" stopColor="#c084fc" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>

          {/* Subtle Glow Filter for Nodes */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Large Primary Orbital Ellipse (Tilted soft planetary orbit) */}
        <ellipse 
          cx="720" 
          cy="460" 
          rx="680" 
          ry="320" 
          transform="rotate(-14 720 460)"
          fill="none" 
          stroke="url(#orbitGrad1)" 
          strokeWidth="1.25"
          strokeDasharray="6 10"
          className="opacity-75"
        />

        {/* Second Outer Orbital Ellipse */}
        <ellipse 
          cx="680" 
          cy="480" 
          rx="820" 
          ry="400" 
          transform="rotate(11 680 480)"
          fill="none" 
          stroke="url(#orbitGrad2)" 
          strokeWidth="1.2"
          strokeDasharray="4 8"
          className="opacity-60"
        />

        {/* Third Inner Accent Orbital Ring */}
        <ellipse 
          cx="520" 
          cy="430" 
          rx="440" 
          ry="210" 
          transform="rotate(-22 520 430)"
          fill="none" 
          stroke="url(#orbitGrad1)" 
          strokeWidth="0.9"
          strokeDasharray="3 6"
          className="opacity-45"
        />

        {/* Elegant Curved Light Trail 1 (Sweeping through upper atmosphere) */}
        <path
          d="M -120,240 C 260,80 540,380 920,220 C 1240,80 1420,380 1620,260"
          fill="none"
          stroke="url(#trailGrad1)"
          strokeWidth="1.5"
          strokeDasharray="8 12"
          className="opacity-70"
        />

        {/* Elegant Curved Light Trail 2 (Sweeping lower atmosphere) */}
        <path
          d="M -80,680 C 320,760 620,520 1020,640 C 1360,740 1520,540 1680,620"
          fill="none"
          stroke="url(#orbitGrad2)"
          strokeWidth="1.25"
          strokeDasharray="6 10"
          className="opacity-60"
        />

        {/* Atmospheric Floating Finance / Subscription Themed Elements (Restrained & Elegant) */}
        
        {/* Element A: Subtle Recurring Subscription Orbit Ring (↺) with orbital beacon */}
        <g transform="translate(180, 160)" className="opacity-45">
          <circle cx="0" cy="0" r="22" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 0,-22 A 22,22 0 0,1 22,0" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="22" cy="0" r="2.5" fill="#38bdf8" filter="url(#nodeGlow)" />
          {/* Faint subtle recurrence arrow tip */}
          <polygon points="20,-4 25,1 18,3" fill="#38bdf8" />
        </g>

        {/* Element B: Subscription Security Shield Vector Node */}
        <g transform="translate(1260, 220)" className="opacity-40">
          <path 
            d="M 0,-14 C 7,-14 12,-11 12,-4 C 12,6 0,14 0,14 C 0,14 -12,6 -12,-4 C -12,-11 -7,-14 0,-14 Z" 
            fill="none" 
            stroke="#818cf8" 
            strokeWidth="1"
          />
          <circle cx="0" cy="-1" r="2" fill="#818cf8" filter="url(#nodeGlow)" />
        </g>

        {/* Element C: Financial Ledger / Card Chip Outline Node */}
        <g transform="translate(240, 720)" className="opacity-35">
          <rect x="-14" y="-10" width="28" height="20" rx="3" fill="none" stroke="#6366f1" strokeWidth="1" />
          <line x1="-14" y1="-1" x2="-4" y2="-1" stroke="#818cf8" strokeWidth="0.8" />
          <line x1="4" y1="-1" x2="14" y2="-1" stroke="#818cf8" strokeWidth="0.8" />
          <circle cx="0" cy="-1" r="2" fill="#c084fc" filter="url(#nodeGlow)" />
        </g>

        {/* Element D: Active Subscription Cycle Pulse (Top Right) */}
        <g transform="translate(1180, 680)" className="opacity-40">
          <circle cx="0" cy="0" r="16" fill="none" stroke="#38bdf8" strokeWidth="0.9" strokeDasharray="2 3" />
          <circle cx="0" cy="0" r="4" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="16" cy="0" r="2" fill="#38bdf8" filter="url(#nodeGlow)" />
        </g>

        {/* Subtle Constellation Connection Nodes & Glowing Particles */}
        <circle cx="340" cy="280" r="2.5" fill="#38bdf8" filter="url(#nodeGlow)" className="opacity-60" />
        <circle cx="480" cy="180" r="1.8" fill="#818cf8" className="opacity-50" />
        <circle cx="820" cy="190" r="2.2" fill="#c084fc" filter="url(#nodeGlow)" className="opacity-60" />
        <circle cx="1060" cy="340" r="2" fill="#38bdf8" className="opacity-50" />
        <circle cx="940" cy="710" r="2.2" fill="#818cf8" filter="url(#nodeGlow)" className="opacity-55" />
        <circle cx="620" cy="740" r="1.8" fill="#38bdf8" className="opacity-45" />
        <circle cx="1340" cy="520" r="2.5" fill="#818cf8" filter="url(#nodeGlow)" className="opacity-55" />
        <circle cx="120" cy="480" r="2" fill="#38bdf8" className="opacity-45" />
      </svg>

      {/* 4. Ambient Soft Moving Blurred Gradient Orbs */}
      {/* Orb 1: Deep Indigo/Blue Orb top-left */}
      <div
        className="absolute -top-32 -left-20 w-[580px] h-[580px] rounded-full bg-indigo-600/16 blur-[120px] animate-orb-1 will-change-transform pointer-events-none"
      />

      {/* Orb 2: Purple/Violet Orb bottom-right */}
      <div
        className="absolute -bottom-40 -right-20 w-[620px] h-[620px] rounded-full bg-purple-600/15 blur-[130px] animate-orb-2 will-change-transform pointer-events-none"
      />

      {/* Orb 3: Cyan/Teal Ambient Accent Orb center-left */}
      <div
        className="absolute top-1/3 left-1/4 w-[460px] h-[460px] rounded-full bg-sky-500/10 blur-[135px] animate-orb-3 will-change-transform pointer-events-none"
      />

      {/* 5. Soft Radial Core Lighting behind the Bot and Card Area */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] max-w-full rounded-full bg-radial from-indigo-500/10 via-purple-500/4 to-transparent blur-3xl pointer-events-none" 
      />

      {/* 6. Atmospheric Edge Vignette for Cinematic Space Depth */}
      <div className="absolute inset-0 bg-radial-[at_center] from-transparent via-transparent to-black/65 pointer-events-none" />
    </div>
  );
};
