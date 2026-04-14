<?php
try {
    $pdo = new PDO('pgsql:host=ep-soft-truth-angd73n8-pooler.c-6.us-east-1.aws.neon.tech;port=5432;dbname=neondb;sslmode=require', 'neondb_owner', 'npg_VQsekRq05SXg');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('DROP TABLE IF EXISTS roles CASCADE;');
    $pdo->exec('CREATE TABLE roles (id bigserial primary key, name varchar(255) not null, slug varchar(255) not null, description text null, created_at timestamp null, updated_at timestamp null)');
    echo "Table created.\n";
    $pdo->exec('alter table roles add constraint roles_slug_unique unique (slug)');
    echo "Unique constraint added.\n";
} catch(PDOException $e) {
    echo $e->getMessage();
}
