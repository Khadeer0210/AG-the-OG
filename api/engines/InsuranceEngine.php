<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — InsuranceEngine (Parametric Loss Model)
// Formula: Loss% = w_ndvi×NDVIstress + w_rain×RainStress + w_heat×HeatStress
// ═══════════════════════════════════════════════════════

class InsuranceEngine {

    /**
     * Run parametric assessment
     * @param array $crop — crop row from DB
     * @param array $ndvi — output from NDVIEngine::getCurrentNDVI()
     * @param array|null $policy — insurance_policies row
     * @return array — full assessment
     */
    public function assess($crop, $ndvi, $policy = null) {
        $ndviNow   = $ndvi['ndvi_now'] ?? 0.38;
        $ndviBase  = $ndvi['ndvi_base'] ?? 0.72;
        $rainData  = $ndvi['rain_stress'] ?? [];
        $heatData  = $ndvi['heat_stress'] ?? [];

        // ── 1. NDVI Stress (vegetation decline) ──
        $ndviStress = $ndviBase > 0
            ? max(0, ($ndviBase - $ndviNow) / $ndviBase * 100)
            : 0;

        // ── 2. Rain Stress ──
        $actualRain   = floatval($rainData['actual_mm'] ?? 285);
        $expectedRain = floatval($rainData['expected_mm'] ?? 180);
        $rainRatio    = $expectedRain > 0 ? $actualRain / $expectedRain : 1;

        if ($rainRatio < 0.5) {
            // Drought — deficit stress
            $rainStress = ((0.5 - $rainRatio) / 0.5) * 100;
            $rainType = 'deficit';
        } elseif ($rainRatio > 1.8) {
            // Waterlogging — excess stress
            $rainStress = (($rainRatio - 1.8) / 1.8) * 100;
            $rainType = 'excess';
        } else {
            $rainStress = 0;
            $rainType = 'normal';
        }
        $rainStress = min(100, max(0, $rainStress));

        // ── 3. Heat Stress ──
        $hotDays   = intval($heatData['hot_days'] ?? 5);
        $totalDays = intval($heatData['total_days'] ?? 30);
        $heatStress = $totalDays > 0 ? ($hotDays / $totalDays) * 100 : 0;
        $heatStress = min(100, max(0, $heatStress));

        // ── 4. Weighted Loss ──
        $lossPct = (WEIGHT_NDVI * $ndviStress)
                 + (WEIGHT_RAIN * $rainStress)
                 + (WEIGHT_HEAT * $heatStress);
        $lossPct = round(min(100, max(0, $lossPct)), 2);

        // ── 5. Eligibility & Payout ──
        $threshold   = INSURANCE_THRESHOLD;
        $eligible    = $lossPct >= $threshold;
        $sumInsured  = floatval($policy['sum_insured'] ?? 150000);
        $premium     = floatval($policy['premium'] ?? $sumInsured * KHARIF_PREMIUM_RATE);
        $payout      = $eligible ? round($sumInsured * ($lossPct / 100), 2) : 0;
        $scheme      = $policy['scheme'] ?? 'PMFBY Kharif';
        $premiumRate = $policy ? round($premium / max($sumInsured, 1) * 100, 1) . '%' : '2%';

        // ── 6. Vegetation health label ──
        $vegHealth = 'Healthy';
        $vegColor  = 'var(--color-paddy)';
        if ($ndviNow < 0.25)      { $vegHealth = 'Critical';  $vegColor = 'var(--color-alert)'; }
        elseif ($ndviNow < 0.4)   { $vegHealth = 'Stressed';  $vegColor = 'var(--color-alert)'; }
        elseif ($ndviNow < 0.6)   { $vegHealth = 'Moderate';  $vegColor = 'var(--color-turmeric)'; }

        // ── 7. Build evidence bundle ──
        $evidence = [
            'crop'       => $crop['crop'] ?? 'Unknown',
            'variety'    => $crop['variety'] ?? '',
            'farm_id'    => $crop['farm_id'] ?? 0,
            'plant_date' => $crop['plant_date'] ?? '',
            'assessment_date' => date('Y-m-d H:i:s'),
            'ndvi' => [
                'current'  => $ndviNow,
                'baseline' => $ndviBase,
                'stress'   => round($ndviStress, 2),
                'health'   => $vegHealth,
                'days_since_plant' => $ndvi['days_since_plant'] ?? 0,
            ],
            'rain' => [
                'actual_mm'   => $actualRain,
                'expected_mm' => $expectedRain,
                'ratio'       => round($rainRatio, 2),
                'type'        => $rainType,
                'stress'      => round($rainStress, 2),
            ],
            'heat' => [
                'hot_days'    => $hotDays,
                'total_days'  => $totalDays,
                'stress'      => round($heatStress, 2),
            ],
            'weights' => [
                'ndvi' => WEIGHT_NDVI,
                'rain' => WEIGHT_RAIN,
                'heat' => WEIGHT_HEAT,
            ],
            'loss_formula' => sprintf(
                '%.2f×%.1f + %.2f×%.1f + %.2f×%.1f = %.2f%%',
                WEIGHT_NDVI, $ndviStress,
                WEIGHT_RAIN, $rainStress,
                WEIGHT_HEAT, $heatStress,
                $lossPct
            ),
        ];

        return [
            'ndvi_now'      => $ndviNow,
            'ndvi_base'     => $ndviBase,
            'ndvi_stress'   => round($ndviStress, 2),
            'rain_actual'   => $actualRain,
            'rain_expected' => $expectedRain,
            'rain_stress'   => round($rainStress, 2),
            'rain_type'     => $rainType,
            'heat_days'     => $hotDays,
            'heat_total'    => $totalDays,
            'heat_stress'   => round($heatStress, 2),
            'loss_pct'      => $lossPct,
            'threshold'     => $threshold,
            'eligible'      => $eligible,
            'sum_insured'   => $sumInsured,
            'premium'       => $premium,
            'premium_rate'  => $premiumRate,
            'payout'        => $payout,
            'scheme'        => $scheme,
            'veg_health'    => $vegHealth,
            'veg_color'     => $vegColor,
            'evidence'      => $evidence,
        ];
    }

    /**
     * Generate tamper-evident SHA-256 hash of the evidence
     */
    public function hashEvidence($assessment) {
        $evidenceStr = json_encode($assessment['evidence'] ?? $assessment, JSON_UNESCAPED_UNICODE);
        return hash('sha256', $evidenceStr);
    }
}
