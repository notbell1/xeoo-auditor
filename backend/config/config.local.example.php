<?php
declare(strict_types=1);

/**
 * XeooAuditor — Local / Shared Hosting Configuration Template
 * 
 * Instructions:
 * 1. For production deployment on Wuaze / InfinityFree, copy this file as:
 *    backend/config/config.local.php
 * 2. Fill in your actual database credentials from your hosting cPanel.
 * 3. Never commit config.local.php to git (it is ignored by .gitignore).
 */

return [
    'APP_ENV' => 'production',
    'DB_HOST' => 'sqlxxx.infinityfree.com',
    'DB_DATABASE' => 'if0_xxxxxx_xeoo_auditor_db',
    'DB_USERNAME' => 'if0_xxxxxx',
    'DB_PASSWORD' => 'your_hosting_mysql_password',
    'DB_PORT' => 3306,
];

