<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Security/RequestGuard.php';
require_once __DIR__ . '/../../src/Security/RateLimiter.php';
require_once __DIR__ . '/../../src/Security/UrlGuard.php';
require_once __DIR__ . '/../../src/Audit/AuditEngine.php';

use XeooAuditor\Audit\AuditEngine;
use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\RateLimiter;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Security\SecurityLog;
use XeooAuditor\Security\UrlGuard;
use XeooAuditor\Security\Validator;
use XeooAuditor\Auth\SessionManager;

require_once __DIR__ . '/../../src/Auth/SessionManager.php';

SecurityHeaders::applyApiHeaders();
RequestGuard::requireMethod('POST');
RequestGuard::requireSameOrigin();

// Throttle per client (salted hash of the IP) before doing any outbound work.
$clientKey = SessionManager::getClientIp();
RateLimiter::enforce('audit_min', $clientKey, 6, 60, 'audits.create');
RateLimiter::enforce('audit_hour', $clientKey, 60, 3600, 'audits.create');

$data = RequestGuard::readJsonObject();
$targetUrl = Validator::string($data, 'url', 4, UrlGuard::MAX_URL_LENGTH, null, true, true);

$result = AuditEngine::runAudit((string)$targetUrl);

if (!$result['success']) {
    SecurityLog::record('SECURITY_BLOCKED', 'low', 'audits.create', 'target_rejected', 'rejected');
    ApiResponse::error(400, 'INVALID_TARGET', $result['error'] ?? 'Audit evaluation failed.');
    exit;
}

ApiResponse::ok([
    'auditId' => $result['auditId'],
    'record' => $result['record'],
]);
