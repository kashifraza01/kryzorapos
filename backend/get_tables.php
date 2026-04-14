<?php
try {
    $pdo = new PDO('pgsql:host=ep-soft-truth-angd73n8-pooler.c-6.us-east-1.aws.neon.tech;port=5432;dbname=neondb;sslmode=require', 'neondb_owner', 'npg_VQsekRq05SXg');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'");
    print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
} catch(PDOException $e) {
    echo $e->getMessage();
}
