<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Insurance API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/engines/InsuranceEngine.php';
require_once __DIR__ . '/engines/NDVIEngine.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();
$userId = $_SESSION['user_id'] ?? 1;
$action = $_GET['action'] ?? $method;

switch ($action) {
    case 'GET':
    case 'policies':
        $cropId = $_GET['crop_id'] ?? null;
        if ($cropId) {
            $stmt = $db->prepare('SELECT ip.* FROM insurance_policies ip JOIN crops c ON ip.crop_id = c.id JOIN farms f ON c.farm_id = f.id WHERE ip.crop_id = ? AND f.user_id = ?');
            $stmt->execute([$cropId, $userId]);
        } else {
            $stmt = $db->prepare('SELECT ip.*, c.crop, c.variety, f.name as farm_name FROM insurance_policies ip JOIN crops c ON ip.crop_id = c.id JOIN farms f ON c.farm_id = f.id WHERE f.user_id = ?');
            $stmt->execute([$userId]);
        }
        json_response(['policies' => $stmt->fetchAll()]);
        break;

    case 'assess':
    case 'POST':
        $body = get_json_body();
        $cropId = $body['crop_id'] ?? $_GET['crop_id'] ?? null;
        if (!$cropId) json_response(['error' => 'crop_id required'], 400);

        // Get crop + farm data
        $stmt = $db->prepare('SELECT c.*, f.lat, f.lng, f.soil_type FROM crops c JOIN farms f ON c.farm_id = f.id WHERE c.id = ? AND f.user_id = ?');
        $stmt->execute([$cropId, $userId]);
        $crop = $stmt->fetch();
        if (!$crop) json_response(['error' => 'Crop not found'], 404);

        // Get policy
        $stmt = $db->prepare('SELECT * FROM insurance_policies WHERE crop_id = ? LIMIT 1');
        $stmt->execute([$cropId]);
        $policy = $stmt->fetch();

        // Run NDVI engine
        $ndviEngine = new NDVIEngine($crop['farm_id'], $crop);
        $ndvi = $ndviEngine->getCurrentNDVI();

        // Run Insurance engine
        $insuranceEngine = new InsuranceEngine();
        $assessment = $insuranceEngine->assess($crop, $ndvi, $policy);

        // Save assessment
        $hash = hash('sha256', json_encode($assessment) . time());
        $stmt = $db->prepare('INSERT INTO insurance_assessments (crop_id, ndvi_now, ndvi_base, loss_pct, eligible, payout, evidence_json, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $cropId, $assessment['ndvi_now'], $assessment['ndvi_base'],
            $assessment['loss_pct'], $assessment['eligible'] ? 1 : 0,
            $assessment['payout'], json_encode($assessment), $hash,
        ]);

        $assessment['id'] = $db->lastInsertId();
        $assessment['hash'] = $hash;
        json_response($assessment);
        break;

    case 'assessments':
        $cropId = $_GET['crop_id'] ?? null;
        $sql = 'SELECT ia.* FROM insurance_assessments ia JOIN crops c ON ia.crop_id = c.id JOIN farms f ON c.farm_id = f.id WHERE f.user_id = ?';
        $params = [$userId];
        if ($cropId) { $sql .= ' AND ia.crop_id = ?'; $params[] = $cropId; }
        $sql .= ' ORDER BY ia.created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        json_response(['assessments' => $stmt->fetchAll()]);
        break;

    default:
        json_response(['error' => 'Invalid action. Use: policies, assess, assessments'], 400);
}
