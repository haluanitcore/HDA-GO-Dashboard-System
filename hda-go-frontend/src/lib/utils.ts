import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates that a URL uses only allowed schemes (http/https/mailto).
 * Returns undefined if the URL is invalid or uses a dangerous scheme such as
 * `javascript:` or `data:`, preventing XSS via href/src injection.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) return url;
  } catch {
    // Relative paths starting with / are safe internal routes
    if (url.startsWith('/')) return url;
  }
  return undefined;
}
