import React, { useState, useEffect, useRef } from 'react';

export type MascotMood = 
  | 'entering' 
  | 'presenting' 
  | 'idle' 
  | 'looking_at_input' 
  | 'hiding_password' 
  | 'worried_error' 
  | 'switching_mode' 
  | 'celebrating';

export type BotReaction = 'tickle' | 'surprised' | 'shy' | 'happy' | 'curious';

// 5-Stage Conversational Dialogue Pools (Stage 1 to Stage 5)
// Dialogue stages are strictly sequential and decoupled from visual reaction animations
export type ConversationStage = 1 | 2 | 3 | 4 | 5;

const CONVERSATION_STAGE_MESSAGES: Record<ConversationStage, string[]> = {
  1: [
    'Whoa! 👀',
    'Hey! 😂',
    'Oh! You got me 😳',
    "I wasn't ready for that! 👀",
  ],
  2: [
    "Wait... you're doing that on purpose 😂",
    'Okay okay, I felt that! 😆',
    'Are you testing me? 🤔',
    'You found my tickle spot! 😂',
  ],
  3: [
    'Haha, you really like bothering me 😄',
    "You're having way too much fun with this 😂",
    'I can see that cursor, you know 👀',
    'Hmm... suspicious cursor activity 🤨',
  ],
  4: [
    'Alright, I like your energy 😄',
    "Okay... we're friends now 🤝",
    "You're making me shy now 😊",
    'Fine, you win 😂💜',
  ],
  5: [
    "But... weren't you here to sign in? 👀👉",
    "I'm fun, but your login form is still waiting 😂👉",
    'Okay, enough distracting me 😆 The form is over there 👉',
    'I think we forgot why you came here 😂',
  ],
};

// Utility to shuffle an array
const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Storage history structure for subtle bot interactions
export interface BotSessionRecord {
  timestamp: number;
  reactionsCompleted: number; // e.g. 5 for full conversation
  isFullConversation: boolean;
}

const BOT_HISTORY_STORAGE_KEY = 'subzap_bot_interaction_history_v1';
const MAX_STORED_SESSIONS = 5;

// Read recent interaction sessions
export const getStoredBotSessions = (): BotSessionRecord[] => {
  try {
    const data = localStorage.getItem(BOT_HISTORY_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Check if previous sessions had a long conversation (3+ reactions or full 5)
export const hasPreviousLongConversation = (): boolean => {
  const sessions = getStoredBotSessions();
  // Any session with full conversation or at least 3 reactions
  return sessions.some(s => s.isFullConversation || s.reactionsCompleted >= 3);
};

// Append a session record keeping only the last MAX_STORED_SESSIONS
export const recordBotSession = (reactionsCompleted: number, isFullConversation: boolean): void => {
  if (reactionsCompleted === 0) return;
  try {
    const existing = getStoredBotSessions();
    const newSession: BotSessionRecord = {
      timestamp: Date.now(),
      reactionsCompleted,
      isFullConversation,
    };
    const updated = [newSession, ...existing].slice(0, MAX_STORED_SESSIONS);
    localStorage.setItem(BOT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save bot interaction session:', err);
  }
};

interface ZapBotMascotProps {
  mood: MascotMood;
  viewMode: 'signin' | 'signup' | 'verify_email' | 'forgot_password';
  className?: string;
  isCompact?: boolean;
  isLoading?: boolean;
  isAssembling?: boolean;
}

export const ZapBotMascot: React.FC<ZapBotMascotProps> = ({
  mood,
  viewMode,
  className = '',
  isCompact = false,
  isLoading = false,
  isAssembling = false,
}) => {
  // Idle blink cycle
  const [isBlinking, setIsBlinking] = useState(false);

  // Interactive Bot Reactions State (Tickle, Surprised, Shy, Happy, Curious)
  const [activeReaction, setActiveReaction] = useState<BotReaction | null>(null);
  const [activeSpeechMessage, setActiveSpeechMessage] = useState<string | null>(null);
  const [isConversationCompleted, setIsConversationCompleted] = useState<boolean>(false);

  // Subtle interaction history state: detect if the user had a previous long conversation
  const [hadLongConversation] = useState<boolean>(() => {
    return hasPreviousLongConversation();
  });

  // Track number of reactions completed in the current interactive session
  const reactionsCompletedInSessionRef = useRef<number>(0);

  // Session management refs
  const conversationStageRef = useRef<ConversationStage>(1);
  const animationQueueRef = useRef<BotReaction[]>([]);
  const isSessionRunningRef = useRef<boolean>(false);
  const lastSessionStageMessagesRef = useRef<Partial<Record<ConversationStage, string>>>({});
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextReactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isBotHovered = useRef<boolean>(false);

  // Pupil mouse tracking refs
  const botContainerRef = useRef<HTMLDivElement | null>(null);
  const leftPupilRef = useRef<SVGGElement | null>(null);
  const rightPupilRef = useRef<SVGGElement | null>(null);

  // Target and current pupil offsets in SVG units
  const targetOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerInside = useRef<boolean>(false);
  const rafId = useRef<number | null>(null);

  // Priority check: higher priority authentication/form states disable reactions
  const isCoveringEyes = mood === 'hiding_password';
  const isError = mood === 'worried_error';
  const isCelebrating = mood === 'celebrating';
  const isSwitching = mood === 'switching_mode';
  const isEntering = mood === 'entering';
  const isLookingAtInput = mood === 'looking_at_input';

  // Can reactions trigger? Allowed only during normal interactive idling or presenting
  const canTriggerReaction = 
    !isCoveringEyes && 
    !isError && 
    !isCelebrating && 
    !isLoading && 
    !isSwitching && 
    !isEntering &&
    !isLookingAtInput &&
    viewMode !== 'verify_email';

  // Automatically dismiss active reaction and conversation if high-priority state occurs
  useEffect(() => {
    if (!canTriggerReaction) {
      if (activeReaction !== null) {
        setActiveReaction(null);
      }
      setActiveSpeechMessage(null);
      setIsConversationCompleted(false);
      animationQueueRef.current = [];
      conversationStageRef.current = 1;
      isSessionRunningRef.current = false;

      // If a session was interrupted by form interaction after having completed reactions, persist the count
      if (reactionsCompletedInSessionRef.current > 0) {
        recordBotSession(reactionsCompletedInSessionRef.current, false);
        reactionsCompletedInSessionRef.current = 0;
      }

      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
        reactionTimerRef.current = null;
      }
      if (nextReactionTimerRef.current) {
        clearTimeout(nextReactionTimerRef.current);
        nextReactionTimerRef.current = null;
      }
    }
  }, [canTriggerReaction, activeReaction]);

  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    let isMounted = true;

    const scheduleNextBlink = () => {
      const delay = 5000 + Math.random() * 2000;
      blinkTimer = setTimeout(() => {
        if (!isMounted) return;
        setIsBlinking(true);
        setTimeout(() => {
          if (isMounted) {
            setIsBlinking(false);
            scheduleNextBlink();
          }
        }, 220);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      isMounted = false;
      clearTimeout(blinkTimer);
    };
  }, []);

  // Pupil animation loop with smooth lerping
  useEffect(() => {
    // When covering eyes or during squinted reactions (happy/tickle), pause tracking and center
    const shouldTrack = !isCoveringEyes && activeReaction !== 'tickle' && activeReaction !== 'happy';

    const animatePupils = () => {
      if (!shouldTrack || !isPointerInside.current) {
        targetOffset.current = { x: 0, y: 0 };
      }

      // Smooth lerp towards target
      const ease = 0.18;
      currentOffset.current.x += (targetOffset.current.x - currentOffset.current.x) * ease;
      currentOffset.current.y += (targetOffset.current.y - currentOffset.current.y) * ease;

      const tx = Math.round(currentOffset.current.x * 100) / 100;
      const ty = Math.round(currentOffset.current.y * 100) / 100;

      const transformStr = `translate(${tx}px, ${ty}px)`;

      if (leftPupilRef.current) {
        leftPupilRef.current.style.transform = transformStr;
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.style.transform = transformStr;
      }

      rafId.current = requestAnimationFrame(animatePupils);
    };

    rafId.current = requestAnimationFrame(animatePupils);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isCoveringEyes, activeReaction]);

  // Global pointer/mouse move & leave listener without triggering React state updates
  useEffect(() => {
    if (isCoveringEyes) {
      targetOffset.current = { x: 0, y: 0 };
      return;
    }

    const handlePointerMove = (e: MouseEvent) => {
      isPointerInside.current = true;
      if (!botContainerRef.current) return;

      const rect = botContainerRef.current.getBoundingClientRect();
      // Calculate face center roughly at the visor area (35% from top of bot container)
      const botCenterX = rect.left + rect.width / 2;
      const botCenterY = rect.top + rect.height * 0.35;

      const dx = e.clientX - botCenterX;
      const dy = e.clientY - botCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) {
        targetOffset.current = { x: 0, y: 0 };
        return;
      }

      // Max bounds: Eye is 18w x 22h, pupil is r=4.5 (50% of 18px diameter). Clamping ensures pupil never leaves blue eye boundary
      // If curious reaction is active, strongly track towards cursor
      const maxDistanceX = activeReaction === 'curious' ? 3.8 : 3.2;
      const maxDistanceY = activeReaction === 'curious' ? 4.8 : 4.0;

      // Special reaction pupil overrides:
      if (activeReaction === 'shy') {
        // Shy: pupils glance sideways away from cursor
        const glanceDirection = dx >= 0 ? -1 : 1;
        targetOffset.current = { x: glanceDirection * 2.8, y: 1.2 };
        return;
      }

      // Smooth distance factor: ramps up as cursor moves away, up to 1.0 at ~350px
      const distFactor = activeReaction === 'curious' ? 1.0 : Math.min(dist / 350, 1.0);

      const normX = dx / dist;
      const normY = dy / dist;

      targetOffset.current = {
        x: normX * maxDistanceX * distFactor,
        y: normY * maxDistanceY * distFactor,
      };
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // If leaving the window document
      if (!e.relatedTarget) {
        isPointerInside.current = false;
        targetOffset.current = { x: 0, y: 0 };
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isCoveringEyes, activeReaction]);

  // Clean up reaction timers on unmount
  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
      }
      if (nextReactionTimerRef.current) {
        clearTimeout(nextReactionTimerRef.current);
      }
    };
  }, []);

  // Helper to pick a random message for a conversational stage (1 to 5)
  // Dialogue stages strictly follow the conversation arc, avoiding previous session repeats
  const pickMessageForStage = (stage: ConversationStage): string => {
    const pool = CONVERSATION_STAGE_MESSAGES[stage];
    const prevSessionMsg = lastSessionStageMessagesRef.current[stage];
    const candidates = pool.filter((msg) => msg !== prevSessionMsg);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
    lastSessionStageMessagesRef.current[stage] = chosen;
    return chosen;
  };

  // Play next reaction in the current session queue
  const playNextInSession = () => {
    if (!canTriggerReaction || !isBotHovered.current) {
      isSessionRunningRef.current = false;
      return;
    }

    const currentStage = conversationStageRef.current;

    if (currentStage > 5) {
      // All 5 conversational stages completed in this session!
      setIsConversationCompleted(true);
      setActiveReaction(null);
      setActiveSpeechMessage(null);
      isSessionRunningRef.current = false;

      // Save full conversation to interaction history
      recordBotSession(5, true);
      reactionsCompletedInSessionRef.current = 5;
      return;
    }

    // Pick dialogue message strictly from the current conversation stage
    const msg = pickMessageForStage(currentStage);

    // Pick visual reaction animation independently from the animation queue
    const nextReaction = animationQueueRef.current.length > 0 
      ? animationQueueRef.current.shift()! 
      : 'happy';

    reactionsCompletedInSessionRef.current = currentStage;
    setActiveReaction(nextReaction);
    setActiveSpeechMessage(msg);

    // Advance to the next conversation stage for the next turn
    conversationStageRef.current = (currentStage + 1) as ConversationStage;

    // Each reaction + message lasts between 2500ms and 3000ms for comfortable reading
    const reactionDuration = 2500 + Math.random() * 500; // 2500ms - 3000ms

    if (reactionTimerRef.current) {
      clearTimeout(reactionTimerRef.current);
    }

    reactionTimerRef.current = setTimeout(() => {
      reactionTimerRef.current = null;

      if (!isBotHovered.current || !canTriggerReaction) {
        setActiveReaction(null);
        setActiveSpeechMessage(null);
        isSessionRunningRef.current = false;
        return;
      }

      // Small natural transition delay between reactions (120-200ms)
      const transitionDelay = 120 + Math.random() * 80;
      if (nextReactionTimerRef.current) {
        clearTimeout(nextReactionTimerRef.current);
      }
      nextReactionTimerRef.current = setTimeout(() => {
        nextReactionTimerRef.current = null;
        playNextInSession();
      }, transitionDelay);
    }, reactionDuration);
  };

  // Start a new interactive 5-stage conversation session
  const startConversationSession = () => {
    if (!canTriggerReaction || isSessionRunningRef.current || isConversationCompleted) return;

    // Reset reaction counter and conversation stage for this session
    reactionsCompletedInSessionRef.current = 0;
    conversationStageRef.current = 1;

    // Build randomized queue of all 5 reaction animations for visual variety
    const allReactions: BotReaction[] = ['tickle', 'surprised', 'shy', 'happy', 'curious'];
    animationQueueRef.current = shuffleArray(allReactions);
    isSessionRunningRef.current = true;

    playNextInSession();
  };

  // Handler for mouse entry onto the bot character
  const handleMouseEnterBot = () => {
    isBotHovered.current = true;

    if (!canTriggerReaction) return;
    if (isSessionRunningRef.current || isConversationCompleted) return;

    startConversationSession();
  };

  // Handler for mouse completely leaving the bot character
  const handleMouseLeaveBot = () => {
    isBotHovered.current = false;

    // If leaving mid-session with partial progress, record to interaction history
    if (reactionsCompletedInSessionRef.current > 0 && !isConversationCompleted) {
      recordBotSession(reactionsCompletedInSessionRef.current, false);
    }
    reactionsCompletedInSessionRef.current = 0;

    // Reset pending timers
    if (reactionTimerRef.current) {
      clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
    if (nextReactionTimerRef.current) {
      clearTimeout(nextReactionTimerRef.current);
      nextReactionTimerRef.current = null;
    }

    // Reset session and reaction states completely on exit
    setActiveReaction(null);
    setActiveSpeechMessage(null);
    setIsConversationCompleted(false);
    animationQueueRef.current = [];
    conversationStageRef.current = 1;
    isSessionRunningRef.current = false;
  };

  // Compute arm poses and head orientation based on mood & active reaction
  const isPresenting = mood === 'presenting' || isConversationCompleted;
  const isLookingAtForm = (mood === 'looking_at_input' || mood === 'idle' || isConversationCompleted) && !activeReaction;

  // Dynamic message bubble text resolution based on state, mood & active reaction
  let bubbleText = '';
  if (mood === 'entering' || isAssembling) {
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
  } else if (activeReaction && activeSpeechMessage) {
    // Current reaction message from the conversation pool
    bubbleText = activeSpeechMessage;
  } else if (isConversationCompleted && isBotHovered.current) {
    // Final friendly message directing the user toward Sign In / Create Account
    if (viewMode === 'signup') {
      bubbleText = "Come on 😄 Let's create your account! 👉";
    } else {
      bubbleText = "Come on 😄 Let's get you signed in! 👉";
    }
  } else if (mood === 'idle' || mood === 'presenting') {
    // Check subtle interaction history: if returning user with prior long conversation, greet them warmly
    if (hadLongConversation && viewMode === 'signin') {
      bubbleText = "Welcome back! Great to see you again 👋";
    } else {
      bubbleText = "Ready when you are!";
    }
  }

  return (
    <div 
      ref={botContainerRef}
      className={`relative select-none flex flex-col items-center justify-center transition-all duration-500 ${className}`}
      aria-hidden="true"
    >
      {/* Dynamic Contextual Message Bubble above the bot */}
      <div className={`w-full flex justify-center mb-2 z-10 transition-all duration-300 ${
        bubbleText && mood !== 'entering' && !isAssembling
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
      }`}>
        {bubbleText && (
          <div
            key={bubbleText}
            className="relative px-3.5 py-1.5 max-w-[280px] sm:max-w-[320px] rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 shadow-md shadow-slate-900/5 dark:shadow-black/20 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md flex items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200 leading-snug"
          >
            {bubbleText}
            {/* Subtle speech bubble tail pointing down toward bot antenna */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/95 dark:bg-slate-800/95 border-b border-r border-slate-200/90 dark:border-slate-700/80 rotate-45 transform" />
          </div>
        )}
      </div>

      {/* Main SVG Mascot Character: "ZapBot" */}
      <div 
        onMouseEnter={handleMouseEnterBot}
        onMouseLeave={handleMouseLeaveBot}
        className={`relative transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group ${
          mood === 'entering' && !isAssembling
            ? '-translate-x-12 opacity-0 scale-90' 
            : 'translate-x-0 opacity-100 scale-100'
        }`}
      >
        <svg
          viewBox="0 0 240 280"
          className={`${isCompact ? 'w-28 h-32' : 'w-48 h-56 sm:w-56 sm:h-64'} drop-shadow-xl transition-all duration-500 ${
            isAssembling
              ? ''
              : activeReaction === 'tickle'
              ? 'animate-bot-wiggle'
              : activeReaction === 'surprised'
              ? 'animate-bot-surprise'
              : activeReaction === 'happy'
              ? 'animate-bot-bounce'
              : activeReaction === 'curious'
              ? 'scale-[1.02] origin-bottom'
              : activeReaction === 'shy'
              ? 'scale-[0.98]'
              : (mood === 'idle' || mood === 'looking_at_input') ? 'animate-idle-float' : ''
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
          <g className={`transition-all duration-500 ${isAssembling ? 'animate-assemble-thruster origin-bottom' : ''}`}>
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
          <g className={`transition-all duration-300 ${isAssembling ? 'animate-assemble-torso origin-center' : ''}`}>
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

            {/* Glowing SubZap chest reactor / brand lightning element */}
            <g className={isAssembling ? 'animate-assemble-core origin-[120px_182px]' : ''}>
              <circle cx="120" cy="182" r="18" fill="url(#darkPlate)" stroke="#6366F1" strokeWidth="2.5" />
              <circle cx="120" cy="182" r="12" fill="url(#zapCore)" filter="url(#eyeGlow)" opacity="0.9" />
              {/* Mini lightning bolt icon inside core */}
              <path 
                d="M121 173 L114 182 L119 182 L118 191 L126 181 L121 181 Z" 
                fill="#FFFFFF" 
              />
            </g>
          </g>

          {/* ================= HEAD & VISOR ================= */}
          <g 
            className={`transition-transform duration-500 ease-out origin-[120px_130px] ${
              isAssembling
                ? 'animate-assemble-head'
                : isError 
                ? '-rotate-6 translate-y-1' 
                : isCelebrating 
                ? 'rotate-3 -translate-y-1.5' 
                : isCoveringEyes 
                ? '-rotate-6 translate-y-0.5' 
                : activeReaction === 'shy'
                ? '-rotate-6 translate-y-0.5'
                : activeReaction === 'curious'
                ? 'rotate-6 -translate-y-1'
                : activeReaction === 'tickle'
                ? 'rotate-2'
                : activeReaction === 'surprised'
                ? '-translate-y-2'
                : activeReaction === 'happy'
                ? 'rotate-2 -translate-y-1'
                : isLookingAtForm 
                ? 'rotate-3' 
                : 'rotate-0'
            }`}
          >
            {/* Neck joint */}
            <rect x="108" y="126" width="24" height="18" rx="5" fill="url(#darkPlate)" />

            {/* Antenna / Energy Crest */}
            <g className={isAssembling ? 'animate-assemble-antenna origin-[120px_56px]' : ''}>
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
            </g>

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
            ) : isCelebrating || activeReaction === 'tickle' || activeReaction === 'happy' ? (
              // Cheerful / Tickled / Happy Squinted Arch Eyes ^ ^ with warm pink blush
              <g className="transition-all duration-300">
                <path d="M90 95 Q100 83 110 95" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                <path d="M130 95 Q140 83 150 95" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                {/* Warm cheerful blush cheek circles */}
                <circle cx="88" cy="104" r="4" fill="#F43F5E" opacity="0.65" />
                <circle cx="152" cy="104" r="4" fill="#F43F5E" opacity="0.65" />
                {activeReaction === 'happy' && (
                  <circle cx="120" cy="80" r="2.5" fill="#A855F7" opacity="0.9" filter="url(#eyeGlow)" />
                )}
              </g>
            ) : (
              // Standard / Looking / Surprised / Curious / Shy Eyes with blink capability
              <g 
                className={`transition-all duration-200 ${
                  isBlinking && activeReaction !== 'surprised' ? 'scale-y-10 origin-[120px_92px]' : 'scale-y-100'
                }`}
              >
                {/* Shy blush cheeks if shy reaction */}
                {activeReaction === 'shy' && (
                  <g className="transition-all duration-300">
                    <circle cx="86" cy="104" r="3.8" fill="#FB7185" opacity="0.8" />
                    <circle cx="154" cy="104" r="3.8" fill="#FB7185" opacity="0.8" />
                  </g>
                )}

                {/* Left Eye */}
                <g 
                  className={`transition-transform duration-300 ${
                    isLookingAtForm ? 'translate-x-3' : 'translate-x-0'
                  }`}
                >
                  {/* Glowing blue eye body - expands slightly when surprised */}
                  <rect 
                    x={activeReaction === 'surprised' ? "88" : "90"} 
                    y={activeReaction === 'surprised' ? "80" : "82"} 
                    width={activeReaction === 'surprised' ? "22" : "18"} 
                    height={activeReaction === 'surprised' ? "26" : "22"} 
                    rx={activeReaction === 'surprised' ? "11" : "9"} 
                    fill="#38BDF8" 
                    filter="url(#eyeGlow)" 
                  />
                  {/* Mouse-following pupil */}
                  <g ref={leftPupilRef} className="will-change-transform">
                    {/* Dark/black pupil */}
                    <circle 
                      cx="99" 
                      cy="93" 
                      r={activeReaction === 'surprised' ? "5.2" : "4.5"} 
                      fill="#0F172A" 
                    />
                    <circle 
                      cx="99" 
                      cy="93" 
                      r={activeReaction === 'surprised' ? "2.2" : "1.8"} 
                      fill="#020617" 
                    />
                  </g>
                  {/* Eye highlight reflection (remains crisp on top) */}
                  <circle cx="95" cy="88" r="3" fill="#FFFFFF" opacity="0.95" />
                </g>

                {/* Right Eye */}
                <g 
                  className={`transition-transform duration-300 ${
                    isLookingAtForm ? 'translate-x-3' : 'translate-x-0'
                  }`}
                >
                  {/* Glowing blue eye body - expands slightly when surprised */}
                  <rect 
                    x={activeReaction === 'surprised' ? "130" : "132"} 
                    y={activeReaction === 'surprised' ? "80" : "82"} 
                    width={activeReaction === 'surprised' ? "22" : "18"} 
                    height={activeReaction === 'surprised' ? "26" : "22"} 
                    rx={activeReaction === 'surprised' ? "11" : "9"} 
                    fill="#38BDF8" 
                    filter="url(#eyeGlow)" 
                  />
                  {/* Mouse-following pupil */}
                  <g ref={rightPupilRef} className="will-change-transform">
                    {/* Dark/black pupil */}
                    <circle 
                      cx="141" 
                      cy="93" 
                      r={activeReaction === 'surprised' ? "5.2" : "4.5"} 
                      fill="#0F172A" 
                    />
                    <circle 
                      cx="141" 
                      cy="93" 
                      r={activeReaction === 'surprised' ? "2.2" : "1.8"} 
                      fill="#020617" 
                    />
                  </g>
                  {/* Eye highlight reflection (remains crisp on top) */}
                  <circle cx="137" cy="88" r="3" fill="#FFFFFF" opacity="0.95" />
                </g>
              </g>
            )}
          </g>

          {/* ================= LEFT ARM ================= */}
          <g 
            id="bot-left-shoulder"
            className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-[72px_155px] ${
              isAssembling
                ? 'animate-assemble-arm-left'
                : isCoveringEyes 
                ? 'rotate-[155deg] -translate-y-1' 
                : isCelebrating 
                ? '-rotate-[75deg] -translate-y-8 -translate-x-3' 
                : isError 
                ? 'rotate-[20deg] translate-y-1' 
                : activeReaction === 'surprised'
                ? '-rotate-[25deg] -translate-x-2'
                : activeReaction === 'shy'
                ? 'rotate-[16deg] translate-x-1.5'
                : activeReaction === 'tickle'
                ? '-rotate-[15deg] translate-y-0.5'
                : activeReaction === 'happy'
                ? '-rotate-[38deg] -translate-y-2'
                : activeReaction === 'curious'
                ? 'rotate-[10deg]'
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
                  : activeReaction === 'shy'
                  ? 'rotate-[25deg]'
                  : activeReaction === 'happy'
                  ? 'rotate-[20deg]'
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
              isAssembling
                ? 'animate-assemble-arm-right'
                : isCoveringEyes 
                ? '-rotate-[155deg] -translate-y-1' 
                : isCelebrating 
                ? 'rotate-[75deg] -translate-y-8 translate-x-3' 
                : isError 
                ? '-rotate-[45deg] -translate-y-4' 
                : activeReaction === 'surprised'
                ? 'rotate-[25deg] translate-x-2'
                : activeReaction === 'shy'
                ? '-rotate-[16deg] -translate-x-1.5'
                : activeReaction === 'tickle'
                ? 'rotate-[15deg] translate-y-0.5'
                : activeReaction === 'happy'
                ? 'rotate-[38deg] -translate-y-2'
                : activeReaction === 'curious'
                ? '-rotate-[14deg]'
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
                  : activeReaction === 'shy'
                  ? '-rotate-[25deg]'
                  : activeReaction === 'happy'
                  ? '-rotate-[20deg]'
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
                  fill={isCelebrating || activeReaction === 'happy' ? '#10B981' : '#38BDF8'} 
                  filter="url(#eyeGlow)" 
                />
                {/* Pointing finger / Presentation indicator when presenting */}
                {(isPresenting || isLookingAtForm) && !isCoveringEyes && !isCelebrating && !activeReaction && (
                  <path 
                    d="M174 212 L188 207 L174 217 Z" 
                    fill="#38BDF8" 
                    filter="url(#eyeGlow)" 
                  />
                )}
              </g>
            </g>
          </g>

          {/* ================= ASSEMBLY ENERGY SPARKS & FLASH RING ================= */}
          {isAssembling && (
            <g className="pointer-events-none">
              {/* Spark 1: Top-Left converging to chest core */}
              <circle cx="48" cy="70" r="2.5" fill="#38BDF8" className="animate-assemble-spark-1" filter="url(#eyeGlow)" />
              {/* Spark 2: Top-Right converging to chest core */}
              <circle cx="192" cy="74" r="2" fill="#818CF8" className="animate-assemble-spark-2" filter="url(#eyeGlow)" />
              {/* Spark 3: Mid-Left converging to chest core */}
              <circle cx="34" cy="170" r="2.2" fill="#6366F1" className="animate-assemble-spark-3" filter="url(#eyeGlow)" />
              {/* Spark 4: Mid-Right converging to chest core */}
              <circle cx="206" cy="175" r="2" fill="#38BDF8" className="animate-assemble-spark-4" filter="url(#eyeGlow)" />
              {/* Spark 5: Bottom-Left thruster spark */}
              <circle cx="68" cy="240" r="2.5" fill="#A855F7" className="animate-assemble-spark-5" filter="url(#eyeGlow)" />

              {/* Lock-in energy flash ring bursting at 800-1000ms */}
              <circle 
                cx="120" 
                cy="182" 
                r="16" 
                fill="none" 
                stroke="#38BDF8" 
                strokeWidth="2" 
                className="animate-assemble-flash"
                filter="url(#eyeGlow)"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
