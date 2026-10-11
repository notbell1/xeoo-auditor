<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Security/RequestGuard.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;

SecurityHeaders::applyApiHeaders();
RequestGuard::requireMethod('POST');
RequestGuard::requireSameOrigin();

$rawToken = SessionManager::getTokenFromCookie();
if ($rawToken) {
    SessionManager::revokeSession($rawToken, 'user_logout');
}

SessionManager::clearSessionCookie();

ApiResponse::ok(['message' => 'Logged out successfully']);
