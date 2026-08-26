<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — SuitabilityEngine
// Recommends crops based on location, soil, and season
// ═══════════════════════════════════════════════════════

class SuitabilityEngine {

    // Crop database with growing requirements
    private $cropDB = [
        'Paddy' => ['ph_min' => 5.5, 'ph_max' => 7.0, 'water' => 'high', 'temp_min' => 20, 'temp_max' => 35, 'seasons' => ['Kharif', 'Rabi'], 'duration' => '120-150 days', 'soil_types' => ['Alluvial Clay', 'Clay Loam', 'Loamy'], 'yield' => '4-6 t/ha'],
        'Wheat' => ['ph_min' => 6.0, 'ph_max' => 7.5, 'water' => 'moderate', 'temp_min' => 15, 'temp_max' => 25, 'seasons' => ['Rabi'], 'duration' => '120-150 days', 'soil_types' => ['Loamy', 'Clay Loam', 'Sandy Loam'], 'yield' => '3-5 t/ha'],
        'Maize' => ['ph_min' => 5.5, 'ph_max' => 7.5, 'water' => 'moderate', 'temp_min' => 21, 'temp_max' => 30, 'seasons' => ['Kharif', 'Rabi'], 'duration' => '90-120 days', 'soil_types' => ['Loamy', 'Sandy Loam', 'Red Sandy Loam'], 'yield' => '5-8 t/ha'],
        'Groundnut' => ['ph_min' => 5.5, 'ph_max' => 7.0, 'water' => 'low', 'temp_min' => 25, 'temp_max' => 30, 'seasons' => ['Kharif'], 'duration' => '100-130 days', 'soil_types' => ['Sandy Loam', 'Red Sandy Loam', 'Loamy'], 'yield' => '1.5-2.5 t/ha'],
        'Sugarcane' => ['ph_min' => 6.0, 'ph_max' => 7.5, 'water' => 'very_high', 'temp_min' => 20, 'temp_max' => 35, 'seasons' => ['Year-round'], 'duration' => '12-18 months', 'soil_types' => ['Alluvial Clay', 'Loamy', 'Clay Loam'], 'yield' => '70-100 t/ha'],
        'Cotton' => ['ph_min' => 6.0, 'ph_max' => 8.0, 'water' => 'moderate', 'temp_min' => 21, 'temp_max' => 35, 'seasons' => ['Kharif'], 'duration' => '150-180 days', 'soil_types' => ['Black Cotton', 'Loamy', 'Clay Loam'], 'yield' => '1.5-2.5 t/ha'],
        'Soybean' => ['ph_min' => 6.0, 'ph_max' => 7.0, 'water' => 'moderate', 'temp_min' => 20, 'temp_max' => 30, 'seasons' => ['Kharif'], 'duration' => '90-120 days', 'soil_types' => ['Loamy', 'Clay Loam', 'Black Cotton'], 'yield' => '1.5-2.5 t/ha'],
        'Tomato' => ['ph_min' => 6.0, 'ph_max' => 7.0, 'water' => 'moderate', 'temp_min' => 20, 'temp_max' => 27, 'seasons' => ['Year-round'], 'duration' => '60-90 days', 'soil_types' => ['Loamy', 'Sandy Loam', 'Red Sandy Loam'], 'yield' => '25-40 t/ha'],
        'Brinjal' => ['ph_min' => 5.5, 'ph_max' => 6.5, 'water' => 'moderate', 'temp_min' => 25, 'temp_max' => 35, 'seasons' => ['Year-round'], 'duration' => '60-80 days', 'soil_types' => ['Loamy', 'Sandy Loam', 'Alluvial Clay'], 'yield' => '25-35 t/ha'],
        'Onion' => ['ph_min' => 6.0, 'ph_max' => 7.0, 'water' => 'low', 'temp_min' => 15, 'temp_max' => 25, 'seasons' => ['Rabi', 'Kharif'], 'duration' => '120-150 days', 'soil_types' => ['Loamy', 'Sandy Loam', 'Alluvial Clay'], 'yield' => '20-30 t/ha'],
        'Turmeric' => ['ph_min' => 5.0, 'ph_max' => 7.5, 'water' => 'moderate', 'temp_min' => 20, 'temp_max' => 30, 'seasons' => ['Kharif'], 'duration' => '7-9 months', 'soil_types' => ['Loamy', 'Sandy Loam', 'Alluvial Clay'], 'yield' => '20-25 t/ha'],
        'Sunflower' => ['ph_min' => 6.0, 'ph_max' => 7.5, 'water' => 'low', 'temp_min' => 20, 'temp_max' => 30, 'seasons' => ['Rabi', 'Kharif'], 'duration' => '85-100 days', 'soil_types' => ['Loamy', 'Sandy Loam', 'Black Cotton'], 'yield' => '1-2 t/ha'],
        'Black Gram' => ['ph_min' => 6.0, 'ph_max' => 7.0, 'water' => 'low', 'temp_min' => 25, 'temp_max' => 35, 'seasons' => ['Kharif'], 'duration' => '70-90 days', 'soil_types' => ['Loamy', 'Sandy Loam', 'Red Sandy Loam'], 'yield' => '0.8-1.2 t/ha'],
        'Sesame' => ['ph_min' => 5.5, 'ph_max' => 8.0, 'water' => 'low', 'temp_min' => 25, 'temp_max' => 35, 'seasons' => ['Kharif'], 'duration' => '80-95 days', 'soil_types' => ['Sandy Loam', 'Red Sandy Loam', 'Loamy'], 'yield' => '0.5-0.8 t/ha'],
    ];

    /**
     * Score and rank crops for given conditions
     * @param float $lat, $lng — location
     * @param array $soil — {ph, n, p, k, organic_c, soil_type}
     * @param string $season — Kharif|Rabi|Summer|Year-round
     * @param float $avgTemp — average temperature °C
     * @param float $rainfall — expected season rainfall mm
     * @return array — ranked crop recommendations with scores and reasoning
     */
    public function recommend($lat, $lng, $soil, $season = 'Kharif', $avgTemp = 28, $rainfall = 800) {
        $ph = floatval($soil['ph'] ?? 7.0);
        $soilType = $soil['soil_type'] ?? 'Loamy';

        $results = [];

        foreach ($this->cropDB as $name => $req) {
            $score = 0;
            $reasons = [];
            $warnings = [];

            // 1. Season match (25 pts)
            $seasonMatch = in_array($season, $req['seasons']) || in_array('Year-round', $req['seasons']);
            if ($seasonMatch) {
                $score += 25;
                $reasons[] = "Suitable for {$season} season";
            } else {
                $score -= 20;
                $warnings[] = "Not typically grown in {$season}";
            }

            // 2. pH match (20 pts)
            if ($ph >= $req['ph_min'] && $ph <= $req['ph_max']) {
                $score += 20;
                $reasons[] = "pH {$ph} is within optimal range ({$req['ph_min']}-{$req['ph_max']})";
            } elseif ($ph >= $req['ph_min'] - 0.5 && $ph <= $req['ph_max'] + 0.5) {
                $score += 10;
                $warnings[] = "pH {$ph} is slightly outside optimal ({$req['ph_min']}-{$req['ph_max']})";
            } else {
                $score -= 10;
                $warnings[] = "pH {$ph} is not suitable (needs {$req['ph_min']}-{$req['ph_max']})";
            }

            // 3. Soil type (20 pts)
            if (in_array($soilType, $req['soil_types'])) {
                $score += 20;
                $reasons[] = "{$soilType} soil is suitable";
            } else {
                $score += 5;
                $warnings[] = "Prefers " . implode(', ', array_slice($req['soil_types'], 0, 2));
            }

            // 4. Temperature (15 pts)
            if ($avgTemp >= $req['temp_min'] && $avgTemp <= $req['temp_max']) {
                $score += 15;
                $reasons[] = "Temperature {$avgTemp}°C is optimal";
            } elseif ($avgTemp >= $req['temp_min'] - 3 && $avgTemp <= $req['temp_max'] + 3) {
                $score += 8;
                $warnings[] = "Temperature slightly outside optimal";
            } else {
                $score -= 10;
                $warnings[] = "Temperature {$avgTemp}°C not suitable (needs {$req['temp_min']}-{$req['temp_max']}°C)";
            }

            // 5. Water availability (20 pts)
            $waterNeed = ['low' => 400, 'moderate' => 600, 'high' => 1000, 'very_high' => 1400];
            $needed = $waterNeed[$req['water']] ?? 600;
            if ($rainfall >= $needed * 0.8) {
                $score += 20;
                $reasons[] = "Rainfall adequate for water needs";
            } elseif ($rainfall >= $needed * 0.5) {
                $score += 10;
                $warnings[] = "May need supplemental irrigation";
            } else {
                $score -= 5;
                $warnings[] = "Insufficient rainfall — heavy irrigation needed";
            }

            $score = max(0, min(100, $score));

            $results[] = [
                'crop'     => $name,
                'score'    => $score,
                'duration' => $req['duration'],
                'yield'    => $req['yield'],
                'water'    => $req['water'],
                'reasons'  => $reasons,
                'warnings' => $warnings,
            ];
        }

        // Sort by score descending
        usort($results, function($a, $b) { return $b['score'] - $a['score']; });

        return array_slice($results, 0, 8); // Return top 8
    }
}
