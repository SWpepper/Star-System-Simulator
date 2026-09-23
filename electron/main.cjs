const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

let mainWindow = null;

function writeErrorLog(error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);

  try {
    const logDirectory = app.getPath('userData');
    fs.mkdirSync(logDirectory, { recursive: true });
    fs.appendFileSync(
      path.join(logDirectory, 'startup-error.log'),
      `${new Date().toISOString()} ${message}\n`,
    );
  } catch (logError) {
    console.error('无法写入启动错误日志:', logError);
  }
}

process.on('uncaughtException', (error) => {
  writeErrorLog(error);
  dialog.showErrorBox('恒星系模拟器启动失败', error.message);
  app.exit(1);
});

process.on('unhandledRejection', (error) => {
  writeErrorLog(error);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: '恒星系模拟器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    backgroundColor: '#000005',
    autoHideMenuBar: true,
    show: !process.argv.includes('--smoke-test'),
  });

  const smokeTest = process.argv.includes('--smoke-test');
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const loadPromise = devServerUrl
    ? mainWindow.loadURL(devServerUrl)
    : mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'web', 'index.html'));

  loadPromise.catch((error) => {
    writeErrorLog(error);
    if (!smokeTest) {
      dialog.showErrorBox('页面加载失败', error.message);
    }
    app.exit(1);
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    writeErrorLog(`页面加载失败 (${code}): ${description} ${url}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    writeErrorLog(`渲染进程退出: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!smokeTest) {
      return;
    }

    setTimeout(async () => {
      try {
        const ready = await mainWindow.webContents.executeJavaScript(
          "document.documentElement.dataset.appReady === 'true' && Boolean(document.querySelector('#container canvas'))",
        );
        console.log(ready ? 'electron-smoke: ok' : 'electron-smoke: renderer not ready');
        const exitCode = ready ? 0 : 1;
        mainWindow.destroy();
        app.quit();
        setTimeout(() => app.exit(exitCode), 500);
      } catch (error) {
        writeErrorLog(error);
        console.error('electron-smoke: failed');
        app.exit(1);
      }
    }, 1500);
  });

  mainWindow.once('ready-to-show', () => {
    if (!smokeTest) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app
  .whenReady()
  .then(createWindow)
  .catch((error) => {
    writeErrorLog(error);
    app.exit(1);
  });

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    const allowedPrefix = process.env.VITE_DEV_SERVER_URL || 'file:';
    if (!url.startsWith(allowedPrefix)) {
      event.preventDefault();
    }
  });
});
