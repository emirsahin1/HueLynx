import Swal from 'sweetalert2';
import tinyColor from 'tinycolor2';
import { getSelectedLights } from './renderer';
let threshold = null
let sma_window = null
let min_freq = null
let max_freq = null
let base_color = null
let peak_color = null
let duration = null
let isMusicMatching = false;
let noise_gate = null;

/**
 * Starts Music Match with the selected group and region
 */
async function startMusicMatch() {
  $('#start-music-btn').addClass('stop-active');
  $('#start-music-btn')[0].textContent = 'Stop Music Matching'

  let lights = getSelectedLights();
  
  electronAPI.startMusicMatch({lights, duration, threshold, sma_window, min_freq, max_freq, base_color, peak_color, noise_gate}).then((result) => {
      isMusicMatching = true;
      Swal.fire({
        title: result, toast: true, position: 'top-right',
        showConfirmButton: false, timer: 3000, timerProgressBar: true, customClass: { popup: 'swal-toast', timerProgressBar: 'swal-timer' }
      });
    }).catch((err) => {
      isMusicMatching = false;
      console.log(err);
      Swal.fire({ title: "Error Music Matching: ", text: readError(err.message), heightAuto: false, customClass: { popup: 'swal-popup' } });
      stopMusicMatching();
    });
}

/**
 * Stops Music Matching
 */
 async function stopMusicMatching() {
  $('#start-music-btn').removeClass('stop-active');
  $('#start-music-btn')[0].textContent = 'Start Music Matching'
  electronAPI.stopScreenMirroring();
  if (isMusicMatching) {
    //fire only if there isn't an active swal
    Swal.fire({
      title: "Stopped Music Matching", toast: true, position: 'top-right',
      showConfirmButton: false, timer: 3000, timerProgressBar: true, customClass: { popup: 'swal-toast red', timerProgressBar: 'swal-timer' }
    });
  }
  isMusicMatching = false;
}

// /**
//  * Reads the error without extra text
//  * @param {*} errorMessage 
//  * @returns simple error message
//  */
function readError(errorMessage) {
  const parts = errorMessage.split("BEGIN:");
  return parts.length > 1 ? parts[1].trim() : '';
}

/**
 * Update the UI with the current values
 */
function updateUI() {
  $("#threshold-input").val(threshold);
  $("#sma-input").val(sma_window);
  $("#min-freq-input").val(min_freq);
  $("#max-freq-input").val(max_freq);
  $("#noise-gate-input").val(noise_gate);
  $("#music-duration-input").val(duration);
  $("#base-color-input").spectrum("set", JSON.parse(base_color));
  $("#peak-color-input").spectrum("set", JSON.parse(peak_color));
}

//Initialize the UI --------------------
$(function () {

  //Get initial variable values
  threshold = parseFloat($("#threshold-input").val());
  sma_window = parseInt($("#sma-input").val());
  min_freq = parseInt($("#min-freq-input").val());
  max_freq = parseInt($("#max-freq-input").val());
  noise_gate = parseInt($("#noise-gate-input").val());
  duration = parseInt($("#music-duration-input").val());
  base_color = JSON.stringify(tinyColor("rgb(31, 5, 44)").toRgb());
  peak_color = JSON.stringify(tinyColor("#f00").toRgb());

  $('#start-music-btn').on('click', () => { isMusicMatching ? stopMusicMatching() : startMusicMatch()});
  
  $("#base-color-input").spectrum({
    preferredFormat: "rgb",
    showInput: true,
    showButtons: false,
    color: "rgb(31, 5, 44)",
    change: function (color) {
      let rgb = color.toRgb();
      base_color = JSON.stringify({r: rgb.r, g: rgb.g, b: rgb.b});
      stopMusicMatching();
    }
  });
  
  $("#peak-color-input").spectrum({
    preferredFormat: "rgb",
    showInput: true,
    showButtons: false,
    color: "#f00",
    change: function (color) {
      let rgb = color.toRgb();
      peak_color = JSON.stringify({r: rgb.r, g: rgb.g, b: rgb.b});
      stopMusicMatching();
    }
  });

  $("#threshold-input").on('change', (event) => {
    threshold = parseFloat(event.target.value);
    stopMusicMatching();
  });

  $("#sma-input").on('change', (event) => {
    sma_window = parseInt(event.target.value);
    stopMusicMatching();
  });

  $("#min-freq-input").on('change', (event) => {
    min_freq = parseInt(event.target.value);
    stopMusicMatching();
  });

  $("#max-freq-input").on('change', (event) => {
    max_freq = parseInt(event.target.value);
    stopMusicMatching();
  });

  $("#music-duration-input").on('change', (event) => {
    duration = parseInt(event.target.value);
    stopMusicMatching();
  });

  $("#noise-gate-input").on('change', (event) => {
    noise_gate = parseInt(event.target.value);
    stopMusicMatching();
  });

  $("#preset-1").on('click', () => {
    threshold = 1.9;
    sma_window = 100;
    min_freq = 50;
    max_freq = 100;
    updateUI()
    stopMusicMatching();
  });

  $("#preset-2").on('click', () => {
    threshold = 1.7;
    sma_window = 70;
    min_freq = 150;
    max_freq = 220;
    updateUI()
    stopMusicMatching();
  });

  $("#preset-3").on('click', () => {
    threshold = 1.4;
    sma_window = 400;
    min_freq = 400;
    max_freq = 5000;
    updateUI()
    stopMusicMatching();
  });

  $("#preset-4").on('click', () => {
    threshold = 1.6;
    sma_window = 100;
    min_freq = 0;
    max_freq = 20000;
    updateUI()
    stopMusicMatching();
  });

  $("#preset-5").on('click', () => {
    threshold = 1.3;
    sma_window = 50;
    min_freq = 0;
    max_freq = 20000;
    updateUI()
    stopMusicMatching();
  });

});
