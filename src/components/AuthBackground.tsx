import React from 'react';

export const AuthBackground: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" 
      aria-hidden="true"
    >
      {/* 1. Base Rich Navy/Indigo Gradient Canvas */}
      <div className="absolute inset-0 bg-[#070b14] bg-radial-[at_top_center] from-[#0f172a] via-[#090d16] to-[#050811]" />

      {/* 2. Extremely subtle technical dot/grid texture */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 3. Faint flowing money/subscription connection lines & nodes */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="streamGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="streamGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Diagonal soft stream line 1 */}
        <path
          d="M -100,200 C 300,100 500,450 900,320 C 1300,190 1500,500 1920,400"
          fill="none"
          stroke="url(#streamGrad1)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          className="opacity-70"
        />

        {/* Diagonal soft stream line 2 */}
        <path
          d="M -50,550 C 400,620 700,350 1100,500 C 1500,650 1700,350 2100,480"
          fill="none"
          stroke="url(#streamGrad2)"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          className="opacity-60"
        />

        {/* Faint technical network nodes */}
        <circle cx="380" cy="180" r="2.5" fill="#818cf8" className="opacity-40" />
        <circle cx="720" cy="420" r="3" fill="#38bdf8" className="opacity-40" />
        <circle cx="1180" cy="480" r="2" fill="#c084fc" className="opacity-35" />
        <circle cx="1450" cy="340" r="2.5" fill="#818cf8" className="opacity-30" />
      </svg>

      {/* 4. Ambient slowly moving blurred gradient orbs with hardware-accelerated CSS */}
      {/* Orb 1: Indigo/Blue orb top-left */}
      <div
        className="absolute -top-32 -left-20 w-[540px] h-[540px] rounded-full bg-indigo-600/18 blur-[110px] animate-orb-1 will-change-transform pointer-events-none"
      />

      {/* Orb 2: Purple/Violet orb bottom-right */}
      <div
        className="absolute -bottom-40 -right-20 w-[580px] h-[580px] rounded-full bg-purple-600/16 blur-[120px] animate-orb-2 will-change-transform pointer-events-none"
      />

      {/* Orb 3: Cyan/Teal subtle accent orb center-left */}
      <div
        className="absolute top-1/3 left-1/4 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-[130px] animate-orb-3 will-change-transform pointer-events-none"
      />

      {/* 5. Soft radial lighting behind the bot and authentication card area */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[650px] max-w-full rounded-full bg-radial from-indigo-500/10 via-purple-500/5 to-transparent blur-2xl pointer-events-none" 
      />

      {/* Subtle edge vignette */}
      <div className="absolute inset-0 bg-radial-[at_center] from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
};
