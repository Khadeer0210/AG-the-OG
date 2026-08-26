<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Authentication API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';

session_start();
$body = get_json_body();
$action = $body['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $phone = trim($body['phone'] ?? '');
        $password = $body['password'] ?? '';
        $village = trim($body['village'] ?? DEFAULT_VILLAGE);

        if (!$name || !$email || !$password) {
            json_response(['error' => 'Name, email, and password are required'], 400);
        }

        $db = get_db();
        // Check existing
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            json_response(['error' => 'Email already registered'], 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (name, email, phone, password_hash, village) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$name, $email, $phone, $hash, $village]);
        $userId = $db->lastInsertId();

        $_SESSION['user_id'] = $userId;
        json_response(['success' => true, 'user' => ['id' => $userId, 'name' => $name, 'email' => $email]]);
        break;

    case 'login':
        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (!$email || !$password) {
            json_response(['error' => 'Email and password required'], 400);
        }

        $db = get_db();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            json_response(['error' => 'Invalid credentials'], 401);
        }

        $_SESSION['user_id'] = $user['id'];
        unset($user['password_hash']);
        json_response(['success' => true, 'user' => $user]);
        break;

    case 'logout':
        session_destroy();
        json_response(['success' => true]);
        break;

    case 'me':
        if (empty($_SESSION['user_id'])) {
            json_response(['error' => 'Not authenticated'], 401);
        }
        $db = get_db();
        $stmt = $db->prepare('SELECT id, name, email, phone, language, lat, lng, village, created_at FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        json_response(['user' => $user ?: null]);
        break;

    default:
        json_response(['error' => 'Invalid action. Use: register, login, logout, me'], 400);
}
