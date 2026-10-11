<?php
declare(strict_types=1);

namespace XeooAuditor\Security;

/**
 * SSRF defenses for user-submitted and discovered URLs.
 * Validates scheme, credentials, port and every resolved IP; returns a pinned IP so the
 * HTTP client connects to exactly the address that was validated (DNS-rebinding defense).
 */
class UrlGuard
{
    public const MAX_URL_LENGTH = 2048;
    /** @var list<int> */
    private const ALLOWED_PORTS = [80, 443, 8080, 8443];

    /** @var list<string> */
    private const BLOCKED_V4 = [
        '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
        '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.88.99.0/24', '192.168.0.0/16',
        '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4',
    ];

    /** @var list<string> */
    private const BLOCKED_V6 = [
        '::/128', '::1/128', '100::/64', '2001::/32', '2001:db8::/32',
        'fc00::/7', 'fe80::/10', 'fec0::/10', 'ff00::/8',
    ];

    public static function isPublicIp(string $ip): bool
    {
        $packed = @inet_pton($ip);
        if ($packed === false) {
            return false;
        }

        if (strlen($packed) === 4) {
            return !self::inAnyCidr($packed, self::BLOCKED_V4);
        }

        // IPv4-mapped (::ffff:a.b.c.d), NAT64 (64:ff9b::/96) and 6to4 (2002::/16) embed an IPv4 address.
        if (str_starts_with($packed, str_repeat("\0", 10) . "\xff\xff")) {
            return self::isPublicIp((string)inet_ntop(substr($packed, 12, 4)));
        }
        if (str_starts_with($packed, "\x00\x64\xff\x9b" . str_repeat("\0", 8))) {
            return self::isPublicIp((string)inet_ntop(substr($packed, 12, 4)));
        }
        if (str_starts_with($packed, "\x20\x02")) {
            return self::isPublicIp((string)inet_ntop(substr($packed, 2, 4)));
        }

        return !self::inAnyCidr($packed, self::BLOCKED_V6);
    }

    /**
     * Validate a URL and resolve it to a pinned, public IP.
     *
     * @return array{valid: true, url: string, scheme: string, host: string, port: int, ip: string}|array{valid: false, error: string}
     */
    public static function validate(string $url): array
    {
        $url = trim($url);
        if ($url === '') {
            return self::fail('Target URL cannot be empty.');
        }
        if (strlen($url) > self::MAX_URL_LENGTH || preg_match('/[\x00-\x20\x7F]/', $url) === 1) {
            return self::fail('Target URL is too long or contains invalid characters.');
        }

        $parts = parse_url($url);
        if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
            return self::fail('Invalid URL format (must include http:// or https://).');
        }

        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return self::fail('Only http:// and https:// schemes are permitted for auditing.');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            return self::fail('URLs containing credentials are not permitted.');
        }

        $host = strtolower(trim($parts['host'], '[]'));
        $port = (int)($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
        if (!in_array($port, self::ALLOWED_PORTS, true)) {
            return self::fail('This port is not permitted for auditing (allowed: 80, 443, 8080, 8443).');
        }

        $blockedMessage = 'This destination is not permitted for auditing (SSRF protection).';
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local')
            || str_ends_with($host, '.internal') || $host === '') {
            return self::fail($blockedMessage);
        }

        $isIpLiteral = filter_var($host, FILTER_VALIDATE_IP) !== false;
        // Reject ambiguous numeric hosts (decimal/octal/hex IPv4 forms such as 2130706433).
        if (!$isIpLiteral && preg_match('/^[0-9.x]+$/i', $host) === 1) {
            return self::fail($blockedMessage);
        }

        $ips = $isIpLiteral ? [$host] : self::resolve($host);
        if ($ips === []) {
            return self::fail('Domain could not be resolved to a public IP address.');
        }
        foreach ($ips as $ip) {
            if (!self::isPublicIp($ip)) {
                return self::fail($blockedMessage);
            }
        }

        $path = ($parts['path'] ?? '') === '' ? '/' : $parts['path'];
        $query = isset($parts['query']) ? '?' . $parts['query'] : '';
        $hostPart = $isIpLiteral && str_contains($host, ':') ? "[{$host}]" : $host;
        $portPart = isset($parts['port']) ? ':' . $parts['port'] : '';

        return [
            'valid' => true,
            'url' => "{$scheme}://{$hostPart}{$portPart}{$path}{$query}",
            'scheme' => $scheme,
            'host' => $host,
            'port' => $port,
            'ip' => $ips[0],
        ];
    }

    /**
     * Resolve a relative or absolute Location header against the current URL.
     */
    public static function resolveRedirect(string $currentUrl, string $location): ?string
    {
        $location = trim($location);
        if ($location === '' || preg_match('/[\x00-\x1F\x7F]/', $location) === 1) {
            return null;
        }
        if (preg_match('#^https?://#i', $location) === 1) {
            return $location;
        }
        $base = parse_url($currentUrl);
        if ($base === false || !isset($base['scheme'], $base['host'])) {
            return null;
        }
        $origin = $base['scheme'] . '://' . $base['host'] . (isset($base['port']) ? ':' . $base['port'] : '');
        if (str_starts_with($location, '//')) {
            return $base['scheme'] . ':' . $location;
        }
        if (str_starts_with($location, '/')) {
            return $origin . $location;
        }
        if (preg_match('#^[a-z][a-z0-9+.\-]*:#i', $location) === 1) {
            return null; // unsafe or unsupported scheme such as javascript:, file:, gopher:
        }
        $dir = rtrim(dirname(($base['path'] ?? '/') . 'x'), '/');
        return $origin . $dir . '/' . $location;
    }

    /** @return list<string> */
    private static function resolve(string $host): array
    {
        $ips = [];
        $records = @dns_get_record($host, DNS_A | DNS_AAAA);
        foreach (is_array($records) ? $records : [] as $record) {
            $ip = $record['ip'] ?? ($record['ipv6'] ?? null);
            if (is_string($ip)) {
                $ips[] = $ip;
            }
        }
        if ($ips === []) {
            $fallback = @gethostbynamel($host);
            $ips = is_array($fallback) ? array_values($fallback) : [];
        }
        // Prefer IPv4 for the pinned address.
        usort($ips, static fn (string $a, string $b): int => str_contains($a, ':') <=> str_contains($b, ':'));
        return array_values(array_unique($ips));
    }

    /** @param list<string> $cidrs */
    private static function inAnyCidr(string $packedIp, array $cidrs): bool
    {
        foreach ($cidrs as $cidr) {
            [$network, $bits] = explode('/', $cidr);
            $packedNetwork = inet_pton($network);
            if ($packedNetwork === false || strlen($packedNetwork) !== strlen($packedIp)) {
                continue;
            }
            $bits = (int)$bits;
            $fullBytes = intdiv($bits, 8);
            if (substr($packedIp, 0, $fullBytes) !== substr($packedNetwork, 0, $fullBytes)) {
                continue;
            }
            $remainder = $bits % 8;
            if ($remainder === 0) {
                return true;
            }
            $mask = (0xFF << (8 - $remainder)) & 0xFF;
            if ((ord($packedIp[$fullBytes]) & $mask) === (ord($packedNetwork[$fullBytes]) & $mask)) {
                return true;
            }
        }
        return false;
    }

    /** @return array{valid: false, error: string} */
    private static function fail(string $message): array
    {
        return ['valid' => false, 'error' => $message];
    }
}

