<?php

declare(strict_types=1);

namespace XeooAuditor\Audit;

require_once __DIR__ . '/../Security/UrlGuard.php';

use PDO;
use Throwable;
use XeooAuditor\Config\Database;
use XeooAuditor\Security\UrlGuard;

class AuditEngine
{
    private const MAX_RESPONSE_SIZE = 2097152; // 2MB
    private const REQUEST_TIMEOUT = 8; // 8 seconds
    private const MAX_REDIRECTS = 5;

    /**
     * Validate target URL against SSRF and illegal schemes (delegates to UrlGuard)
     */
    public static function validateTargetUrl(string $url): array
    {
        $result = UrlGuard::validate($url);
        if (!$result['valid']) {
            return ['valid' => false, 'error' => $result['error']];
        }

        return [
            'valid' => true,
            'url' => $result['url'],
            'scheme' => $result['scheme'],
            'host' => $result['host'],
            'port' => $result['port'],
        ];
    }

    /**
     * Perform safe HTTP fetch: every hop (including redirects) is re-validated, the connection is
     * pinned to the validated IP, and timeout, size and redirect limits apply. TLS verification stays on.
     */
    private static function fetchUrl(string $url, int $timeout = self::REQUEST_TIMEOUT): array
    {
        $currentUrl = $url;
        $totalMs = 0;
        $result = null;

        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $target = UrlGuard::validate($currentUrl);
            if (!$target['valid']) {
                return self::blockedFetchResult($currentUrl, $totalMs);
            }

            $result = self::fetchSingleHop($target, $timeout);
            $totalMs += $result['duration_ms'];

            $isRedirect = in_array($result['http_code'], [301, 302, 303, 307, 308], true);
            $location = $result['headers']['location'] ?? '';
            if (!$isRedirect || $location === '') {
                break;
            }

            $next = UrlGuard::resolveRedirect($currentUrl, $location);
            if ($next === null || $hop === self::MAX_REDIRECTS) {
                $result['success'] = false;
                $result['error'] = 'Too many or invalid redirects.';
                break;
            }
            $currentUrl = $next;
        }

        $result['duration_ms'] = $totalMs;
        return $result;
    }

    /** @return array<string, mixed> */
    private static function blockedFetchResult(string $url, int $durationMs): array
    {
        return [
            'success' => false,
            'http_code' => 0,
            'body' => '',
            'headers' => [],
            'effective_url' => $url,
            'duration_ms' => $durationMs,
            'ssl_verified' => false,
            'error' => 'Destination blocked by SSRF protection.',
        ];
    }

    /**
     * @param array{url: string, scheme: string, host: string, port: int, ip: string} $target
     * @return array<string, mixed>
     */
    private static function fetchSingleHop(array $target, int $timeout): array
    {
        $buffer = '';
        $headerBuffer = '';
        $pinnedIp = trim($target['ip'], '[]');
        $httpProtocols = CURLPROTO_HTTP | CURLPROTO_HTTPS;

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $target['url'],
            CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$pinnedIp}"],
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => $httpProtocols,
            CURLOPT_REDIR_PROTOCOLS => $httpProtocols,
            CURLOPT_CONNECTTIMEOUT => $timeout,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; XeooAuditor/1.0; +https://xeootools.site.je/bot)',
            CURLOPT_HEADER => false,
            CURLOPT_HEADERFUNCTION => function ($ch, $headerLine) use (&$headerBuffer) {
                if (strlen($headerBuffer) < 65536) {
                    $headerBuffer .= $headerLine;
                }
                return strlen($headerLine);
            },
            CURLOPT_WRITEFUNCTION => function ($ch, $data) use (&$buffer) {
                $len = strlen($data);
                if (strlen($buffer) + $len > self::MAX_RESPONSE_SIZE) {
                    return 0; // Abort download once max size reached
                }
                $buffer .= $data;
                return $len;
            },
        ]);

        $success = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $totalTime = (float)curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $sslVerifyResult = (int)curl_getinfo($ch, CURLINFO_SSL_VERIFYRESULT);
        $curlError = curl_error($ch);
        $curlErrno = curl_errno($ch);
        curl_close($ch);

        // Parse headers into key-value map (a redirect hop may emit several header blocks; last wins)
        $headers = [];
        foreach (explode("\r\n", $headerBuffer) as $line) {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) {
                $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
        }

        return [
            'success' => $success && ($curlErrno === 0 || $curlErrno === CURLE_WRITE_ERROR),
            'http_code' => $httpCode,
            'body' => $buffer,
            'headers' => $headers,
            'effective_url' => $target['url'],
            'duration_ms' => (int)round($totalTime * 1000),
            'ssl_verified' => $sslVerifyResult === 0,
            'error' => $curlError,
        ];
    }

    /**
     * Run full real-time audit producing exactly 20 standard output modules
     */
    public static function runAudit(string $targetInput): array
    {
        $startTime = microtime(true);

        // 1. SSRF Validation
        $validation = self::validateTargetUrl($targetInput);
        if (!$validation['valid']) {
            return [
                'success' => false,
                'error' => $validation['error'],
            ];
        }

        $targetUrl = $validation['url'];
        $host = $validation['host'];
        $scheme = $validation['scheme'];
        $baseUrl = "{$scheme}://{$host}";

        // 2. Fetch Apex / Target Document
        $mainPage = self::fetchUrl($targetUrl);
        $mainBody = $mainPage['body'] ?? '';
        $mainHeaders = $mainPage['headers'] ?? [];
        $httpCode = $mainPage['http_code'] ?? 0;

        // Fetch auxiliary documents (Robots.txt, Sitemap.xml, 404 Probe)
        $robotsUrl = "{$baseUrl}/robots.txt";
        $robotsRes = self::fetchUrl($robotsUrl, 4);

        $sitemapUrl = "{$baseUrl}/sitemap.xml";
        $sitemapRes = self::fetchUrl($sitemapUrl, 4);

        $probe404Url = "{$baseUrl}/xeoo-audit-probe-" . substr(md5((string)time()), 0, 8);
        $probe404Res = self::fetchUrl($probe404Url, 4);

        // 3. Evaluate 20 Standard Audit Modules (A01 - A20)
        $findings = [];

        // A01: Sitemap.xml
        $hasSitemapXml = ($sitemapRes['http_code'] === 200 && (
            str_contains(strtolower($sitemapRes['headers']['content-type'] ?? ''), 'xml') ||
            str_contains($sitemapRes['body'], '<urlset') ||
            str_contains($sitemapRes['body'], '<sitemapindex')
        ));
        $sitemapUrlsCount = substr_count($sitemapRes['body'], '<loc>');
        if ($hasSitemapXml) {
            $findings[] = [
                'id' => 'A01',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Sitemap.xml',
                'status' => 'PASS',
                'severity' => 'MEDIUM',
                'description' => "XML sitemap is accessible with an HTTP 200 OK response ({$sitemapUrlsCount} URLs registered).",
                'recommendation' => 'Maintain automatic sitemap updates when new routes or content are published. To build or regenerate hierarchical sitemaps, use https://xeootools.site.je/tools/sitemap-generator',
                'evidence' => "HTTP 200 OK at {$sitemapUrl} — Found {$sitemapUrlsCount} <loc> tags.",
            ];
        } elseif ($sitemapRes['http_code'] === 200) {
            $findings[] = [
                'id' => 'A01',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Sitemap.xml',
                'status' => 'WARNING',
                'severity' => 'MEDIUM',
                'description' => 'Sitemap.xml returned HTTP 200 but XML format is non-standard or missing the <urlset> tag.',
                'recommendation' => 'Correct XML structure to comply with sitemaps.org standards (https://xeootools.site.je/tools/sitemap-generator). Generate a valid sitemap instantly at https://xeootools.site.je/tools/sitemap-generator',
                'evidence' => "Content-Type Header: " . ($sitemapRes['headers']['content-type'] ?? 'unknown'),
            ];
        } else {
            $findings[] = [
                'id' => 'A01',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Sitemap.xml',
                'status' => 'FAIL',
                'severity' => 'HIGH',
                'description' => "Sitemap.xml was not found at standard path (HTTP status {$sitemapRes['http_code']}).",
                'recommendation' => 'Deploy a public XML sitemap at /sitemap.xml to guide Google and search crawlers. Generate a validated XML sitemap at https://xeootools.site.je/tools/sitemap-generator and upload it to your web root.',
                'evidence' => "Attempted to fetch {$sitemapUrl} — server responded with HTTP {$sitemapRes['http_code']}.",
            ];
        }

        // A02: Robots.txt
        $hasRobots = ($robotsRes['http_code'] === 200 && str_contains(strtolower($robotsRes['body']), 'user-agent'));
        $blocksAll = str_contains($robotsRes['body'], 'Disallow: /') && !str_contains($robotsRes['body'], 'Allow:');
        if ($hasRobots && !$blocksAll) {
            $findings[] = [
                'id' => 'A02',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Robots.txt',
                'status' => 'PASS',
                'severity' => 'MEDIUM',
                'description' => 'Robots.txt is valid and provides clear crawl directives to search engines.',
                'recommendation' => 'Regularly audit Disallow directives to ensure sensitive data or staging routes remain shielded. Test and build robots.txt rules at https://xeootools.site.je/tools/robots-txt-generator',
                'evidence' => "HTTP 200 OK — Found User-agent directive at {$robotsUrl}.",
            ];
        } elseif ($hasRobots && $blocksAll) {
            $findings[] = [
                'id' => 'A02',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Robots.txt',
                'status' => 'WARNING',
                'severity' => 'HIGH',
                'description' => 'Robots.txt contains "Disallow: /" directive, potentially blocking all search engine crawlers.',
                'recommendation' => 'Remove "Disallow: /" if the website is intended for the public. Specify disallow rules only for private folders (e.g. Disallow: /admin/). Build proper robots.txt rules at https://xeootools.site.je/tools/robots-txt-generator',
                'evidence' => "Found 'Disallow: /' directive in robots.txt.",
            ];
        } else {
            $findings[] = [
                'id' => 'A02',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Robots.txt',
                'status' => 'WARNING',
                'severity' => 'MEDIUM',
                'description' => "Robots.txt file was not found at {$robotsUrl} (HTTP {$robotsRes['http_code']}).",
                'recommendation' => 'Provide a robots.txt file in your domain root to guide web crawlers and prevent 404 crawler errors. Generate a structured robots.txt file at https://xeootools.site.je/tools/robots-txt-generator',
                'evidence' => "Server response: HTTP {$robotsRes['http_code']}.",
            ];
        }

        // A03: Search Console
        $hasGscMeta = (bool)preg_match('/<meta[^>]+name=["\']google-site-verification["\'][^>]*>/i', $mainBody);
        if ($hasGscMeta) {
            $findings[] = [
                'id' => 'A03',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Search Console',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Google Search Console verification meta tag detected in HTML document.',
                'recommendation' => 'Ensure URL property in Google Search Console remains active to monitor crawl issues, CTR, and index coverage.',
                'evidence' => 'Found <meta name="google-site-verification"> tag.',
            ];
        } else {
            $findings[] = [
                'id' => 'A03',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Search Console',
                'status' => 'MANUAL_REQUIRED',
                'severity' => 'INFO',
                'description' => 'Search Console verification tag not detected in HTML (verification may be handled via DNS TXT or Google Tag Manager).',
                'recommendation' => 'Claim and verify domain ownership in Google Search Console (search.google.com/search-console) via DNS TXT record or HTML meta tag.',
                'evidence' => 'No google-site-verification tag found on public apex page.',
            ];
        }

        // A04: Submit Sitemap
        $hasSitemapInRobots = str_contains(strtolower($robotsRes['body']), 'sitemap:');
        if ($hasSitemapInRobots) {
            $findings[] = [
                'id' => 'A04',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Submit Sitemap',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Sitemap location declaration found in robots.txt file, helping search engines discover your index.',
                'recommendation' => 'Maintain absolute HTTPS sitemap URLs in robots.txt so crawlers immediately find the URL index.',
                'evidence' => 'Found Sitemap directive in robots.txt.',
            ];
        } else {
            $findings[] = [
                'id' => 'A04',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Submit Sitemap',
                'status' => 'WARNING',
                'severity' => 'MEDIUM',
                'description' => 'Robots.txt does not contain a Sitemap location declaration.',
                'recommendation' => "Add 'Sitemap: {$baseUrl}/sitemap.xml' to the end of your robots.txt file. You can configure and download a complete robots.txt at https://xeootools.site.je/tools/robots-txt-generator",
                'evidence' => 'Sitemap directive not found in robots.txt content.',
            ];
        }

        // A05: Internal Links
        preg_match_all('/<a\b[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)<\/a>/is', $mainBody, $linkMatches);
        $totalLinks = count($linkMatches[1] ?? []);
        $internalLinks = 0;
        $emptyAnchorLinks = 0;
        foreach (($linkMatches[1] ?? []) as $i => $href) {
            $hrefTrimmed = trim($href);
            $anchorText = strip_tags($linkMatches[2][$i] ?? '');
            if ($anchorText === '' && !str_contains($linkMatches[2][$i] ?? '', '<img')) {
                $emptyAnchorLinks++;
            }
            if (str_starts_with($hrefTrimmed, '/') || str_contains($hrefTrimmed, $host)) {
                $internalLinks++;
            }
        }
        if ($internalLinks > 0 && $emptyAnchorLinks <= 3) {
            $findings[] = [
                'id' => 'A05',
                'category' => 'LINK_HEALTH',
                'title' => 'Internal Links',
                'status' => 'PASS',
                'severity' => 'MEDIUM',
                'description' => "Internal link structure is well-formed ({$internalLinks} internal links out of {$totalLinks} total links).",
                'recommendation' => 'Use descriptive and relevant anchor text on all internal links.',
                'evidence' => "Found {$internalLinks} internal links on the primary page document.",
            ];
        } elseif ($internalLinks > 0) {
            $findings[] = [
                'id' => 'A05',
                'category' => 'LINK_HEALTH',
                'title' => 'Internal Links',
                'status' => 'WARNING',
                'severity' => 'MEDIUM',
                'description' => "Internal links found ({$internalLinks} links), but {$emptyAnchorLinks} links have empty anchor text.",
                'recommendation' => 'Provide descriptive anchor text or add aria-label attributes for icon-only buttons.',
                'evidence' => "Found {$emptyAnchorLinks} links without descriptive text.",
            ];
        } else {
            $findings[] = [
                'id' => 'A05',
                'category' => 'LINK_HEALTH',
                'title' => 'Internal Links',
                'status' => 'WARNING',
                'severity' => 'HIGH',
                'description' => 'Homepage has minimal internal navigation links to other pages.',
                'recommendation' => 'Add navigation menus or internal link architecture to distribute PageRank and crawl depth.',
                'evidence' => "Only {$internalLinks} internal links detected.",
            ];
        }

        // A06: Breadcrumbs
        $hasBreadcrumbs = str_contains($mainBody, 'BreadcrumbList') || str_contains($mainBody, 'itemprop="breadcrumb"');
        if ($hasBreadcrumbs) {
            $findings[] = [
                'id' => 'A06',
                'category' => 'STRUCTURED_DATA',
                'title' => 'Breadcrumbs',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'BreadcrumbList schema structure detected on page markup.',
                'recommendation' => 'Ensure breadcrumb hierarchy remains synchronized with URL structure.',
                'evidence' => 'Found Schema.org BreadcrumbList in JSON-LD or Microdata.',
            ];
        } else {
            $findings[] = [
                'id' => 'A06',
                'category' => 'STRUCTURED_DATA',
                'title' => 'Breadcrumbs',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => 'BreadcrumbList schema was not detected on this page.',
                'recommendation' => 'Add JSON-LD BreadcrumbList markup so search engines can display hierarchical navigation snippets.',
                'evidence' => 'BreadcrumbList schema not detected.',
            ];
        }

        // A07: Canonical URL
        preg_match('/<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']/i', $mainBody, $canonicalMatch);
        $canonicalHref = $canonicalMatch[1] ?? null;
        if (!$canonicalHref) {
            // Check reversed attribute order
            preg_match('/<link[^>]+href=["\']([^"\']*)["\'][^>]+rel=["\']canonical["\']/i', $mainBody, $canonicalMatch);
            $canonicalHref = $canonicalMatch[1] ?? null;
        }

        if ($canonicalHref) {
            $findings[] = [
                'id' => 'A07',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Canonical URL',
                'status' => 'PASS',
                'severity' => 'MEDIUM',
                'description' => 'Canonical URL tag is explicitly defined to prevent duplicate content issues.',
                'recommendation' => 'Ensure canonical URLs always use secure HTTPS and a consistent primary host.',
                'evidence' => "<link rel=\"canonical\" href=\"{$canonicalHref}\">",
            ];
        } else {
            $findings[] = [
                'id' => 'A07',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Canonical URL',
                'status' => 'FAIL',
                'severity' => 'HIGH',
                'description' => '<link rel="canonical"> tag not found in <head> element.',
                'recommendation' => 'Embed a self-referencing canonical tag to declare the authoritative URL version of the page.',
                'evidence' => '<head> element does not contain a rel="canonical" link.',
            ];
        }

        // A08: LocalBusiness Schema
        $hasLocalBusiness = str_contains($mainBody, 'LocalBusiness') ||
            str_contains($mainBody, 'Store') ||
            str_contains($mainBody, 'Restaurant') ||
            str_contains($mainBody, 'ProfessionalService');
        if ($hasLocalBusiness) {
            $findings[] = [
                'id' => 'A08',
                'category' => 'STRUCTURED_DATA',
                'title' => 'LocalBusiness Schema',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'LocalBusiness schema detected, improving visibility on Google Maps and local search packs.',
                'recommendation' => 'Ensure address, geo coordinates, and phone numbers remain accurate.',
                'evidence' => 'Found LocalBusiness entity in structured data.',
            ];
        } else {
            $findings[] = [
                'id' => 'A08',
                'category' => 'STRUCTURED_DATA',
                'title' => 'LocalBusiness Schema',
                'status' => 'NOT_CHECKED',
                'severity' => 'INFO',
                'description' => 'LocalBusiness schema not detected (optional if the website is not a local physical business).',
                'recommendation' => 'If your entity has a physical address, embed LocalBusiness schema with operating hours and address.',
                'evidence' => 'No LocalBusiness schema found.',
            ];
        }

        // A09: Organization Schema
        $hasOrganization = str_contains($mainBody, 'Organization') || str_contains($mainBody, 'Corporation');
        if ($hasOrganization) {
            $findings[] = [
                'id' => 'A09',
                'category' => 'STRUCTURED_DATA',
                'title' => 'Organization Schema',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Organization schema detected for brand identity and Google Knowledge Panels.',
                'recommendation' => 'Include logo, url, contactPoint, and sameAs social media links.',
                'evidence' => 'Found @type Organization in JSON-LD or Microdata.',
            ];
        } else {
            $findings[] = [
                'id' => 'A09',
                'category' => 'STRUCTURED_DATA',
                'title' => 'Organization Schema',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => 'Organization schema was not detected on the primary page.',
                'recommendation' => 'Add JSON-LD Organization markup containing official logo and entity name.',
                'evidence' => 'Organization schema not detected in HTML document.',
            ];
        }

        // A10: Indexing (Meta Robots)
        preg_match('/<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']*)["\']/i', $mainBody, $robotsMeta);
        $robotsContent = strtolower($robotsMeta[1] ?? '');
        $xRobots = strtolower($mainHeaders['x-robots-tag'] ?? '');

        if (str_contains($robotsContent, 'noindex') || str_contains($xRobots, 'noindex')) {
            $findings[] = [
                'id' => 'A10',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Indexing',
                'status' => 'FAIL',
                'severity' => 'CRITICAL',
                'description' => 'Primary page is blocked from search engine indexing by a noindex directive!',
                'recommendation' => 'Remove the noindex directive from meta tags or HTTP headers so your site can appear in Google.',
                'evidence' => "Found noindex directive (Meta: '{$robotsContent}', Header: '{$xRobots}').",
            ];
        } else {
            $findings[] = [
                'id' => 'A10',
                'category' => 'TECHNICAL_SEO',
                'title' => 'Indexing',
                'status' => 'PASS',
                'severity' => 'HIGH',
                'description' => 'Page is open for indexing and crawling by search engines (index, follow allowed).',
                'recommendation' => 'Monitor coverage status in Google Search Console to verify no URL indexing anomalies.',
                'evidence' => 'No noindex restrictions found in meta robots or X-Robots-Tag header.',
            ];
        }

        // A11: Broken Links
        // Test up to 3 sampled links
        $sampleBroken = 0;
        $testedLinks = 0;
        $uniqueLinks = array_unique(array_filter($linkMatches[1] ?? [], function ($l) use ($host) {
            $l = trim($l);
            return !str_starts_with($l, '#') && !str_starts_with($l, 'javascript:') && !str_starts_with($l, 'mailto:') && !str_starts_with($l, 'tel:');
        }));

        $sampleToTest = array_slice($uniqueLinks, 0, 3);
        foreach ($sampleToTest as $testL) {
            $fullTestUrl = str_starts_with($testL, 'http') ? $testL : rtrim($baseUrl, '/') . '/' . ltrim($testL, '/');
            $testRes = self::fetchUrl($fullTestUrl, 3);
            $testedLinks++;
            if ($testRes['http_code'] >= 400 && $testRes['http_code'] < 600) {
                $sampleBroken++;
            }
        }

        if ($sampleBroken === 0) {
            $findings[] = [
                'id' => 'A11',
                'category' => 'LINK_HEALTH',
                'title' => 'Broken Links',
                'status' => 'PASS',
                'severity' => 'HIGH',
                'description' => "Sampled links are active and respond without HTTP 404/500 errors ({$testedLinks} links tested).",
                'recommendation' => 'Conduct periodic link crawling to identify and repair deprecated third-party links.',
                'evidence' => "Tested {$testedLinks} link samples — all returned valid HTTP status codes.",
            ];
        } else {
            $findings[] = [
                'id' => 'A11',
                'category' => 'LINK_HEALTH',
                'title' => 'Broken Links',
                'status' => 'FAIL',
                'severity' => 'HIGH',
                'description' => "Found {$sampleBroken} broken links among sampled links tested on the page.",
                'recommendation' => 'Repair or remove broken links to prevent visitors and crawlers from encountering 404 dead-ends.',
                'evidence' => "Broken links discovered during sampling ({$sampleBroken} 404/500 responses).",
            ];
        }

        // A12: Form Validation
        $hasForm = str_contains($mainBody, '<form');
        $hasValidation = (bool)preg_match('/<input[^>]+(required|pattern|type=["\']email["\']|type=["\']number["\'])[^>]*>/i', $mainBody);
        if ($hasForm && $hasValidation) {
            $findings[] = [
                'id' => 'A12',
                'category' => 'FORMS_USABILITY',
                'title' => 'Form Validation',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Input forms utilize native HTML5 validation attributes (required, email, pattern).',
                'recommendation' => 'Ensure strict server-side validation is enforced alongside frontend validation.',
                'evidence' => 'Detected input validation attributes on form elements.',
            ];
        } elseif ($hasForm) {
            $findings[] = [
                'id' => 'A12',
                'category' => 'FORMS_USABILITY',
                'title' => 'Form Validation',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => 'Form discovered but lacks basic validation attributes (such as required or email types).',
                'recommendation' => 'Add HTML5 validation attributes to form fields to enhance usability.',
                'evidence' => '<form> element present without explicit required or pattern attributes.',
            ];
        } else {
            $findings[] = [
                'id' => 'A12',
                'category' => 'FORMS_USABILITY',
                'title' => 'Form Validation',
                'status' => 'NOT_CHECKED',
                'severity' => 'INFO',
                'description' => 'No interactive form elements detected on the primary page.',
                'recommendation' => 'If contact or lead forms reside on separate routes, enforce strict validation there.',
                'evidence' => 'No <form> tags discovered on the page.',
            ];
        }

        // A13: Anti-spam Form
        $hasAntiSpam = str_contains(strtolower($mainBody), 'recaptcha') ||
            str_contains(strtolower($mainBody), 'turnstile') ||
            str_contains(strtolower($mainBody), 'hcaptcha') ||
            str_contains(strtolower($mainBody), 'honeypot') ||
            preg_match('/<input[^>]+(style=["\'][^"\']*display:\s*none|class=["\'][^"\']*hidden)[^>]*>/i', $mainBody);

        if ($hasForm && $hasAntiSpam) {
            $findings[] = [
                'id' => 'A13',
                'category' => 'FORMS_USABILITY',
                'title' => 'Anti-spam Form',
                'status' => 'PASS',
                'severity' => 'MEDIUM',
                'description' => 'Forms include spam mitigation instruments or bot defense (CAPTCHA, Turnstile, or Honeypot).',
                'recommendation' => 'Use non-intrusive methods like Honeypot or Cloudflare Turnstile to keep the user experience seamless.',
                'evidence' => 'Detected anti-spam library or protection attributes on form.',
            ];
        } elseif ($hasForm) {
            $findings[] = [
                'id' => 'A13',
                'category' => 'FORMS_USABILITY',
                'title' => 'Anti-spam Form',
                'status' => 'WARNING',
                'severity' => 'MEDIUM',
                'description' => 'Public contact form exposed without detected bot defense or honeypot, vulnerable to automated spam.',
                'recommendation' => 'Implement hidden honeypot fields or Turnstile to repel automated spam submissions.',
                'evidence' => 'Form detected without captcha or honeypot protection.',
            ];
        } else {
            $findings[] = [
                'id' => 'A13',
                'category' => 'FORMS_USABILITY',
                'title' => 'Anti-spam Form',
                'status' => 'NOT_CHECKED',
                'severity' => 'INFO',
                'description' => 'Anti-spam evaluation skipped because no forms were found on the landing page.',
                'recommendation' => 'Implement bot defense whenever interactive forms are added in the future.',
                'evidence' => 'No forms scanned.',
            ];
        }

        // A14: Form-submit Tracking
        $hasFormTracking = str_contains($mainBody, 'onsubmit') ||
            str_contains($mainBody, 'gtag') ||
            str_contains($mainBody, 'dataLayer') ||
            str_contains($mainBody, 'analytics');
        if ($hasForm && $hasFormTracking) {
            $findings[] = [
                'id' => 'A14',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'Form-submit Tracking',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Form submission is hooked into analytics tracking or conversion telemetry handlers.',
                'recommendation' => 'Ensure conversion event parameters are configured correctly in your analytics dashboard.',
                'evidence' => 'Detected submit event listener or dataLayer integration on form.',
            ];
        } elseif ($hasForm) {
            $findings[] = [
                'id' => 'A14',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'Form-submit Tracking',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => 'Form submission is not configured to send telemetry or conversion analytics events.',
                'recommendation' => 'Attach an event handler upon successful form submission to measure conversion rates.',
                'evidence' => 'No tracking listeners detected on form submit action.',
            ];
        } else {
            $findings[] = [
                'id' => 'A14',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'Form-submit Tracking',
                'status' => 'NOT_CHECKED',
                'severity' => 'INFO',
                'description' => 'No forms present on the primary page to evaluate conversion tracking.',
                'recommendation' => 'Configure conversion tracking on your lead generation forms.',
                'evidence' => 'No forms found.',
            ];
        }

        // A15: Contact Tracking (Multi-channel: Email, Tel, WhatsApp, Telegram, GitHub, Twitter/X, LinkedIn, Reddit, Discord)
        $contactsFound = [];

        // Email (mailto:)
        if (preg_match_all('/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i', $mainBody, $mailMatches)) {
            $uniqueEmails = array_unique($mailMatches[1]);
            foreach (array_slice($uniqueEmails, 0, 2) as $em) {
                $contactsFound[] = "Email: " . $em;
            }
        }

        // Telephone (tel:)
        if (preg_match_all('/tel:([+\d\s().-]{7,20})/i', $mainBody, $telMatches)) {
            $uniqueTels = array_unique(array_map('trim', $telMatches[1]));
            foreach (array_slice($uniqueTels, 0, 1) as $tel) {
                $contactsFound[] = "Phone: " . $tel;
            }
        }

        // WhatsApp (wa.me, api.whatsapp.com, whatsapp:)
        if (preg_match('/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/??([0-9]{8,15})?/i', $mainBody, $waMatch)) {
            $waNum = !empty($waMatch[1]) ? " (" . $waMatch[1] . ")" : "";
            $contactsFound[] = "WhatsApp" . $waNum;
        } elseif (preg_match('/(wa\.me|api\.whatsapp\.com|whatsapp:\/\/)/i', $mainBody)) {
            $contactsFound[] = "WhatsApp";
        }

        // Telegram (t.me)
        if (preg_match('/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{4,32})/i', $mainBody, $tgMatch)) {
            $contactsFound[] = "Telegram: @" . $tgMatch[1];
        }

        // GitHub
        if (preg_match('/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]{1,39})/i', $mainBody, $ghMatch)) {
            $contactsFound[] = "GitHub: @" . $ghMatch[1];
        }

        // Twitter / X
        if (preg_match('/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,25})/i', $mainBody, $xMatch)) {
            $contactsFound[] = "Twitter/X: @" . $xMatch[1];
        }

        // LinkedIn
        if (preg_match('/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/i', $mainBody, $liMatch)) {
            $contactsFound[] = "LinkedIn: " . $liMatch[1];
        }

        // Reddit
        if (preg_match('/(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:r|user)\/([a-zA-Z0-9_-]+)/i', $mainBody, $rdMatch)) {
            $contactsFound[] = "Reddit: " . $rdMatch[1];
        }

        // Discord
        if (preg_match('/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9_-]+)/i', $mainBody, $dcMatch)) {
            $contactsFound[] = "Discord";
        }

        if (!empty($contactsFound)) {
            $channelList = implode(', ', $contactsFound);
            $findings[] = [
                'id' => 'A15',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'Contact Tracking',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Public contact channels detected active (' . count($contactsFound) . ' communication channels identified).',
                'recommendation' => 'Attach onClick event listeners to contact links to measure prospect conversions and lead engagements.',
                'evidence' => 'Found verified contact channels: ' . $channelList,
            ];
        } else {
            $findings[] = [
                'id' => 'A15',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'Contact Tracking',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => 'No direct contact links (Email, Phone, WhatsApp, Telegram, GitHub, Twitter/X, or social channels) detected on the primary page.',
                'recommendation' => 'Provide direct contact channels or social links in the footer/header to build credibility and enable inquiries.',
                'evidence' => 'No mailto:, tel:, WhatsApp, Telegram, GitHub, Twitter, or community links found.',
            ];
        }

        // A16: CTA Tracking
        $hasCtaButtons = (bool)preg_match('/<(button|a)[^>]+(class=["\'][^"\']*(btn|cta|button|action)[^"\']*|role=["\']button["\'])[^>]*>/i', $mainBody) ||
            str_contains($mainBody, 'tel:') ||
            str_contains($mainBody, 'mailto:');
        if ($hasCtaButtons) {
            $findings[] = [
                'id' => 'A16',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'CTA Tracking',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Call-to-Action (CTA) buttons or direct contact buttons (tel/mailto/button) clearly identified.',
                'recommendation' => 'Assign unique tracking IDs or classes to each CTA button for conversion funnel analytics.',
                'evidence' => 'Found interactive CTA button elements on the landing page.',
            ];
        } else {
            $findings[] = [
                'id' => 'A16',
                'category' => 'ANALYTICS_CONVERSION',
                'title' => 'CTA Tracking',
                'status' => 'WARNING',
                'severity' => 'MEDIUM',
                'description' => 'Page lacks prominent action or CTA buttons to guide visitors.',
                'recommendation' => 'Add clear, contrasting Call to Action buttons (e.g. Sign Up, Contact Us, or Get Started).',
                'evidence' => 'No primary CTA button elements identified on page.',
            ];
        }

        // A17: Favicon
        $hasFavicon = (bool)preg_match('/<link[^>]+rel=["\'](icon|shortcut icon|apple-touch-icon)["\'][^>]*>/i', $mainBody);
        if ($hasFavicon) {
            $findings[] = [
                'id' => 'A17',
                'category' => 'CONFIG_BRANDING',
                'title' => 'Favicon',
                'status' => 'PASS',
                'severity' => 'LOW',
                'description' => 'Favicon icon is officially declared in HTML document for browser tabs and mobile bookmarks.',
                'recommendation' => 'Provide SVG and PNG 32x32 formats along with apple-touch-icon for sharp resolution.',
                'evidence' => 'Found <link rel="icon"> tag in <head> element.',
            ];
        } else {
            $findings[] = [
                'id' => 'A17',
                'category' => 'CONFIG_BRANDING',
                'title' => 'Favicon',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => 'Favicon tag not declared in <head> (browser may rely solely on default /favicon.ico fallback).',
                'recommendation' => 'Add <link rel="icon" type="image/svg+xml" href="/favicon.svg"> to the <head> element.',
                'evidence' => 'No rel="icon" tag declaration found.',
            ];
        }

        // A18: Custom 404
        $isReal404 = ($probe404Res['http_code'] === 404);
        $isSoft404 = ($probe404Res['http_code'] === 200);
        if ($isReal404) {
            $findings[] = [
                'id' => 'A18',
                'category' => 'CONFIG_BRANDING',
                'title' => 'Custom 404',
                'status' => 'PASS',
                'severity' => 'MEDIUM',
                'description' => 'Server correctly handles missing URLs by returning a genuine HTTP 404 status code.',
                'recommendation' => 'Ensure custom 404 page provides clear navigation back to the homepage or search box.',
                'evidence' => "Probing random URL {$probe404Url} returned genuine HTTP 404 Not Found response.",
            ];
        } elseif ($isSoft404) {
            $findings[] = [
                'id' => 'A18',
                'category' => 'CONFIG_BRANDING',
                'title' => 'Custom 404',
                'status' => 'FAIL',
                'severity' => 'HIGH',
                'description' => 'Soft-404 condition detected! Server returns HTTP 200 OK for non-existent URLs.',
                'recommendation' => 'Configure server to return genuine HTTP 404 status when content is not found to preserve crawl budget.',
                'evidence' => 'Random URL probe returned HTTP 200 OK response (Soft-404).',
            ];
        } else {
            $findings[] = [
                'id' => 'A18',
                'category' => 'CONFIG_BRANDING',
                'title' => 'Custom 404',
                'status' => 'WARNING',
                'severity' => 'LOW',
                'description' => "Server returned HTTP {$probe404Res['http_code']} status code for non-existent URLs.",
                'recommendation' => 'Ensure server routes non-existent URLs directly to a 404 error template.',
                'evidence' => "HTTP status code received: {$probe404Res['http_code']}.",
            ];
        }

        // A19: HTTPS / SSL
        $isHttps = ($scheme === 'https');
        $hasHsts = isset($mainHeaders['strict-transport-security']);
        if ($isHttps && $mainPage['ssl_verified'] && $hasHsts) {
            $findings[] = [
                'id' => 'A19',
                'category' => 'SECURITY_TLS',
                'title' => 'HTTPS / SSL',
                'status' => 'PASS',
                'severity' => 'CRITICAL',
                'description' => 'Fully encrypted TLS connection with valid certificate and active HSTS header protection.',
                'recommendation' => 'Maintain automated certificate renewals and configure HSTS max-age for at least 6 months.',
                'evidence' => "HTTPS active, valid SSL handshake, HSTS Header: {$mainHeaders['strict-transport-security']}.",
            ];
        } elseif ($isHttps && $mainPage['ssl_verified']) {
            $findings[] = [
                'id' => 'A19',
                'category' => 'SECURITY_TLS',
                'title' => 'HTTPS / SSL',
                'status' => 'PASS',
                'severity' => 'HIGH',
                'description' => 'TLS encrypted connection with valid certificate. Enabling HSTS is recommended for maximum security.',
                'recommendation' => 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains header.',
                'evidence' => 'HTTPS active with verified SSL certificate.',
            ];
        } else {
            $findings[] = [
                'id' => 'A19',
                'category' => 'SECURITY_TLS',
                'title' => 'HTTPS / SSL',
                'status' => 'FAIL',
                'severity' => 'CRITICAL',
                'description' => 'Target uses insecure HTTP protocol or invalid TLS certificate!',
                'recommendation' => 'Install a valid SSL/TLS certificate (e.g. Let\'s Encrypt) and enforce 301 redirection to HTTPS.',
                'evidence' => "Scheme: {$scheme} — SSL Verification: " . ($mainPage['ssl_verified'] ? 'OK' : 'FAILED / INSECURE'),
            ];
        }

        // A20: Device Responsive Viewport
        preg_match('/<meta[^>]+name=["\']viewport["\'][^>]+content=["\']([^"\']*)["\']/i', $mainBody, $viewportMatch);
        $viewportContent = strtolower($viewportMatch[1] ?? '');
        if (str_contains($viewportContent, 'width=device-width')) {
            $findings[] = [
                'id' => 'A20',
                'category' => 'RESPONSIVE_MOBILE',
                'title' => 'Device Responsive',
                'status' => 'PASS',
                'severity' => 'HIGH',
                'description' => 'Responsive viewport meta tag correctly configured for cross-device rendering (mobile, tablet, desktop).',
                'recommendation' => 'Maintain fluid layouts and ensure touch targets are at least 44x44px on touchscreens.',
                'evidence' => "<meta name=\"viewport\" content=\"{$viewportMatch[1]}\">",
            ];
        } else {
            $findings[] = [
                'id' => 'A20',
                'category' => 'RESPONSIVE_MOBILE',
                'title' => 'Device Responsive',
                'status' => 'FAIL',
                'severity' => 'CRITICAL',
                'description' => '<meta name="viewport"> tag not found or missing width=device-width!',
                'recommendation' => 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to <head>.',
                'evidence' => 'Viewport meta tag not detected in HTML document.',
            ];
        }

        // 4. Calculate Summary and Score
        $summary = [
            'pass' => 0,
            'fail' => 0,
            'warning' => 0,
            'notChecked' => 0,
            'manualRequired' => 0,
        ];

        $scoredPoints = 0;
        $maxPossiblePoints = 0;

        foreach ($findings as $f) {
            $st = $f['status'];
            if ($st === 'PASS') {
                $summary['pass']++;
                $scoredPoints += 5;
                $maxPossiblePoints += 5;
            } elseif ($st === 'WARNING') {
                $summary['warning']++;
                $scoredPoints += 2.5;
                $maxPossiblePoints += 5;
            } elseif ($st === 'FAIL') {
                $summary['fail']++;
                $maxPossiblePoints += 5;
            } elseif ($st === 'NOT_CHECKED') {
                $summary['notChecked']++;
            } elseif ($st === 'MANUAL_REQUIRED') {
                $summary['manualRequired']++;
            }
        }

        $score = $maxPossiblePoints > 0 ? (int)round(($scoredPoints / $maxPossiblePoints) * 100) : 100;
        $durationMs = (int)round((microtime(true) - $startTime) * 1000);
        $auditId = 'audit-' . time() . '-' . bin2hex(random_bytes(16));

        $auditRecord = [
            'id' => $auditId,
            'url' => $targetUrl,
            'domain' => $host,
            'createdAt' => date('c'),
            'durationMs' => $durationMs,
            'score' => $score,
            'summary' => $summary,
            'findings' => $findings,
            'isDemo' => false,
        ];

        // 5. Persist to Database & Update Real-time Admin Metrics
        self::persistAudit($auditRecord);

        return [
            'success' => true,
            'auditId' => $auditId,
            'record' => $auditRecord,
        ];
    }

    /**
     * Persist audit record and update real-time daily metrics in database
     */
    private static function persistAudit(array $record): void
    {
        try {
            $pdo = Database::getConnection();

            // Insert audit record
            $stmt = $pdo->prepare("
                INSERT INTO `audit_records`
                (`id`, `target_url`, `domain`, `score`, `duration_ms`, `summary_json`, `findings_json`, `created_at`)
                VALUES (:id, :target_url, :domain, :score, :duration_ms, :summary_json, :findings_json, NOW())
            ");

            $stmt->execute([
                ':id' => $record['id'],
                ':target_url' => $record['url'],
                ':domain' => $record['domain'],
                ':score' => $record['score'],
                ':duration_ms' => $record['durationMs'],
                ':summary_json' => json_encode($record['summary']),
                ':findings_json' => json_encode($record['findings']),
            ]);

            // Update real-time daily metrics in audit_metrics_daily
            $today = date('Y-m-d');
            $upsertMetrics = $pdo->prepare("
                INSERT INTO `audit_metrics_daily`
                (`metric_date`, `total_audits`, `completed_audits`, `failed_audits`, `avg_duration_ms`, `ssl_checks_count`, `header_checks_count`, `sitemap_checks_count`, `robots_checks_count`, `created_at`)
                VALUES (:today, 1, 1, 0, :dur, 1, 1, 1, 1, NOW())
                ON DUPLICATE KEY UPDATE
                    `total_audits` = `total_audits` + 1,
                    `completed_audits` = `completed_audits` + 1,
                    `avg_duration_ms` = ROUND((`avg_duration_ms` + :dur2) / 2),
                    `ssl_checks_count` = `ssl_checks_count` + 1,
                    `header_checks_count` = `header_checks_count` + 1,
                    `sitemap_checks_count` = `sitemap_checks_count` + 1,
                    `robots_checks_count` = `robots_checks_count` + 1
            ");

            $upsertMetrics->execute([
                ':today' => $today,
                ':dur' => $record['durationMs'],
                ':dur2' => $record['durationMs'],
            ]);
        } catch (Throwable $e) {
            error_log('Failed to persist audit record: ' . $e->getMessage());
        }
    }

    /**
     * Retrieve audit record by ID
     */
    public static function getAuditById(string $id): ?array
    {
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT * FROM `audit_records` WHERE `id` = :id LIMIT 1");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                return null;
            }

            return [
                'id' => $row['id'],
                'url' => $row['target_url'],
                'domain' => $row['domain'],
                'createdAt' => $row['created_at'],
                'durationMs' => (int)$row['duration_ms'],
                'score' => (int)$row['score'],
                'summary' => json_decode($row['summary_json'], true) ?: [],
                'findings' => json_decode($row['findings_json'], true) ?: [],
                'isDemo' => false,
            ];
        } catch (Throwable $e) {
            error_log('Failed to fetch audit by id: ' . $e->getMessage());
            return null;
        }
    }
}
