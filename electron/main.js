const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

// ============================================================
// SINGLE INSTANCE LOCK — Prevent multiple app launches
// ============================================================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

let mainWindow = null;
let backendProcess = null;
const isDev = !app.isPackaged;

// ============================================================
// PATH HELPERS
// ============================================================

function getResourcePath(relativePath) {
    if (isDev) {
        return path.join(__dirname, '..', relativePath);
    }
    return path.join(process.resourcesPath, relativePath);
}

function getPhpPath() {
    if (isDev) {
        return 'php';
    }
    const bundledPhp = path.join(process.resourcesPath, 'php', 'php.exe');
    if (fs.existsSync(bundledPhp)) {
        return bundledPhp;
    }
    return 'php';
}

function getPhpIni() {
    if (isDev) {
        return path.join(__dirname, 'php', 'php.ini');
    }
    return path.join(process.resourcesPath, 'php', 'php.ini');
}

// ============================================================
// DIRECTORY & DATABASE SETUP
// ============================================================

function ensureStorageDirs(backendDir) {
    const dirs = [
        path.join(backendDir, 'storage', 'logs'),
        path.join(backendDir, 'storage', 'framework', 'cache', 'data'),
        path.join(backendDir, 'storage', 'framework', 'sessions'),
        path.join(backendDir, 'storage', 'framework', 'views'),
        path.join(backendDir, 'storage', 'app', 'public'),
        path.join(backendDir, 'bootstrap', 'cache'),
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function ensureDatabase(backendDir) {
    const dbPath = path.join(backendDir, 'database', 'KryzoraPOS.sqlite');
    const dbDir = path.join(backendDir, 'database');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, '');
        console.log('Created empty SQLite database');
    }
}

// ============================================================
// BACKEND MANAGEMENT
// ============================================================

function startBackend() {
    const backendDir = getResourcePath('backend');
    const phpPath = getPhpPath();
    const phpIni = getPhpIni();

    console.log(`Backend dir: ${backendDir}`);
    console.log(`PHP path: ${phpPath}`);
    console.log(`PHP ini: ${phpIni}`);

    ensureStorageDirs(backendDir);
    ensureDatabase(backendDir);

    try {
        if (phpPath !== 'php' && !fs.existsSync(phpPath)) {
            throw new Error(`Bundled PHP not found at: ${phpPath}`);
        }

        // Build PHP args
        const phpArgs = [];
        if (fs.existsSync(phpIni)) {
            phpArgs.push('-c', phpIni);
        }

        // Run migrations synchronously to ensure DB is ready before server starts
        const migrateArgs = [...phpArgs, 'artisan', 'migrate', '--force'];
        console.log(`Running migrations: ${phpPath} ${migrateArgs.join(' ')}`);

        // Run migrations asynchronously so it doesn't block main process GUI
        console.log('Running migrations...');
        const migrateCmd = `"${phpPath}" ${phpArgs.map(a => `"${a}"`).join(' ')} artisan migrate --force`;
        require('child_process').exec(migrateCmd, {
            cwd: backendDir,
            windowsHide: true,
            timeout: 30000, // 30 second timeout for migrations
            env: { ...process.env, APP_ENV: 'production' }
        }, (error) => {
            if (error) {
                console.error('Migration failed:', error);
            } else {
                console.log('Migrations completed successfully.');
            }

            // Start the PHP built-in server AFTER migrations return or run parallel
            const serverArgs = [...phpArgs, '-S', '127.0.0.1:8111', '-t', 'public', 'server.php'];
            console.log(`Starting server: ${phpPath} ${serverArgs.join(' ')}`);

            backendProcess = spawn(phpPath, serverArgs, {
                cwd: backendDir,
                stdio: 'pipe',
                shell: false,
                env: { 
                    ...process.env, 
                    APP_ENV: 'production',
                    PHP_CLI_SERVER_WORKERS: '10' 
                }
            });

            backendProcess.stdout.on('data', (data) => {
                console.log(`[Backend] ${data.toString().trim()}`);
            });

            backendProcess.stderr.on('data', (data) => {
                console.log(`[Backend] ${data.toString().trim()}`);
            });

            backendProcess.on('error', (err) => {
                console.error('Backend process error:', err);
                showPhpError();
            });

            backendProcess.on('close', (code) => {
                console.log(`Backend process exited with code ${code}`);
                backendProcess = null;
            });
            console.log('Backend server starting on http://127.0.0.1:8111');
        });

    } catch (err) {
        console.error('Failed to start backend:', err);
        showPhpError();
    }
}

function showPhpError() {
    dialog.showErrorBox(
        'KryzoraPOS - Backend Error',
        'Could not start the backend server.\n\n' +
        'Possible causes:\n' +
        '• PHP runtime is missing or corrupted\n' +
        '• Port 8111 is already in use\n' +
        '• Required PHP extensions are missing\n\n' +
        'Try restarting the application.\n' +
        'If the problem persists, reinstall KryzoraPOS.'
    );
}

/**
 * CRITICAL: Kill the backend PHP process and all children.
 * Uses taskkill with /T flag to kill the entire process tree.
 */
function stopBackend() {
    if (backendProcess && backendProcess.pid) {
        console.log(`Stopping backend process (PID: ${backendProcess.pid})`);
        try {
            // Use execSync to ensure the process is killed before we continue
            execSync(`taskkill /F /T /PID ${backendProcess.pid}`, {
                stdio: 'ignore',
                windowsHide: true,
            });
            console.log('Backend process killed successfully');
        } catch (e) {
            // Process may have already exited
            console.log('Backend process already stopped or could not be killed');
        }
        backendProcess = null;
    }
    
    // Safety check: Ensure port 8111 is free
    try {
        execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :8111') do taskkill /F /PID %a`, {
            shell: 'cmd.exe',
            stdio: 'ignore',
            windowsHide: true,
        });
    } catch(e) {}
}

// ============================================================
// WINDOW MANAGEMENT
// ============================================================

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'KryzoraPOS',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            devTools: isDev,
        },
        show: false,
        backgroundColor: '#0e1117',
        autoHideMenuBar: true,
    });

    // Remove menu bar entirely
    Menu.setApplicationMenu(null);

    // Show window after content is ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Load the frontend
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000').catch(() => {
            console.log("Dev server not found, falling back to build...");
            loadProductionBuild();
        });
    } else {
        loadProductionBuild();
    }

    function loadProductionBuild() {
        const distPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
        console.log(`Loading production build from: ${distPath}`);
        mainWindow.loadFile(distPath).catch((err) => {
            console.error('Could not load app:', err);
            mainWindow.loadURL(`data:text/html,
                <div style="font-family:system-ui;padding:3rem;background:#0e1117;color:#f1f5f9;min-height:100vh;">
                    <h1 style="color:#FF4D4D;">KryzoraPOS Error</h1>
                    <p>Application files not found.</p>
                    <p style="color:#94a3b8;">Expected: ${distPath}</p>
                    <p style="color:#94a3b8;">Please reinstall KryzoraPOS.</p>
                </div>`);
        });
    }

    // Block navigation to external URLs (security)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.origin !== 'http://127.0.0.1:8111' &&
                parsedUrl.origin !== 'http://localhost:3000' &&
                parsedUrl.protocol !== 'file:') {
                event.preventDefault();
                shell.openExternal(url);
            }
        } catch (e) {
            event.preventDefault();
        }
    });

    // Block popup windows
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // When the window is closed, set reference to null
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ============================================================
// APP LIFECYCLE — CRITICAL: Proper close behavior
// ============================================================

function waitForBackend(callback) {
    const MAX_RETRIES = 60; // 60 seconds max
    let retries = 0;
    const check = () => {
        retries++;
        if (retries > MAX_RETRIES) {
            console.error('Backend failed to start within 60 seconds');
            dialog.showErrorBox(
                'KryzoraPOS - Startup Failed',
                'The backend server did not start within 60 seconds.\n\n' +
                'Possible causes:\n' +
                '• PHP runtime is missing or corrupted\n' +
                '• Port 8111 is already in use\n' +
                '• Database migration failed\n\n' +
                'Please restart the application.\n' +
                'If the problem persists, reinstall KryzoraPOS.'
            );
            app.quit();
            return;
        }
        const req = http.get('http://127.0.0.1:8111/api/settings/public', (res) => {
            if (res.statusCode === 200) {
                console.log('Backend is ready!');
                callback();
            } else {
                setTimeout(check, 1000);
            }
        }).on('error', () => {
            console.log(`Waiting for backend... (${retries}/${MAX_RETRIES})`);
            setTimeout(check, 1000);
        });
        req.end();
    };
    check();
}

app.whenReady().then(() => {
    startBackend();
    waitForBackend(() => {
        createWindow();
    });
});

// Second instance: focus existing window instead of opening new one
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});

// CRITICAL: When all windows are closed, quit the app (no hiding to tray)
app.on('window-all-closed', () => {
    stopBackend();
    app.quit();
});

// CRITICAL: Clean up backend before quitting
app.on('before-quit', () => {
    stopBackend();
});

// Safety net: If before-quit didn't clean up, will-quit is the last chance
app.on('will-quit', (event) => {
    stopBackend();
});

// macOS: re-create window if dock icon clicked
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Security: Disable remote module access
app.on('remote-require', (event) => event.preventDefault());
app.on('remote-get-builtin', (event) => event.preventDefault());
app.on('remote-get-global', (event) => event.preventDefault());
app.on('remote-get-current-window', (event) => event.preventDefault());
app.on('remote-get-current-web-contents', (event) => event.preventDefault());
