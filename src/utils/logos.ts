/**
 * Dynamic Automated Logo Fetching Engine
 * Automatically extracts domain from service name or user input,
 * generating high-resolution logo asset URLs from Brandfetch CDN with graceful fallbacks.
 */

const KNOWN_DOMAINS: Record<string, string> = {
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  adobe: 'adobe.com',
  photoshop: 'adobe.com',
  illustrator: 'adobe.com',
  creativecloud: 'adobe.com',
  chatgpt: 'openai.com',
  openai: 'openai.com',
  notion: 'notion.so',
  github: 'github.com',
  copilot: 'github.com',
  youtube: 'youtube.com',
  google: 'google.com',
  googleone: 'one.google.com',
  gsuite: 'workspace.google.com',
  audible: 'audible.com',
  amazon: 'amazon.com',
  prime: 'primevideo.com',
  apple: 'apple.com',
  applemusic: 'apple.com',
  icloud: 'apple.com',
  figma: 'figma.com',
  slack: 'slack.com',
  discord: 'discord.com',
  disney: 'disneyplus.com',
  hotstar: 'hotstar.com',
  canva: 'canva.com',
  dropbox: 'dropbox.com',
  zoom: 'zoom.us',
  equinox: 'equinox.com',
  cultfit: 'cult.fit',
  cult: 'cult.fit',
  hulu: 'hulu.com',
  max: 'max.com',
  hbo: 'max.com',
  microsoft: 'microsoft.com',
  office: 'microsoft.com',
  office365: 'microsoft.com',
  linkedin: 'linkedin.com',
  twitter: 'x.com',
  x: 'x.com',
  medium: 'medium.com',
  substack: 'substack.com',
  linear: 'linear.app',
  vercel: 'vercel.com',
  loom: 'loom.com',
  grammarly: 'grammarly.com',
  midjourney: 'midjourney.com',
  claude: 'anthropic.com',
  anthropic: 'anthropic.com',
  strava: 'strava.com',
  duolingo: 'duolingo.com',
  nytime: 'nytimes.com',
  wsj: 'wsj.com',
};

/**
 * Format user input into a clean root domain
 */
export function extractDomain(input: string): string {
  if (!input) return 'example.com';
  const trimmed = input.trim().toLowerCase();

  // Check if input is a URL
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      return url.hostname.replace(/^www\./, '');
    }
  } catch {
    // fallback to string parsing
  }

  // If already resembles a domain with extension (e.g. notion.so, cult.fit, app.slack.com)
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(trimmed)) {
    return trimmed.replace(/^www\./, '');
  }

  // Check known aliases
  const simplified = trimmed.replace(/[^a-z0-9]/g, '');
  for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
    if (simplified.includes(key)) {
      return domain;
    }
  }

  // Extract first word or clean name
  const words = trimmed.split(/[\s_-]+/);
  const candidate = words[0].replace(/[^a-z0-9]/g, '');
  if (candidate && candidate.length > 1) {
    return `${candidate}.com`;
  }

  return `${simplified || 'service'}.com`;
}

/**
 * Generates Brandfetch Logo API CDN endpoint
 */
export function getBrandfetchLogoUrl(domain: string): string {
  const cleanDomain = extractDomain(domain);
  return `https://cdn.brandfetch.io/domain/${cleanDomain}`;
}

/**
 * Fallback logo providers if Brandfetch CDN fails for niche services
 */
export function getSecondaryLogoUrl(domain: string): string {
  const cleanDomain = extractDomain(domain);
  return `https://unavatar.io/${cleanDomain}?fallback=false`;
}

/**
 * Generate a nice 2-letter monogram initials for fallback
 */
export function getInitials(name: string): string {
  if (!name) return 'SZ';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
