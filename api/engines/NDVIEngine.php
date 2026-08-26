<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — NDVIEngine (Synthetic NDVI model)
// No satellite API key required — uses crop phenology
// curve × weather × soil to synthesize NDVI
// ═══════════════════════════════════════════════════════

class NDVIEngine {
    private $farmId;
    private $crop;

    // Reference NDVI phenology curves (day-of-crop → NDVI)
    private $phenologyCurves = [
        'Paddy' => [
            0 => 0.15, 15 => 0.25, 30 => 0.40, 45 => 0.55, 60 => 0.70,
            75 => 0.80, 90 => 0.82, 105 => 0.75, 120 => 0.60, 135 => 0.40, 150 => 0.20,
        ],
        'Groundnut' => [
            0 => 0.12, 15 => 0.22, 30 => 0.38, 45 => 0.52, 60 => 0.65,
            75 => 0.72, 90 => 0.68, 105 => 0.55, 120 => 0.35, 130 => 0.18,
        ],
        'Sugarcane' => [
            0 => 0.10, 30 => 0.20, 60 => 0.35, 90 => 0.50, 120 => 0.65,
            150 => 0.75, 180 => 0.80, 240 => 0.82, 300 => 0.78, 360 => 0.50, 450 => 0.25,
        ],
        'Brinjal' => [
            0 => 0.12, 10 => 0.22, 20 => 0.38, 30 => 0.55, 40 => 0.68,
            50 => 0.75, 60 => 0.72, 70 => 0.65, 80 => 0.45, 90 => 0.25,
        ],
        'default' => [
            0 => 0.12, 15 => 0.25, 30 => 0.42, 45 => 0.58, 60 => 0.70,
            75 => 0.75, 90 => 0.72, 105 => 0.60, 120 => 0.40, 135 => 0.20,
        ],
    ];

    public function __construct($farmId, $cropData) {
        $this->farmId = $farmId;
        $this->crop = $cropData;
    }

    /**
     * Get current synthetic NDVI based on:
     * 1. Phenology curve (days since planting)
     * 2. Rain stress factor (too little or too much rain)
     * 3. Temperature stress factor
     */
    public function getCurrentNDVI() {
        $cropName = $this->crop['crop'] ?? 'default';
        $plantDate = $this->crop['plant_date'] ?? date('Y-m-d', strtotime('-60 days'));
        $daysSincePlant = max(0, (time() - strtotime($plantDate)) / 86400);

        // 1. Base NDVI from phenology curve
        $baseNDVI = $this->interpolateCurve($cropName, $daysSincePlant);

        // 2. Rain stress
        $rainStress = $this->computeRainStress();

        // 3. Temperature stress
        $heatStress = $this->computeHeatStress();

        // 4. Apply stress factors (each reduces NDVI)
        $stressMultiplier = 1 - ($rainStress['factor'] * 0.3) - ($heatStress['factor'] * 0.2);
        $stressMultiplier = max(0.2, min(1.0, $stressMultiplier));

        $currentNDVI = round($baseNDVI * $stressMultiplier, 3);
        $currentNDVI = max(0.05, min(0.95, $currentNDVI));

        return [
            'ndvi_now' => $currentNDVI,
            'ndvi_base' => round($baseNDVI, 3),
            'days_since_plant' => round($daysSincePlant),
            'rain_stress' => $rainStress,
            'heat_stress' => $heatStress,
            'veg_health' => $this->classifyHealth($currentNDVI),
            'stress_multiplier' => round($stressMultiplier, 3),
        ];
    }

    /**
     * Generate historical NDVI time series (for charts)
     */
    public function getTimeSeries($days = 120) {
        $cropName = $this->crop['crop'] ?? 'default';
        $plantDate = $this->crop['plant_date'] ?? date('Y-m-d', strtotime("-{$days} days"));
        $series = [];

        for ($d = 0; $d <= $days; $d += 5) {
            $baseNDVI = $this->interpolateCurve($cropName, $d);
            // Add noise ±0.05
            $noise = (mt_rand(-50, 50) / 1000);
            $ndvi = max(0.05, min(0.95, $baseNDVI + $noise));
            $date = date('Y-m-d', strtotime($plantDate . " +{$d} days"));
            $series[] = ['date' => $date, 'ndvi' => round($ndvi, 3)];
        }

        return $series;
    }

    private function interpolateCurve($cropName, $day) {
        $curve = $this->phenologyCurves[$cropName] ?? $this->phenologyCurves['default'];
        $keys = array_keys($curve);

        if ($day <= $keys[0]) return $curve[$keys[0]];
        if ($day >= end($keys)) return end($curve);

        // Linear interpolation
        for ($i = 0; $i < count($keys) - 1; $i++) {
            if ($day >= $keys[$i] && $day <= $keys[$i + 1]) {
                $t = ($day - $keys[$i]) / max(1, $keys[$i + 1] - $keys[$i]);
                return $curve[$keys[$i]] + $t * ($curve[$keys[$i + 1]] - $curve[$keys[$i]]);
            }
        }

        return 0.5; // fallback
    }

    private function computeRainStress() {
        // Would fetch from WeatherEngine archive in production
        // Simulated: compare actual vs expected rainfall
        $actualRain = 285; // mm last 30 days (simulated)
        $expectedRain = 180; // mm normal

        $ratio = $expectedRain > 0 ? $actualRain / $expectedRain : 1;

        // Stress when ratio < 0.5 (drought) or > 1.5 (waterlogging)
        if ($ratio < 0.5) {
            $factor = (0.5 - $ratio) / 0.5;
            $type = 'deficit';
        } elseif ($ratio > 1.5) {
            $factor = ($ratio - 1.5) / 1.5;
            $type = 'excess';
        } else {
            $factor = 0;
            $type = 'normal';
        }

        $factor = min(1.0, $factor);
        $stressPct = round($factor * 100, 1);

        return [
            'actual_mm' => $actualRain,
            'expected_mm' => $expectedRain,
            'ratio' => round($ratio, 2),
            'type' => $type,
            'factor' => round($factor, 3),
            'stress_pct' => $stressPct,
        ];
    }

    private function computeHeatStress() {
        // Simulated: count days exceeding crop heat threshold
        $threshold = 35; // °C for paddy
        $totalDays = 30;
        $hotDays = 5; // simulated

        $factor = $totalDays > 0 ? $hotDays / $totalDays : 0;
        $stressPct = round($factor * 100, 1);

        return [
            'threshold_c' => $threshold,
            'hot_days' => $hotDays,
            'total_days' => $totalDays,
            'factor' => round($factor, 3),
            'stress_pct' => $stressPct,
        ];
    }

    private function classifyHealth($ndvi) {
        if ($ndvi >= 0.6) return 'Healthy';
        if ($ndvi >= 0.4) return 'Moderate';
        if ($ndvi >= 0.25) return 'Stressed';
        return 'Critical';
    }
}
