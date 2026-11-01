import { Site } from "../shared/types";

export interface SiteTokenLimit {
  warningThreshold: number; // tokens at which we show a warning
  maxRecommended: number;   // maximum recommended input tokens
}

export const SITE_LIMITS: Record<Site, SiteTokenLimit> = {
  chatgpt: {
    warningThreshold: 6000,
    maxRecommended: 12000,
  },
  claude: {
    warningThreshold: 15000,
    maxRecommended: 30000,
  },
  gemini: {
    warningThreshold: 15000,
    maxRecommended: 32000,
  },
};

/**
 * Estimates token count based on text length and word boundaries.
 * In English/code, ~4 characters is roughly 1 token.
 * We also consider whitespace and punctuation for better approximation.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  // Standard rule of thumb: ~4 characters per token
  const charBased = Math.ceil(text.length / 4);
  // Word based estimate: ~0.75 tokens per word
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordBased = Math.ceil(words * 1.3);

  // Return weighted average favoring character count for code-heavy chats
  return Math.max(charBased, wordBased);
}

export interface TokenStatus {
  tokens: number;
  chars: number;
  exceedsWarning: boolean;
  exceedsMax: boolean;
  limit: SiteTokenLimit;
}

export function checkTokenLimits(text: string, site: Site): TokenStatus {
  const tokens = estimateTokens(text);
  const limit = SITE_LIMITS[site] || {
    warningThreshold: 8000,
    maxRecommended: 16000,
  };

  return {
    tokens,
    chars: text.length,
    exceedsWarning: tokens > limit.warningThreshold,
    exceedsMax: tokens > limit.maxRecommended,
    limit,
  };
}

