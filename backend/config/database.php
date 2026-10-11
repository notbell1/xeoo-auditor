<?php
declare(strict_types=1);

namespace XeooAuditor\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $localConfig = [];
        if (file_exists(__DIR__ . '/config.local.php')) {
            $loaded = require __DIR__ . '/config.local.php';
            if (is_array($loaded)) {
                $localConfig = $loaded;
            }
        }

        $env = strtolower((string)($localConfig['APP_ENV'] ?? getenv('APP_ENV') ?: 'development'));

        if ($env === 'production') {
            $host = $localConfig['DB_HOST'] ?? getenv('DB_HOST');
            $dbname = $localConfig['DB_DATABASE'] ?? getenv('DB_DATABASE');
            $username = $localConfig['DB_USERNAME'] ?? getenv('DB_USERNAME');
            $password = $localConfig['DB_PASSWORD'] ?? getenv('DB_PASSWORD');

            if (!$host || !$dbname || !$username || $password === false || $password === null) {
                error_log('Critical configuration failure: Database credentials missing in production environment.');
                throw new PDOException('Database configuration missing or incomplete.');
            }
            $port = (int)($localConfig['DB_PORT'] ?? getenv('DB_PORT') ?: 3306);
        } else {
            $host = $localConfig['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
            $port = (int)($localConfig['DB_PORT'] ?? getenv('DB_PORT') ?: 3306);
            $dbname = $localConfig['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: 'xeoo_auditor_db';
            $username = $localConfig['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: 'root';
            $password = $localConfig['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';
        }

        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";

        try {
            self::$instance = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            self::$instance->exec("SET time_zone = '+00:00'");

            return self::$instance;
        } catch (PDOException $e) {
            error_log('Database connection error: ' . $e->getMessage());
            throw new PDOException('Database connection failed. Please check configuration.');
        }
    }
}
