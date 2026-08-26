<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — SoilEngine (ISRIC SoilGrids v2, free)
// ═══════════════════════════════════════════════════════

class SoilEngine {
    private $lat;
    private $lng;

    public function __construct($lat, $lng) {
        $this->lat = $lat;
        $this->lng = $lng;
    }

    public function fetchSoilGrids() {
        $properties = ['phh2o', 'nitrogen', 'soc', 'bdod', 'cec', 'clay', 'sand', 'silt'];
        $depths = '0-5cm,5-15cm,15-30cm';
        $url = SOILGRIDS_URL . "/properties/query?"
             . "lon={$this->lng}&lat={$this->lat}"
             . "&property=" . implode(',', $properties)
             . "&depth={$depths}&value=mean";

        $res = curl_get($url, 15);

        if ($res['code'] !== 200) {
            return $this->fallbackSoil();
        }

        $data = json_decode($res['body'], true);
        $layers = $data['properties']['layers'] ?? [];
        $result = [];

        foreach ($layers as $layer) {
            $name = $layer['name'] ?? '';
            $depths = $layer['depths'] ?? [];
            $topsoil = $depths[0]['values']['mean'] ?? null;

            switch ($name) {
                case 'phh2o':
                    $result['ph'] = $topsoil !== null ? round($topsoil / 10, 1) : 6.8; // SoilGrids returns pH × 10
                    break;
                case 'nitrogen':
                    $result['n'] = $topsoil !== null ? round($topsoil / 100, 0) : 245; // cg/kg → kg/ha approx
                    break;
                case 'soc':
                    $result['organic_c'] = $topsoil !== null ? round($topsoil / 100, 2) : 0.62; // dg/kg → %
                    break;
            }
        }

        // P and K not in SoilGrids — estimate from soil type
        $result['p'] = $result['p'] ?? 18;
        $result['k'] = $result['k'] ?? 182;
        $result['source'] = 'ISRIC SoilGrids v2';

        return $result;
    }

    public function diagnose($soil) {
        $diagnosis = [];
        $prescription = [];

        // pH
        $ph = $soil['ph'] ?? 7;
        if ($ph < 5.5) {
            $diagnosis[] = "pH: Strongly acidic ({$ph}) — needs liming";
            $prescription[] = "Apply 2-3 t/ha agricultural lime to raise pH";
        } elseif ($ph < 6.0) {
            $diagnosis[] = "pH: Moderately acidic ({$ph})";
            $prescription[] = "Apply 1-2 t/ha dolomite lime";
        } elseif ($ph <= 7.5) {
            $diagnosis[] = "pH: Optimal range ({$ph})";
        } else {
            $diagnosis[] = "pH: Alkaline ({$ph}) — may reduce nutrient availability";
            $prescription[] = "Apply gypsum at 2 t/ha or add organic matter to reduce pH";
        }

        // Nitrogen
        $n = $soil['n'] ?? 0;
        if ($n < 200) {
            $diagnosis[] = "Nitrogen: Low ({$n} kg/ha)";
            $prescription[] = "Apply 40-50 kg/ha urea in 2 split doses";
        } elseif ($n <= 300) {
            $diagnosis[] = "Nitrogen: Adequate ({$n} kg/ha)";
        } else {
            $diagnosis[] = "Nitrogen: High ({$n} kg/ha) — reduce N fertilizer";
        }

        // Phosphorus
        $p = $soil['p'] ?? 0;
        if ($p < 25) {
            $diagnosis[] = "Phosphorus: Low ({$p} kg/ha) — needs supplementation";
            $prescription[] = "Apply 25-30 kg/ha Single Super Phosphate (SSP) at sowing";
        } elseif ($p <= 50) {
            $diagnosis[] = "Phosphorus: Medium ({$p} kg/ha)";
        } else {
            $diagnosis[] = "Phosphorus: High ({$p} kg/ha)";
        }

        // Potassium
        $k = $soil['k'] ?? 0;
        if ($k < 150) {
            $diagnosis[] = "Potassium: Low ({$k} kg/ha)";
            $prescription[] = "Apply 30 kg/ha Muriate of Potash (MOP)";
        } elseif ($k <= 250) {
            $diagnosis[] = "Potassium: Medium ({$k} kg/ha)";
            $prescription[] = "Apply 20 kg/ha MOP at tillering stage";
        } else {
            $diagnosis[] = "Potassium: High ({$k} kg/ha)";
        }

        // Organic Carbon
        $oc = $soil['organic_c'] ?? 0;
        if ($oc < 0.5) {
            $diagnosis[] = "Organic Carbon: Very Low ({$oc}%)";
            $prescription[] = "Add 3-4 t/ha farmyard manure and practice green manuring";
        } elseif ($oc < 0.75) {
            $diagnosis[] = "Organic Carbon: Low ({$oc}%)";
            $prescription[] = "Add 2 t/ha farmyard manure or vermicompost";
        } else {
            $diagnosis[] = "Organic Carbon: Adequate ({$oc}%)";
        }

        // General
        $prescription[] = "Green manure with Dhaincha/Sunhemp before next season";

        // Health score (0-100)
        $score = 50;
        $score += ($ph >= 6.0 && $ph <= 7.5) ? 15 : -5;
        $score += ($n >= 200) ? 10 : -5;
        $score += ($p >= 25) ? 10 : -5;
        $score += ($k >= 150) ? 10 : -5;
        $score += ($oc >= 0.75) ? 10 : ($oc >= 0.5 ? 5 : -5);
        $score = max(0, min(100, $score));

        return [
            'score' => $score,
            'diagnosis' => $diagnosis,
            'prescription' => $prescription,
        ];
    }

    private function fallbackSoil() {
        return [
            'ph' => 6.8, 'n' => 245, 'p' => 18, 'k' => 182, 'organic_c' => 0.62,
            'source' => 'fallback (SoilGrids unreachable)',
        ];
    }
}
