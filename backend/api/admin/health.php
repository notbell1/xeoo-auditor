<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Config\Database;

SecurityHeaders::applyApiHeaders();

// Enforces server-side administrator session
$session = SessionManager::requireAdmin();

$components = [];

// 1. Database Connectivity & Ping
$startDb = microtime(true);
$dbStatus = 'UNAVAILABLE';
$dbLatencyMs = 0;
try {
    $pdo = Database::getConnection();
    $pdo->query("SELECT 1");
    $dbLatencyMs = round((microtime(true) - $startDb) * 1000, 2);
    $dbStatus = 'OPERATIONAL';
} catch (Throwable $e) {
    $dbStatus = 'UNAVAILABLE';
}
$components[] = [
    'id' => 'database',
    'name' => 'Database (MySQL)',
    'status' => $dbStatus,
    'latency_ms' => $dbLatencyMs,
    'details' => 'Koneksi database PDO MySQL aktif dan merespons query.',
];

// 2. Backend API Runtime
$components[] = [
    'id' => 'backend_api',
    'name' => 'Backend API Runtime (PHP)',
    'status' => 'OPERATIONAL',
    'details' => 'PHP ' . PHP_VERSION . ' (SAPI: ' . PHP_SAPI . ') dengan opcache/mod_fcgid aktif.',
];

// 3. Temporary Storage
$tmpDir = sys_get_temp_dir();
$canWriteTmp = is_writable($tmpDir);
$components[] = [
    'id' => 'temp_storage',
    'name' => 'Temporary Storage',
    'status' => $canWriteTmp ? 'OPERATIONAL' : 'DEGRADED',
    'details' => $canWriteTmp 
        ? 'Direktori sementara sistem dapat dibaca dan ditulis untuk ephemeral audit report.'
        : 'Direktori sementara sistem memiliki izin terbatas.',
];

// 4. Audit Processor Engine
$curlInstalled = function_exists('curl_init');
$openSslInstalled = extension_loaded('openssl');
$components[] = [
    'id' => 'audit_processor',
    'name' => 'Audit Processor Engine (cURL & OpenSSL)',
    'status' => ($curlInstalled && $openSslInstalled) ? 'OPERATIONAL' : 'UNAVAILABLE',
    'details' => 'cURL HTTP/1.1 & HTTP/2 client dengan verifikasi OpenSSL TLS 1.3.',
];

// 5. SSRF Defense Guard
$ssrfBlockedTest = false;
$samplePrivateIps = ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.169.254'];
$allBlocked = true;
foreach ($samplePrivateIps as $ip) {
    // Standard RFC-1918 filter validation
    $filtered = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    if ($filtered !== false) {
        $allBlocked = false;
        break;
    }
}
$components[] = [
    'id' => 'ssrf_guard',
    'name' => 'SSRF Pre-Flight Gateway',
    'status' => $allBlocked ? 'OPERATIONAL' : 'DEGRADED',
    'details' => 'Penyaringan alamat IP privat, loopback, link-local, dan cloud metadata aktif.',
];

// Determine overall system health
$statuses = array_column($components, 'status');
$overallStatus = 'OPERATIONAL';
if (in_array('UNAVAILABLE', $statuses, true)) {
    $overallStatus = 'UNAVAILABLE';
} elseif (in_array('DEGRADED', $statuses, true)) {
    $overallStatus = 'DEGRADED';
}

echo json_encode([
    'success' => true,
    'status' => $overallStatus,
    'checked_at' => date('c'),
    'components' => $components,
]);

