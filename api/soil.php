<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Soil API
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/engines/SoilEngine.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();
$userId = $_SESSION['user_id'] ?? 1;

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'report';
    $farmId = $_GET['farm_id'] ?? null;

    if ($action === 'fetch') {
        // Fetch from SoilGrids
        $lat = floatval($_GET['lat'] ?? DEFAULT_LAT);
        $lng = floatval($_GET['lng'] ?? DEFAULT_LNG);
        $engine = new SoilEngine($lat, $lng);
        $soil = $engine->fetchSoilGrids();
        $analysis = $engine->diagnose($soil);

        // Save to DB if farm_id provided
        if ($farmId) {
            $stmt = $db->prepare('INSERT INTO soil_reports (farm_id, ph, n, p, k, organic_c, source, diagnosis_json, prescription_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $farmId, $soil['ph'], $soil['n'], $soil['p'], $soil['k'], $soil['organic_c'],
                'soilgrids', json_encode($analysis['diagnosis']), json_encode($analysis['prescription']),
            ]);
        }

        json_response(array_merge($soil, $analysis));
    }

    if ($action === 'history' && $farmId) {
        $stmt = $db->prepare('SELECT * FROM soil_reports WHERE farm_id = ? ORDER BY created_at DESC');
        $stmt->execute([$farmId]);
        $reports = $stmt->fetchAll();
        foreach ($reports as &$r) {
            $r['diagnosis'] = json_decode($r['diagnosis_json'] ?? '[]', true);
            $r['prescription'] = json_decode($r['prescription_json'] ?? '[]', true);
        }
        json_response(['reports' => $reports]);
    }

    // Get latest report for farm
    if ($farmId) {
        $stmt = $db->prepare('SELECT * FROM soil_reports WHERE farm_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$farmId]);
        $report = $stmt->fetch();
        if ($report) {
            $report['diagnosis'] = json_decode($report['diagnosis_json'] ?? '[]', true);
            $report['prescription'] = json_decode($report['prescription_json'] ?? '[]', true);
        }
        json_response(['report' => $report ?: null]);
    }

    json_response(['error' => 'farm_id required'], 400);
}

if ($method === 'POST') {
    // Manual lab report entry
    $body = get_json_body();
    $farmId = $body['farm_id'] ?? null;
    if (!$farmId) json_response(['error' => 'farm_id required'], 400);

    $soil = [
        'ph' => floatval($body['ph'] ?? 7),
        'n' => floatval($body['n'] ?? 0),
        'p' => floatval($body['p'] ?? 0),
        'k' => floatval($body['k'] ?? 0),
        'organic_c' => floatval($body['organic_c'] ?? 0),
    ];
    $aiAnalysis = $body['ai_analysis'] ?? null;

    $engine = new SoilEngine(DEFAULT_LAT, DEFAULT_LNG);
    $analysis = $engine->diagnose($soil);

    $stmt = $db->prepare('INSERT INTO soil_reports (farm_id, ph, n, p, k, organic_c, source, diagnosis_json, prescription_json, ai_analysis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $farmId, $soil['ph'], $soil['n'], $soil['p'], $soil['k'], $soil['organic_c'],
        $body['source'] ?? 'lab', json_encode($analysis['diagnosis']), json_encode($analysis['prescription']), $aiAnalysis
    ]);

    json_response(['success' => true, 'id' => $db->lastInsertId(), 'analysis' => $analysis], 201);
}

json_response(['error' => 'Method not allowed'], 405);
