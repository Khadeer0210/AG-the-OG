<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Database Connection (PDO Singleton)
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/config.php';

function get_db() {
    static $pdo = null;
    static $failed = false;
    if ($failed) return null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 2, // 2 second timeout so app doesn't hang if MySQL is off
            ]);
        } catch (PDOException $e) {
            $failed = true;
            return null; // Return null instead of killing the API response
        }
    }
    return $pdo;
}
