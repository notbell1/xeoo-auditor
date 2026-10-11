<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../../src/Security/RequestGuard.php';
require_once __DIR__ . '/../../../src/Security/ApiResponse.php';
require_once __DIR__ . '/../../../src/Auth/SessionManager.php';

use XeooAuditor\Config\Database;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;

SecurityHeaders::applyApiHeaders();
RequestGuard::requireMethod('GET');

// Enforce authenticated administrator session
$session = SessionManager::requireAdmin();

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = max(1, min(50, (int)($_GET['per_page'] ?? 10)));
$offset = ($page - 1) * $perPage;

$statusFilter = strtolower(trim((string)($_GET['status'] ?? 'all')));
$allowedStatuses = ['unread', 'read', 'resolved', 'archived'];

$search = trim((string)($_GET['search'] ?? ''));
if (strlen($search) > 100) {
    $search = substr($search, 0, 100);
}

$pdo = Database::getConnection();

// Build parameterized query safely
$whereClauses = [];
$params = [];

if (in_array($statusFilter, $allowedStatuses, true)) {
    $whereClauses[] = "`status` = :status";
    $params[':status'] = $statusFilter;
}

if ($search !== '') {
    $whereClauses[] = "(`name` LIKE :search_name OR `email` LIKE :search_email OR `subject` LIKE :search_subject)";
    $likeVal = '%' . $search . '%';
    $params[':search_name'] = $likeVal;
    $params[':search_email'] = $likeVal;
    $params[':search_subject'] = $likeVal;
}

$whereSql = $whereClauses !== [] ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

// Count total matching items
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM `contact_submissions` {$whereSql}");
$countStmt->execute($params);
$totalItems = (int)$countStmt->fetchColumn();

$totalPages = max(1, (int)ceil($totalItems / $perPage));

// Fetch items
$selectSql = "SELECT `id`, `name`, `email`, `category`, `subject`, `message`, `ip_address`, `status`, `admin_notes`, `created_at`
              FROM `contact_submissions`
              {$whereSql}
              ORDER BY `id` DESC
              LIMIT :limit OFFSET :offset";

$itemsStmt = $pdo->prepare($selectSql);
foreach ($params as $key => $val) {
    $itemsStmt->bindValue($key, $val);
}
$itemsStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$itemsStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$itemsStmt->execute();
$items = $itemsStmt->fetchAll();

// Count unread total
$unreadCount = (int)$pdo->query("SELECT COUNT(*) FROM `contact_submissions` WHERE `status` = 'unread'")->fetchColumn();

ApiResponse::ok([
    'items' => $items,
    'pagination' => [
        'current_page' => $page,
        'per_page' => $perPage,
        'total_items' => $totalItems,
        'total_pages' => $totalPages,
    ],
    'unread_count' => $unreadCount,
    'data' => [
        'items' => $items,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $perPage,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
        ],
        'unread_count' => $unreadCount,
    ],
]);

