import type { AuditRecord } from "../types/audit";
import { readJsonSafe, toApiFailure, type ApiFailure } from "./apiError";

const STORAGE_KEY = "xeoo_session_audits";

/**
 * Standard Reference Audit Record using real-world scanned data for https://github.com/
 */
export const SAMPLE_AUDIT_RECORD: AuditRecord = {
  id: "sample-demo-report",
  url: "https://example.com/",
  domain: "example.com",
  createdAt: new Date().toISOString(),
  durationMs: 412,
  score: 100,
  isDemo: true,
  summary: {
    pass: 20,
    fail: 0,
    warning: 0,
    notChecked: 0,
    manualRequired: 0,
  },
  findings: [
    {
      id: "A01",
      category: "TECHNICAL_SEO",
      title: "Sitemap.xml",
      status: "PASS",
      severity: "LOW",
      description:
        "Valid sitemap.xml file accessible with standard <urlset> XML declaration indexing URLs.",
      recommendation:
        "Automatically update your sitemap whenever new routes or content are published. To generate a standardized XML sitemap instantly, use https://xeootools.site.je/tools/sitemap-generator",
      evidence:
        'HTTP 200 OK — Detected valid sitemap.xml at https://example.com/sitemap.xml with <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"> declaration.',
    },
    {
      id: "A02",
      category: "TECHNICAL_SEO",
      title: "Robots.txt",
      status: "PASS",
      severity: "LOW",
      description:
        "Valid robots.txt file provides clear crawling directives to search engine bots.",
      recommendation:
        "Periodically monitor User-agent directives to ensure critical public routes are not unintentionally blocked. Configure and test robots.txt rules at https://xeootools.site.je/tools/robots-txt-generator",
      evidence:
        "HTTP 200 OK — Found robots.txt at https://example.com/robots.txt:\nUser-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
    },
    {
      id: "A03",
      category: "TECHNICAL_SEO",
      title: "Search Console",
      status: "PASS",
      severity: "LOW",
      description:
        "Google Search Console verification meta tag detected in homepage HTML document.",
      recommendation:
        "Regularly monitor index coverage, CTR, and crawl error reports in Google Search Console.",
      evidence:
        '<meta name="google-site-verification" content="example-gsc-token-verification-compliant">',
    },
    {
      id: "A04",
      category: "TECHNICAL_SEO",
      title: "Submit Sitemap",
      status: "PASS",
      severity: "LOW",
      description:
        "Sitemap file location is explicitly declared inside the robots.txt file.",
      recommendation:
        "Ensure sitemap URLs in robots.txt always use absolute HTTPS protocols. Use https://xeootools.site.je/tools/robots-txt-generator to update your robots.txt file.",
      evidence:
        "Sitemap: https://example.com/sitemap.xml specified in robots.txt.",
    },
    {
      id: "A05",
      category: "LINK_HEALTH",
      title: "Internal Links",
      status: "PASS",
      severity: "LOW",
      description:
        "Internal navigation links are well-structured with clear, descriptive anchor text.",
      recommendation:
        "Maintain clean navigation architecture to distribute internal link equity and guide visitors.",
      evidence:
        "Discovered 24 internal links with descriptive and valid anchor text on the homepage.",
    },
    {
      id: "A06",
      category: "STRUCTURED_DATA",
      title: "Breadcrumbs",
      status: "PASS",
      severity: "LOW",
      description:
        "BreadcrumbList schema markup is properly embedded to support rich navigation snippets in search engines.",
      recommendation:
        "Maintain JSON-LD BreadcrumbList markup across all hierarchical page paths.",
      evidence:
        "Detected BreadcrumbList structured data (JSON-LD: Home > Overview > Documentation).",
    },
    {
      id: "A07",
      category: "TECHNICAL_SEO",
      title: "Canonical URL",
      status: "PASS",
      severity: "LOW",
      description:
        'rel="canonical" tag is explicitly defined to prevent duplicate content issues across URL variants.',
      recommendation:
        "Ensure canonical URLs always reference canonical absolute HTTPS addresses.",
      evidence: '<link rel="canonical" href="https://example.com/">',
    },
    {
      id: "A08",
      category: "STRUCTURED_DATA",
      title: "LocalBusiness Schema",
      status: "PASS",
      severity: "LOW",
      description:
        "LocalBusiness / Organization schema embedded with entity and contact details.",
      recommendation:
        "Keep address attributes, phone numbers, and operational hours synced with physical locations.",
      evidence:
        "Discovered Schema.org LocalBusiness/Organization with verified metadata.",
    },
    {
      id: "A09",
      category: "STRUCTURED_DATA",
      title: "Organization Schema",
      status: "PASS",
      severity: "LOW",
      description:
        "Organization schema detected with official logo, entity name, and social media profiles.",
      recommendation:
        "Ensure social profile links and branding logo assets remain synchronized.",
      evidence:
        "Found Schema.org Organization (name: 'Example Org', logo: 'https://example.com/logo.svg', sameAs: ['https://twitter.com/example', 'https://github.com/example']).",
    },
    {
      id: "A10",
      category: "TECHNICAL_SEO",
      title: "Indexing",
      status: "PASS",
      severity: "LOW",
      description:
        "Page is open for indexing and crawling by search engines (index, follow allowed).",
      recommendation:
        "Monitor index status in search engine webmaster consoles to prevent indexing gaps.",
      evidence:
        "No noindex restrictions found in meta robots tags or X-Robots-Tag response headers.",
    },
    {
      id: "A11",
      category: "LINK_HEALTH",
      title: "Broken Links",
      status: "PASS",
      severity: "LOW",
      description:
        "All scanned links respond without HTTP 404 or 500 errors (15 links tested).",
      recommendation:
        "Run periodic link health checks to identify broken third-party links promptly.",
      evidence:
        "Tested 15 sample links — all returned valid HTTP 200 OK status codes.",
    },
    {
      id: "A12",
      category: "FORMS_USABILITY",
      title: "Form Validation",
      status: "PASS",
      severity: "LOW",
      description:
        "Interactive forms utilize native HTML5 validation attributes (required, type=email, pattern).",
      recommendation:
        "Always pair frontend client-side validation with strict backend server-side validation.",
      evidence:
        '<form action="/contact" method="POST">\n  <input type="email" name="email" required placeholder="user@example.com">\n  <textarea name="message" required minlength="10"></textarea>\n</form>',
    },
    {
      id: "A13",
      category: "FORMS_USABILITY",
      title: "Anti-spam Form",
      status: "PASS",
      severity: "LOW",
      description:
        "Forms include spam mitigation instruments and bot defense (Cloudflare Turnstile token & honeypot).",
      recommendation:
        "Utilize non-intrusive bot defense mechanisms like Honeypot or Turnstile for frictionless UX.",
      evidence:
        "Detected honeypot spam protection field and bot defense token integration on form.",
    },
    {
      id: "A14",
      category: "ANALYTICS_CONVERSION",
      title: "Form-submit Tracking",
      status: "PASS",
      severity: "LOW",
      description:
        "Form submission is hooked into analytics tracking and conversion telemetry handlers.",
      recommendation:
        "Ensure conversion event parameters are configured correctly in your analytics dashboard.",
      evidence:
        "Detected submit event listener dataLayer.push({ event: 'generate_lead' }) on contact form.",
    },
    {
      id: "A15",
      category: "ANALYTICS_CONVERSION",
      title: "Contact Tracking",
      status: "PASS",
      severity: "LOW",
      description:
        "Public contact channels detected active (5 verified communication channels).",
      recommendation:
        "Attach onClick event listeners to contact links to measure prospect conversions and lead engagements.",
      evidence:
        "Verified active contact channels: Email: contact@example.com, Phone: +62 812-3456-7890, WhatsApp: wa.me/6281234567890, GitHub: @example, Twitter/X: @example",
    },
    {
      id: "A16",
      category: "ANALYTICS_CONVERSION",
      title: "CTA Tracking",
      status: "PASS",
      severity: "LOW",
      description:
        "Call-to-Action (CTA) buttons are prominent and include interaction tracking attributes.",
      recommendation:
        "Assign unique tracking identifiers or data attributes to each CTA button for conversion funnel analysis.",
      evidence:
        '<a href="/get-started" class="btn btn-primary" data-track="cta_hero_start">Get Started Free</a>',
    },
    {
      id: "A17",
      category: "CONFIG_BRANDING",
      title: "Favicon",
      status: "PASS",
      severity: "LOW",
      description:
        "Favicon icons are officially defined in HTML for browser tabs and mobile bookmarks.",
      recommendation:
        "Provide SVG and PNG 32x32 formats along with apple-touch-icon for crisp displays across all resolutions.",
      evidence:
        '<link rel="icon" type="image/svg+xml" href="https://example.com/favicon.svg">\n<link rel="apple-touch-icon" href="https://example.com/apple-touch-icon.png">',
    },
    {
      id: "A18",
      category: "CONFIG_BRANDING",
      title: "Custom 404",
      status: "PASS",
      severity: "LOW",
      description:
        "Server correctly handles missing URLs by serving genuine HTTP 404 status codes.",
      recommendation:
        "Ensure custom 404 error pages provide clear navigation back to the homepage or search box.",
      evidence:
        "Probed random route /random-check-test-404 returned genuine HTTP 404 Not Found response.",
    },
    {
      id: "A19",
      category: "SECURITY_TLS",
      title: "HTTPS / SSL",
      status: "PASS",
      severity: "LOW",
      description:
        "Fully encrypted TLS 1.3 connection with valid SSL certificate and active HSTS policy.",
      recommendation:
        "Maintain automated SSL renewal and configure HSTS max-age for at least 6 months.",
      evidence:
        "HTTPS active, valid TLS 1.3 handshake, HSTS Header: max-age=31536000; includeSubDomains; preload.",
    },
    {
      id: "A20",
      category: "RESPONSIVE_MOBILE",
      title: "Device Responsive",
      status: "PASS",
      severity: "LOW",
      description:
        "Responsive meta viewport tag correctly configured for cross-device rendering.",
      recommendation:
        "Maintain responsive layouts and ensure touch targets are at least 44x44px on mobile devices.",
      evidence:
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    },
  ],
};

/**
 * Retrieve session audits from ephemeral sessionStorage
 */
export function getSessionAudits(): AuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a new audit to session storage
 */
export function saveSessionAudit(audit: AuditRecord): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getSessionAudits();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save audit to session storage:", err);
  }
}

/**
 * Find audit record synchronously from session or fallback demo
 */
export function findAuditById(id: string): AuditRecord | null {
  if (id === "sample-demo-report" || id === "demo") {
    return SAMPLE_AUDIT_RECORD;
  }
  const sessionList = getSessionAudits();
  const found = sessionList.find((item) => item.id === id);
  return found || null;
}

/**
 * Fetch audit record asynchronously from backend API with fallback to session
 */
export async function fetchAuditByIdAsync(
  id: string,
): Promise<AuditRecord | null> {
  if (id === "sample-demo-report" || id === "demo") {
    return SAMPLE_AUDIT_RECORD;
  }

  // 1. Check local session storage first for instant render
  const local = findAuditById(id);
  if (local) return local;

  // 2. Fetch from backend API
  try {
    const res = await fetch(`/api/audits/get.php?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.record) {
        saveSessionAudit(data.record);
        return data.record;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch audit from server:", err);
  }

  return null;
}

/**
 * Dispatch real-time audit scan to backend API
 */
export async function executeRealtimeAudit(
  targetUrl: string,
): Promise<{
  success: boolean;
  auditId?: string;
  record?: AuditRecord;
  error?: string;
  failure?: ApiFailure;
}> {
  try {
    const res = await fetch("/api/audits/create.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
    });

    const data = await readJsonSafe(res) as Record<string, unknown> | null;
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: typeof data?.error === "string" ? data.error : "Failed to audit the target website.",
        failure: toApiFailure(res, data),
      };
    }

    const record = data.record as AuditRecord | undefined;
    if (record) {
      saveSessionAudit(record);
    }

    return {
      success: true,
      auditId: data.auditId as string,
      record,
    };
  } catch {
    return {
      success: false,
      error:
        "Unable to connect to the audit engine server. Ensure backend is active.",
    };
  }
}
