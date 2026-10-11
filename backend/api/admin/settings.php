<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Config\Database;

require_once __DIR__ . '/../../src/Security/RequestGuard.php';

use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\RequestGuard;

SecurityHeaders::applyApiHeaders();

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) {
    RequestGuard::requireMethod('GET');
}

// Enforces server-side administrator session
$session = SessionManager::requireAdmin();
$pdo = Database::getConnection();

// POST: Update system execution limits or retention configuration
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    RequestGuard::requireSameOrigin();
    $data = RequestGuard::readJsonObject();

    // Allowed settings to update with safe minimum and maximum validation
    $allowedSettings = [
        'max_pages_per_audit' => ['min' => 1, 'max' => 50],
        'request_timeout_seconds' => ['min' => 2, 'max' => 30],
        'max_response_size_kb' => ['min' => 512, 'max' => 10240],
        'max_redirects' => ['min' => 1, 'max' => 5],
        'max_concurrent_audits' => ['min' => 1, 'max' => 10],
        'audit_retention_days' => ['min' => 1, 'max' => 90],
        'log_retention_days' => ['min' => 7, 'max' => 365],
        'error_retention_days' => ['min' => 7, 'max' => 365],
    ];

    $updates = [];
    foreach ($data as $key => $val) {
        if (isset($allowedSettings[$key]) && is_numeric($val)) {
            $numVal = (int)$val;
            $bounds = $allowedSettings[$key];
            if ($numVal >= $bounds['min'] && $numVal <= $bounds['max']) {
                $updates[$key] = (string)$numVal;
            }
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No valid setting values provided to save.']);
        exit;
    }

    $updateStmt = $pdo->prepare("UPDATE `system_settings` SET `setting_value` = :val WHERE `setting_key` = :key");
    foreach ($updates as $key => $val) {
        $updateStmt->execute([':val' => $val, ':key' => $key]);
    }

    // Log setting change to audit log
    $logStmt = $pdo->prepare("
        INSERT INTO `admin_audit_logs` (`admin_id`, `action`, `details`, `ip_address`, `created_at`)
        VALUES (:admin_id, 'update_settings', :details, :ip, NOW())
    ");
    $logStmt->execute([
        ':admin_id' => $session['admin_id'],
        ':details' => json_encode(['updated_keys' => array_keys($updates)]),
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'System settings updated successfully.',
        'updated_settings' => $updates,
    ]);
    exit;
}

// GET: Retrieve all system settings
$settingsStmt = $pdo->query("SELECT `setting_key`, `setting_value`, `description` FROM `system_settings`");
$settingsRows = $settingsStmt->fetchAll(PDO::FETCH_ASSOC);

$settingsMap = [];
foreach ($settingsRows as $row) {
    $settingsMap[$row['setting_key']] = [
        'value' => $row['setting_value'],
        'description' => $row['description'],
    ];
}

echo json_encode([
    'success' => true,
    'admin' => [
        'id' => $session['admin_id'],
        'username' => $session['username'],
        'role' => $session['role'],
    ],
    'settings' => $settingsMap,
    'app_info' => [
        'name' => 'XeooAuditor',
        'version' => '1.0.0-rc',
        'environment' => 'Production / Local Server',
        'php_version' => PHP_VERSION,
        'database_engine' => 'MySQL (InnoDB)',
        'server_time' => date('c'),
    ],
]);
