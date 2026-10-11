<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Config\Database;

require_once __DIR__ . '/../../src/Security/RequestGuard.php';

use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\Validator;

SecurityHeaders::applyApiHeaders();

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) {
    RequestGuard::requireMethod('GET');
}

// Enforces server-side administrator session
$session = SessionManager::requireAdmin();
$pdo = Database::getConnection();

// Handle POST to resolve / unresolve error
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    RequestGuard::requireSameOrigin();
    $data = RequestGuard::readJsonObject();
    $fingerprint = (string)Validator::string($data, 'fingerprint', 1, 128, '/^[A-Za-z0-9:_.\-]+$/', true, true);
    $newStatus = (string)Validator::string($data, 'status', 1, 16, null, true, true);

    if (!in_array($newStatus, ['resolved', 'unresolved'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'code' => 'INVALID_INPUT', 'error' => 'Invalid status or fingerprint parameter']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE `operational_errors` SET `status` = :status WHERE `fingerprint` = :fp");
    $stmt->execute([':status' => $newStatus, ':fp' => $fingerprint]);

    echo json_encode(['success' => true, 'message' => "Error status updated to {$newStatus}"]);
    exit;
}

// GET list of errors with filters & pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(5, (int)($_GET['limit'] ?? 10)));
$offset = ($page - 1) * $limit;

$statusFilter = trim((string)($_GET['status'] ?? ''));
$severityFilter = trim((string)($_GET['severity'] ?? ''));

$where = [];
$params = [];

if ($statusFilter !== '' && in_array($statusFilter, ['resolved', 'unresolved'], true)) {
    $where[] = "`status` = :status";
    $params[':status'] = $statusFilter;
}

if ($severityFilter !== '' && in_array($severityFilter, ['critical', 'warning', 'info'], true)) {
    $where[] = "`severity` = :severity";
    $params[':severity'] = $severityFilter;
}

$whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM `operational_errors` {$whereSql}");
$countStmt->execute($params);
$totalItems = (int)$countStmt->fetchColumn();

$sql = "
    SELECT 
        `id`,
        `fingerprint`,
        `category`,
        `severity`,
        `message`,
        `occurrence_count`,
        `status`,
        `first_seen_at`,
        `last_seen_at`,
        `runbook`
    FROM `operational_errors`
    {$whereSql}
    ORDER BY `last_seen_at` DESC
    LIMIT {$limit} OFFSET {$offset}
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$errors = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Counts by status
$unresolvedCount = (int)$pdo->query("SELECT COUNT(*) FROM `operational_errors` WHERE `status` = 'unresolved'")->fetchColumn();
$resolvedCount = (int)$pdo->query("SELECT COUNT(*) FROM `operational_errors` WHERE `status` = 'resolved'")->fetchColumn();

echo json_encode([
    'success' => true,
    'pagination' => [
        'current_page' => $page,
        'per_page' => $limit,
        'total_items' => $totalItems,
        'total_pages' => max(1, (int)ceil($totalItems / $limit)),
    ],
    'stats' => [
        'unresolved' => $unresolvedCount,
        'resolved' => $resolvedCount,
        'total' => $unresolvedCount + $resolvedCount,
    ],
    'errors' => $errors,
]);

