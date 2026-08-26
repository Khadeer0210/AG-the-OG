<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Alerts API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/engines/AlertEngine.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();
$userId = $_SESSION['user_id'] ?? 1;

// Cron mode: generate alerts for all users
if (isset($_GET['cron'])) {
    $engine = new AlertEngine($db);
    $count = $engine->runForAllUsers();
    json_response(['generated' => $count]);
}

switch ($method) {
    case 'GET':
        $severity = $_GET['severity'] ?? null;
        $unread = isset($_GET['unread']);

        $sql = 'SELECT * FROM alerts WHERE user_id = ?';
        $params = [$userId];
        if ($severity) { $sql .= ' AND severity = ?'; $params[] = $severity; }
        if ($unread) { $sql .= ' AND read_flag = 0'; }
        $sql .= ' ORDER BY created_at DESC LIMIT 50';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $alerts = $stmt->fetchAll();

        $countStmt = $db->prepare('SELECT COUNT(*) as cnt FROM alerts WHERE user_id = ? AND read_flag = 0');
        $countStmt->execute([$userId]);
        $unreadCount = $countStmt->fetch()['cnt'];

        json_response(['alerts' => $alerts, 'unread_count' => $unreadCount]);
        break;

    case 'PUT':
        $body = get_json_body();
        $id = $body['id'] ?? $_GET['id'] ?? null;
        $action = $body['action'] ?? 'read';

        if ($action === 'read' && $id) {
            $db->prepare('UPDATE alerts SET read_flag = 1 WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
        } elseif ($action === 'read_all') {
            $db->prepare('UPDATE alerts SET read_flag = 1 WHERE user_id = ?')->execute([$userId]);
        }
        json_response(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $db->prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
        }
        json_response(['success' => true]);
        break;

    case 'POST':
        // Generate alerts for current user based on weather
        $engine = new AlertEngine($db);
        $generated = $engine->generateForUser($userId);
        json_response(['success' => true, 'generated' => $generated]);
        break;

    default:
        json_response(['error' => 'Method not allowed'], 405);
}
