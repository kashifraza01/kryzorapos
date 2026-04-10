# KryzoraPOS — Final Hardening & Production Readiness

## Summary

Complete audit of the codebase has revealed **17 critical issues** across 8 areas. This plan addresses every one without breaking existing functionality.

---

## PHASE 1 — Seeder Safety (CRITICAL)

### Issues Found in [KryzoraPOSSeeder.php](file:///d:/Kryzora%20POS/backend/database/seeders/KryzoraPOSSeeder.php)

| # | Issue | Severity |
|---|-------|----------|
| 1 | `Setting::truncate()` on line 26 — **deletes all settings on re-run** | 🔴 Critical |
| 2 | Lines 24-25 — garbled/broken code (`User::firstOrCreate([...])`) | 🔴 Critical |
| 3 | `PRAGMA foreign_keys = OFF` — disables referential integrity | 🟡 High |
| 4 | Hardcoded lifetime license `KRYZORA-LIFETIME-VIP` with 100-year expiry | 🔴 Critical |
| 5 | `User::create` for admin (line 115) — duplicates on re-run | 🟡 High |
| 6 | `Permission::create` (line 108) — duplicates on re-run | 🟡 High |
| 7 | 50 dummy customers + 20 tables created without duplicate checks | 🟡 High |
| 8 | 1-month demo data loop (~675-1800 fake orders) — **production data pollution** | 🔴 Critical |

#### [MODIFY] [KryzoraPOSSeeder.php](file:///d:/Kryzora%20POS/backend/database/seeders/KryzoraPOSSeeder.php)

**Changes:**
- Remove ALL `truncate()` calls and PRAGMA statements
- Remove broken garbled lines 24-25
- Replace `User::create` with `User::firstOrCreate` for admin user
- Replace `Permission::create` with `Permission::firstOrCreate`
- Replace `MenuCategory::create` and `MenuItem::create` with `firstOrCreate`
- Replace `RestaurantTable::create` with `firstOrCreate`
- Replace `Customer::create` with `firstOrCreate`
- **Remove** the entire 1-month demo data generation loop (lines 122-187)
- **Remove** the fake lifetime license values (lines 44-47)
- Add only safe default settings (restaurant name, currency, etc.) without license data
- Seeder becomes safe to re-run at any time — idempotent

---

## PHASE 2 — License System Hardening

### Issues Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Hardcoded `MASTER_KEYS` in plain text — anyone reading source knows all keys | [LicenseService.php](file:///d:/Kryzora%20POS/backend/app/Services/LicenseService.php) L42-50 | 🔴 Critical |
| 2 | License stored as plain text in `settings` table — trivially editable in SQLite | LicenseService.php | 🔴 Critical |
| 3 | No HMAC/signature to detect tampering | LicenseService.php | 🔴 Critical |
| 4 | Grace period offline check is commented out | [License.php](file:///d:/Kryzora%20POS/backend/app/Models/License.php) L43 | 🟡 High |
| 5 | `License` model exists but is unused — all data in Settings table | License.php | 🟠 Medium |

#### [MODIFY] [LicenseService.php](file:///d:/Kryzora%20POS/backend/app/Services/LicenseService.php)

**Changes:**
- **Remove hardcoded master keys** — replace with HMAC-verified key format
- Keys will follow format: `KRYZORA-{PLAN}-{MONTHS}-{HMAC_SIGNATURE}`
- Server-side HMAC uses `APP_KEY` as the secret — keys are generated server-side
- Add `generateKey()` method for creating legitimate keys (admin command)
- Add `verifyKeySignature()` — validates HMAC before accepting any key
- Add **tamper detection**: license data is stored with an integrity hash
- When reading license from Settings, verify the stored HMAC matches — if tampered, invalidate
- **Enforce offline grace period**: if `license_last_verified` is > 5 days old and no internet check succeeds, block the app
- Add `storeLicenseSecure()` that writes data + HMAC signature together

#### [NEW] [GenerateLicenseKey.php](file:///d:/Kryzora%20POS/backend/app/Console/Commands/GenerateLicenseKey.php)

Artisan command `php artisan license:generate {plan} {months}` for you (the vendor) to generate valid license keys. This is the ONLY way to create keys.

---

## PHASE 3 — Electron App Close Fix

### Issues Found in [main.js](file:///d:/Kryzora%20POS/electron/main.js)

| # | Issue | Severity |
|---|-------|----------|
| 1 | No port cleanup on startup — orphan PHP from previous crash blocks port 8111 | 🔴 Critical |
| 2 | `stopBackend()` called in both `before-quit` and `will-quit` — redundant race | 🟡 High |
| 3 | No forced `process.exit()` after cleanup — can hang | 🟡 High |
| 4 | Backend starts inside async callback — `backendProcess` ref may be null during quit | 🟡 High |

#### [MODIFY] [main.js](file:///d:/Kryzora%20POS/electron/main.js)

**Changes:**
- Add `killPort8111()` function — on startup, kills any existing process on port 8111 using `netstat` + `taskkill`
- Consolidate quit handler: use only `before-quit` with synchronous `stopBackend()`
- Add `process.exit(0)` in `will-quit` as final fallback
- Add `isQuitting` flag to prevent race conditions between window close and app quit
- Add 3-second safety timeout: if backend hasn't stopped after 3s, force-kill everything

---

## PHASE 4 — Backend Start Stability

### Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | `createWindow()` called BEFORE `startBackend()` — line 289 | 🔴 Critical |
| 2 | No health check ensures backend is ready before UI loads | 🔴 Critical |
| 3 | Frontend relies on AuthContext retry (15×1s) which may not be enough | 🟡 High |

#### [MODIFY] [main.js](file:///d:/Kryzora%20POS/electron/main.js)

**Changes:**
- Reorder startup: `startBackend()` first, then create window
- Add `waitForBackend()` — polls `http://127.0.0.1:8111/api/settings/public` with retries (30 attempts × 1s)
- Only call `createWindow()` after backend responds successfully
- Show a native splash/loading dialog if backend takes > 3 seconds
- If backend fails after 30 attempts, show error dialog and exit

---

## PHASE 5 — PHP Bundling Enforcement

### Issues Found in [main.js](file:///d:/Kryzora%20POS/electron/main.js)

| # | Issue | Severity |
|---|-------|----------|
| 1 | `getPhpPath()` line 31-33: dev mode returns system `'php'` | 🟡 Medium |
| 2 | Line 38: production fallback returns system `'php'` if bundled missing | 🔴 Critical |

#### [MODIFY] [main.js](file:///d:/Kryzora%20POS/electron/main.js) — `getPhpPath()`

**Changes:**
- In **production**: if bundled PHP not found → show error dialog and `app.quit()` — NO fallback to system PHP
- In **dev mode**: keep using system PHP (acceptable for development)
- Add clear error message: "PHP runtime not found. Please reinstall KryzoraPOS."

---

## PHASE 6 — Database Safety

### Current State

The existing `ensureDatabase()` and migration logic is mostly correct:
- Creates empty SQLite file if missing ✅
- Runs `migrate --force` before server starts ✅

#### Minor Fixes in [main.js](file:///d:/Kryzora%20POS/electron/main.js)

- Pass `-c php.ini` flag to the migration exec command (currently missing)
- Add error handling: if migration fails, show error and exit instead of silently continuing

---

## PHASE 7 — Bug Fixing

### Frontend API Interceptor

#### [MODIFY] [api.js](file:///d:/Kryzora%20POS/frontend/src/api.js)

Add response interceptor for 403 errors:
- If response includes `requires_activation: true` → clear localStorage and redirect to license screen
- If response includes `license_status: 'feature_locked'` → show toast notification
- Prevents the app from silently failing when license expires mid-session

### Seeder Broken Lines

Lines 24-25 in seeder are garbled code remnants — will be removed in Phase 1.

---

## PHASE 8 — Final Validation

After all changes, verification steps:

### Automated Tests
1. Run `php artisan migrate:fresh --force` — verify clean migration
2. Run `php artisan db:seed` — verify seeder runs without errors
3. Run seeder **again** — verify idempotent (no duplicates, no errors)
4. Run `php artisan license:generate full 12` — verify key generation
5. Start backend on port 8111, verify `/api/settings/public` responds
6. Verify `/api/auth/license/check` returns `{ valid: false }` (no license)

### Manual Verification
- Launch Electron app → verify backend starts first, then UI
- Verify license activation screen appears (no pre-seeded license)
- Activate with a generated key → verify app unlocks
- Close app → verify no orphan processes in Task Manager
- Re-launch → verify data persists

---

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `backend/database/seeders/KryzoraPOSSeeder.php` | MODIFY | 1 |
| `backend/app/Services/LicenseService.php` | MODIFY | 2 |
| `backend/app/Console/Commands/GenerateLicenseKey.php` | NEW | 2 |
| `electron/main.js` | MODIFY | 3, 4, 5, 6 |
| `frontend/src/api.js` | MODIFY | 7 |

> [!IMPORTANT]
> No existing working features will be broken. All changes are additive or replacement-only.

## Open Questions

> [!IMPORTANT]
> **License Key Distribution**: The new HMAC-based keys will need to be generated via `php artisan license:generate {plan} {months}`. Do you want me to also create a simple batch file/script that generates keys for you to give to customers?

> [!NOTE]
> The `License` model (`app/Models/License.php`) is currently unused — all license data lives in the `settings` table. I will keep using the Settings table approach since it's already wired throughout the system. The License model will remain as-is for potential future use.
