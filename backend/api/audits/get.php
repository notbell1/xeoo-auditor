<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Security/RequestGuard.php';
require_once __DIR__ . '/../../src/Security/RateLimiter.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';
require_once __DIR__ . '/../../src/Audit/AuditEngine.php';

use XeooAuditor\Audit\AuditEngine;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\HttpException;
use XeooAuditor\Security\RateLimiter;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;

SecurityHeaders::applyApiHeaders();
RequestGuard::requireMethod('GET');
RateLimiter::enforce('audit_read', SessionManager::getClientIp(), 120, 60, 'audits.get');

$id = $_GET['id'] ?? '';
// Legacy IDs: audit-<unix>-<8 hex>; current IDs: audit-<unix>-<32 hex>.
if (!is_string($id) || preg_match('/^audit-\d{9,12}-[a-f0-9]{8,32}$/', $id) !== 1) {
    throw new HttpException(400, 'INVALID_INPUT', 'A valid audit ID is required.', ['field' => 'id']);
}

$record = AuditEngine::getAuditById($id);
if (!$record) {
    ApiResponse::error(404, 'RESOURCE_NOT_FOUND', 'Audit record not found.');
    exit;
}

ApiResponse::ok(['record' => $record]);
