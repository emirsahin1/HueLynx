const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld('electronAPI', {
  discoverLights: () => ipcRenderer.invoke('discoverLights'),
  startScreenMirroring: (params) => ipcRenderer.invoke('startScreenMirroring', params),
  stopScreenMirroring: () => ipcRenderer.invoke('stopScreenMirroring'),
  startMusicMatch: (params) => ipcRenderer.invoke('startMusicMatch', params),
  minimizeWindow: () => ipcRenderer.send('minimizeWindow'),
  closeWindow: () => ipcRenderer.send('closeWindow'),
  takeScreenshot: () => ipcRenderer.invoke('takeScreenshot'),
  onWindowShown: (callback) => ipcRenderer.on('window-shown', callback),
  manualControl: (lights, scale) => ipcRenderer.invoke('manualControl', lights, scale),
  sendRGBData: (rgbData) => ipcRenderer.send('rgbData', rgbData),
  openLink: (link) => ipcRenderer.invoke('openLink', link),
})
