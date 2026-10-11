<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Security/RequestGuard.php';
require_once __DIR__ . '/../../src/Security/RateLimiter.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\RateLimiter;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Security\SecurityLog;
use XeooAuditor\Security\Validator;

SecurityHeaders::applyApiHeaders();
RequestGuard::requireMethod('POST');
RequestGuard::requireSameOrigin();

// Per-IP throttle on top of the per-account failure lockout in SessionManager.
RateLimiter::enforce('login_ip', SessionManager::getClientIp(), 30, 900, 'auth.login');

$data = RequestGuard::readJsonObject();

// Anti-bot honeypot: a filled field is concrete evidence of automated form-filling.
if (Validator::honeypotFilled($data, 'honeypot')) {
    SecurityLog::record('SECURITY_BLOCKED', 'low', 'auth.login', 'honeypot_filled', 'rejected');
    ApiResponse::error(400, 'SECURITY_BLOCKED', 'Bad Request');
    exit;
}

$username = (string)Validator::string($data, 'username', 1, 64);
$password = (string)Validator::string($data, 'password', 1, 128);

$result = SessionManager::login($username, $password);

if ($result['success'] ?? false) {
    SessionManager::sendSessionCookie($result['raw_token']);
    ApiResponse::ok(['user' => $result['user'] ?? null]);
    exit;
}

SessionManager::clearSessionCookie();
$status = (int)($result['status_code'] ?? 401);
$message = $result['error'] ?? 'Authentication failed';

if ($status === 429) {
    SecurityLog::record('RATE_LIMITED', 'medium', 'auth.login', 'login_lockout', 'throttled');
    $retryAfter = (int)($result['retry_after'] ?? 900);
    ApiResponse::error(429, 'RATE_LIMITED', $message, ['retry_after' => $retryAfter]);
} elseif ($status === 401) {
    SecurityLog::record('UNAUTHENTICATED', 'low', 'auth.login', 'invalid_credentials', 'rejected');
    ApiResponse::error(401, 'INVALID_CREDENTIALS', $message);
} else {
    ApiResponse::error($status, 'INTERNAL_ERROR', $message);
}
