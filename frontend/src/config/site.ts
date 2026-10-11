/**
 * Centralized SEO & Site Configuration for XeooAuditor
 *
 * All public URLs, canonical paths, and metadata defaults are defined here.
 * If the domain changes in the future, updating VITE_SITE_URL or this file's
 * DEFAULT_BASE_URL will automatically update all canonical URLs, Open Graph tags,
 * sitemaps, and robots references.
 */

const DEFAULT_BASE_URL = "https://xeooauditor.xo.je";

export const siteConfig = {
  name: "XeooAuditor",
  shortName: "XeooAuditor",
  // Base URL normalized without trailing slash
  baseUrl: (import.meta.env.VITE_SITE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  defaultTitle: "XeooAuditor — Privacy-First Website Security & Compliance Auditing",
  titleTemplate: "%s | XeooAuditor",
  defaultDescription:
    "Privacy-first public website security auditing toolkit. Run SSL/TLS, HTTP security headers, DNS, sitemap, and robots checks with zero tracking and no registration.",
  defaultLanguage: "en",
  themeColor: "#020617",
  ogImage: "/brand/xeoo-auditor-wordmark.svg",
  contactPath: "/contact",
  routes: {
    home: "/",
    contact: "/contact",
    login: "/login/mimin",
  },
} as const;

/**
 * Returns a fully qualified, normalized canonical URL for a given relative path.
 * Strips duplicate slashes and avoids trailing slashes unless on the root.
 */
export function getCanonicalUrl(path: string = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/" || cleanPath === "") {
    return `${siteConfig.baseUrl}/`;
  }
  // Remove trailing slashes on sub-paths for strict consistency
  return `${siteConfig.baseUrl}${cleanPath.replace(/\/+$/, "")}`;
}

