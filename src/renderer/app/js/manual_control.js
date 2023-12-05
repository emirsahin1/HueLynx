import tinyColor from 'tinycolor2';

let newColor = tinyColor("rgb(71, 5, 255)").toRgb();

/**
 * Starts Music Match with the selected group and region
 */
async function setColor() {
  let stringColor = String(newColor.r + "," + newColor.g + "," + newColor.b)
  electronAPI.sendRGBData(stringColor)
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


//Initialize the UI --------------------
$(function () {
  //Get initial variable values  
  $("#manual-color-input").spectrum({
    preferredFormat: "rgb",
    showInput: true,
    showButtons: false,
    color: newColor,
    change: function (color) {
      newColor = color.toRgb();
      setColor();
    },
    move: function (color) {
      newColor = color.toRgb();
      setColor();
    },
  });
 

  $("#effect-1").on('click', () => {
  });
});
