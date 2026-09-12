import React, { useState, useEffect } from 'react';
import { extractDomain, getBrandfetchLogoUrl, getSecondaryLogoUrl, getInitials } from '../utils/logos';

interface BrandLogoProps {
  name: string;
  domain?: string;
  logoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  categoryColor?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  name,
  domain,
  logoUrl,
  size = 'md',
  className = '',
  categoryColor = '#6366F1',
}) => {
  const resolvedDomain = domain || extractDomain(name);
  const primaryUrl = logoUrl || getBrandfetchLogoUrl(resolvedDomain);

  // States: 0 = primary (Brandfetch), 1 = secondary (unavatar), 2 = monogram fallback
  const [attempt, setAttempt] = useState<number>(0);
  const [currentSrc, setCurrentSrc] = useState<string>(primaryUrl);

  useEffect(() => {
    setAttempt(0);
    setCurrentSrc(logoUrl || getBrandfetchLogoUrl(domain || extractDomain(name)));
  }, [name, domain, logoUrl]);

  const handleError = () => {
    if (attempt === 0) {
      setAttempt(1);
      setCurrentSrc(getSecondaryLogoUrl(resolvedDomain));
    } else {
      setAttempt(2);
    }
  };

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px] rounded-md',
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-12 h-12 text-sm rounded-2xl',
  };

  const imgSizeClasses = {
    xs: 'w-5 h-5 rounded-md',
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  if (attempt >= 2) {
    // Elegant monogram fallback badge
    return (
      <div
        className={`flex items-center justify-center font-bold font-mono shrink-0 shadow-sm transition-transform select-none ${sizeClasses[size]} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${categoryColor}25, ${categoryColor}40)`,
          color: categoryColor,
          border: `1px solid ${categoryColor}50`,
        }}
        title={`${name} (${resolvedDomain})`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <img
        src={currentSrc}
        alt={`${name} logo`}
        className={`object-contain p-1 w-full h-full ${imgSizeClasses[size]}`}
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
};
