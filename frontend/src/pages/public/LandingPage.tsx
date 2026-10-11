import React, { useState, useMemo } from "react";
import {
  Search,
  CircleCheck,
  LockKeyhole,
  FileSearch,
  FileCode,
  Lock,
  Link2,
  Share2,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
  X,
  ExternalLink,
} from "lucide-react";
import { PublicLayout } from "../../layouts/PublicLayout";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Pagination,
  SEO,
} from "../../components/common";
import { CyberSpaceBackground } from "../../components/background/CyberSpaceBackground";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import {
  SAMPLE_AUDIT_RECORD,
  executeRealtimeAudit,
} from "../../services/auditStorage";
import type { AuditRecord } from "../../types/audit";
import { cn } from "../../lib/utils";
import { showFailureAlert } from "../../lib/securityAlert";
import { trackCTA } from "../../lib/analytics";

export const LandingPage: React.FC = () => {
  const [heroUrl, setHeroUrl] = useState("");
  const [heroError, setHeroError] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [auditRecord, setAuditRecord] =
    useState<AuditRecord>(SAMPLE_AUDIT_RECORD);
  const [auditedUrl, setAuditedUrl] = useState<string>(SAMPLE_AUDIT_RECORD.url);

  // Scroll-spy sections
  const landingSectionIds = useMemo(
    () => ["home", "features", "how-it-works", "audit-preview", "faq"],
    [],
  );
  const [activeSectionId, scrollToSection] = useScrollSpy(landingSectionIds, {
    rootMargin: "-90px 0px -40% 0px",
  });

  // Sample report filter state
  const [previewFilter, setPreviewFilter] = useState<
    | "ALL"
    | "ISSUES"
    | "PASSED"
    | "FAILED"
    | "WARNINGS"
    | "NOT_CHECKED"
    | "MANUAL_REQUIRED"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(
    null,
  );
  const ITEMS_PER_PAGE = 10;

  // FAQ Accordion open states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [alertPopup, setAlertPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeroError(undefined);

    const trimmed = heroUrl.trim();
    trackCTA("cta_try_tool", "hero_submit");
    if (!trimmed) {
      setAlertPopup({
        isOpen: true,
        title: "URL Required",
        message: "Please enter a website URL to begin the audit.",
      });
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setAlertPopup({
          isOpen: true,
          title: "Invalid URL Scheme",
          message:
            "URL scheme must be http:// or https:// (e.g. https://github.com).",
        });
        return;
      }
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1" ||
        parsed.hostname.startsWith("192.168.") ||
        parsed.hostname.startsWith("10.")
      ) {
        setAlertPopup({
          isOpen: true,
          title: "SSRF Protection",
          message:
            "Localhost and private IP addresses are blocked for SSRF security.",
        });
        return;
      }

      setIsProcessing(true);
      setProcessingStatus("Conducting pre-flight SSRF & DNS validation...");

      const res = await executeRealtimeAudit(parsed.href);
      if (res.success && res.record) {
        setAuditRecord(res.record);
        setAuditedUrl(parsed.href);
        setCurrentPage(1);
        const previewElement = document.getElementById("audit-preview");
        if (previewElement) {
          previewElement.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        showFailureAlert(res.failure);
      }
    } catch {
      setAlertPopup({
        isOpen: true,
        title: "Malformed URL",
        message: "Please enter a valid website URL (e.g. https://github.com).",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  const filteredPreviewFindings = useMemo(() => {
    if (previewFilter === "ISSUES") {
      return auditRecord.findings.filter(
        (f) => f.status === "FAIL" || f.status === "WARNING",
      );
    }
    if (previewFilter === "PASSED") {
      return auditRecord.findings.filter((f) => f.status === "PASS");
    }
    if (previewFilter === "FAILED") {
      return auditRecord.findings.filter((f) => f.status === "FAIL");
    }
    if (previewFilter === "WARNINGS") {
      return auditRecord.findings.filter((f) => f.status === "WARNING");
    }
    if (previewFilter === "NOT_CHECKED") {
      return auditRecord.findings.filter((f) => f.status === "NOT_CHECKED");
    }
    if (previewFilter === "MANUAL_REQUIRED") {
      return auditRecord.findings.filter((f) => f.status === "MANUAL_REQUIRED");
    }
    return auditRecord.findings;
  }, [previewFilter, auditRecord]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPreviewFindings.length / ITEMS_PER_PAGE),
  );

  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPreviewFindings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPreviewFindings, currentPage]);

  const renderFormattedRecommendation = (recommendation: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = recommendation.split(urlRegex);

    return (
      <div className="space-y-2">
        <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--color-text-primary)] font-medium">
          {parts.map((part, i) => {
            if (part.match(urlRegex)) {
              let label = "Visit Recommended Tool";
              if (part.includes("sitemap-generator")) {
                label = "Open Sitemap Generator (XeooTools)";
              } else if (part.includes("robots-txt-generator")) {
                label = "Open Robots.txt Generator (XeooTools)";
              }
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-xs text-[var(--color-brand-primary)] hover:underline mx-1 bg-[var(--color-brand-subtle)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] transition-all hover:bg-[var(--color-brand-primary)] hover:text-white align-middle"
                >
                  <span>{label}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>
    );
  };

  const faqs = [
    {
      q: "What does XeooAuditor inspect?",
      a: "XeooAuditor performs bounded, non-destructive technical checks on public websites. It examines HTTPS/TLS certificate configuration, security response headers (CSP, HSTS), robots.txt directives, sitemap.xml validity, canonical link declarations, internal link redirect hops, broken links, favicon configuration, and basic structured data markup.",
    },
    {
      q: "How do I start a website audit?",
      a: "Simply enter any publicly accessible website URL (e.g. https://github.com/) into the audit form and click Start Audit. XeooAuditor pre-screens the address to defend against SSRF and executes bounded HTTP inspection requests.",
    },
    {
      q: "What do PASS, FAIL, WARNING, and NOT_CHECKED mean?",
      a: "PASS means the check verified complete technical compliance with evidence. FAIL signifies a definite defect or missing critical security/SEO requirement. WARNING indicates a suboptimal configuration or advisory finding. NOT_CHECKED means the test was skipped due to bounded scan limits or rate limits. MANUAL_REQUIRED highlights checks that necessitate third-party account authorization.",
    },
    {
      q: "Does a technical audit guarantee 100% website security?",
      a: "No. XeooAuditor conducts bounded public inspection of web headers, TLS handshakes, and public document configurations. It is not an intrusive penetration testing tool and cannot identify internal code vulnerabilities, database security, or server-level exploit vectors.",
    },
    {
      q: "How does XeooAuditor handle privacy and visitor data?",
      a: "XeooAuditor operates on a privacy-first, zero-store model. Public users never create accounts, and the application never collects or stores target site cookies, authentication credentials, or visitor tracking profiles. Scan runs are ephemeral and stored only within your current browser session.",
    },
  ];

  return (
    <PublicLayout
      activeSectionId={activeSectionId}
      onNavigateSection={scrollToSection}
    >
      <SEO canonicalPath="/" />
      {/* =========================================================
          SECTION 1: HERO (#home) with WHITE BACKGROUND & DARK ICONS
          ========================================================= */}
      <section
        id="home"
        className="scroll-mt-16  min-h-[calc(100dvh-64px)] flex flex-col justify-center relative py-12 md:py-16 border-b border-slate-200 overflow-hidden bg-white"
      >
        {/* Animated CyberSpace Deep Space Background (20 Audit Modules, Dark Semi-Transparent Icons on White) */}
        <CyberSpaceBackground />

        {/* Foreground Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-sans text-slate-950 tracking-tight leading-[1.12]">
            Understand Your Website. <br />
            <span className="text-sky-600">Improve Every Detail.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Inspect essential website health signals, discover configuration
            flaws, and understand exactly what needs attention — without
            accounts or tracking.
          </p>

          {/* Working Hero Audit Form */}
          <div className="max-w-xl mx-auto pt-2">
            <form
              onSubmit={handleHeroSubmit}
              className="flex flex-col sm:flex-row items-stretch gap-2.5 bg-white/95 backdrop-blur-md p-2 rounded-[var(--radius-md)] border border-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.06),0_2px_8px_rgba(15,23,42,0.04)]"
            >
              <div className="flex-1">
                <Input
                  id="hero-url-input"
                  placeholder="https://yourwebsite.com"
                  value={heroUrl}
                  onChange={(e) => setHeroUrl(e.target.value)}
                  error={heroError}
                  disabled={isProcessing}
                  leftIcon={
                    <Search
                      className="size-4 text-slate-400"
                      aria-hidden="true"
                    />
                  }
                  className="border-0 shadow-none focus-visible:outline-none min-h-[42px] bg-transparent text-slate-900 placeholder:text-slate-400"
                  aria-label="Website address to audit"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className={cn(
                  "relative group shrink-0 overflow-hidden px-6 py-3 rounded-[var(--radius-md)] cursor-pointer",
                  "bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8]",
                  "border border-cyan-200/50 text-white font-bold tracking-wide text-xs sm:text-sm uppercase select-none",
                  "shadow-[0_0_24px_rgba(14,165,233,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)]",
                  "hover:from-[#0369a1] hover:via-[#0284c7] hover:to-[#0ea5e9] hover:shadow-[0_0_36px_rgba(56,189,248,0.55)] hover:scale-[1.02]",
                  "active:scale-[0.98] transition-all duration-200 ease-out",
                  "focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2",
                  "disabled:opacity-60 disabled:pointer-events-none disabled:hover:scale-100 flex items-center justify-center gap-2",
                )}
              >
                {/* Sleek sheen shine reflection */}
                <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-25deg] pointer-events-none group-hover:translate-x-[250%] transition-transform duration-700 ease-in-out -translate-x-[150%]" />

                {isProcessing ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <span>Scan</span>
                    <ArrowRight
                      className="size-4 text-cyan-100 group-hover:translate-x-1 transition-transform duration-200"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Quick target sample suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5 text-xs text-slate-500">
              <span className="text-[11px] text-slate-400">Target sample:</span>
              <button
                type="button"
                onClick={() => setHeroUrl("https://github.com/")}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-blue-600  text-[11px] transition-colors cursor-pointer"
              >
                https://github.com/
              </button>
              <button
                type="button"
                onClick={() => setHeroUrl("https://xeootools.site.je/")}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-blue-600  text-[11px] transition-colors cursor-pointer"
              >
                https://xeootools.site.je/
              </button>
            </div>

            {isProcessing && processingStatus && (
              <div className="flex items-center justify-center gap-2 mt-3 px-3 py-2 rounded-[var(--radius-sm)] bg-sky-50 text-xs  text-sky-800 border border-sky-200">
                <span className="size-2 rounded-full bg-sky-600 animate-ping" />
                <span>{processingStatus}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-slate-500 ">
              <span className="flex items-center gap-1.5">
                <CircleCheck className="size-3.5 text-emerald-600" />
                No account needed
              </span>
              <span>•</span>
              <span>SSRF protected</span>
              <span>•</span>
              <span>Instant bounded report</span>
            </div>
          </div>
        </div>
      </section>

      {/* SweetAlert Style Modal (Light backdrop, only closeable via 'X' button) */}
      {alertPopup?.isOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 backdrop-blur-[2px] animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Top-Right 'X' button — Sole close trigger */}
            <button
              type="button"
              onClick={() => {
                setAlertPopup(null);
                document.getElementById("hero-url-input")?.focus();
              }}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 cursor-pointer"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            {/* SweetAlert circular warning icon */}
            <div className="size-16 rounded-full border-4 border-amber-300 bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-4">
              <span className="text-3xl font-bold font-serif leading-none">
                !
              </span>
            </div>

            <h3
              id="alert-dialog-title"
              className="text-xl font-bold text-slate-800 mb-2 tracking-tight"
            >
              {alertPopup.title}
            </h3>

            <p
              id="alert-dialog-desc"
              className="text-sm text-slate-600 leading-relaxed"
            >
              {alertPopup.message}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
          SECTION 2: FEATURES / AUDIT CAPABILITIES (#features)
          ========================================================= */}
      <section
        id="features"
        className="scroll-mt-16  min-h-[calc(100dvh-64px)] flex flex-col justify-center py-12 md:py-16 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
              Comprehensive Health Signals, Objective Evidence
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Every audit module executes bounded, non-destructive HTTP
              inspections and evaluates your public web assets against modern
              standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="h-full">
              <CardContent className="p-6 space-y-3">
                <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center">
                  <FileCode className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Technical SEO & Crawlability
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Verifies robots.txt directives, sitemap.xml availability,
                  canonical tag declarations, and custom 404 response behavior
                  to ensure search engine index hygiene.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="h-full">
              <CardContent className="p-6 space-y-3">
                <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center">
                  <Lock className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  HTTPS & Security Headers
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Inspects TLS certificate validity, cipher suites, HSTS
                  preloading headers, Content-Security-Policy (CSP), and
                  X-Frame-Options to safeguard visitors.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="h-full">
              <CardContent className="p-6 space-y-3">
                <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center">
                  <Link2 className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Link Health & Integrity
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Identifies internal redirect chains (301/302 hops) that slow
                  user journeys, checks for broken 404 links, and verifies
                  external hyperlink relationships.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="h-full">
              <CardContent className="p-6 space-y-3">
                <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center">
                  <Share2 className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Structured Data & Breadcrumbs
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Detects Schema.org JSON-LD definitions (Organization, WebSite,
                  BreadcrumbList) for rich snippet qualification in Google and
                  Bing search results.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="h-full">
              <CardContent className="p-6 space-y-3">
                <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center">
                  <Layers className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Asset & Configuration Signals
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Checks for modern SVG favicon availability, Apple touch icons,
                  viewport meta tag responsiveness, and server response
                  latencies.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="h-full">
              <CardContent className="p-6 space-y-3">
                <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] flex items-center justify-center">
                  <LockKeyhole className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  SSRF-Defended Engine
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Engineered with strict IP and DNS rebind defenses. Rejects
                  RFC1918 private subnets, cloud metadata endpoints, and
                  non-http/https URL schemes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 3: HOW IT WORKS (#how-it-works)
          ========================================================= */}
      <section
        id="how-it-works"
        className="scroll-mt-16  min-h-[calc(100dvh-64px)] flex flex-col justify-center py-12 md:py-16 border-b border-[var(--color-border)]"
      >
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
              Three Steps from URL to Actionable Findings
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              No complicated onboarding, no tracking pixels, and no software
              installation required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 space-y-3 relative">
              <span className="size-8 rounded-full bg-[var(--color-brand-primary)] text-white  font-bold text-sm flex items-center justify-center">
                1
              </span>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Submit Public Website URL
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Provide any valid <code className="xa-code">https://</code> or{" "}
                <code className="xa-code">http://</code> target. Pre-flight
                checks screen the domain against SSRF and private IP filters.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 space-y-3 relative">
              <span className="size-8 rounded-full bg-[var(--color-brand-primary)] text-white  font-bold text-sm flex items-center justify-center">
                2
              </span>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Run Bounded Technical Checks
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                The engine evaluates SSL certificates, response headers, XML
                sitemaps, robots.txt directives, and hyperlinks within strict
                resource and concurrency limits.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 space-y-3 relative">
              <span className="size-8 rounded-full bg-[var(--color-brand-primary)] text-white  font-bold text-sm flex items-center justify-center">
                3
              </span>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Inspect Findings & Evidence
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Receive an objective report categorized into PASS, FAIL, and
                WARNING statuses with raw technical evidence and
                developer-oriented fix instructions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4: AUDIT PREVIEW (#audit-preview)
          ========================================================= */}
      <section
        id="audit-preview"
        className="scroll-mt-16 min-h-[calc(100dvh-64px)] flex flex-col justify-center py-6 sm:py-8 md:py-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                Live Interactive Sample Report
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xl">
                Explore an actual simulated audit report for{" "}
                <code className="xa-code">https://example.com/</code> to see how
                findings, severities, and recommendations are presented.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="size-4" />}
              onClick={() => {
                const el = document.getElementById("hero-url-input");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.focus();
                }
              }}
            >
              Audit Your Own Website
            </Button>
          </div>

          {/* Sample Report Box */}
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-background)] p-4 sm:p-5 space-y-4 shadow-xs flex flex-col">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
              <div className="min-w-0 flex-1">
                <span className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-wider block mb-0.5">
                  Target Website Under Audit
                </span>
                <h3
                  className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] truncate font-mono"
                  title={auditedUrl}
                >
                  {auditedUrl}
                </h3>
              </div>
              <div className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] block uppercase">
                    OVERALL SCORE
                  </span>
                  <span className="text-2xl font-black font-sans text-[var(--color-brand-primary)] leading-tight">
                    {auditRecord.score}/100
                  </span>
                </div>
                <Badge
                  status={
                    auditRecord.score >= 80
                      ? "pass"
                      : auditRecord.score >= 50
                        ? "warning"
                        : "fail"
                  }
                  size="md"
                >
                  {auditRecord.score >= 85
                    ? "GRADE A"
                    : auditRecord.score >= 70
                      ? "GRADE B"
                      : auditRecord.score >= 50
                        ? "GRADE C"
                        : "NEEDS WORK"}
                </Badge>
              </div>
            </div>
            {/* 6 Interactive Filter Cards with Identical Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {/* 1. All Findings */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFilter("ALL");
                  setCurrentPage(1);
                }}
                className={cn(
                  "p-3 rounded-[var(--radius-sm)] border transition-all text-left cursor-pointer h-[74px] flex flex-col justify-between",
                  previewFilter === "ALL"
                    ? "bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)] shadow-xs ring-2 ring-[var(--color-brand-primary)] ring-offset-1"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-brand-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold block tracking-wide truncate",
                    previewFilter === "ALL"
                      ? "text-white/90"
                      : "text-[var(--color-text-muted)]",
                  )}
                >
                  ALL FINDINGS
                </span>
                <span
                  className={cn(
                    "text-2xl font-black font-mono leading-none",
                    previewFilter === "ALL"
                      ? "text-white"
                      : "text-[var(--color-text-primary)]",
                  )}
                >
                  {auditRecord.findings.length}
                </span>
              </button>

              {/* 2. Passed Checks */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFilter(
                    previewFilter === "PASSED" ? "ALL" : "PASSED",
                  );
                  setCurrentPage(1);
                }}
                className={cn(
                  "p-3 rounded-[var(--radius-sm)] border transition-all text-left cursor-pointer h-[74px] flex flex-col justify-between",
                  previewFilter === "PASSED"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600 ring-offset-1"
                    : "bg-[var(--color-status-pass-bg)] border-[var(--color-status-pass-border)] hover:border-emerald-500",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold block tracking-wide truncate",
                    previewFilter === "PASSED"
                      ? "text-white/90"
                      : "text-[var(--color-status-pass-text)]",
                  )}
                >
                  PASSED CHECKS
                </span>
                <span
                  className={cn(
                    "text-2xl font-black font-mono leading-none",
                    previewFilter === "PASSED"
                      ? "text-white"
                      : "text-[var(--color-status-pass-text)]",
                  )}
                >
                  {auditRecord.summary.pass}
                </span>
              </button>

              {/* 3. Failed Defects */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFilter(
                    previewFilter === "FAILED" ? "ALL" : "FAILED",
                  );
                  setCurrentPage(1);
                }}
                className={cn(
                  "p-3 rounded-[var(--radius-sm)] border transition-all text-left cursor-pointer h-[74px] flex flex-col justify-between",
                  previewFilter === "FAILED"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-600 ring-offset-1"
                    : "bg-[var(--color-status-fail-bg)] border-[var(--color-status-fail-border)] hover:border-rose-500",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold block tracking-wide truncate",
                    previewFilter === "FAILED"
                      ? "text-white/90"
                      : "text-[var(--color-status-fail-text)]",
                  )}
                >
                  FAILED DEFECTS
                </span>
                <span
                  className={cn(
                    "text-2xl font-black font-mono leading-none",
                    previewFilter === "FAILED"
                      ? "text-white"
                      : "text-[var(--color-status-fail-text)]",
                  )}
                >
                  {auditRecord.summary.fail}
                </span>
              </button>

              {/* 4. Warnings */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFilter(
                    previewFilter === "WARNINGS" ? "ALL" : "WARNINGS",
                  );
                  setCurrentPage(1);
                }}
                className={cn(
                  "p-3 rounded-[var(--radius-sm)] border transition-all text-left cursor-pointer h-[74px] flex flex-col justify-between",
                  previewFilter === "WARNINGS"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-600 ring-offset-1"
                    : "bg-[var(--color-status-warning-bg)] border-[var(--color-status-warning-border)] hover:border-amber-500",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold block tracking-wide truncate",
                    previewFilter === "WARNINGS"
                      ? "text-white/90"
                      : "text-[var(--color-status-warning-text)]",
                  )}
                >
                  WARNINGS
                </span>
                <span
                  className={cn(
                    "text-2xl font-black font-mono leading-none",
                    previewFilter === "WARNINGS"
                      ? "text-white"
                      : "text-[var(--color-status-warning-text)]",
                  )}
                >
                  {auditRecord.summary.warning}
                </span>
              </button>

              {/* 5. Not Checked */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFilter(
                    previewFilter === "NOT_CHECKED" ? "ALL" : "NOT_CHECKED",
                  );
                  setCurrentPage(1);
                }}
                className={cn(
                  "p-3 rounded-[var(--radius-sm)] border transition-all text-left cursor-pointer h-[74px] flex flex-col justify-between",
                  previewFilter === "NOT_CHECKED"
                    ? "bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-700 ring-offset-1"
                    : "bg-[var(--color-status-not-checked-bg)] border-[var(--color-status-not-checked-border)] hover:border-slate-500",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold block tracking-wide truncate",
                    previewFilter === "NOT_CHECKED"
                      ? "text-white/90"
                      : "text-[var(--color-status-not-checked-text)]",
                  )}
                >
                  NOT CHECKED
                </span>
                <span
                  className={cn(
                    "text-2xl font-black font-mono leading-none",
                    previewFilter === "NOT_CHECKED"
                      ? "text-white"
                      : "text-[var(--color-status-not-checked-text)]",
                  )}
                >
                  {auditRecord.summary.notChecked}
                </span>
              </button>

              {/* 6. Manual Required */}
              <button
                type="button"
                onClick={() => {
                  setPreviewFilter(
                    previewFilter === "MANUAL_REQUIRED"
                      ? "ALL"
                      : "MANUAL_REQUIRED",
                  );
                  setCurrentPage(1);
                }}
                className={cn(
                  "p-3 rounded-[var(--radius-sm)] border transition-all text-left cursor-pointer h-[74px] flex flex-col justify-between",
                  previewFilter === "MANUAL_REQUIRED"
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-600 ring-offset-1"
                    : "bg-[var(--color-status-manual-bg)] border-[var(--color-status-manual-border)] hover:border-sky-500",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold block tracking-wide truncate",
                    previewFilter === "MANUAL_REQUIRED"
                      ? "text-white/90"
                      : "text-[var(--color-status-manual-text)]",
                  )}
                >
                  MANUAL REQUIRED
                </span>
                <span
                  className={cn(
                    "text-2xl font-black font-mono leading-none",
                    previewFilter === "MANUAL_REQUIRED"
                      ? "text-white"
                      : "text-[var(--color-status-manual-text)]",
                  )}
                >
                  {auditRecord.summary.manualRequired}
                </span>
              </button>
            </div>
            {/* Active Filter Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)] text-xs">
              <span className="text-[var(--color-text-secondary)]">
                Active Findings Category:{" "}
                <strong className="text-[var(--color-text-primary)] font-bold font-mono">
                  {previewFilter.replace("_", " ")} (
                  {filteredPreviewFindings.length})
                </strong>
              </span>
              {previewFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewFilter("ALL");
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline cursor-pointer"
                >
                  Show All ({auditRecord.findings.length})
                </button>
              )}
            </div>
            {/* Structured Table / Card Findings Area with EXACT SAME HEIGHT for both Data and Empty States */}

            <div className="min-h-[500px] flex flex-col justify-between">
              {/* DESKTOP & TABLET: Structured Data Table */}
              <div className="hidden sm:block overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] table-fixed text-left text-xs border-collapse">
                    <colgroup>
                      <col className="w-[5%]" />
                      <col className="w-[13%]" />
                      <col className="w-[24%]" />
                      <col className="w-[14%]" />
                      <col className="w-[34%]" />
                      <col className="w-[10%]" />
                    </colgroup>

                    <thead>
                      <tr className="border-b-2 border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[11px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        <th className="border-r border-[var(--color-border)] py-3 px-3.5 text-center">
                          NO
                        </th>
                        <th className="border-r border-[var(--color-border)] py-3 px-3.5">
                          Status
                        </th>
                        <th className="border-r border-[var(--color-border)] py-3 px-3.5">
                          Audit Module
                        </th>
                        <th className="border-r border-[var(--color-border)] py-3 px-3.5">
                          Category
                        </th>
                        <th className="border-r border-[var(--color-border)] py-3 px-3.5">
                          Summary &amp; Findings
                        </th>
                        <th className="py-3 px-3.5 text-center">Details</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--color-border)]">
                      {paginatedFindings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="h-[440px] p-6 text-center">
                            <div className="h-full flex flex-col items-center justify-center space-y-3">
                              <div className="size-12 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-muted)]">
                                <HelpCircle className="size-6" />
                              </div>

                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                                  No Findings ({previewFilter.replace("_", " ")}
                                  )
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
                                  No audit modules found with status{" "}
                                  {previewFilter
                                    .toLowerCase()
                                    .replace("_", " ")}{" "}
                                  for this website. All parameters verified.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFilter("ALL");
                                  setCurrentPage(1);
                                  setExpandedFindingId(null);
                                }}
                                className="text-xs font-semibold px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-hover)] transition-colors cursor-pointer shadow-xs"
                              >
                                Show All Findings
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedFindings.map((finding, idx) => {
                          const isExpanded = expandedFindingId === finding.id;

                          return (
                            <React.Fragment key={finding.id}>
                              <tr
                                onClick={() =>
                                  setExpandedFindingId(
                                    isExpanded ? null : finding.id,
                                  )
                                }
                                className={cn(
                                  "cursor-pointer transition-colors duration-150",
                                  "border-b border-[var(--color-border)]",
                                  !isExpanded &&
                                    "even:bg-[var(--color-surface-secondary)]/50",
                                  "hover:bg-[var(--color-surface-hover)]",
                                  isExpanded &&
                                    "bg-[var(--color-surface-secondary)]",
                                )}
                              >
                                <td className="border-r border-[var(--color-border-subtle)] py-2.5 px-3.5 text-center font-mono text-[var(--color-text-muted)]">
                                  {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                </td>

                                <td className="border-r border-[var(--color-border-subtle)] py-2.5 px-3.5">
                                  <Badge
                                    status={
                                      finding.status === "PASS"
                                        ? "pass"
                                        : finding.status === "FAIL"
                                          ? "fail"
                                          : finding.status === "WARNING"
                                            ? "warning"
                                            : finding.status === "NOT_CHECKED"
                                              ? "not_checked"
                                              : "manual"
                                    }
                                    size="sm"
                                  >
                                    {finding.status}
                                  </Badge>
                                </td>

                                <td className="border-r border-[var(--color-border-subtle)] py-2.5 px-3.5 font-semibold text-[var(--color-text-primary)]">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {finding.status === "PASS" && (
                                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                    )}
                                    {finding.status === "FAIL" && (
                                      <XCircle className="size-4 text-rose-600 shrink-0" />
                                    )}
                                    {finding.status === "WARNING" && (
                                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                                    )}
                                    {finding.status === "NOT_CHECKED" && (
                                      <HelpCircle className="size-4 text-slate-400 shrink-0" />
                                    )}
                                    {finding.status === "MANUAL_REQUIRED" && (
                                      <FileSearch className="size-4 text-sky-600 shrink-0" />
                                    )}

                                    <span className="truncate min-w-0">
                                      {finding.title}
                                    </span>
                                  </div>
                                </td>

                                <td className="border-r border-[var(--color-border-subtle)] py-2.5 px-3.5 font-mono text-[10px] uppercase text-[var(--color-text-muted)] font-bold break-words">
                                  {finding.category.replace("_", " ")}
                                </td>

                                <td className="border-r border-[var(--color-border-subtle)] py-2.5 px-3.5 text-[var(--color-text-secondary)]">
                                  <p className="truncate">
                                    {finding.description}
                                  </p>
                                </td>

                                <td className="py-2.5 px-3.5 text-center">
                                  <button
                                    type="button"
                                    aria-label={
                                      isExpanded
                                        ? "Collapse details"
                                        : "Expand details"
                                    }
                                    aria-expanded={isExpanded}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setExpandedFindingId(
                                        isExpanded ? null : finding.id,
                                      );
                                    }}
                                    className="inline-flex items-center justify-center p-1 rounded-[var(--radius-xs)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                    title={
                                      isExpanded
                                        ? "Collapse details"
                                        : "Expand details"
                                    }
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "size-4 transition-transform duration-200",
                                        isExpanded &&
                                          "rotate-180 text-[var(--color-brand-primary)]",
                                      )}
                                    />
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="border-b-2 border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                                  <td
                                    colSpan={6}
                                    className="border-t border-[var(--color-border)] p-4"
                                  >
                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                                          Detailed Description
                                        </span>
                                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed break-words">
                                          {finding.description}
                                        </p>
                                      </div>

                                      {finding.evidence && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                                            Technical Evidence / Inspected File
                                            Content
                                          </span>

                                          <pre className="p-3 rounded-[var(--radius-xs)] bg-slate-900 text-slate-100 font-mono text-[11px] max-h-40 overflow-auto border border-slate-700 whitespace-pre-wrap break-all leading-relaxed shadow-inner">
                                            <code>{finding.evidence}</code>
                                          </pre>
                                        </div>
                                      )}

                                      {finding.recommendation && (
                                        <div className="p-3 rounded-[var(--radius-xs)] bg-[var(--color-surface)] border-l-4 border-l-[var(--color-brand-primary)] border border-[var(--color-border)] text-xs space-y-1.5 shadow-xs">
                                          <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-brand-primary)]">
                                            <span>
                                              💡 Recommendations &amp;
                                              Remediation
                                            </span>
                                          </div>

                                          {renderFormattedRecommendation(
                                            finding.recommendation,
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE: Card View */}
              <div className="block sm:hidden">
                {paginatedFindings.length === 0 ? (
                  <div className="h-[460px] flex flex-col items-center justify-center p-6 text-center bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] space-y-3 shadow-2xs">
                    <div className="size-11 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-muted)]">
                      <HelpCircle className="size-5" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                        No Findings ({previewFilter.replace("_", " ")})
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
                        No audit modules found with status{" "}
                        {previewFilter.toLowerCase().replace("_", " ")} for this
                        website.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFilter("ALL");
                        setCurrentPage(1);
                        setExpandedFindingId(null);
                      }}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-hover)] transition-colors cursor-pointer shadow-xs"
                    >
                      Show All Findings
                    </button>
                  </div>
                ) : (
                  <div className="h-[460px] overflow-y-auto pr-1 space-y-2.5">
                    {paginatedFindings.map((finding, idx) => {
                      const isExpanded = expandedFindingId === finding.id;

                      return (
                        <div
                          key={finding.id}
                          className={cn(
                            "overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)]",
                            "shadow-xs transition-colors duration-150",
                            idx % 2 === 1 && !isExpanded
                              ? "bg-[var(--color-surface-secondary)]/50"
                              : "bg-[var(--color-surface)]",
                            isExpanded && "border-[var(--color-brand-primary)]",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedFindingId(
                                isExpanded ? null : finding.id,
                              )
                            }
                            aria-expanded={isExpanded}
                            className="w-full text-left p-3 space-y-2 hover:bg-[var(--color-surface-hover)] transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {finding.status === "PASS" && (
                                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                )}
                                {finding.status === "FAIL" && (
                                  <XCircle className="size-4 text-rose-600 shrink-0" />
                                )}
                                {finding.status === "WARNING" && (
                                  <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                                )}
                                {finding.status === "NOT_CHECKED" && (
                                  <HelpCircle className="size-4 text-slate-400 shrink-0" />
                                )}
                                {finding.status === "MANUAL_REQUIRED" && (
                                  <FileSearch className="size-4 text-sky-600 shrink-0" />
                                )}

                                <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                                  {finding.title}
                                </span>
                              </div>

                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200",
                                  isExpanded &&
                                    "rotate-180 text-[var(--color-brand-primary)]",
                                )}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono uppercase font-bold text-[var(--color-text-muted)]">
                                {finding.category.replace("_", " ")}
                              </span>

                              <Badge
                                status={
                                  finding.status === "PASS"
                                    ? "pass"
                                    : finding.status === "FAIL"
                                      ? "fail"
                                      : finding.status === "WARNING"
                                        ? "warning"
                                        : finding.status === "NOT_CHECKED"
                                          ? "not_checked"
                                          : "manual"
                                }
                                size="sm"
                              >
                                {finding.status}
                              </Badge>
                            </div>

                            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                              {finding.description}
                            </p>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[var(--color-border)] p-3 space-y-3 bg-[var(--color-background)]">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                  Detailed Description
                                </span>
                                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed break-words">
                                  {finding.description}
                                </p>
                              </div>

                              {finding.evidence && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    Technical Evidence
                                  </span>
                                  <pre className="p-2.5 rounded-[var(--radius-xs)] bg-slate-900 text-slate-100 font-mono text-[11px] max-h-32 overflow-auto border border-slate-700 whitespace-pre-wrap break-all leading-relaxed">
                                    <code>{finding.evidence}</code>
                                  </pre>
                                </div>
                              )}

                              {finding.recommendation && (
                                <div className="p-3 rounded-[var(--radius-xs)] bg-[var(--color-surface)] border-l-4 border-l-[var(--color-brand-primary)] border border-[var(--color-border)] text-xs space-y-1.5">
                                  <div className="font-bold text-[11px] uppercase tracking-wider text-[var(--color-brand-primary)]">
                                    💡 Recommendations &amp; Remediation
                                  </div>
                                  {renderFormattedRecommendation(
                                    finding.recommendation,
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SHARED PAGINATION */}
              <div className="pt-2.5 border-t border-[var(--color-border-subtle)] min-h-[48px] flex items-center justify-between">
                {filteredPreviewFindings.length > 0 ? (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredPreviewFindings.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    className="w-full"
                  />
                ) : (
                  <div className="flex items-center justify-between w-full text-xs text-[var(--color-text-muted)] font-mono py-1">
                    <p>Showing 0–0 of 0 records</p>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      Page 1 of 1
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 5: FAQ (#faq)
          ========================================================= */}
      <section id="faq" className="scroll-mt-16 w-full min-w-0 py-12 md:py-16">
        <div className="mx-auto w-full max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-3 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
              Common Inquiries & Verification Details
            </h2>

            <p className="text-sm text-[var(--color-text-muted)]">
              Clear, transparent answers on our auditing process, security
              boundaries, and data policies.
            </p>
          </div>

          <div className="w-full min-w-0 space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;

              return (
                <div
                  key={idx}
                  className="w-full min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    className={cn(
                      "flex w-full min-w-0 items-center justify-between gap-3",
                      "px-4 py-3.5 sm:px-5",
                      "text-left text-sm font-semibold leading-5",
                      "text-[var(--color-text-primary)]",
                      "transition-colors duration-200",
                      "hover:bg-[var(--color-surface-hover)]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
                      "focus-visible:outline-offset-[-2px]",
                    )}
                  >
                    <span className="min-w-0 flex-1 break-words">{faq.q}</span>

                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-[var(--color-text-muted)]",
                        "transition-transform duration-200",
                        isOpen &&
                          "rotate-180 text-[var(--color-brand-primary)]",
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${idx}`}
                      className={cn(
                        "w-full min-w-0 border-t border-[var(--color-border-subtle)]",
                        "bg-[var(--color-background)]",
                        "px-4 py-3 sm:px-5",
                        "break-words",
                        "text-xs leading-5 text-[var(--color-text-secondary)] sm:text-sm",
                        "max-h-32 overflow-y-auto overscroll-contain",
                      )}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
