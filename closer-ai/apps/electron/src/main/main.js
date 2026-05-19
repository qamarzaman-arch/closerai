const { app, BrowserWindow, desktopCapturer, session } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// CSP — strict in prod, allow Vite HMR eval in dev only
const CSP_DEV = [
  "default-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "connect-src 'self' ws://localhost:* http://localhost:* wss://localhost:*",
  "media-src 'self' mediastream: blob:",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
  "worker-src blob: 'self'",
].join('; ');

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' ws://localhost:3001 http://localhost:3001",
  "media-src 'self' mediastream: blob:",
  "worker-src blob: 'self'",
  "img-src 'self' data:",
].join('; ');

function setupSessionCSP() {
  // Inject CSP header on all responses from defaultSession
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDev ? CSP_DEV : CSP_PROD],
      },
    });
  });
}

function setupDisplayMedia(win) {
  // Attach to the window's actual session — more reliable than defaultSession
  const ses = win.webContents.session;

  // audio: 'loopback' on Windows = captures ALL system audio automatically
  // (Zoom, Meet, Teams, phone calls — everything playing through speakers)
  // Mac/Linux: user must check "Share audio" in the OS picker dialog
  ses.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ['screen', 'window'] })
      .then((sources) => {
        if (!sources.length) {
          console.warn('[CloserAI] No desktop sources found for display media');
          return callback({});
        }
        console.log('[CloserAI] Display media handler: providing source', sources[0].name);
        callback({
          video: sources[0],
          audio: process.platform === 'win32' ? 'loopback' : undefined,
        });
      })
      .catch((err) => {
        console.error('[CloserAI] desktopCapturer.getSources failed:', err);
        callback({});
      });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#111827',
    title: 'CloserAI',
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  win.webContents.on('will-navigate', (event, url) => {
    const allowedDevUrl = url.startsWith('http://localhost:5173');
    if (!isDev || !allowedDevUrl) event.preventDefault();
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Must be called after win is created so win.webContents.session is available
  setupDisplayMedia(win);
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    setupSessionCSP();
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
