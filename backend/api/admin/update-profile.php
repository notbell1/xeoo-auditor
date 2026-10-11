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

// Require active administrator session
$session = SessionManager::requireAdmin();

// Throttle current-password guessing even with a valid session.
RateLimiter::enforce('profile_update', (string)$session['admin_id'], 10, 900, 'admin.update-profile');

$data = RequestGuard::readJsonObject();
$currentPassword = (string)Validator::string($data, 'current_password', 1, 128);
$newUsername = (string)Validator::string($data, 'new_username', 3, 64, '/^[a-zA-Z0-9_-]+$/', true, true);
$newPassword = Validator::string($data, 'new_password', 8, 128, null, false);

$result = SessionManager::updateProfile(
    (int)$session['admin_id'],
    $currentPassword,
    $newUsername,
    $newPassword
);

if (!($result['success'] ?? false)) {
    if (($result['status_code'] ?? 0) === 401) {
        SecurityLog::record('UNAUTHENTICATED', 'medium', 'admin.update-profile', 'current_password_mismatch', 'rejected');
    }
    $status = (int)($result['status_code'] ?? 400);
    ApiResponse::error($status, $status === 401 ? 'INVALID_CREDENTIALS' : ($status === 409 ? 'CONFLICT' : 'INVALID_INPUT'), (string)($result['error'] ?? 'Update failed.'));
    exit;
}

ApiResponse::ok(['message' => $result['message'] ?? 'Profile updated successfully.', 'user' => $result['user'] ?? null]);
