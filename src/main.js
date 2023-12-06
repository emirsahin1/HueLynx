const { app, BrowserWindow, ipcMain, Tray, Menu} = require('electron')
import { is } from '@electron-toolkit/utils'
const { PythonShell } = require('python-shell');
const screenshot = require('screenshot-desktop');
const path = require('path');
require('dotenv').config();

let pythonLoop = null
let pythonPath = process.env.PYTHON_PATH;
let mainWindow = null;
let tray = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

async function discoverLights() {
  return new Promise((resolve, reject) => {
    console.log("Calling python script")
    if (pythonLoop)
      pythonLoop.kill();

    let pythonShell = new PythonShell("./src/light_controls/discover_lights.py", { mode: "json", pythonPath: pythonPath });
    pythonShell.on('message', function (message) {
      resolve(message);
    });

    pythonShell.end(function (err) {
      if (err) {
        console.log("Error Discorvering Lights: " + err);
        reject(err);
      }
    });
  })
}

function startScreenMirroring({lights, region, duration, scale}) {
  console.log("Lights: " + lights)
  return new Promise((resolve, reject) => {
    if (pythonLoop)
      pythonLoop.kill();

    if (lights.length == 0) {
      reject(new Error("BEGIN:Error: No lights/group selected"));
      return
    }
    if (region == null) {
      reject(new Error("BEGIN:Error: No region selected"));
      return
    }
    if (duration == null) {
      reject(new Error("BEGIN:Error: No duration selected"));
      return
    }
    lights = JSON.stringify(lights);
    pythonLoop = new PythonShell("./src/light_controls/mirror_screen.py", { mode: "text", pythonPath: pythonPath, args: [lights, region, duration, scale] });

    pythonLoop.on('message', function (message) {
      console.log(message);
      if (message == "OK")
        resolve("Screen Mirroring Started!");
    });

    pythonLoop.end(function (err) {
      if (err) {
        console.log(err)
        reject(err);
      }
      else {
        reject("BEGIN:Screen Mirroring Unexpectedly Stopped")
      }
    });
  });
}

function startMusicMatch({lights, duration, threshold, sma_window, min_freq, max_freq, base_color, peak_color, noise_gate}) {
  return new Promise((resolve, reject) => {
    if (pythonLoop)
      pythonLoop.kill();

    if (lights.length == 0) {
      reject(new Error("BEGIN:Error: No lights/group selected"));
      return
    }
    lights = JSON.stringify(lights);
    pythonLoop = new PythonShell("./src/light_controls/music_matcher.py", {
      mode: "text", pythonPath: pythonPath, args: [lights, duration, threshold, sma_window, min_freq, max_freq, base_color, peak_color, noise_gate]
    });

    pythonLoop.on('message', function (message) {
      console.log(message);
      if (message == "OK")
        resolve("Music Matching Started!");
    });

    pythonLoop.end(function (err) {
      if (err) {
        console.log(err)
        reject(err);
      }
      else {
        reject("BEGIN:Screen Mirroring Unexpectedly Stopped")
      }
    });
  });
}

/**
 * Starts the manual control python script
 */
function startManualControl(lights, scale) {
  return new Promise((resolve, reject) => {
    if (pythonLoop)
      pythonLoop.kill();

    if (lights.length == 0) {
      reject(new Error("BEGIN:Error: No lights/group selected"));
      return
    }

    lights = JSON.stringify(lights);
    pythonLoop = new PythonShell("./src/light_controls/manual_control.py", 
    { mode: "text", pythonPath: pythonPath, args: [lights, scale] });

    pythonLoop.on('message', function (message) {
      console.log(message);
      if (message == "OK")
        console.log("Manual Control Started!")
        resolve("Manual Control Started!");
    });
  
  });
}


function createWindow() {
  const { screen } = require('electron')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.floor(width / 1.7),
    height: Math.floor(height / 1.1),
    resizable: false,
    autoHideMenuBar: true,
    useContentSize: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: false,
      contextIsolation: true,
      sandbox: false,
      // webSecurity: false,
      preload: path.join(__dirname, '../preload/preload.js')
    },
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow();
  tray = null;
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    tray = new Tray(process.env.MEDIA_PATH + "/icon.ico")
  } else {
    tray = new Tray(path.join(__dirname, '../renderer/app/media/icon.ico'))
  }
  tray.setToolTip('Hue Lynx')
  tray.on('click', () => {
    mainWindow.show()
    mainWindow.webContents.send('window-shown');
  })
  
  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open', click: () => { mainWindow.show() } },
      { label: 'Exit', click: () => { app.quit() } }
    ])
    tray.popUpContextMenu(contextMenu)
  })

  ipcMain.handle('discoverLights', discoverLights)
  ipcMain.handle('startScreenMirroring', (event, params) => { return startScreenMirroring(params); })

  ipcMain.handle('stopScreenMirroring', () => {
    console.log("Stopping Screen Mirroring...")
    if (pythonLoop)
      pythonLoop.kill();
  })

  ipcMain.handle('startMusicMatch', (event, params) => {
    console.log("Starting Music Matching...")
    return startMusicMatch(params);
  })

  ipcMain.handle('manualControl', (event, lights, group, scale) => {
    return startManualControl(lights, group, scale);
  })

  ipcMain.on('rgbData', (event, rgbData) => {
    if (pythonLoop){
      pythonLoop.send(rgbData+"\n");
    }
  })

  ipcMain.on('minimizeWindow', () => {
    mainWindow.hide()
  })

  ipcMain.on('closeWindow', () => {
    BrowserWindow.getFocusedWindow().close()
  })

  ipcMain.handle('openLink', (event, link) => {
    require('electron').shell.openExternal(link)
  })


  /**
   * Take Screenshot and return the image to the renderer
   */
  ipcMain.handle('takeScreenshot', () => {
    return screenshot({ format: 'jpg' }).then((image) => {
      return image.toString('base64');
    }).catch((err) => {
      console.log(err)
    })
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

