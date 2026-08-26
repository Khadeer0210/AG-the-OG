<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — WeatherEngine (Open-Meteo free API)
// ═══════════════════════════════════════════════════════

class WeatherEngine {
    private $lat;
    private $lng;
    private $baseUrl;

    public function __construct($lat, $lng) {
        $this->lat = $lat;
        $this->lng = $lng;
        $this->baseUrl = OPEN_METEO_URL;
    }

    public function getCurrent() {
        $url = "{$this->baseUrl}/forecast?latitude={$this->lat}&longitude={$this->lng}"
             . "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure"
             . "&timezone=Asia/Kolkata";

        $res = curl_get($url);
        if ($res['code'] !== 200) {
            return $this->fallbackCurrent();
        }

        $data = json_decode($res['body'], true);
        $c = $data['current'] ?? [];

        return [
            'temp' => $c['temperature_2m'] ?? 29,
            'humidity' => $c['relative_humidity_2m'] ?? 78,
            'feels_like' => $c['apparent_temperature'] ?? 32,
            'precipitation' => $c['precipitation'] ?? 0,
            'wind_speed' => $c['wind_speed_10m'] ?? 12,
            'wind_dir' => $c['wind_direction_10m'] ?? 180,
            'pressure' => $c['surface_pressure'] ?? 1008,
            'weather_code' => $c['weather_code'] ?? 2,
            'condition' => $this->weatherCodeToText($c['weather_code'] ?? 2),
            'icon' => $this->weatherCodeToIcon($c['weather_code'] ?? 2),
            'source' => 'Open-Meteo',
        ];
    }

    public function getHourly() {
        $url = "{$this->baseUrl}/forecast?latitude={$this->lat}&longitude={$this->lng}"
             . "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code"
             . "&forecast_hours=24&timezone=Asia/Kolkata";

        $res = curl_get($url);
        if ($res['code'] !== 200) return $this->fallbackHourly();

        $data = json_decode($res['body'], true);
        $hourly = $data['hourly'] ?? [];
        $result = [];

        for ($i = 0; $i < min(24, count($hourly['time'] ?? [])); $i++) {
            $result[] = [
                'time' => $hourly['time'][$i] ?? '',
                'temp' => $hourly['temperature_2m'][$i] ?? 0,
                'humidity' => $hourly['relative_humidity_2m'][$i] ?? 0,
                'rain_prob' => $hourly['precipitation_probability'][$i] ?? 0,
                'precipitation' => $hourly['precipitation'][$i] ?? 0,
            ];
        }
        return ['hourly' => $result, 'source' => 'Open-Meteo'];
    }

    public function getDaily($days = 7) {
        $url = "{$this->baseUrl}/forecast?latitude={$this->lat}&longitude={$this->lng}"
             . "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
             . "&forecast_days={$days}&timezone=Asia/Kolkata";

        $res = curl_get($url);
        if ($res['code'] !== 200) return $this->fallbackDaily();

        $data = json_decode($res['body'], true);
        $daily = $data['daily'] ?? [];
        $result = [];

        for ($i = 0; $i < count($daily['time'] ?? []); $i++) {
            $result[] = [
                'date' => $daily['time'][$i] ?? '',
                'temp_max' => $daily['temperature_2m_max'][$i] ?? 0,
                'temp_min' => $daily['temperature_2m_min'][$i] ?? 0,
                'precipitation' => $daily['precipitation_sum'][$i] ?? 0,
                'rain_prob' => $daily['precipitation_probability_max'][$i] ?? 0,
                'wind_max' => $daily['wind_speed_10m_max'][$i] ?? 0,
                'icon' => $this->weatherCodeToIcon($daily['weather_code'][$i] ?? 0),
                'condition' => $this->weatherCodeToText($daily['weather_code'][$i] ?? 0),
            ];
        }
        return ['daily' => $result, 'source' => 'Open-Meteo'];
    }

    public function getArchive($startDate, $endDate) {
        $url = "https://archive-api.open-meteo.com/v1/archive?latitude={$this->lat}&longitude={$this->lng}"
             . "&start_date={$startDate}&end_date={$endDate}"
             . "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean"
             . "&timezone=Asia/Kolkata";

        $res = curl_get($url, 30);
        if ($res['code'] !== 200) return ['error' => 'Archive fetch failed', 'fallback' => true];

        return json_decode($res['body'], true);
    }

    public function getClimateAnalysis() {
        // Fetch 120-day archive + 16-day forecast
        $archiveStart = date('Y-m-d', strtotime('-120 days'));
        $archiveEnd = date('Y-m-d', strtotime('-1 day'));
        $archive = $this->getArchive($archiveStart, $archiveEnd);

        $daily = $this->getDaily(16);

        // Compute climate indices
        $archiveDaily = $archive['daily'] ?? [];
        $precipValues = $archiveDaily['precipitation_sum'] ?? [];
        $tempMaxValues = $archiveDaily['temperature_2m_max'] ?? [];

        $totalRain = array_sum($precipValues);
        $avgRain = count($precipValues) > 0 ? $totalRain / count($precipValues) : 0;
        $normalRain120 = 350; // mm approx for Sriperumbudur 120-day period

        $rainAnomaly = $normalRain120 > 0 ? round(($totalRain - $normalRain120) / $normalRain120 * 100, 1) : 0;

        // Dry spell (consecutive days with <1mm rain)
        $drySpell = 0; $maxDry = 0;
        foreach ($precipValues as $p) {
            if ($p < 1) { $drySpell++; $maxDry = max($maxDry, $drySpell); }
            else { $drySpell = 0; }
        }

        // Heatwave (days where Tmax > baseline+3)
        $baseline_tmax = 33; // approx for Sriperumbudur
        $heatDays = 0;
        foreach ($tempMaxValues as $t) {
            if ($t > $baseline_tmax + 3) $heatDays++;
        }

        // 30-day SPI-like (simplified)
        $last30Rain = array_sum(array_slice($precipValues, -30));
        $normal30 = 90; // mm approx
        $spi = $normal30 > 0 ? round(($last30Rain - $normal30) / max($normal30 * 0.3, 1), 2) : 0;

        return [
            'rain_anomaly_pct' => $rainAnomaly,
            'spi_30day' => $spi,
            'heatwave_days' => $heatDays,
            'max_dry_spell_days' => $maxDry,
            'total_rain_120d' => round($totalRain, 1),
            'monsoon_onset_estimate' => 'Jun 8 (based on historical)',
            'forecast_16d' => $daily,
            'source' => 'Open-Meteo Archive + Forecast',
        ];
    }

    private function weatherCodeToText($code) {
        $map = [0 => 'Clear sky', 1 => 'Mainly clear', 2 => 'Partly cloudy', 3 => 'Overcast',
                45 => 'Fog', 48 => 'Rime fog', 51 => 'Light drizzle', 53 => 'Moderate drizzle',
                55 => 'Dense drizzle', 61 => 'Slight rain', 63 => 'Moderate rain', 65 => 'Heavy rain',
                71 => 'Slight snow', 73 => 'Moderate snow', 75 => 'Heavy snow',
                80 => 'Slight showers', 81 => 'Moderate showers', 82 => 'Violent showers',
                95 => 'Thunderstorm', 96 => 'Thunderstorm with hail', 99 => 'Thunderstorm with heavy hail'];
        return $map[$code] ?? 'Unknown';
    }

    private function weatherCodeToIcon($code) {
        if ($code <= 1) return '☀️';
        if ($code <= 3) return '⛅';
        if ($code <= 48) return '🌫️';
        if ($code <= 55) return '🌦️';
        if ($code <= 65) return '🌧️';
        if ($code <= 75) return '🌨️';
        if ($code <= 82) return '🌧️';
        return '⛈️';
    }

    private function fallbackCurrent() {
        return ['temp' => 29, 'humidity' => 78, 'feels_like' => 32, 'precipitation' => 0, 'wind_speed' => 12, 'condition' => 'Partly Cloudy', 'icon' => '⛅', 'source' => 'fallback'];
    }

    private function fallbackHourly() {
        $result = [];
        for ($i = 0; $i < 24; $i++) {
            $result[] = ['time' => date('Y-m-d\TH:00', strtotime("+{$i} hours")), 'temp' => 25 + rand(0, 8), 'humidity' => 60 + rand(0, 30), 'rain_prob' => rand(0, 50), 'precipitation' => 0];
        }
        return ['hourly' => $result, 'source' => 'fallback'];
    }

    private function fallbackDaily() {
        $result = [];
        for ($i = 0; $i < 7; $i++) {
            $result[] = ['date' => date('Y-m-d', strtotime("+{$i} days")), 'temp_max' => 30 + rand(0, 4), 'temp_min' => 23 + rand(0, 3), 'precipitation' => rand(0, 20), 'rain_prob' => rand(10, 80), 'icon' => '⛅', 'condition' => 'Partly Cloudy'];
        }
        return ['daily' => $result, 'source' => 'fallback'];
    }
}
