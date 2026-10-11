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
$pdo = Database::getConnection();

// Pagination parameters
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(5, (int)($_GET['limit'] ?? 10)));
$offset = ($page - 1) * $limit;

// Total event count from audit logs
$totalCount = (int)$pdo->query("SELECT COUNT(*) FROM `admin_audit_logs`")->fetchColumn();

// Fetch paginated events
$stmt = $pdo->prepare("
    SELECT 
        l.`id`,
        l.`action` as event_category,
        CASE 
            WHEN l.`action` LIKE '%fail%' THEN 'warning'
            WHEN l.`action` LIKE '%revoke%' THEN 'info'
            ELSE 'normal'
        END as severity,
        l.`details` as summary,
        l.`created_at` as timestamp,
        SHA2(CONCAT(l.`id`, l.`created_at`), 256) as correlation_id
    FROM `admin_audit_logs` l
    ORDER BY l.`created_at` DESC
    LIMIT :limit OFFSET :offset
");
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

$events = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Format and sanitize output (truncate correlation_id to 12 chars for display)
$sanitizedEvents = array_map(function ($event) {
    return [
        'id' => (int)$event['id'],
        'category' => $event['event_category'],
        'severity' => $event['severity'],
        'summary' => $event['summary'] ?: 'Operational activity recorded',
        'timestamp' => $event['timestamp'],
        'correlation_id' => substr((string)$event['correlation_id'], 0, 12),
    ];
}, $events);

// Summary counts
$total24h = (int)$pdo->query("
    SELECT COUNT(*) FROM `admin_audit_logs` 
    WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
")->fetchColumn();

echo json_encode([
    'success' => true,
    'pagination' => [
        'current_page' => $page,
        'per_page' => $limit,
        'total_items' => $totalCount,
        'total_pages' => max(1, (int)ceil($totalCount / $limit)),
    ],
    'events_24h_count' => $total24h,
    'events' => $sanitizedEvents,
]);

