import React, { useState, useEffect } from 'react';

export type MascotMood = 
  | 'entering' 
  | 'presenting' 
  | 'idle' 
  | 'looking_at_input' 
  | 'hiding_password' 
  | 'worried_error' 
  | 'switching_mode' 
  | 'celebrating';

interface ZapBotMascotProps {
  mood: MascotMood;
  viewMode: 'signin' | 'signup' | 'verify_email' | 'forgot_password';
  className?: string;
  isCompact?: boolean;
  isLoading?: boolean;
}

export const ZapBotMascot: React.FC<ZapBotMascotProps> = ({
  mood,
  viewMode,
  className = '',
  isCompact = false,
  isLoading = false,
}) => {
  // Idle blink cycle
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Compute arm poses and head orientation based on mood
  const isCoveringEyes = mood === 'hiding_password';
  const isPresenting = mood === 'presenting';
  const isLookingAtForm = mood === 'looking_at_input' || mood === 'idle';
  const isError = mood === 'worried_error';
  const isCelebrating = mood === 'celebrating';
  const isSwitching = mood === 'switching_mode';

  // Dynamic message bubble text resolution based on state & mood
  let bubbleText = '';
  if (mood === 'entering') {
    bubbleText = '';
  } else if (isCelebrating) {
    bubbleText = "You're in! 🎉";
  } else if (isError) {
    bubbleText = "Hmm, something's not right";
  } else if (isLoading) {
    bubbleText = "Checking...";
  } else if (viewMode === 'verify_email') {
    bubbleText = "Check your inbox ✉️";
  } else if (isCoveringEyes) {
    bubbleText = "🙈 I won't peek!";
  } else if (isSwitching) {
    bubbleText = "Let's get you set up!";
  } else if (mood === 'looking_at_input') {
    bubbleText = "Let's start with your email";
  } else if (mood === 'idle' || mood === 'presenting') {
    bubbleText = "Ready when you are!";
  }

  return (
    <div 
      className={`relative select-none flex flex-col items-center justify-center transition-all duration-500 ${className}`}
      aria-hidden="true"
    >
      {/* Dynamic Contextual Message Bubble above the bot */}
      <div className={`w-full flex justify-center mb-2 z-10 transition-all duration-300 ${
        bubbleText && mood !== 'entering' 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
      }`}>
        {bubbleText && (
          <div
            key={bubbleText}
            className="relative px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 shadow-md shadow-slate-900/5 dark:shadow-black/20 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md flex items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200 whitespace-nowrap"
          >
            {bubbleText}
            {/* Subtle speech bubble tail pointing down toward bot antenna */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/95 dark:bg-slate-800/95 border-b border-r border-slate-200/90 dark:border-slate-700/80 rotate-45 transform" />
          </div>
        )}
      </div>

      {/* Main SVG Mascot Character: "ZapBot" */}
      <div 
        className={`relative transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mood === 'entering' 
            ? '-translate-x-12 opacity-0 scale-90' 
            : 'translate-x-0 opacity-100 scale-100'
        }`}
      >
        <svg
          viewBox="0 0 240 280"
          className={`${isCompact ? 'w-28 h-32' : 'w-48 h-56 sm:w-56 sm:h-64'} drop-shadow-xl transition-all duration-500 ${
            // Subtle idle hover breathing animation
            mood === 'idle' || mood === 'looking_at_input' ? 'animate-idle-float' : ''
          }`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glossy robot shell gradient */}
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            {/* Dark plate / joint gradient */}
            <linearGradient id="darkPlate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* SubZap Electric Indigo / Purple core */}
            <linearGradient id="zapCore" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>

            {/* Glowing Visor screen */}
            <linearGradient id="visorScreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#090D16" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>

            {/* Cyan Eye Glow */}
            <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Thruster exhaust glow */}
            <filter id="thrusterGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* ================= THRUSTRER / HOVER GLOW BASE ================= */}
          <g className="transition-all duration-500">
            {/* Thruster energy ring */}
            <ellipse 
              cx="120" 
              cy="255" 
              rx="40" 
              ry="10" 
              fill="url(#zapCore)" 
              opacity="0.3" 
              filter="url(#thrusterGlow)" 
            />
            <ellipse 
              cx="120" 
              cy="253" 
              rx="24" 
              ry="6" 
              fill="#38BDF8" 
              opacity="0.8" 
              filter="url(#eyeGlow)" 
            />
            {/* Thruster nozzle */}
            <path 
              d="M102 230 L138 230 L130 248 L110 248 Z" 
              fill="url(#darkPlate)" 
            />
          </g>

          {/* ================= TORSO & CORE ================= */}
          <g className="transition-all duration-300">
            {/* Main torso armor */}
            <rect 
              x="82" 
              y="142" 
              width="76" 
              height="88" 
              rx="24" 
              fill="url(#bodyGradient)" 
              stroke="#94A3B8" 
              strokeWidth="2" 
            />
            {/* Torso side accent plates */}
            <path d="M82 165 C82 155 86 148 94 145 L94 210 C86 207 82 198 82 190 Z" fill="#CBD5E1" />
            <path d="M158 165 C158 155 154 148 146 145 L146 210 C154 207 158 198 158 190 Z" fill="#CBD5E1" />

            {/* Glowing SubZap chest reactor */}
            <circle cx="120" cy="182" r="18" fill="url(#darkPlate)" stroke="#6366F1" strokeWidth="2.5" />
            <circle cx="120" cy="182" r="12" fill="url(#zapCore)" filter="url(#eyeGlow)" opacity="0.9" />
            {/* Mini lightning bolt icon inside core */}
            <path 
              d="M121 173 L114 182 L119 182 L118 191 L126 181 L121 181 Z" 
              fill="#FFFFFF" 
            />
          </g>

          {/* ================= HEAD & VISOR ================= */}
          <g 
            className={`transition-transform duration-500 ease-out origin-[120px_130px] ${
              isError 
                ? '-rotate-6 translate-y-1' 
                : isCelebrating 
                ? 'rotate-3 -translate-y-1.5' 
                : isCoveringEyes 
                ? '-rotate-6 translate-y-0.5' 
                : isLookingAtForm 
                ? 'rotate-3' 
                : 'rotate-0'
            }`}
          >
            {/* Neck joint */}
            <rect x="108" y="126" width="24" height="18" rx="5" fill="url(#darkPlate)" />

            {/* Antenna / Energy Crest */}
            <path 
              d="M118 56 L122 56 L122 34 L118 34 Z" 
              fill="url(#darkPlate)" 
            />
            {/* Glowing lightning crest orb */}
            <circle 
              cx="120" 
              cy="28" 
              r="8" 
              fill="url(#zapCore)" 
              stroke="#FFFFFF" 
              strokeWidth="1.5" 
              filter="url(#eyeGlow)" 
              className={isCelebrating ? 'animate-ping' : ''}
            />
            <path 
              d="M121 23 L117 28 L120 28 L119 33 L123 27 L120 27 Z" 
              fill="#FFFFFF" 
            />

            {/* Head Helmet Shell */}
            <rect 
              x="62" 
              y="52" 
              width="116" 
              height="80" 
              rx="30" 
              fill="url(#bodyGradient)" 
              stroke="#94A3B8" 
              strokeWidth="2.5" 
            />

            {/* Head side ears / audio sensors */}
            <rect x="52" y="74" width="12" height="34" rx="6" fill="url(#darkPlate)" />
            <circle cx="58" cy="91" r="3" fill="#38BDF8" />
            <rect x="176" y="74" width="12" height="34" rx="6" fill="url(#darkPlate)" />
            <circle cx="182" cy="91" r="3" fill="#38BDF8" />

            {/* Visor Screen */}
            <rect 
              x="72" 
              y="64" 
              width="96" 
              height="56" 
              rx="20" 
              fill="url(#visorScreen)" 
              stroke="#312E81" 
              strokeWidth="1.5" 
            />

            {/* Visor Glass Highlight Arc */}
            <path 
              d="M82 72 Q120 66 158 72" 
              stroke="#FFFFFF" 
              strokeWidth="2" 
              strokeLinecap="round" 
              opacity="0.25" 
            />

            {/* ================= DYNAMIC VISOR EYES ================= */}
            {isCoveringEyes ? (
              // Privacy mode: closed-eye cute expression with shy blush
              <g className="transition-all duration-300">
                <path d="M88 94 Q98 86 108 94" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M132 94 Q142 86 152 94" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
                {/* Cute privacy blush dots */}
                <circle cx="86" cy="104" r="4" fill="#F43F5E" opacity="0.8" />
                <circle cx="154" cy="104" r="4" fill="#F43F5E" opacity="0.8" />
              </g>
            ) : isError ? (
              // Puzzled / Worried > < eyes
              <g className="transition-all duration-300">
                <path d="M92 86 L104 94 L92 102" stroke="#F43F5E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M148 86 L136 94 L148 102" stroke="#F43F5E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Sweatdrop glitch dot */}
                <circle cx="160" cy="74" r="3.5" fill="#38BDF8" opacity="0.9" />
              </g>
            ) : isCelebrating ? (
              // Celebrating Happy Arch Eyes ^ ^
              <g className="transition-all duration-300">
                <path d="M90 95 Q100 83 110 95" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
                <path d="M130 95 Q140 83 150 95" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
                {/* Sparkles */}
                <polygon points="120,78 122,83 127,85 122,87 120,92 118,87 113,85 118,83" fill="#FBBF24" />
                <circle cx="92" cy="104" r="4" fill="#FB7185" opacity="0.7" />
                <circle cx="148" cy="104" r="4" fill="#FB7185" opacity="0.7" />
              </g>
            ) : (
              // Standard / Looking Eyes with blink capability
              <g 
                className={`transition-all duration-200 ${
                  isBlinking ? 'scale-y-10 origin-[120px_92px]' : 'scale-y-100'
                }`}
              >
                {/* Left Eye */}
                <g 
                  className={`transition-transform duration-300 ${
                    isLookingAtForm ? 'translate-x-3' : 'translate-x-0'
                  }`}
                >
                  <rect 
                    x="90" 
                    y="82" 
                    width="18" 
                    height="22" 
                    rx="9" 
                    fill="#38BDF8" 
                    filter="url(#eyeGlow)" 
                  />
                  {/* Eye pupil reflection */}
                  <circle cx="95" cy="88" r="3.5" fill="#FFFFFF" />
                </g>

                {/* Right Eye */}
                <g 
                  className={`transition-transform duration-300 ${
                    isLookingAtForm ? 'translate-x-3' : 'translate-x-0'
                  }`}
                >
                  <rect 
                    x="132" 
                    y="82" 
                    width="18" 
                    height="22" 
                    rx="9" 
                    fill="#38BDF8" 
                    filter="url(#eyeGlow)" 
                  />
                  {/* Eye pupil reflection */}
                  <circle cx="137" cy="88" r="3.5" fill="#FFFFFF" />
                </g>
              </g>
            )}
          </g>

          {/* ================= LEFT ARM ================= */}
          <g 
            id="bot-left-shoulder"
            className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-[72px_155px] ${
              isCoveringEyes 
                ? 'rotate-[155deg] -translate-y-1' 
                : isCelebrating 
                ? '-rotate-[75deg] -translate-y-8 -translate-x-3' 
                : isError 
                ? 'rotate-[20deg] translate-y-1' 
                : isPresenting 
                ? '-rotate-12 translate-y-1' 
                : 'rotate-0'
            }`}
          >
            {/* Shoulder joint */}
            <circle cx="72" cy="155" r="10" fill="url(#darkPlate)" stroke="#94A3B8" strokeWidth="1.5" />
            
            {/* Upper arm segment */}
            <rect x="62" y="156" width="18" height="34" rx="9" fill="url(#bodyGradient)" stroke="#94A3B8" strokeWidth="1.5" />
            
            {/* Elbow joint */}
            <circle cx="71" cy="186" r="8" fill="url(#darkPlate)" stroke="#94A3B8" strokeWidth="1" />

            {/* Forearm & hand (rotates at elbow joint) */}
            <g
              id="bot-left-forearm"
              className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-[71px_186px] ${
                isCoveringEyes
                  ? 'rotate-[80deg]'
                  : 'rotate-0'
              }`}
            >
              {/* Forearm segment */}
              <rect x="62" y="182" width="18" height="34" rx="9" fill="url(#bodyGradient)" stroke="#94A3B8" strokeWidth="1.5" />
              {/* Hand / Mitt */}
              <circle cx="71" cy="214" r="11" fill="url(#darkPlate)" stroke="#94A3B8" strokeWidth="1.5" />
              <circle cx="71" cy="214" r="5" fill="#38BDF8" opacity="0.8" />
            </g>
          </g>

          {/* ================= RIGHT ARM (PRESENTING / INTERACTIVE) ================= */}
          <g 
            id="bot-right-shoulder"
            className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-[168px_155px] ${
              isCoveringEyes 
                ? '-rotate-[155deg] -translate-y-1' 
                : isCelebrating 
                ? 'rotate-[75deg] -translate-y-8 translate-x-3' 
                : isError 
                ? '-rotate-[45deg] -translate-y-4' 
                : isPresenting 
                ? '-rotate-[55deg] translate-x-4 -translate-y-4' 
                : isLookingAtForm 
                ? '-rotate-[35deg] translate-x-2 -translate-y-2' 
                : 'rotate-0'
            }`}
          >
            {/* Shoulder joint */}
            <circle cx="168" cy="155" r="10" fill="url(#darkPlate)" stroke="#94A3B8" strokeWidth="1.5" />
            
            {/* Upper arm segment */}
            <rect x="160" y="156" width="18" height="34" rx="9" fill="url(#bodyGradient)" stroke="#94A3B8" strokeWidth="1.5" />
            
            {/* Elbow joint */}
            <circle cx="169" cy="186" r="8" fill="url(#darkPlate)" stroke="#94A3B8" strokeWidth="1" />

            {/* Forearm & hand (rotates at elbow joint) */}
            <g
              id="bot-right-forearm"
              className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-[169px_186px] ${
                isCoveringEyes
                  ? '-rotate-[80deg]'
                  : 'rotate-0'
              }`}
            >
              {/* Forearm segment */}
              <rect x="160" y="182" width="18" height="34" rx="9" fill="url(#bodyGradient)" stroke="#94A3B8" strokeWidth="1.5" />
              {/* Hand */}
              <g className="origin-[169px_214px]">
                <circle cx="169" cy="214" r="11" fill="url(#darkPlate)" stroke="#94A3B8" strokeWidth="1.5" />
                {/* Hand energy indicator */}
                <circle 
                  cx="169" 
                  cy="214" 
                  r="5" 
                  fill={isCelebrating ? '#10B981' : '#38BDF8'} 
                  filter="url(#eyeGlow)" 
                />
                {/* Pointing finger / Presentation indicator when presenting */}
                {(isPresenting || isLookingAtForm) && !isCoveringEyes && !isCelebrating && (
                  <path 
                    d="M174 212 L188 207 L174 217 Z" 
                    fill="#38BDF8" 
                    filter="url(#eyeGlow)" 
                  />
                )}
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};
