<?php
try {
    $pdo = new PDO('pgsql:host=ep-soft-truth-angd73n8-pooler.c-6.us-east-1.aws.neon.tech;port=5432;dbname=neondb;sslmode=require', 'neondb_owner', 'npg_VQsekRq05SXg');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->prepare("UPDATE users SET plan = 'full', subscription_expires_at = '2126-04-14 00:00:00' WHERE email = 'admin@kryzorapos.com'");
    $stmt->execute();
    echo "Done";
} catch(PDOException $e) {
    echo $e->getMessage();
}
