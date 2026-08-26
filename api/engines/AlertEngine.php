<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — AlertEngine (rule-based weather alerts)
// ═══════════════════════════════════════════════════════

class AlertEngine {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function runForAllUsers() {
        $stmt = $this->db->query('SELECT id, lat, lng FROM users');
        $users = $stmt->fetchAll();
        $total = 0;
        foreach ($users as $user) {
            $total += $this->generateForUser($user['id'], $user['lat'], $user['lng']);
        }
        return $total;
    }

    public function generateForUser($userId, $lat = null, $lng = null) {
        if (!$lat || !$lng) {
            $stmt = $this->db->prepare('SELECT lat, lng FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            $lat = $user['lat'] ?? DEFAULT_LAT;
            $lng = $user['lng'] ?? DEFAULT_LNG;
        }

        // Fetch current weather
        require_once __DIR__ . '/WeatherEngine.php';
        $weather = new WeatherEngine($lat, $lng);
        $current = $weather->getCurrent();
        $daily = $weather->getDaily(3);
        $dailyData = $daily['daily'] ?? [];

        $alerts = [];
        $generated = 0;

        // Rule 1: Heavy rain >60mm in 48h
        $rain48h = 0;
        foreach (array_slice($dailyData, 0, 2) as $d) {
            $rain48h += floatval($d['precipitation'] ?? 0);
        }
        if ($rain48h > 60) {
            $alerts[] = [
                'severity' => 'amber',
                'type' => 'heavy_rain',
                'title' => "Heavy Rainfall Warning — {$rain48h}mm/48h",
                'body' => 'Ensure drainage channels are clear. Delay fertilizer application. Protect seedbeds.',
                'action_required' => 1,
            ];
        }

        // Rule 2: Heatwave (Tmax >= baseline+3 for 3+ days)
        $baseline = 33;
        $hotDays = 0;
        foreach ($dailyData as $d) {
            if (($d['temp_max'] ?? 0) >= $baseline + 3) $hotDays++;
        }
        if ($hotDays >= 3) {
            $alerts[] = [
                'severity' => 'amber',
                'type' => 'heatwave',
                'title' => "Heatwave Watch — {$hotDays} Day Streak",
                'body' => 'Tmax exceeding baseline by 3°C+. Apply mulch, irrigate in evening, provide shade for nurseries.',
                'action_required' => 1,
            ];
        }

        // Rule 3: Dry spell (check if no rain for 7+ days upcoming)
        $dryDays = 0;
        foreach ($dailyData as $d) {
            if (($d['precipitation'] ?? 0) < 1) $dryDays++;
        }
        if ($dryDays >= 5) { // forecast only 7 days, so 5+ is significant
            $alerts[] = [
                'severity' => 'amber',
                'type' => 'dry_spell',
                'title' => 'Dry Spell Warning — 7+ Days Without Rain Expected',
                'body' => 'Plan irrigation schedule. Apply mulch to conserve moisture. Consider deficit irrigation.',
                'action_required' => 1,
            ];
        }

        // Rule 4: Pest/Fungal risk (RH>85% & 24-30°C)
        $rh = $current['humidity'] ?? 0;
        $temp = $current['temp'] ?? 0;
        if ($rh > 85 && $temp >= 24 && $temp <= 30) {
            $alerts[] = [
                'severity' => 'red',
                'type' => 'pest_risk',
                'title' => 'Blast/Aphid Risk — High Humidity + Warm Temps',
                'body' => "RH={$rh}%, Temp={$temp}°C — ideal for blast fungus and aphid proliferation. Apply preventive spray.",
                'action_required' => 1,
            ];
        }

        // Rule 5: Irrigation skip (good soil moisture after rain)
        if (($current['precipitation'] ?? 0) > 5 || $rain48h > 20) {
            $alerts[] = [
                'severity' => 'blue',
                'type' => 'irrigation',
                'title' => 'Skip Irrigation — Soil Moisture Adequate',
                'body' => 'Recent/upcoming rainfall sufficient. Skip irrigation for 2-3 days to save water.',
                'action_required' => 0,
            ];
        }

        // Insert new alerts (avoid duplicates from last 24h)
        foreach ($alerts as $alert) {
            $stmt = $this->db->prepare('SELECT id FROM alerts WHERE user_id = ? AND type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)');
            $stmt->execute([$userId, $alert['type']]);
            if (!$stmt->fetch()) {
                $stmt = $this->db->prepare('INSERT INTO alerts (user_id, severity, type, title, body, action_required) VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->execute([$userId, $alert['severity'], $alert['type'], $alert['title'], $alert['body'], $alert['action_required']]);
                $generated++;
            }
        }

        return $generated;
    }
}
