<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — AI Orchestrator (Central AI Service)
// All AI calls MUST go through this orchestrator.
// ═══════════════════════════════════════════════════════

class AIOrchestrator {

    // ── Service States ──
    const STATE_INITIALIZING       = 'INITIALIZING';
    const STATE_OLLAMA_UNAVAILABLE = 'OLLAMA_UNAVAILABLE';
    const STATE_MODEL_UNAVAILABLE  = 'MODEL_UNAVAILABLE';
    const STATE_MODEL_LOADING      = 'MODEL_LOADING';
    const STATE_READY              = 'READY';
    const STATE_DEGRADED           = 'DEGRADED';
    const STATE_ERROR              = 'ERROR';

    // ── Timeout Tiers ──
    const TIER_CHAT     = 'chat';
    const TIER_ANALYSIS = 'analysis';
    const TIER_VISION   = 'vision';

    private static $instance = null;
    private $state;
    private $activeModel = null;
    private $ollamaReachable = false;
    private $modelAvailable = false;
    private $isWarm = false;
    private $lastError = '';
    private $lastCheckTime = 0;
    private $healthCache = null;
    private $log = [];

    // ═══════════════════════════════════════════════════
    // SINGLETON
    // ═══════════════════════════════════════════════════

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->state = self::STATE_INITIALIZING;
        $this->log('[AI] Orchestrator instantiated');
        $this->loadCachedHealth();
    }

    // ═══════════════════════════════════════════════════
    // HEALTH MANAGEMENT
    // ═══════════════════════════════════════════════════

    /**
     * Full health check — cached for AI_HEALTH_CACHE_TTL seconds
     */
    public function getHealth($forceRefresh = false) {
        // Return cached health if fresh
        if (!$forceRefresh && $this->healthCache !== null) {
            $age = time() - ($this->healthCache['checked_at'] ?? 0);
            if ($age < AI_HEALTH_CACHE_TTL) {
                $this->applyHealthCache();
                return $this->healthCache;
            }
        }

        $this->log('[AI] Running health check');
        $health = [
            'status' => self::STATE_INITIALIZING,
            'ollama_reachable' => false,
            'model_available' => false,
            'model_name' => null,
            'warm' => false,
            'last_error' => '',
            'checked_at' => time(),
            'checked_at_iso' => date('c'),
        ];

        // Step 1: Check Ollama reachability
        $ollamaOk = $this->checkOllama();
        $health['ollama_reachable'] = $ollamaOk;

        if (!$ollamaOk) {
            $health['status'] = self::STATE_OLLAMA_UNAVAILABLE;
            $health['last_error'] = 'Ollama is not reachable at ' . OLLAMA_URL;
            $this->saveHealthCache($health);
            return $health;
        }

        // Step 2: Find available model
        $model = $this->findAvailableModel();
        $health['model_available'] = ($model !== null);
        $health['model_name'] = $model;

        if ($model === null) {
            $health['status'] = self::STATE_MODEL_UNAVAILABLE;
            $health['last_error'] = 'No configured AI model found. Tried: ' . AI_MODELS;
            $this->saveHealthCache($health);
            return $health;
        }

        // Step 3: Warm-up check
        $health['warm'] = $this->isWarm;
        $health['status'] = self::STATE_READY;

        $this->saveHealthCache($health);
        return $health;
    }

    /**
     * Quick readiness check (uses cache, doesn't hit Ollama)
     */
    public function isReady() {
        $health = $this->getHealth();
        return $health['status'] === self::STATE_READY;
    }

    /**
     * Check if Ollama HTTP API is reachable
     */
    private function checkOllama() {
        $this->log('[OLLAMA] Checking availability at ' . OLLAMA_URL);
        $ch = curl_init(OLLAMA_URL . '/api/tags');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($code === 200 && $response) {
            $this->ollamaReachable = true;
            $this->log('[OLLAMA] Connected (HTTP 200)');
            return true;
        }

        $this->ollamaReachable = false;
        $this->lastError = "Ollama unreachable: HTTP {$code}" . ($error ? " — {$error}" : '');
        $this->log('[OLLAMA] ' . $this->lastError);
        return false;
    }

    /**
     * Find the first available model from AI_MODELS preference list
     */
    private function findAvailableModel() {
        $this->log('[MODEL] Checking models: ' . AI_MODELS);

        // Get list of installed models from Ollama
        $ch = curl_init(OLLAMA_URL . '/api/tags');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200 || !$response) {
            return null;
        }

        $data = json_decode($response, true);
        $installedModels = [];
        foreach (($data['models'] ?? []) as $m) {
            $installedModels[] = $m['name'] ?? '';
            // Also add without :latest suffix for matching
            $name = $m['name'] ?? '';
            if (str_ends_with($name, ':latest')) {
                $installedModels[] = str_replace(':latest', '', $name);
            }
        }

        // Try each preferred model in order
        $preferredModels = array_map('trim', explode(',', AI_MODELS));
        foreach ($preferredModels as $model) {
            if (in_array($model, $installedModels)) {
                $this->activeModel = $model;
                $this->modelAvailable = true;
                $this->log("[MODEL] Found: {$model}");
                return $model;
            }
        }

        // Fallback: try OLLAMA_MODEL constant
        if (in_array(OLLAMA_MODEL, $installedModels)) {
            $this->activeModel = OLLAMA_MODEL;
            $this->modelAvailable = true;
            $this->log("[MODEL] Fallback found: " . OLLAMA_MODEL);
            return OLLAMA_MODEL;
        }

        $this->lastError = 'No configured model available. Installed: ' . implode(', ', $installedModels);
        $this->log('[MODEL] ' . $this->lastError);
        return null;
    }

    /**
     * Warm up the model with a lightweight request
     */
    public function warmUp() {
        if (!AI_WARMUP_ENABLED) return true;
        if ($this->isWarm) return true;
        if (!$this->activeModel) return false;

        // File-lock to prevent parallel warm-ups
        $lockFile = AI_WARMUP_LOCK_FILE;
        $fp = @fopen($lockFile, 'c+');
        if (!$fp) {
            $this->log('[MODEL] Could not open warm-up lock file');
            return false;
        }

        if (!flock($fp, LOCK_EX | LOCK_NB)) {
            // Another process is warming up — wait briefly
            $this->log('[MODEL] Another warm-up in progress, waiting...');
            flock($fp, LOCK_EX); // blocking wait
        }

        // Check if warm-up already done (by another process)
        $lockContent = @file_get_contents($lockFile);
        if ($lockContent) {
            $lockData = json_decode($lockContent, true);
            if (($lockData['model'] ?? '') === $this->activeModel
                && (time() - ($lockData['time'] ?? 0)) < 300) { // 5 min keep-warm
                $this->isWarm = true;
                flock($fp, LOCK_UN);
                fclose($fp);
                $this->log('[MODEL] Already warm (by another process)');
                return true;
            }
        }

        $this->log("[MODEL] Warming up {$this->activeModel}...");
        $this->state = self::STATE_MODEL_LOADING;

        $result = $this->rawOllamaChat(
            [['role' => 'user', 'content' => 'Hello']],
            $this->activeModel,
            false, [], 10, 10 // very short warm-up
        );

        if ($result !== null) {
            $this->isWarm = true;
            $this->state = self::STATE_READY;
            $this->log('[MODEL] Warm-up successful');

            // Write lock file
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode([
                'model' => $this->activeModel,
                'time' => time(),
            ]));
        } else {
            $this->log('[MODEL] Warm-up failed, continuing anyway');
        }

        flock($fp, LOCK_UN);
        fclose($fp);
        return $this->isWarm;
    }

    // ═══════════════════════════════════════════════════
    // PUBLIC AI METHODS
    // ═══════════════════════════════════════════════════

    /**
     * Chat with the AI assistant
     */
    public function chat($message, $history = [], $language = 'en', $context = []) {
        $requestId = $this->generateRequestId();
        $this->log("[AI] Chat request {$requestId}");

        if (!$this->ensureReady()) {
            return $this->unavailableResponse($requestId);
        }

        $langName = $this->getLanguageName($language);
        $systemPrompt = $this->buildSystemPrompt($langName, $context);

        $messages = [['role' => 'system', 'content' => $systemPrompt]];

        // Add conversation history (last 4 exchanges)
        foreach (array_slice($history, -4) as $h) {
            $messages[] = ['role' => $h['role'] ?? 'user', 'content' => $h['content'] ?? ''];
        }

        $messages[] = ['role' => 'user', 'content' => $message];

        $reply = $this->callWithRetry($messages, self::TIER_CHAT, [], AI_MAX_TOKENS_CHAT);

        if ($reply === null) {
            return [
                'reply' => null,
                'error' => 'AI service did not respond. Check /api/health.php for details.',
                'offline' => true,
                'request_id' => $requestId,
                'ai_status' => $this->state,
            ];
        }

        return [
            'reply' => $reply,
            'request_id' => $requestId,
            'ai_status' => $this->state,
            'model' => $this->activeModel,
        ];
    }

    /**
     * Analyze a plant image (vision)
     */
    public function analyzePlant($imageBase64, $message = '', $language = 'en', $context = []) {
        $requestId = $this->generateRequestId();
        $this->log("[AI] Vision request {$requestId}");

        if (!$this->ensureReady()) {
            return $this->unavailableResponse($requestId);
        }

        $langName = $this->getLanguageName($language);

        $visionPrompt = "You are Krishi Saarthi, an expert Indian farm advisor AI. ALWAYS respond directly in {$langName}. "
            . "Analyze this plant image. Reply ONLY as valid JSON: "
            . '{"crop":"name","disease":"name or None","confidence":85,"severity":"Low|Moderate|High|Severe",'
            . '"organic_treatment":"brief organic remedy","chemical_treatment":"brief chemical remedy",'
            . '"symptoms":["symptom1","symptom2"],"possible_causes":["cause1"],'
            . '"recommended_actions":["action1"],"prevention":["tip1"],'
            . '"summary":"summary in ' . $langName . '"}';

        $contextStr = $this->buildContextString($context);
        if ($contextStr) {
            $visionPrompt .= "\nContext:\n" . $contextStr;
        }

        $userMessage = $message ?: 'Identify the plant disease in this image and suggest treatments.';

        $messages = [
            ['role' => 'system', 'content' => $visionPrompt],
            ['role' => 'user', 'content' => $userMessage],
        ];

        $reply = $this->callWithRetry($messages, self::TIER_VISION, [$imageBase64], AI_MAX_TOKENS_VISION);

        if ($reply === null) {
            return [
                'error' => 'AI Vision is not responding.',
                'offline' => true,
                'request_id' => $requestId,
                'ai_status' => $this->state,
            ];
        }

        // Attempt to parse structured JSON from response
        $parsed = $this->parseStructuredJson($reply);
        if ($parsed) {
            $parsed['request_id'] = $requestId;
            $parsed['ai_status'] = $this->state;
            $parsed['ai_generated'] = true;
            return $parsed;
        }

        // Fallback: return raw reply
        return [
            'reply' => $reply,
            'request_id' => $requestId,
            'ai_status' => $this->state,
            'ai_generated' => true,
        ];
    }

    /**
     * Generate weather-based farming advisory bulletin
     */
    public function generateBulletin($weatherData, $locationName, $language = 'en', $context = []) {
        $requestId = $this->generateRequestId();
        $this->log("[AI] Bulletin request {$requestId}");

        if (!$this->ensureReady()) {
            return ['bulletin' => null, 'offline' => true, 'request_id' => $requestId, 'ai_status' => $this->state];
        }

        $langName = $this->getLanguageName($language);
        $systemPrompt = $this->buildSystemPrompt($langName, $context);

        $prompt = "Weather for {$locationName}: {$weatherData}. "
            . "Provide 3 short bullet points of farming advice in {$langName}. "
            . "Base advice on factual weather data. Do not invent weather values.";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        $reply = $this->callWithRetry($messages, self::TIER_ANALYSIS, [], AI_MAX_TOKENS_ANALYSIS);

        return [
            'bulletin' => $reply,
            'offline' => ($reply === null),
            'request_id' => $requestId,
            'ai_status' => $this->state,
            'ai_generated' => true,
        ];
    }

    /**
     * Generate crop suitability suggestions
     */
    public function suggestCrops($soil, $season, $locationName, $language = 'en', $context = []) {
        $requestId = $this->generateRequestId();
        $this->log("[AI] Suitability request {$requestId}");

        if (!$this->ensureReady()) {
            return ['suggestions' => null, 'offline' => true, 'request_id' => $requestId, 'ai_status' => $this->state];
        }

        $langName = $this->getLanguageName($language);
        $systemPrompt = $this->buildSystemPrompt($langName, $context);

        $prompt = "Location: {$locationName}, Soil: {$soil}, Season: {$season}. "
            . "List top 4 suitable crops with 1 sentence each in {$langName}. "
            . "Include practical growing tips for each crop.";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        $reply = $this->callWithRetry($messages, self::TIER_ANALYSIS, [], AI_MAX_TOKENS_ANALYSIS);

        return [
            'suggestions' => $reply,
            'offline' => ($reply === null),
            'request_id' => $requestId,
            'ai_status' => $this->state,
            'ai_generated' => true,
        ];
    }

    /**
     * Explain data (insurance assessment, anomaly, etc.) in farmer-friendly language
     */
    public function explainData($data, $language = 'en', $context = []) {
        $requestId = $this->generateRequestId();
        $this->log("[AI] Explain request {$requestId}");

        if (!$this->ensureReady()) {
            return ['explanation' => null, 'offline' => true, 'request_id' => $requestId, 'ai_status' => $this->state];
        }

        $langName = $this->getLanguageName($language);
        $systemPrompt = $this->buildSystemPrompt($langName, $context);

        $prompt = "Explain this data briefly in {$langName} for a farmer: {$data}. "
            . "Use simple language. Distinguish between factual data and your interpretation.";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        $reply = $this->callWithRetry($messages, self::TIER_ANALYSIS, [], AI_MAX_TOKENS_ANALYSIS);

        return [
            'explanation' => $reply,
            'offline' => ($reply === null),
            'request_id' => $requestId,
            'ai_status' => $this->state,
            'ai_generated' => true,
        ];
    }

    // ═══════════════════════════════════════════════════
    // CORE REQUEST ENGINE
    // ═══════════════════════════════════════════════════

    /**
     * Call Ollama with retry logic
     */
    private function callWithRetry($messages, $tier = self::TIER_CHAT, $images = [], $maxTokens = 150) {
        $timeout = $this->getTimeout($tier);
        $maxRetries = AI_MAX_RETRIES;

        for ($attempt = 0; $attempt <= $maxRetries; $attempt++) {
            if ($attempt > 0) {
                $backoff = min(5, pow(2, $attempt - 1)); // 1s, 2s, 4s max 5s
                $this->log("[AI] Retry {$attempt}/{$maxRetries} after {$backoff}s backoff");
                sleep($backoff);
            }

            $result = $this->rawOllamaChat($messages, $this->activeModel, false, $images, $maxTokens, $timeout);

            if ($result !== null) {
                return $result;
            }

            // On failure, check if it's a transient error worth retrying
            if (!$this->ollamaReachable) {
                $this->log('[AI] Ollama unreachable, skipping retry');
                break;
            }
        }

        $this->state = self::STATE_DEGRADED;
        return null;
    }

    /**
     * Raw Ollama /api/chat call — the ONLY place that talks to Ollama
     */
    private function rawOllamaChat($messages, $model, $stream = false, $images = [], $maxTokens = 150, $timeout = 30) {
        $data = [
            'model' => $model,
            'messages' => $messages,
            'stream' => $stream,
            'options' => [
                'num_predict' => $maxTokens,
                'temperature' => AI_TEMPERATURE,
                'top_p' => AI_TOP_P,
            ],
        ];

        if (!empty($images)) {
            $lastIdx = count($data['messages']) - 1;
            $data['messages'][$lastIdx]['images'] = $images;
        }

        $ch = curl_init(OLLAMA_URL . '/api/chat');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($code !== 200 || !$response) {
            $this->log("[OLLAMA] Request failed: HTTP {$code}" . ($curlError ? " — {$curlError}" : ''));
            if ($code === 0 || $curlError) {
                $this->ollamaReachable = false;
            }
            return null;
        }

        $decoded = json_decode($response, true);
        $msg = $decoded['message'] ?? [];
        $content = $msg['content'] ?? '';

        // Handle thinking models where answer might be in thinking field
        if (empty(trim($content)) && !empty($msg['thinking'])) {
            $content = $msg['thinking'];
        }

        // Strip <think> tags if any
        $content = preg_replace('/<think>.*?<\/think>/s', '', $content);
        $content = trim($content);

        if ($content !== '') {
            $this->log("[AI] Response received (" . strlen($content) . " chars)");
            return $content;
        }

        $this->log('[AI] Empty response from model');
        return null;
    }

    // ═══════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════

    /**
     * Ensure the service is ready (check health + warm-up if needed)
     */
    private function ensureReady() {
        $health = $this->getHealth();

        if ($health['status'] === self::STATE_OLLAMA_UNAVAILABLE
            || $health['status'] === self::STATE_MODEL_UNAVAILABLE) {
            return false;
        }

        // Lazy warm-up on first real request
        if (!$this->isWarm && AI_WARMUP_ENABLED) {
            $this->warmUp();
        }

        return $this->activeModel !== null;
    }

    /**
     * Build the system prompt with context
     */
    private function buildSystemPrompt($langName, $context = []) {
        $prompt = "You are Krishi Saarthi, an expert Indian farm advisor AI. "
            . "ALWAYS respond directly in {$langName}. "
            . "Be concise, practical, and helpful (under 100 words). "
            . "Do not show internal thinking tags or reasoning processes. "
            . "Base your advice on the provided context data when available. "
            . "Clearly distinguish between factual data and AI-generated recommendations.";

        $contextStr = $this->buildContextString($context);
        if ($contextStr) {
            $prompt .= "\nContext:\n" . $contextStr;
        }

        return $prompt;
    }

    /**
     * Build context string from context array
     */
    private function buildContextString($context) {
        $parts = [];
        if (!empty($context['location']))   $parts[] = "Location: {$context['location']}";
        if (!empty($context['weather']))     $parts[] = "Weather: {$context['weather']}";
        if (!empty($context['crops']))       $parts[] = "Crops: {$context['crops']}";
        if (!empty($context['soil']))        $parts[] = "Soil: {$context['soil']}";
        if (!empty($context['market']))      $parts[] = "Market: {$context['market']}";
        if (!empty($context['alerts']))      $parts[] = "Active Alerts: {$context['alerts']}";
        if (!empty($context['season']))      $parts[] = "Season: {$context['season']}";
        return implode("\n", $parts);
    }

    /**
     * Get timeout for request tier
     */
    private function getTimeout($tier) {
        switch ($tier) {
            case self::TIER_CHAT:     return AI_TIMEOUT_CHAT;
            case self::TIER_ANALYSIS: return AI_TIMEOUT_ANALYSIS;
            case self::TIER_VISION:   return AI_TIMEOUT_VISION;
            default:                  return AI_TIMEOUT_CHAT;
        }
    }

    /**
     * Get full language name from code
     */
    private function getLanguageName($code) {
        $map = [
            'en' => 'English', 'hi' => 'Hindi', 'ta' => 'Tamil',
            'te' => 'Telugu', 'mr' => 'Marathi', 'kn' => 'Kannada',
        ];
        return $map[$code] ?? 'English';
    }

    /**
     * Parse structured JSON from AI response
     */
    private function parseStructuredJson($text) {
        // Try to find JSON object in the response
        if (preg_match('/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s', $text, $matches)) {
            $parsed = json_decode($matches[0], true);
            if ($parsed && is_array($parsed)) {
                return $parsed;
            }
        }

        // Try full text as JSON
        $parsed = json_decode($text, true);
        if ($parsed && is_array($parsed)) {
            return $parsed;
        }

        return null;
    }

    /**
     * Generate a unique request ID
     */
    private function generateRequestId() {
        return 'ai_' . substr(md5(uniqid(mt_rand(), true)), 0, 12);
    }

    /**
     * Build unavailable response
     */
    private function unavailableResponse($requestId) {
        return [
            'reply' => null,
            'error' => 'AI service is currently unavailable. Non-AI features continue to work normally.',
            'offline' => true,
            'request_id' => $requestId,
            'ai_status' => $this->state,
            'last_error' => $this->lastError,
        ];
    }

    // ═══════════════════════════════════════════════════
    // HEALTH CACHE (file-based for stateless PHP)
    // ═══════════════════════════════════════════════════

    private function loadCachedHealth() {
        $cacheFile = AI_HEALTH_CACHE_FILE;
        if (file_exists($cacheFile)) {
            $data = @file_get_contents($cacheFile);
            if ($data) {
                $cached = json_decode($data, true);
                if ($cached && (time() - ($cached['checked_at'] ?? 0)) < AI_HEALTH_CACHE_TTL) {
                    $this->healthCache = $cached;
                    $this->applyHealthCache();
                    $this->log('[AI] Loaded cached health: ' . $cached['status']);
                }
            }
        }
    }

    private function applyHealthCache() {
        if (!$this->healthCache) return;
        $this->state = $this->healthCache['status'] ?? self::STATE_INITIALIZING;
        $this->ollamaReachable = $this->healthCache['ollama_reachable'] ?? false;
        $this->modelAvailable = $this->healthCache['model_available'] ?? false;
        $this->activeModel = $this->healthCache['model_name'] ?? null;
        $this->isWarm = $this->healthCache['warm'] ?? false;
    }

    private function saveHealthCache($health) {
        $this->healthCache = $health;
        $this->state = $health['status'];
        $this->activeModel = $health['model_name'] ?? $this->activeModel;
        $this->ollamaReachable = $health['ollama_reachable'];
        $this->modelAvailable = $health['model_available'];
        $this->isWarm = $health['warm'] ?? false;

        @file_put_contents(AI_HEALTH_CACHE_FILE, json_encode($health));
    }

    // ═══════════════════════════════════════════════════
    // LOGGING
    // ═══════════════════════════════════════════════════

    private function log($message) {
        $ts = date('H:i:s');
        $entry = "[{$ts}] {$message}";
        $this->log[] = $entry;
        error_log("[AgriVision] {$message}");
    }

    /**
     * Get internal log (for debug endpoints)
     */
    public function getLog() {
        return $this->log;
    }

    /**
     * Get current state
     */
    public function getState() {
        return $this->state;
    }

    /**
     * Get active model name
     */
    public function getActiveModel() {
        return $this->activeModel;
    }
}
