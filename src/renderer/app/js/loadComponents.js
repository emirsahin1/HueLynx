
$.get('app/html/screen_mirror.html', function (data) {
  $('#component-container').append(data);
});

$.get('app/html/music_match.html', function (data) {
  $('#component-container').append(data);
});

$.get('app/html/manual_control.html', function (data) {
  $('#component-container').append(data);
});

$.get('app/html/help.html', function (data) {
  $('#component-container').append(data);
});