/**
 * Privacy-Conscious CTA & Event Tracking Utility for XeooAuditor
 *
 * Design Principles:
 * 1. Zero PII: Never captures names, emails, credentials, cookies, scanned URLs, or payloads.
 * 2. Safe Fallback: Acts as a zero-overhead no-op when no analytics provider is configured.
 * 3. Non-blocking: Analytics failures never crash UI components, navigation, or form submissions.
 * 4. Extensible: Plug-and-play adapter interface for privacy-respecting platforms (e.g., Plausible, Umami).
 */

export type CTAEventName =
  | "cta_try_tool"
  | "cta_get_started"
  | "cta_contact"
  | "cta_view_docs"
  | "cta_nav_home"
  | "cta_nav_contact"
  | "contact_form_submit";

export interface EventProperties {
  ctaId?: string;
  path?: string;
  category?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AnalyticsProvider {
  track: (eventName: CTAEventName, props?: EventProperties) => void;
}

/**
 * Built-in privacy-conscious provider:
 * In development, logs debug event to console if VITE_DEBUG_ANALYTICS is true.
 * In production without third-party integration, performs a safe no-op.
 */
class PrivacyFirstAnalyticsManager {
  private provider: AnalyticsProvider | null = null;
  private isDev = import.meta.env.DEV;

  public setProvider(provider: AnalyticsProvider) {
    this.provider = provider;
  }

  public track(eventName: CTAEventName, props: EventProperties = {}) {
    try {
      const sanitizedProps: EventProperties = {
        path: typeof window !== "undefined" ? window.location.pathname : "/",
        timestamp: Date.now(),
        ...props,
      };

      // Strip any accidental sensitive fields defensively
      delete sanitizedProps.password;
      delete sanitizedProps.token;
      delete sanitizedProps.email;
      delete sanitizedProps.targetUrl;
      delete sanitizedProps.cookie;

      if (this.provider) {
        this.provider.track(eventName, sanitizedProps);
      } else if (this.isDev && import.meta.env.VITE_DEBUG_ANALYTICS === "true") {
        console.debug(`[Analytics] ${eventName}:`, sanitizedProps);
      }
    } catch {
      // Intentionally suppress errors to ensure application reliability
    }
  }
}

export const analytics = new PrivacyFirstAnalyticsManager();

/**
 * Convenience helper to track CTA events
 */
export function trackCTA(eventName: CTAEventName, ctaId?: string, extra?: EventProperties) {
  analytics.track(eventName, { ctaId, ...extra });
}

