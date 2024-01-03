import Swal from 'sweetalert2';
const screenWidth = window.screen.width;
const screenHeight = window.screen.height;
import { getSelectedLights } from './renderer';

let scaleFactor = 0.33;
if(scaleFactor * screenWidth > 640){
  scaleFactor = 640 / screenWidth;
}
let canvas;
let ctx;
let gridOffset;
let region; let duration; let scale;
let isScreenMirroring = false;
let screenshot_Interval = null;

/**
 * Take single screenshot of the screen to show in the Canvas background
 */
async function takeScreenshot() {
  try {
    let screenshot = await electronAPI.takeScreenshot();
    const imgSrc = `data:image/jpeg;base64,${screenshot}`;
    canvas.style.backgroundImage = `url(${imgSrc})`;
  } catch (err) {
    console.log(err);
    clearInterval(screenshot_Interval);
    canvas.style.backgroundColor = 'rgb(200, 184, 218)';
  }
}


/**
 * Starts Screen Mirroring with the selected group and region
 */
async function startScreenMirroring() {
  $('#start-btn').addClass('stop-active');
  $('#start-btn')[0].textContent = 'Stop Screen Mirroring'
  let lights = getSelectedLights();

  electronAPI.startScreenMirroring({lights, region, duration, scale}).then((result) => {
    isScreenMirroring = true;
    Swal.fire({
      title: result, toast: true, position: 'top-right',
      showConfirmButton: false, timer: 3000, timerProgressBar: true, customClass: { popup: 'swal-toast', timerProgressBar: 'swal-timer' }
    });
  }).catch((err) => {
    isScreenMirroring = false;
    console.log(err);
    Swal.fire({ title: "Error Screen Mirroring: ", text: readError(err.message), heightAuto: false, customClass: { popup: 'swal-popup' } });
    stopScreenMirroring();
  });
}

/**
 * Stops Screen Mirroring
 */
function stopScreenMirroring() {
  $('#start-btn').removeClass('stop-active');
  $('#start-btn')[0].textContent = 'Start Screen Mirroring'
  electronAPI.stopScreenMirroring();
  if (isScreenMirroring) {
    //fire only if there isn't an active swal
    Swal.fire({
      title: "Stopped Screen Mirroring", toast: true, position: 'top-right',
      showConfirmButton: false, timer: 3000, timerProgressBar: true, customClass: { popup: 'swal-toast red', timerProgressBar: 'swal-timer' }
    });
  }
  isScreenMirroring = false;
}


/**
 * Reads the error without extra text
 * @param {*} errorMessage 
 * @returns simple error message
 */
function readError(errorMessage) {
  const parts = errorMessage.split("BEGIN:");
  return parts.length > 1 ? parts[1].trim() : '';
}

/**
 * Draws the Grid on Canvas
 * @param {Int} offset : The increment to draw the grid at
 */
function drawGrid(offset) {
  ctx.beginPath();
  ctx.strokeStyle = "#6f46c2";
  ctx.lineWidth = 0.75;
  for (let i = 0; i < canvas.width; i += offset) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
  }
  for (let i = 0; i < canvas.height; i += offset) {
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
  }
  ctx.stroke();
  ctx.strokeStyle = "black";
}

/**
 * Clears the canvas and redraws the grid if enabled
 */
function canvasPrePaint() {
  region = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gridOffset > 1 && $('#grid-toggle')[0].checked) {
    drawGrid(gridOffset);
  }
}


/**
 * Begin Screenshot Interval
 */
function startScreenshotInterval() {
  takeScreenshot();
  screenshot_Interval = setInterval(() => {
    takeScreenshot();
  }, 1500);
}

/**
 * Initializes the Canvas Renderer and it's Event Listeners
 * The event listeners are responsible for drawing the region on the canvas
 */
function setupCanvasFunctions() {
  canvasPrePaint();
  ctx.fillStyle = "rgba(70, 194, 85, 0.45)";

  let isMouseDown = false;
  let didMouseMove = false;
  let lastX1, lastY1, lastX2, lastY2;

  // Start Drawing Region --------------------
  canvas.addEventListener('mousedown', (event) => {
    isMouseDown = true;
    lastX1 = event.offsetX - (event.offsetX % gridOffset);
    lastY1 = event.offsetY - (event.offsetY % gridOffset);
  });

  // Draw Region as the mouse moves --------------------
  window.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
      didMouseMove = true;
      canvasPrePaint();
      lastX2 = event.x - canvas.getBoundingClientRect().left - ((event.clientX - canvas.getBoundingClientRect().left) % gridOffset);
      lastY2 = event.y - canvas.getBoundingClientRect().top - ((event.clientY - canvas.getBoundingClientRect().top) % gridOffset);
      ctx.beginPath();
      ctx.rect(lastX1, lastY1, lastX2 - lastX1, lastY2 - lastY1);
      ctx.stroke();
      ctx.fill();
    }
  });

  // Stop Drawing Region and save the region data --------------------
  window.addEventListener('mouseup', () => {
    isMouseDown = false;
    if (didMouseMove) {
      didMouseMove = false;
      canvasPrePaint();
      ctx.beginPath();
      ctx.rect(lastX1, lastY1, lastX2 - lastX1, lastY2 - lastY1);
      ctx.stroke();
      ctx.fill();
      let points = [lastX1, lastY1, lastX2, lastY2];

      //Make sure the region is within the screen bounds
      points = points.map((element, index) => {
        element = element / scaleFactor;
        if (index % 2 === 0) {
          if (element > screenWidth)
            return screenWidth;
        } else if (element > screenHeight)
          return screenHeight;
        return element;
      });

      region = {
        x: Math.floor(points[0]), y: Math.floor(points[1]),
        width: Math.floor(Math.abs(points[0] - points[2])),
        height: Math.floor(Math.abs(points[1] - points[3]))
      }
      region = JSON.stringify(region);
    }
  });
}

//Initialize the UI --------------------
$(function () {
  // Initial Setup --------------------
  canvas = $('#canvas')[0];
  ctx = canvas.getContext('2d');
  canvas.width = screenWidth * scaleFactor;
  canvas.height = screenHeight * scaleFactor;

  gridOffset = parseInt($('#grid-size')[0].value);
  duration = parseInt($('#duration-input')[0].value);
  scale = parseFloat($('#scale-input')[0].value);
  setupCanvasFunctions();
  startScreenshotInterval();

  //Grid Toggle Handler --------------------
  $("#grid-toggle").on('click', (event) => {
    stopScreenMirroring()
    if (event.target.checked) {
      gridOffset = parseInt($('#grid-size')[0].value);
      canvasPrePaint();
    }
    else {
      gridOffset = 1;
      canvasPrePaint();
    }
  });

  //Grid Size Handler --------------------
  $('#grid-size').on('change', (event) => {
    gridOffset = parseInt(event.target.value);
    stopScreenMirroring();
    canvasPrePaint();
  });

  //Duration Handler --------------------
  $('#duration-input').on('change', (event) => {
    duration = parseInt(event.target.value);
    stopScreenMirroring();
  });

  //Intensity Scale Handler --------------------
  $('#scale-input').on('change', (event) => {
    scale = parseFloat(event.target.value);
    stopScreenMirroring();
  });

  // Button Handlers --------------------
  $('#screen-size')[0].textContent = screenWidth + ' x ' + screenHeight;
  $('#start-btn').on('click', () => { isScreenMirroring ? stopScreenMirroring() : startScreenMirroring() });
});
