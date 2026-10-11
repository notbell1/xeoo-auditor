<?php
declare(strict_types=1);

// Test sending POST to Apache directly
$ctx = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nOrigin: http://localhost:5173\r\n",
        'content' => json_encode(['id' => 3, 'status' => 'read']),
        'ignore_errors' => true,
    ],
]);

$responseApache = file_get_contents('http://127.0.0.1/PROJECT_GIT/xeoo_auditor/backend/api/admin/contact/update_status.php', false, $ctx);
echo "Direct Apache Headers: " . print_r($http_response_header, true) . PHP_EOL;
echo "Direct Apache Body: " . $responseApache . PHP_EOL;

// Now test sending POST through Vite proxy on port 5173
$responseVite = file_get_contents('http://localhost:5173/api/admin/contact/update_status.php', false, $ctx);
echo "Via Vite Headers: " . print_r($http_response_header, true) . PHP_EOL;
echo "Via Vite Body: " . $responseVite . PHP_EOL;

