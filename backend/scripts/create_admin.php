<?php
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Forbidden: CLI access only.\n";
    exit(1);
}

require_once __DIR__ . '/../config/database.php';

use XeooAuditor\Config\Database;

$username = $argv[1] ?? null;
$password = $argv[2] ?? null;

if (!$username || !$password) {
    echo "Usage: php create_admin.php <username> <password>\n";
    echo "Example: php create_admin.php mimin SecretPassword123!\n";
    exit(1);
}

// Validation
if (strlen($username) < 3 || strlen($username) > 64 || !preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
    echo "Error: Username must be 3-64 characters alphanumeric, underscore or hyphen.\n";
    exit(1);
}

if (strlen($password) < 8 || strlen($password) > 128) {
    echo "Error: Password must be between 8 and 128 characters.\n";
    exit(1);
}

try {
    $pdo = Database::getConnection();

    // Use Argon2id if available, otherwise bcrypt with cost 12
    $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    $options = $algo === PASSWORD_BCRYPT ? ['cost' => 12] : [];

    $hash = password_hash($password, $algo, $options);

    $stmt = $pdo->prepare(
        "INSERT INTO `users` (`username`, `password_hash`, `role`, `is_active`)
         VALUES (:username, :hash, 'admin', 1)
         ON DUPLICATE KEY UPDATE `password_hash` = :update_hash, `is_active` = 1, `updated_at` = NOW()"
    );

    $stmt->execute([
        ':username' => $username,
        ':hash' => $hash,
        ':update_hash' => $hash,
    ]);

    echo "SUCCESS: Administrator account '{$username}' provisioned successfully.\n";
} catch (Throwable $e) {
    echo "Error provisioning administrator: " . $e->getMessage() . "\n";
    exit(1);
}