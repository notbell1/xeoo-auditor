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
use XeooAuditor\Security\Validator;

SecurityHeaders::applyApiHeaders();

// Enforce authenticated administrator session
$session = SessionManager::requireAdmin();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? '');
if (!in_array($method, ['POST', 'GET'], true)) {
    if (!headers_sent()) {
        header('Allow: POST, GET, OPTIONS');
    }
    ApiResponse::error(405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
    exit;
}

$pdo = Database::getConnection();

if ($method === 'POST') {
    RequestGuard::requireSameOrigin();
    $data = RequestGuard::readJsonObject();
    $id = (int)Validator::int($data, 'id', 1, 2147483647);
    $status = (string)Validator::string($data, 'status', 2, 20);
    $adminNotes = isset($data['admin_notes']) && is_string($data['admin_notes'])
        ? substr(trim($data['admin_notes']), 0, 1000)
        : null;
} else {
    // GET handling: safe query-param inspection or detail retrieval
    $idRaw = $_GET['id'] ?? null;
    if ($idRaw === null || !ctype_digit((string)$idRaw)) {
        ApiResponse::ok([
            'message' => 'Contact update endpoint active.',
            'supported_methods' => ['POST', 'GET'],
            'allowed_statuses' => ['unread', 'read', 'resolved', 'archived'],
        ]);
        exit;
    }
    $id = (int)$idRaw;
    $statusRaw = $_GET['status'] ?? null;
    $adminNotes = isset($_GET['admin_notes']) && is_string($_GET['admin_notes'])
        ? substr(trim($_GET['admin_notes']), 0, 1000)
        : null;

    if ($statusRaw === null) {
        // Retrieve single submission detail via GET
        $stmt = $pdo->prepare("SELECT * FROM `contact_submissions` WHERE `id` = :id");
        $stmt->execute([':id' => $id]);
        $submission = $stmt->fetch();
        if (!$submission) {
            ApiResponse::error(404, 'NOT_FOUND', 'Contact submission not found.');
            exit;
        }
        ApiResponse::ok($submission);
        exit;
    }
    $status = (string)$statusRaw;
}

$allowedStatuses = ['unread', 'read', 'resolved', 'archived'];
if (!in_array($status, $allowedStatuses, true)) {
    ApiResponse::error(400, 'INVALID_INPUT', 'Invalid submission status.');
    exit;
}

if ($adminNotes !== null) {
    $stmt = $pdo->prepare(
        "UPDATE `contact_submissions`
         SET `status` = :status, `admin_notes` = :notes
         WHERE `id` = :id"
    );
    $stmt->execute([
        ':status' => $status,
        ':notes' => $adminNotes,
        ':id' => $id,
    ]);
} else {
    $stmt = $pdo->prepare(
        "UPDATE `contact_submissions`
         SET `status` = :status
         WHERE `id` = :id"
    );
    $stmt->execute([
        ':status' => $status,
        ':id' => $id,
    ]);
}

if ($stmt->rowCount() === 0) {
    // Check if item exists
    $exists = $pdo->prepare("SELECT `id` FROM `contact_submissions` WHERE `id` = :id");
    $exists->execute([':id' => $id]);
    if (!$exists->fetch()) {
        ApiResponse::error(404, 'NOT_FOUND', 'Contact submission not found.');
        exit;
    }
}

// Log admin action to audit logs safely
SessionManager::logAction(
    (int)$session['admin_id'],
    'update_contact_status',
    json_encode(['submission_id' => $id, 'new_status' => $status])
);

ApiResponse::ok([
    'message' => 'Status updated successfully.',
    'id' => $id,
    'status' => $status,
    'data' => [
        'message' => 'Status updated successfully.',
        'id' => $id,
        'status' => $status,
    ],
]);


