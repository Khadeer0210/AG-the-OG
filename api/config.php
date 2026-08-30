<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Configuration
// ═══════════════════════════════════════════════════════

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'agrivision');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_PORT', getenv('DB_PORT') ?: 3306);

define('OLLAMA_URL', getenv('OLLAMA_URL') ?: 'http://127.0.0.1:11434');
define('OLLAMA_MODEL', getenv('OLLAMA_MODEL') ?: 'gemma4:latest');

// AI Orchestrator configuration
define('AI_MODELS', 'gemma3:4b,gemma4:latest');  // Preference order (first available wins)
define('AI_TIMEOUT_CHAT', 20);        // seconds for chat requests
define('AI_TIMEOUT_ANALYSIS', 35);    // seconds for analysis/advisory
define('AI_TIMEOUT_VISION', 45);      // seconds for image analysis
define('AI_MAX_RETRIES', 2);          // max retry attempts on transient failure
define('AI_WARMUP_ENABLED', true);    // enable lazy model warm-up
define('AI_HEALTH_CACHE_TTL', 30);    // seconds to cache health status
define('AI_MAX_TOKENS_CHAT', 150);    // max tokens for chat responses
define('AI_MAX_TOKENS_ANALYSIS', 250); // max tokens for analysis
define('AI_MAX_TOKENS_VISION', 300);  // max tokens for vision
define('AI_TEMPERATURE', 0.5);        // model temperature
define('AI_TOP_P', 0.9);             // nucleus sampling
define('AI_HEALTH_CACHE_FILE', sys_get_temp_dir() . '/agrivision_ai_health.json');
define('AI_WARMUP_LOCK_FILE', sys_get_temp_dir() . '/agrivision_ai_warmup.lock');

define('OPEN_METEO_URL', 'https://api.open-meteo.com/v1');
define('SOILGRIDS_URL', 'https://rest.isric.org/soilgrids/v2.0');

define('DEFAULT_LAT', 12.9634);
define('DEFAULT_LNG', 79.9431);
define('DEFAULT_VILLAGE', 'Sriperumbudur');

// Insurance config (PMFBY-style)
define('INSURANCE_THRESHOLD', 20); // minimum loss% for eligibility
define('KHARIF_PREMIUM_RATE', 0.02);
define('RABI_PREMIUM_RATE', 0.015);
define('HORT_PREMIUM_RATE', 0.05);

// NDVI weights for loss model
define('WEIGHT_NDVI', 0.55);
define('WEIGHT_RAIN', 0.30);
define('WEIGHT_HEAT', 0.15);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Helper: send JSON response
function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Helper: get JSON body
function get_json_body() {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

// Helper: curl GET
function curl_get($url, $timeout = 10) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['body' => $response, 'code' => $code];
}

// Helper: curl POST JSON
function curl_post_json($url, $data, $timeout = 60) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['body' => $response, 'code' => $code];
}
