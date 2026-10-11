<?php
declare(strict_types=1);

/**
 * Dependency-free backend test runner (no PHPUnit/composer on this stack).
 * Usage: php backend/tests/run.php
 * DB-backed checks (rate limiter) run only when the database is reachable.
 */

require_once __DIR__ . '/../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../src/Security/RequestGuard.php';
require_once __DIR__ . '/../src/Security/RateLimiter.php';
require_once __DIR__ . '/../src/Security/UrlGuard.php';

use XeooAuditor\Security\HttpException;
use XeooAuditor\Security\RateLimiter;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Security\UrlGuard;
use XeooAuditor\Security\Validator;

$passed = 0;
$failed = [];

function check(string $name, bool $condition): void
{
    global $passed, $failed;
    if ($condition) {
        $passed++;
    } else {
        $failed[] = $name;
    }
}

/** @return string|null error code thrown by the callback, or null if nothing was thrown */
function thrownCode(callable $fn): ?string
{
    try {
        $fn();
        return null;
    } catch (HttpException $e) {
        return $e->errorCode;
    }
}

// --- SSRF: IP classification -------------------------------------------------
foreach (['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0',
    '100.64.0.1', '198.18.0.1', '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1',
    'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::7f00:1', '2002:7f00:0001::1', 'not-an-ip'] as $ip) {
    check("blocks {$ip}", UrlGuard::isPublicIp($ip) === false);
}
foreach (['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'] as $ip) {
    check("allows {$ip}", UrlGuard::isPublicIp($ip) === true);
}

// --- SSRF: URL validation (cases that never need DNS) -------------------------
$rejected = [
    'empty' => '',
    'file scheme' => 'file:///etc/passwd',
    'gopher scheme' => 'gopher://example.com/',
    'javascript scheme' => 'javascript:alert(1)',
    'ftp scheme' => 'ftp://example.com/',
    'localhost' => 'http://localhost/',
    'subdomain localhost' => 'http://app.localhost/',
    'loopback v4' => 'http://127.0.0.1/',
    'loopback v6' => 'http://[::1]/',
    'metadata' => 'http://169.254.169.254/latest/meta-data/',
    'private ip' => 'http://192.168.0.10/',
    'decimal ip' => 'http://2130706433/',
    'hex ip' => 'http://0x7f000001/',
    'octal-ish ip' => 'http://0177.0.0.1/',
    'credentials' => 'https://user:pass@example.com/',
    'odd port' => 'http://8.8.8.8:22/',
    'redis port' => 'http://8.8.8.8:6379/',
    'control chars' => "http://8.8.8.8/\r\nX: y",
    'space' => 'http://8.8.8.8/a b',
    'too long' => 'https://8.8.8.8/' . str_repeat('a', 2100),
    '.internal' => 'http://service.internal/',
];
foreach ($rejected as $label => $url) {
    check("rejects {$label}", UrlGuard::validate($url)['valid'] === false);
}
$ok = UrlGuard::validate('https://8.8.8.8/path?x=1');
check('accepts public ip literal', $ok['valid'] === true && $ok['ip'] === '8.8.8.8' && $ok['port'] === 443);
$okPort = UrlGuard::validate('http://8.8.8.8:8080/');
check('accepts allowlisted port', $okPort['valid'] === true && $okPort['port'] === 8080);

// --- SSRF: redirect resolution (every hop is re-validated by the caller) -------
check('relative redirect resolves', UrlGuard::resolveRedirect('https://a.test/x/y', '/z') === 'https://a.test/z');
check('absolute redirect kept', UrlGuard::resolveRedirect('https://a.test/', 'https://b.test/p') === 'https://b.test/p');
check('scheme-relative redirect', UrlGuard::resolveRedirect('https://a.test/', '//b.test/p') === 'https://b.test/p');
check('dangerous scheme redirect dropped', UrlGuard::resolveRedirect('https://a.test/', 'gopher://x/') === null);
check('file scheme redirect dropped', UrlGuard::resolveRedirect('https://a.test/', 'file:///etc/passwd') === null);
check('redirect to metadata is rejected by validate',
    UrlGuard::validate((string)UrlGuard::resolveRedirect('https://a.test/', 'http://169.254.169.254/'))['valid'] === false);
check('redirect to loopback is rejected by validate',
    UrlGuard::validate((string)UrlGuard::resolveRedirect('https://a.test/', 'http://127.0.0.1:80/admin'))['valid'] === false);

// --- Request guard: JSON body --------------------------------------------------
$json = 'application/json; charset=utf-8';
check('valid object parses', RequestGuard::readJsonObject('{"a":"b"}', $json) === ['a' => 'b']);
check('empty object ok', RequestGuard::readJsonObject('{}', $json) === []);
check('wrong content type', thrownCode(fn () => RequestGuard::readJsonObject('{}', 'text/plain')) === 'UNSUPPORTED_MEDIA_TYPE');
check('missing content type', thrownCode(fn () => RequestGuard::readJsonObject('{}', '')) === 'UNSUPPORTED_MEDIA_TYPE');
check('malformed json', thrownCode(fn () => RequestGuard::readJsonObject('{bad', $json)) === 'INVALID_INPUT');
check('json list rejected', thrownCode(fn () => RequestGuard::readJsonObject('["a"]', $json)) === 'INVALID_INPUT');
check('json scalar rejected', thrownCode(fn () => RequestGuard::readJsonObject('"str"', $json)) === 'INVALID_INPUT');
check('null rejected', thrownCode(fn () => RequestGuard::readJsonObject('null', $json)) === 'INVALID_INPUT');
check('oversized body', thrownCode(fn () => RequestGuard::readJsonObject('{"a":"' . str_repeat('x', 20000) . '"}', $json)) === 'REQUEST_TOO_LARGE');
check('deep nesting rejected', thrownCode(fn () => RequestGuard::readJsonObject(str_repeat('{"a":', 20) . '1' . str_repeat('}', 20), $json)) === 'INVALID_INPUT');
$manyKeys = '{' . implode(',', array_map(static fn (int $i): string => "\"k{$i}\":1", range(1, 40))) . '}';
check('too many keys rejected', thrownCode(fn () => RequestGuard::readJsonObject($manyKeys, $json)) === 'INVALID_INPUT');

// --- Request guard: origin ------------------------------------------------------
check('same host origin allowed', RequestGuard::isOriginAllowed('https://app.example.com', 'app.example.com'));
check('same host + port allowed', RequestGuard::isOriginAllowed('http://127.0.0.1:8080', '127.0.0.1:8080'));
check('dev origin allowed', RequestGuard::isOriginAllowed('http://localhost:5173', 'anything'));
check('foreign origin blocked', !RequestGuard::isOriginAllowed('https://evil.test', 'app.example.com'));
check('suffix trick blocked', !RequestGuard::isOriginAllowed('https://app.example.com.evil.test', 'app.example.com'));
check('non-http origin blocked', !RequestGuard::isOriginAllowed('null', 'app.example.com'));
check('javascript origin blocked', !RequestGuard::isOriginAllowed('javascript://app.example.com', 'app.example.com'));

// --- Validators -------------------------------------------------------------------
check('array rejected as string', thrownCode(fn () => Validator::string(['u' => ['x']], 'u', 1, 10)) === 'INVALID_INPUT');
check('int rejected as string', thrownCode(fn () => Validator::string(['u' => 5], 'u', 1, 10)) === 'INVALID_INPUT');
check('missing required', thrownCode(fn () => Validator::string([], 'u', 1, 10)) === 'INVALID_INPUT');
check('optional absent is null', Validator::string([], 'u', 1, 10, null, false) === null);
check('too long rejected', thrownCode(fn () => Validator::string(['u' => str_repeat('a', 11)], 'u', 1, 10)) === 'INVALID_INPUT');
check('too short rejected', thrownCode(fn () => Validator::string(['u' => 'ab'], 'u', 3, 10)) === 'INVALID_INPUT');
check('null byte rejected', thrownCode(fn () => Validator::string(['u' => "a\0b"], 'u', 1, 10)) === 'INVALID_INPUT');
check('pattern enforced', thrownCode(fn () => Validator::string(['u' => 'a b'], 'u', 1, 10, '/^[a-z]+$/')) === 'INVALID_INPUT');
check('trim applied', Validator::string(['u' => '  bob  '], 'u', 1, 10, null, true, true) === 'bob');
// Payload-like text is plain data: only structural rules apply, it must not be rewritten or "detected".
$sqlLike = "' OR 1=1 --";
check('sql-like text kept verbatim', Validator::string(['q' => $sqlLike], 'q', 1, 50) === $sqlLike);
$xssLike = '<script>alert(1)</script>';
check('xss-like text kept verbatim', Validator::string(['q' => $xssLike], 'q', 1, 50) === $xssLike);
check('unicode accepted', Validator::string(['q' => 'Привет 你好 🙂'], 'q', 1, 50) === 'Привет 你好 🙂');
check('honeypot empty ok', Validator::honeypotFilled([], 'h') === false);
check('honeypot filled flagged', Validator::honeypotFilled(['h' => 'bot'], 'h') === true);
check('honeypot array flagged', Validator::honeypotFilled(['h' => ['x']], 'h') === true);
check('int validator accepts valid int', Validator::int(['i' => 5], 'i', 1, 10) === 5);
check('int validator rejects string', thrownCode(fn () => Validator::int(['i' => 'abc'], 'i', 1, 10)) === 'INVALID_INPUT');
check('int validator rejects out of bounds', thrownCode(fn () => Validator::int(['i' => 0], 'i', 1, 10)) === 'INVALID_INPUT');
check('assertNoScript blocks script tag', thrownCode(fn () => Validator::assertNoScript('<script>alert(1)</script>', 'msg')) === 'INVALID_INPUT');
check('assertNoScript blocks onerror payload', thrownCode(fn () => Validator::assertNoScript('<img src=x onerror=alert(1)>', 'msg')) === 'INVALID_INPUT');
check('assertNoScript blocks javascript pseudo-protocol', thrownCode(fn () => Validator::assertNoScript('javascript:alert(1)', 'msg')) === 'INVALID_INPUT');
check('assertNoScript allows safe plain text', (function () {
    Validator::assertNoScript('This is a completely clean inquiry text message.', 'msg');
    return true;
})());

// --- Rate limiter (DB-backed; skipped when the DB is unreachable) --------------------
$dbReachable = true;
try {
    require_once __DIR__ . '/../config/database.php';
    $pdo = XeooAuditor\Config\Database::getConnection();
    $pdo->query('SELECT 1 FROM `security_rate_limits` LIMIT 1');
} catch (Throwable) {
    $dbReachable = false;
}
if ($dbReachable) {
    $key = 'test-' . bin2hex(random_bytes(6));
    $results = [];
    for ($i = 0; $i < 5; $i++) {
        $results[] = RateLimiter::hit('test_scope', $key, 3, 60)['allowed'];
    }
    check('limiter allows up to limit', $results[0] && $results[1] && $results[2]);
    check('limiter blocks past limit', !$results[3] && !$results[4]);
    check('limiter reports retry_after', RateLimiter::hit('test_scope', $key, 3, 60)['retry_after'] >= 1);
    check('limiter isolates keys', RateLimiter::hit('test_scope', $key . 'x', 3, 60)['allowed'] === true);
    check('enforce throws 429', thrownCode(fn () => RateLimiter::enforce('test_scope', $key, 3, 60, 'tests')) === 'RATE_LIMITED');
    $pdo->prepare("DELETE FROM `security_rate_limits` WHERE `scope` = 'test_scope'")->execute();
    $pdo->prepare("DELETE FROM `security_events` WHERE `route` = 'tests'")->execute();
} else {
    echo "SKIPPED: rate limiter tests (database or migration 005 unavailable)\n";
}

// --- Production environment controls & Session security ---------------------
require_once __DIR__ . '/../src/Auth/SessionManager.php';
use XeooAuditor\Auth\SessionManager;

// Test production origins suppression
$origEnv = getenv('APP_ENV') ?: '';
putenv('APP_ENV=production');
check('dev origin blocked in production', !in_array('http://localhost:5173', SecurityHeaders::allowedOrigins(), true));
putenv('XEOO_ALLOWED_ORIGINS=https://admin.xeoo.test');
check('production allowed origin accepted', in_array('https://admin.xeoo.test', SecurityHeaders::allowedOrigins(), true));
putenv($origEnv !== '' ? "APP_ENV={$origEnv}" : 'APP_ENV');
putenv('XEOO_ALLOWED_ORIGINS');

// Test session cookie naming based on HTTPS
$_SERVER['HTTPS'] = 'on';
check('secure cookie uses __Host- prefix under HTTPS', SessionManager::getCookieName() === '__Host-xeoo_admin_session');
unset($_SERVER['HTTPS']);
check('plain cookie does not use prefix under HTTP', SessionManager::getCookieName() === 'xeoo_admin_session');

// Test session lockout check returns integer
if ($dbReachable) {
    $remaining = SessionManager::getRateLimitRemainingSeconds('127.0.0.1', 'test_user');
    check('session lockout remaining is integer >= 0', is_int($remaining) && $remaining >= 0);

    // Verify 5 attempts trigger lockout and isolate by IP/account
    $testIp = '192.0.2.100';
    $otherIp = '192.0.2.101';
    $testUser = 'lockout_test_' . bin2hex(random_bytes(4));

    for ($i = 0; $i < 5; $i++) {
        SessionManager::recordLoginAttempt($testIp, $testUser, false);
    }

    $lockoutIp = SessionManager::getRateLimitRemainingSeconds($testIp, '');
    check('5 failed attempts locks out IP', $lockoutIp > 0 && $lockoutIp <= 900);

    $lockoutUser = SessionManager::getRateLimitRemainingSeconds($otherIp, $testUser);
    check('5 failed attempts locks out username across IPs', $lockoutUser > 0 && $lockoutUser <= 900);

    $unrelated = SessionManager::getRateLimitRemainingSeconds($otherIp, 'unrelated_user');
    check('unrelated IP and user remains unlocked', $unrelated === 0);

    // Clean up test records
    $pdo->prepare("DELETE FROM `admin_login_attempts` WHERE `ip_address` IN (:ip1, :ip2) OR `username_attempted` = :user")
        ->execute([':ip1' => $testIp, ':ip2' => $otherIp, ':user' => $testUser]);
}

echo "Passed: {$passed}\n";
echo 'Failed: ' . count($failed) . "\n";
foreach ($failed as $name) {
    echo " - {$name}\n";
}
exit($failed === [] ? 0 : 1);

