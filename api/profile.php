<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Profile API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();
$userId = $_SESSION['user_id'] ?? 1;

switch ($method) {
    case 'GET':
        $stmt = $db->prepare('SELECT id, name, email, phone, language, lat, lng, village, created_at FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        // Stats
        $farmCount = $db->prepare('SELECT COUNT(*) as cnt FROM farms WHERE user_id = ?');
        $farmCount->execute([$userId]);
        $cropCount = $db->prepare('SELECT COUNT(*) as cnt FROM crops c JOIN farms f ON c.farm_id = f.id WHERE f.user_id = ?');
        $cropCount->execute([$userId]);
        $alertCount = $db->prepare('SELECT COUNT(*) as cnt FROM alerts WHERE user_id = ? AND read_flag = 0');
        $alertCount->execute([$userId]);
        $assessCount = $db->prepare('SELECT COUNT(*) as cnt FROM insurance_assessments ia JOIN crops c ON ia.crop_id = c.id JOIN farms f ON c.farm_id = f.id WHERE f.user_id = ?');
        $assessCount->execute([$userId]);

        json_response([
            'user' => $user,
            'stats' => [
                'farms' => $farmCount->fetch()['cnt'],
                'crops' => $cropCount->fetch()['cnt'],
                'unread_alerts' => $alertCount->fetch()['cnt'],
                'assessments' => $assessCount->fetch()['cnt'],
            ],
        ]);
        break;

    case 'PUT':
        $body = get_json_body();
        $fields = [];
        $params = [];
        $allowed = ['name', 'phone', 'village', 'lat', 'lng', 'language'];

        foreach ($allowed as $f) {
            if (isset($body[$f])) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }

        if (!empty($fields)) {
            $params[] = $userId;
            $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }

        // Password change
        if (!empty($body['new_password']) && !empty($body['current_password'])) {
            $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if ($user && password_verify($body['current_password'], $user['password_hash'])) {
                $newHash = password_hash($body['new_password'], PASSWORD_DEFAULT);
                $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$newHash, $userId]);
                json_response(['success' => true, 'message' => 'Profile and password updated']);
            } else {
                json_response(['error' => 'Current password is incorrect'], 400);
            }
        }

        json_response(['success' => true]);
        break;

    default:
        json_response(['error' => 'Method not allowed'], 405);
}
