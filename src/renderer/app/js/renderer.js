let lights = [];
let groups = [];
let selectedLights = [];
let screenshot_Interval = null;
let current_tab = "#screen-component"


/**
 * Gets Lights from main process and displays them in the UI
 */
async function discoverLights() {
  $("#loader-wrapper").removeClass("hidden");
  updateSelectedLights([]);
  $('#light-list').empty();
  $('#light-group-list').empty();

  let discoverData = await electronAPI.discoverLights()
  lights = discoverData.Lights
  groups = discoverData.Groups
  $("#loader-wrapper").addClass("hidden");

  lights.forEach(currLight => {
    //if not already in the list
    if ($('#light-list').children().toArray().find(light => light.innerHTML == currLight.name) == undefined) {
      let lightDiv = $(document)[0].createElement('div');
      lightDiv.innerHTML = currLight.name;
      lightDiv.setAttribute('data-mac', currLight.mac);
      lightDiv.setAttribute('data-ip', currLight.ip);
      lightDiv.classList.add('light');

      lightDiv.addEventListener('click', function () {
        if (lightDiv.classList.contains('active')) {
          lightDiv.classList.remove('active');
          updateSelectedLights(selectedLights.filter(light => light !== currLight));
        }
        else {
          //if a group is selected, remove it
          if ($('.group').hasClass('active')) {
            $('.group').removeClass('active');
            selectedLights = [];
          }
          lightDiv.classList.add('active');
          updateSelectedLights([...selectedLights, currLight]);
        }
      });
      $('#light-list')[0].appendChild(lightDiv);
    }
  });

  Object.values(groups).forEach(currGroup => {
    if ($('#light-group-list').children().toArray().find(group => group.innerHTML == currGroup.name) == undefined) {
      let groupDiv = $(document)[0].createElement('div');
      groupDiv.innerHTML = currGroup.name;
      groupDiv.setAttribute('lights', currGroup.lights);
      groupDiv.classList.add('light');
      groupDiv.classList.add('group');

      //Only one group can be selected and active at a time
      groupDiv.addEventListener('click', function () {
        //make active
        if (groupDiv.classList.contains('active')) {
          groupDiv.classList.remove('active');
          updateSelectedLights([])
        } else {
          $('.light').removeClass('active');
          groupDiv.classList.add('active');
          updateSelectedLights(currGroup.lights);
        }
      });
      $('#light-group-list')[0].appendChild(groupDiv);
    }
  });
}


function updateSelectedLights(newLights) {
  selectedLights = newLights;
  
  //If we are on the manual tab, restart manual control with the new lights
  if(current_tab == '#manual-light-control-component') {
    electronAPI.manualControl(selectedLights, 1)
  }
}


export function getSelectedLights() {
  return selectedLights
}

/**
 * Gets all available lights
 */
export function getAllLights() {
  return lights
}


/**
 * Smooth Transition Between Components
 */
function transitionComponents(from, to) {
  $(from).addClass('hidden');
  setTimeout(() => {
    $(from).addClass('no-display');
    $(to).removeClass('no-display');

    setTimeout(() => {
      $(to).removeClass('hidden');
    }, 10);
  }, 300);
}


//Initialize the UI --------------------
$(function () {
  //anim fade in on start
  $('#screen-component').removeClass('no-display');
  setTimeout(() => {
    $('#screen-component').removeClass('hidden');
  }, 50);

  $('#discover-lights-btn').on('click', discoverLights);

  // Side Menu Button Handlers --------------------
  $('#screen-mirror-tab').on('click', () => {
    if (screenshot_Interval) {
      clearInterval(screenshot_Interval);
      startScreenshotInterval();
    }
    transitionComponents(current_tab, '#screen-component');
    current_tab = '#screen-component'
  });

  $('#music-match-tab').on('click', () => {
    clearInterval(screenshot_Interval);
    transitionComponents(current_tab, '#music-match-component');
    current_tab = '#music-match-component'
  });

  $('#manual-tab').on('click', () => {
    clearInterval(screenshot_Interval);
    electronAPI.manualControl(selectedLights, 1)
    transitionComponents(current_tab, '#manual-light-control-component');
    current_tab = '#manual-light-control-component'
  });

  $('#help-tab').on('click', () => {
    clearInterval(screenshot_Interval);
    transitionComponents(current_tab, '#help-component');
    current_tab = '#help-component'
  });

  $('#donate-text').on('click', () => {
    electronAPI.openLink("https://ko-fi.com/polymir");
  })

  $('#donate-button').on('click', () => {
    electronAPI.openLink("https://ko-fi.com/polymir");
  })


  //Minimize and Close Buttons --------------------
  document.getElementById('minimize-button').addEventListener('click', () => {
    clearInterval(screenshot_Interval); //Stop the screenshot interval when minimized
    electronAPI.minimizeWindow();
  });
  document.getElementById('close-button').addEventListener('click', () => {
    clearInterval(screenshot_Interval);
    electronAPI.closeWindow();
  });

  //Window Unminimize Handler --------------------
  window.electronAPI.onWindowShown(() => {
    startScreenshotInterval();
  });
});
