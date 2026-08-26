<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Weather API (Open-Meteo, free, no key)
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/engines/WeatherEngine.php';

$action = $_GET['action'] ?? 'current';
$lat = floatval($_GET['lat'] ?? DEFAULT_LAT);
$lng = floatval($_GET['lng'] ?? DEFAULT_LNG);

$engine = new WeatherEngine($lat, $lng);

switch ($action) {
    case 'current':
        json_response($engine->getCurrent());
        break;
    case 'hourly':
        json_response($engine->getHourly());
        break;
    case 'daily':
        $days = intval($_GET['days'] ?? 7);
        json_response($engine->getDaily($days));
        break;
    case 'archive':
        $startDate = $_GET['start'] ?? date('Y-m-d', strtotime('-120 days'));
        $endDate = $_GET['end'] ?? date('Y-m-d');
        json_response($engine->getArchive($startDate, $endDate));
        break;
    case 'climate':
        json_response($engine->getClimateAnalysis());
        break;
    default:
        json_response(['error' => 'Invalid action. Use: current, hourly, daily, archive, climate'], 400);
}
