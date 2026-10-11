<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Auth\SessionManager;

SecurityHeaders::applyApiHeaders();

// Only allow GET requests for session verification
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['authenticated' => false, 'error' => 'Method Not Allowed']);
    exit;
}

$rawToken = SessionManager::getTokenFromCookie();
$session = SessionManager::validateSession($rawToken);

if (!$session) {
    $ip = SessionManager::getClientIp();
    $lockoutSeconds = SessionManager::getRateLimitRemainingSeconds($ip, '');

    http_response_code(200);
    echo json_encode([
        'authenticated' => false,
        'rate_limited' => $lockoutSeconds > 0,
        'lockout_remaining_seconds' => $lockoutSeconds,
    ]);
    exit;
}

http_response_code(200);
echo json_encode([
    'authenticated' => true,
    'user' => [
        'id' => $session['admin_id'] ?? null,
        'username' => $session['username'] ?? null,
        'role' => $session['role'] ?? null,
    ],
]);