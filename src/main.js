const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron')
const { exec, spawn } = require('child_process');
import { is } from '@electron-toolkit/utils'
const screenshot = require('screenshot-desktop');
const path = require('path');
const kill = require('tree-kill');
require('dotenv').config();

let pythonLoop = null
let mainWindow = null;
let tray = null;
//extension based on platform
let exe_tail = ''
if (process.platform === 'win32') {
  exe_tail = '.exe'
}
else if (process.platform === 'darwin') {
  exe_tail = '.app'
}
else if (process.platform === 'linux') {
  exe_tail = '.sh'
}

if (require('electron-squirrel-startup')) {
  gracefulShutdown()
}

async function discoverLights() {
  return new Promise((resolve, reject) => {
    console.log("Calling python script");
    const scriptPath = path.join(__dirname, '..', '..', 'src', 'light_controls', 'discover_lights' + exe_tail);

    exec(scriptPath, (err, stdout, stderr) => {
      if (err) {
        console.error("Error Discovering Lights:", stderr);
        reject(err);
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });
}

function startScreenMirroring({ lights, region, duration, scale }) {
  return new Promise((resolve, reject) => {
    console.log("Lights:", lights);

    if (lights.length === 0) {
      reject(new Error("BEGIN:Error: No lights/group selected"));
      return;
    }
    if (region == null) {
      reject(new Error("BEGIN:Error: No region selected"));
      return;
    }
    if (duration == null) {
      reject(new Error("BEGIN:Error: No duration selected"));
      return;
    }

    // Construct the path to your Python script
    const scriptPath = path.join(__dirname, '..', '..', 'src', 'light_controls', 'mirror_screen' + exe_tail)
    lights = JSON.stringify(lights);
    const args = [lights, region, duration, scale]

    // Kill existing process if it's running
    if (pythonLoop) {
      kill(pythonLoop.pid, 'SIGTERM')
      pythonLoop = null;
    }

    // Start a new Python process
    pythonLoop = spawn(scriptPath, args);

    pythonLoop.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log(message);
      if (message === "OK") {
        resolve("Screen Mirroring Started!");
      }
    });

    pythonLoop.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      reject(new Error(data.toString()));
    });

    pythonLoop.on('close', (code) => {
      if (code !== 0) {
        console.error(`Screen mirroring process exited with code ${code}`);
        reject(new Error("Screen Mirroring Unexpectedly Stopped"));
      }
    });
  });
}

function startMusicMatch({ lights, duration, threshold, sma_window, min_freq, max_freq, base_color, peak_color, noise_gate }) {
  return new Promise((resolve, reject) => {
    if (pythonLoop)
      kill(pythonLoop.pid, 'SIGTERM')

    if (lights.length == 0) {
      reject(new Error("BEGIN:Error: No lights/group selected"));
      return
    }
    lights = JSON.stringify(lights);
    const scriptPath = path.join(__dirname, '..', '..', 'src', 'light_controls', 'music_matcher' + exe_tail)
    pythonLoop = spawn(scriptPath, [lights, duration, threshold, sma_window, min_freq, max_freq, base_color, peak_color, noise_gate]);

    pythonLoop.stdout.on('data', function (data) {
      const message = data.toString().trim();
      console.log(message);
      if (message === "OK")
        resolve("Music Matching Started!");
    });

    pythonLoop.on('close', function (err) {
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
      kill(pythonLoop.pid, 'SIGTERM')

    if (lights.length == 0) {
      reject(new Error("BEGIN:Error: No lights/group selected"));
      return
    }

    lights = JSON.stringify(lights);
    const scriptPath = path.join(__dirname, '..', '..', 'src', 'light_controls', 'manual_control' + exe_tail)
    pythonLoop = spawn(scriptPath, [lights, scale]);

    pythonLoop.on('data', function (message) {
      console.log(message);
      if (message == "OK")
        console.log("Manual Control Started!")
      resolve("Manual Control Started!");
    });

    pythonLoop.stdin.on('error', function (code) {
      kill(pythonLoop.pid, 'SIGTERM')
    })
  });
}


function createWindow() {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
    
  let windowWidth;
  let windowHeight;

  let scaleW = 0.55
  let scaleH = 0.90

  windowWidth = parseInt(width * scaleW);
  if (windowWidth > 1146){
    windowWidth = 1146;
  }
  windowHeight = parseInt(height * scaleH);
  console.log("Window Width:", windowWidth, "Window Height:", windowHeight)

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    resizable: true,
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
  // mainWindow.webContents.openDevTools()
}

function gracefulShutdown() {
  if (pythonLoop) {
    //make sure the python process is killed before closing the app
    pythonLoop.on('close', () => {
      app.quit()
    })
    kill(pythonLoop.pid, 'SIGTERM')
  }
  else{
    app.quit()
  }
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
      { label: 'Exit', click: () => { 
        gracefulShutdown() } }
    ])
    tray.popUpContextMenu(contextMenu)
  })

  //open dev tools on F12
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.openDevTools();
    }
  });

  ipcMain.handle('discoverLights', discoverLights)
  ipcMain.handle('startScreenMirroring', (event, params) => { return startScreenMirroring(params); })

  ipcMain.handle('stopScreenMirroring', () => {
    console.log("Stopping Screen Mirroring...")
    if (pythonLoop) {
      kill(pythonLoop.pid, 'SIGTERM')
      pythonLoop = null;
    }
  })

  ipcMain.handle('startMusicMatch', (event, params) => {
    console.log("Starting Music Matching...")
    return startMusicMatch(params);
  })

  ipcMain.handle('manualControl', (event, lights, group, scale) => {
    return startManualControl(lights, group, scale);
  })

  ipcMain.on('rgbData', (event, rgbData) => {
    if (pythonLoop) {
      pythonLoop.stdin.write(rgbData + "\n");
    }
  })

  ipcMain.on('minimizeWindow', () => {
    mainWindow.hide()
  })

  ipcMain.on('closeWindow', () => {
    gracefulShutdown()
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
    gracefulShutdown()
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

