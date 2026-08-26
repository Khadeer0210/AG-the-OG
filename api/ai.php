<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — AI API Router (Thin Proxy → Orchestrator)
// Actions: chat | vision | bulletin | suit | explain | health
// All AI calls are delegated to the central AIOrchestrator.
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/engines/AIOrchestrator.php';

$body = get_json_body();
$action = $body['action'] ?? '';
$language = $body['language'] ?? 'en';
$context = $body['context'] ?? [];

// Get the orchestrator singleton
$ai = AIOrchestrator::getInstance();

switch ($action) {

    // ── Chat ──────────────────────────────────────────
    case 'chat':
        $message = trim($body['message'] ?? '');
        if (!$message) json_response(['error' => 'Message required'], 400);

        $history = $body['history'] ?? [];
        $result = $ai->chat($message, $history, $language, $context);

        // Try saving to chat history if DB is available (non-blocking)
        if (!empty($result['reply'])) {
            try {
                $db = get_db();
                if ($db) {
                    $userId = $_SESSION['user_id'] ?? 1;
                    $db->prepare('INSERT INTO chat_history (user_id, role, content, lang) VALUES (?, ?, ?, ?)')
                        ->execute([$userId, 'user', $message, $language]);
                    $db->prepare('INSERT INTO chat_history (user_id, role, content, lang) VALUES (?, ?, ?, ?)')
                        ->execute([$userId, 'assistant', $result['reply'], $language]);
                }
            } catch (Exception $e) { /* non-blocking */ }
        }

        json_response($result);
        break;

    // ── Vision (Plant Image Analysis) ────────────────
    case 'vision':
        $imageData = $body['image'] ?? '';
        $message = $body['message'] ?? 'Identify the plant disease in this image and suggest treatments.';

        if (!$imageData) json_response(['error' => 'Image data required'], 400);

        // Basic image validation
        $imageSize = strlen(base64_decode($imageData));
        if ($imageSize > 10 * 1024 * 1024) { // 10MB limit
            json_response(['error' => 'Image too large. Maximum 10MB.'], 400);
        }

        $result = $ai->analyzePlant($imageData, $message, $language, $context);
        json_response($result);
        break;

    // ── Weather Advisory Bulletin ─────────────────────
    case 'bulletin':
        $weatherData = $body['weather'] ?? '';
        $locationName = $body['location_name'] ?? 'your area';

        $result = $ai->generateBulletin($weatherData, $locationName, $language, $context);
        json_response($result);
        break;

    // ── Crop Suitability ─────────────────────────────
    case 'suit':
        $soil = $body['soil'] ?? 'alluvial';
        $season = $body['season'] ?? 'current';
        $locationName = $body['location_name'] ?? 'your region';

        $result = $ai->suggestCrops($soil, $season, $locationName, $language, $context);
        json_response($result);
        break;

    // ── Explain Data ─────────────────────────────────
    case 'explain':
        $data = $body['data'] ?? '';

        $result = $ai->explainData($data, $language, $context);
        json_response($result);
        break;

    // ── Health Check ─────────────────────────────────
    case 'health':
        $forceRefresh = !empty($body['refresh']);
        $health = $ai->getHealth($forceRefresh);
        json_response([
            'ai_status' => $health['status'],
            'model' => $health['model_name'],
            'ollama_reachable' => $health['ollama_reachable'],
            'model_available' => $health['model_available'],
            'warm' => $health['warm'] ?? false,
            'last_error' => $health['last_error'] ?? '',
        ]);
        break;

    default:
        json_response(['error' => 'Invalid action. Supported: chat, vision, bulletin, suit, explain, health'], 400);
}
