<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Health Endpoint
// GET /api/health.php — system-wide health status
// GET /api/health.php?component=ai — AI-only status
// GET /api/health.php?refresh=1 — force cache refresh
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/engines/AIOrchestrator.php';

$component = $_GET['component'] ?? 'all';
$forceRefresh = ($_GET['refresh'] ?? '0') === '1';

$health = [
    'status' => 'ok',
    'timestamp' => date('c'),
    'uptime' => true,
];

// ── AI Health ──
$ai = AIOrchestrator::getInstance();
$aiHealth = $ai->getHealth($forceRefresh);

$health['ai'] = [
    'status' => $aiHealth['status'],
    'model' => $aiHealth['model_name'],
    'ollama_reachable' => $aiHealth['ollama_reachable'],
    'model_available' => $aiHealth['model_available'],
    'warm' => $aiHealth['warm'] ?? false,
    'last_error' => $aiHealth['last_error'] ?? '',
    'checked_at' => $aiHealth['checked_at_iso'] ?? date('c'),
];

// ── Database Health ──
if ($component === 'all') {
    try {
        $db = get_db();
        $health['database'] = [
            'status' => $db ? 'connected' : 'unavailable',
        ];
    } catch (Exception $e) {
        $health['database'] = ['status' => 'error'];
    }

    // ── Weather API Health (lightweight check via cache) ──
    $health['weather_api'] = ['status' => 'assumed_reachable'];
}

// Overall status based on components
if ($aiHealth['status'] !== 'READY') {
    $health['status'] = ($aiHealth['status'] === 'OLLAMA_UNAVAILABLE' || $aiHealth['status'] === 'MODEL_UNAVAILABLE')
        ? 'degraded' : 'partial';
}

// If only AI component requested
if ($component === 'ai') {
    json_response($health['ai']);
} else {
    json_response($health);
}
