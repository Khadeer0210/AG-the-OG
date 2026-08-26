<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — Database Setup Script
// Run once: http://localhost/agrivision/api/setup.php
// ═══════════════════════════════════════════════════════
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain');

try {
    // Connect without database first
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', DB_HOST, DB_PORT);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    echo "✅ Connected to MySQL\n\n";

    // Create database
    $pdo->exec('CREATE DATABASE IF NOT EXISTS `agrivision` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `agrivision`');
    echo "✅ Database 'agrivision' ready\n\n";

    // Execute schema
    $schema = file_get_contents(__DIR__ . '/schema.sql');
    // Remove CREATE DATABASE and USE statements (already done above)
    $schema = preg_replace('/CREATE DATABASE.*?;\s*/i', '', $schema);
    $schema = preg_replace('/USE.*?;\s*/i', '', $schema);

    // Split into individual statements
    $statements = array_filter(array_map('trim', explode(';', $schema)));
    foreach ($statements as $stmt) {
        if (!empty($stmt) && !preg_match('/^\s*--/', $stmt)) {
            $pdo->exec($stmt);
        }
    }
    echo "✅ Schema tables created\n\n";

    // Execute extended schema (field-centric tables)
    $extFile = __DIR__ . '/schema_extend.sql';
    if (file_exists($extFile)) {
        $ext = file_get_contents($extFile);
        $ext = preg_replace('/USE.*?;\\s*/i', '', $ext);
        $extStmts = array_filter(array_map('trim', explode(';', $ext)));
        foreach ($extStmts as $stmt) {
            if (!empty($stmt) && !preg_match('/^\\s*--/', $stmt)) {
                try { $pdo->exec($stmt); } catch (Exception $e) { /* ignore if exists */ }
            }
        }
        echo "✅ Extended schema (field-centric) applied\n\n";
    }

    // Check if seed data exists
    $count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($count == 0) {
        // Execute seed data
        $seed = file_get_contents(__DIR__ . '/seed.sql');
        $seed = preg_replace('/USE.*?;\s*/i', '', $seed);
        $seedStatements = array_filter(array_map('trim', explode(';', $seed)));
        foreach ($seedStatements as $stmt) {
            if (!empty($stmt) && !preg_match('/^\s*--/', $stmt)) {
                $pdo->exec($stmt);
            }
        }
        echo "✅ Seed data inserted\n\n";
    } else {
        echo "ℹ️ Seed data already exists ($count users)\n\n";
    }

    // List tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "📋 Tables in 'agrivision':\n";
    foreach ($tables as $t) {
        $count = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        echo "   • $t ($count rows)\n";
    }

    echo "\n🎉 Setup complete! Your database is ready.\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\nMake sure:\n";
    echo "1. XAMPP MySQL is running\n";
    echo "2. User 'root' with no password can connect\n";
    echo "3. Port 3306 is accessible\n";
}
