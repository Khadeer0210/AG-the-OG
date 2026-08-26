<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Farms CRUD API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();
$userId = $_SESSION['user_id'] ?? 1; // fallback for demo

switch ($method) {
    case 'GET':
        $farmId = $_GET['id'] ?? null;
        if ($farmId) {
            $stmt = $db->prepare('SELECT * FROM farms WHERE id = ? AND user_id = ?');
            $stmt->execute([$farmId, $userId]);
            json_response(['farm' => $stmt->fetch() ?: null]);
        } else {
            $stmt = $db->prepare('SELECT * FROM farms WHERE user_id = ? ORDER BY id');
            $stmt->execute([$userId]);
            json_response(['farms' => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $body = get_json_body();
        $stmt = $db->prepare('INSERT INTO farms (user_id, name, lat, lng, area_ha, soil_type, boundary_geojson) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId,
            $body['name'] ?? 'New Farm',
            $body['lat'] ?? DEFAULT_LAT,
            $body['lng'] ?? DEFAULT_LNG,
            $body['area_ha'] ?? 0,
            $body['soil_type'] ?? '',
            $body['boundary_geojson'] ?? null,
        ]);
        json_response(['success' => true, 'id' => $db->lastInsertId()], 201);
        break;

    case 'PUT':
        $body = get_json_body();
        $id = $body['id'] ?? $_GET['id'] ?? null;
        if (!$id) json_response(['error' => 'Farm ID required'], 400);

        $fields = [];
        $params = [];
        foreach (['name', 'lat', 'lng', 'area_ha', 'soil_type', 'boundary_geojson'] as $f) {
            if (isset($body[$f])) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        if (empty($fields)) json_response(['error' => 'No fields to update'], 400);

        $params[] = $id;
        $params[] = $userId;
        $db->prepare('UPDATE farms SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?')->execute($params);
        json_response(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) json_response(['error' => 'Farm ID required'], 400);
        $db->prepare('DELETE FROM farms WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
        json_response(['success' => true]);
        break;

    default:
        json_response(['error' => 'Method not allowed'], 405);
}
