/**
 * Utility functions for XeooAuditor frontend
 */

/**
 * Combines conditional class names into a single clean string.
 */
export function cn(...classes: unknown[]): string {
  return classes.filter(Boolean).join(" ");
}

