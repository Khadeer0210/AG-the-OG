<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Crops CRUD API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();
$userId = $_SESSION['user_id'] ?? 1;

switch ($method) {
    case 'GET':
        $farmId = $_GET['farm_id'] ?? null;
        $cropId = $_GET['id'] ?? null;

        if ($cropId) {
            $stmt = $db->prepare('SELECT c.* FROM crops c JOIN farms f ON c.farm_id = f.id WHERE c.id = ? AND f.user_id = ?');
            $stmt->execute([$cropId, $userId]);
            $crop = $stmt->fetch();
            if ($crop) {
                $crop['total_cost'] = floatval($crop['cost_seed']) + floatval($crop['cost_fert']) + floatval($crop['cost_pest']) + floatval($crop['cost_labor']) + floatval($crop['cost_irrigation']);
            }
            json_response(['crop' => $crop ?: null]);
        } else {
            $sql = 'SELECT c.*, f.name as farm_name FROM crops c JOIN farms f ON c.farm_id = f.id WHERE f.user_id = ?';
            $params = [$userId];
            if ($farmId) { $sql .= ' AND c.farm_id = ?'; $params[] = $farmId; }
            $sql .= ' ORDER BY c.plant_date DESC';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $crops = $stmt->fetchAll();
            foreach ($crops as &$c) {
                $c['total_cost'] = floatval($c['cost_seed']) + floatval($c['cost_fert']) + floatval($c['cost_pest']) + floatval($c['cost_labor']) + floatval($c['cost_irrigation']);
                // Calculate growth progress
                if ($c['plant_date'] && $c['harvest_date']) {
                    $planted = strtotime($c['plant_date']);
                    $harvest = strtotime($c['harvest_date']);
                    $now = time();
                    $total = max($harvest - $planted, 1);
                    $elapsed = $now - $planted;
                    $c['progress'] = max(0, min(100, round(($elapsed / $total) * 100)));
                } else {
                    $c['progress'] = 0;
                }
            }
            json_response(['crops' => $crops]);
        }
        break;

    case 'POST':
        $body = get_json_body();
        $farmId = $body['farm_id'] ?? null;
        if (!$farmId) json_response(['error' => 'farm_id required'], 400);

        // Verify farm ownership
        $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
        $stmt->execute([$farmId, $userId]);
        if (!$stmt->fetch()) json_response(['error' => 'Farm not found'], 404);

        $stmt = $db->prepare('INSERT INTO crops (farm_id, crop, variety, plant_date, harvest_date, stage, status, area_ha, expected_yield, cost_seed, cost_fert, cost_pest, cost_labor, cost_irrigation, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $farmId, $body['crop'] ?? '', $body['variety'] ?? '',
            $body['plant_date'] ?? null, $body['harvest_date'] ?? null,
            $body['stage'] ?? 'Sowing', $body['status'] ?? 'healthy',
            $body['area_ha'] ?? 0, $body['expected_yield'] ?? '',
            $body['cost_seed'] ?? 0, $body['cost_fert'] ?? 0,
            $body['cost_pest'] ?? 0, $body['cost_labor'] ?? 0,
            $body['cost_irrigation'] ?? 0, $body['notes'] ?? '',
        ]);
        json_response(['success' => true, 'id' => $db->lastInsertId()], 201);
        break;

    case 'PUT':
        $body = get_json_body();
        $id = $body['id'] ?? $_GET['id'] ?? null;
        if (!$id) json_response(['error' => 'Crop ID required'], 400);

        $fields = [];
        $params = [];
        $allowed = ['crop', 'variety', 'plant_date', 'harvest_date', 'stage', 'status', 'area_ha', 'expected_yield', 'cost_seed', 'cost_fert', 'cost_pest', 'cost_labor', 'cost_irrigation', 'notes'];
        foreach ($allowed as $f) {
            if (isset($body[$f])) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        if (empty($fields)) json_response(['error' => 'No fields to update'], 400);

        $params[] = $id;
        $db->prepare('UPDATE crops SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        json_response(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) json_response(['error' => 'Crop ID required'], 400);
        $db->prepare('DELETE FROM crops WHERE id = ? AND farm_id IN (SELECT id FROM farms WHERE user_id = ?)')->execute([$id, $userId]);
        json_response(['success' => true]);
        break;

    default:
        json_response(['error' => 'Method not allowed'], 405);
}
