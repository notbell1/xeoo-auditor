<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Security/RequestGuard.php';
require_once __DIR__ . '/../../src/Security/RateLimiter.php';
require_once __DIR__ . '/../../src/Security/ApiResponse.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Config\Database;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Security\ApiResponse;
use XeooAuditor\Security\HttpException;
use XeooAuditor\Security\RateLimiter;
use XeooAuditor\Security\RequestGuard;
use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Security\SecurityLog;
use XeooAuditor\Security\Validator;

SecurityHeaders::applyApiHeaders();
RequestGuard::requireMethod('POST');

// Defense-in-depth: Per-IP rate limiting (maximum 5 submissions per hour per IP)
$clientIp = SessionManager::getClientIp();
RateLimiter::enforce('contact_ip', $clientIp, 5, 3600, 'contact.submit');

$data = RequestGuard::readJsonObject();

// Anti-bot detection: Invisible honeypot trap
if (Validator::honeypotFilled($data, 'website_sec_trap') || Validator::honeypotFilled($data, 'honeypot')) {
    SecurityLog::record('SECURITY_BLOCKED', 'low', 'contact.submit', 'honeypot_triggered', 'rejected');
    ApiResponse::error(400, 'SECURITY_BLOCKED', 'Bad Request');
    exit;
}

// Strict boundary validation
$name = (string)Validator::string($data, 'name', 2, 100);
Validator::assertNoScript($name, 'name');
if (preg_match('/[<>"`]/', $name)) {
    throw new HttpException(400, 'INVALID_INPUT', 'Name must not contain HTML or special code characters.', ['field' => 'name']);
}

$email = (string)Validator::string($data, 'email', 5, 150);
Validator::assertNoScript($email, 'email');

// Validate email format and strictly reject newline characters (CRLF header injection prevention)
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strpbrk($email, "\r\n<>") !== false) {
    throw new HttpException(400, 'INVALID_INPUT', 'A valid email address is required.', ['field' => 'email']);
}

// Allowed category whitelist
$allowedCategories = ['general', 'bug_report', 'security_disclosure', 'feedback', 'other'];
$category = (string)Validator::string($data, 'category', 2, 50, '/^[a-z0-9_\-]+$/i', true, false) ?: 'general';
if (!in_array($category, $allowedCategories, true)) {
    $category = 'general';
}

$subject = (string)Validator::string($data, 'subject', 2, 150);
Validator::assertNoScript($subject, 'subject');
if (preg_match('/[<>]/', $subject)) {
    throw new HttpException(400, 'INVALID_INPUT', 'Subject must not contain HTML characters.', ['field' => 'subject']);
}

$message = (string)Validator::string($data, 'message', 10, 4000);
Validator::assertNoScript($message, 'message');

// Defense-in-depth sanitization before database storage
$cleanName = htmlspecialchars(strip_tags($name), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$cleanSubject = htmlspecialchars(strip_tags($subject), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$cleanMessage = htmlspecialchars(strip_tags($message), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        "INSERT INTO `contact_submissions` (`name`, `email`, `category`, `subject`, `message`, `ip_address`, `status`, `created_at`)
         VALUES (:name, :email, :category, :subject, :message, :ip, 'unread', NOW())"
    );
    $stmt->execute([
        ':name' => $cleanName,
        ':email' => strtolower($email),
        ':category' => $category,
        ':subject' => $cleanSubject,
        ':message' => $cleanMessage,
        ':ip' => $clientIp,
    ]);

    ApiResponse::ok([
        'message' => 'Your message has been received securely. Thank you for contacting XeooAuditor.',
    ]);
} catch (Throwable $e) {
    error_log('Contact submission database failure: ' . $e->getMessage());
    ApiResponse::error(500, 'INTERNAL_ERROR', 'Unable to record your message at this time. Please try again later.');
}

